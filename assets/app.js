/* SGE CRM admin — vanilla JS + Alpine.js + HTMX.
 *
 * Alpine owns: hash routing, sidebar (search + selection), tab nav,
 * Critical/Regular toggle state, the New Action Item form.
 *
 * HTMX owns: loading the action items table body, loading the action item
 * detail (which contains the edit form + comments). Comments + threads also
 * load via HTMX from within the detail fragment.
 *
 * Edit the next line if the FastAPI URL changes (e.g. ngrok rotation).
 */
const API_BASE_URL = "https://dipper-tidy-unwoven.ngrok-free.dev";

const TAB_ROUTES = new Set([
  "/business-intelligence",
  "/action-items",
  "/rank-tracker",
  "/website-status",
]);

const TABS = [
  { href: "/business-intelligence", label: "Business Intelligence" },
  { href: "/action-items", label: "Action Items" },
  { href: "/rank-tracker", label: "Rank Tracker" },
  { href: "/website-status", label: "Website Status" },
];

/* Configure HTMX defaults — point all hx-get/hx-post at the FastAPI base URL
 * and ship the ngrok skip header on every request. */
document.addEventListener("htmx:configRequest", (event) => {
  const path = event.detail.path || "";
  if (path.startsWith("/")) {
    event.detail.path = `${API_BASE_URL}${path}`;
  }
  event.detail.headers["ngrok-skip-browser-warning"] = "true";
});

/* ---------- JSON API (sidebar, new form, things HTMX doesn't drive) ---------- */

async function api(path, opts = {}) {
  const headers = { "ngrok-skip-browser-warning": "true" };
  if (opts.body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

function listFromResponse(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;
  return [];
}

const apiClient = {
  actionItems: {
    create: (input) => api("/action-items/new/", { method: "POST", body: input }),
  },
  clients: {
    all: () => api("/clients/all/").then(listFromResponse),
  },
};

/* ---------- Hash routing helpers ---------- */

function parseHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [pathRaw, queryRaw] = raw.split("?");
  const path = pathRaw || "/";
  const params = new URLSearchParams(queryRaw || "");
  const segments = path.split("/").filter(Boolean);
  return { path, params, segments, clientId: params.get("client_id") };
}

function buildHash(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") search.set(k, String(v));
  });
  const q = search.toString();
  return `#${path}${q ? `?${q}` : ""}`;
}

function tabHref(href, clientId) {
  return clientId ? buildHash(href, { client_id: clientId }) : buildHash(href);
}

/* HTMX returns HX-Redirect headers as window.location changes. The backend
 * sets them as hash URLs like "/#/action-items" — we intercept and convert
 * to a real hash change. */
document.addEventListener("htmx:beforeOnLoad", (event) => {
  const redirect = event.detail.xhr.getResponseHeader("HX-Redirect");
  if (redirect && redirect.startsWith("/#")) {
    event.preventDefault();
    window.location.hash = redirect.replace(/^\/#/, "");
  }
});

/* ---------- Root Alpine component ---------- */

function app() {
  return {
    route: parseHash(),
    sidebarFilter: "",
    clients: [],
    clientsError: null,

    /* derived */
    get clientId() { return this.route.clientId; },
    get clientName() {
      if (!this.clientId) return null;
      const found = this.clients.find((c) => String(c.id) === String(this.clientId));
      return found?.name ?? `Client #${this.clientId}`;
    },
    get filteredClients() {
      const q = this.sidebarFilter.trim().toLowerCase();
      if (!q) return this.clients;
      return this.clients.filter((c) => (c.name || "").toLowerCase().includes(q));
    },
    get pathRoot() { return "/" + (this.route.segments[0] || ""); },
    get pageKey() {
      const seg = this.route.segments;
      if (seg.length === 0) return "home";
      if (seg[0] === "action-items") {
        if (seg.length === 1) return "action-items";
        if (seg[1] === "new") return "action-items-new";
        return "action-items-detail";
      }
      if (seg[0] === "clients") return "clients";
      if (seg[0] === "business-intelligence") return "stub-bi";
      if (seg[0] === "rank-tracker") return "stub-rt";
      if (seg[0] === "website-status") return "stub-ws";
      if (seg[0] === "login") return "login";
      if (seg[0] === "auth") return "auth-callback";
      return "home";
    },
    get tabsVisible() { return !!this.clientId; },

    /* HTMX URLs used by the page templates */
    get detailId() { return this.route.segments[1]; },
    get detailUrl() {
      const q = this.clientId ? `?client_id=${this.clientId}` : "";
      return `/action-items/id/${this.detailId}/html/${q}`;
    },

    /* lifecycle */
    init() {
      this.loadClients();
      window.addEventListener("hashchange", () => {
        this.route = parseHash();
        /* Alpine re-renders the page template; HTMX picks up the new
         * hx-get and fires on load automatically. */
      });
    },
    async loadClients() {
      try {
        this.clients = await apiClient.clients.all();
      } catch (e) {
        this.clientsError = `Failed to load clients (${e.status || "network"})`;
      }
    },

    /* helpers */
    tabUrl(href) { return tabHref(href, this.clientId); },
    sidebarHref(client) {
      const base = TAB_ROUTES.has(this.pathRoot) && this.clientId ? this.pathRoot : "/business-intelligence";
      return buildHash(base, { client_id: client.id });
    },
    isTabActive(href) { return this.pathRoot === href; },
    isClientActive(client) { return String(this.clientId) === String(client.id); },
    TABS,

    /* ============== New form (still JSON — simpler than HTMX redirect dance) ============== */
    newForm: { title: "", description: "", client_id: "", priority: "low", critical: false },
    newSaving: false,
    initNewForm() {
      this.newForm = {
        title: "",
        description: "",
        client_id: this.clientId ?? "",
        priority: "low",
        critical: false,
      };
    },
    async submitNew() {
      this.newSaving = true;
      try {
        await apiClient.actionItems.create({
          ...this.newForm,
          client_id: Number(this.newForm.client_id),
        });
        window.location.hash = tabHref("/action-items", this.newForm.client_id);
      } catch (e) {
        alert(`Create failed: ${e.status || e.message}`);
      } finally {
        this.newSaving = false;
      }
    },
  };
}

/* Per-page Alpine factory: action items list (Critical/Regular toggle that
 * drives an HTMX re-fetch of the table body). */
function actionItemsList() {
  return {
    filter: "critical",
    get rowsUrl() {
      const params = new URLSearchParams({ filter: this.filter });
      const hash = parseHash();
      if (hash.clientId) params.set("client_id", hash.clientId);
      return `/action-items/html/?${params.toString()}`;
    },
    setFilter(next) {
      this.filter = next;
      /* Wait a tick for :hx-get binding to update, then re-fire the load. */
      this.$nextTick(() => {
        if (window.htmx) {
          window.htmx.trigger("#items-rows", "refresh-rows");
        }
      });
    },
  };
}

window.app = app;
window.actionItemsList = actionItemsList;
