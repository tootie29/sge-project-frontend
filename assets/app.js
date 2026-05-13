/* SGE CRM admin — vanilla JS + Alpine.js.
 *
 * All data fetching is JSON via the Vercel rewrite proxy. The browser sees
 * `/api/clients/all/` (same origin) and Vercel rewrites it to the ngrok
 * tunnel server-side, so CORS is never an issue.
 *
 * If the FastAPI URL changes (e.g. ngrok rotation), edit vercel.json instead
 * of this file — the destination in the rewrite rule is the only place where
 * the real backend URL lives.
 */
const API_BASE_URL = "/api";

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

/* ---------- API client ---------- */

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
    list: (params = {}) => api(`/action-items/?${qs(params)}`).then(listFromResponse),
    byClient: (id, params = {}) => api(`/action-items/client/${id}?${qs(params)}`).then(listFromResponse),
    get: (id) => api(`/action-items/id/${id}`),
    create: (input) => api("/action-items/new/", { method: "POST", body: input }),
    update: (id, input) => api(`/action-items/update/${id}`, { method: "POST", body: input }),
    remove: (id) => api(`/action-items/delete/${id}`),
  },
  comments: {
    list: (id) => api(`/comments/loop/${id}`).then(listFromResponse),
    thread: (id) => api(`/comments/thread/${id}`).then(listFromResponse),
    post: (input) => api("/comments/post/", { method: "POST", body: input }),
    postSub: (input) => api("/comments/post-sub/", { method: "POST", body: input }),
  },
  clients: {
    all: () => api("/clients/all/").then(listFromResponse),
  },
};

function qs(obj) {
  const params = new URLSearchParams();
  Object.entries({ page: 1, limit: 50, order: "desc", ...obj }).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, v);
  });
  return params.toString();
}

/* ---------- Hash routing ---------- */

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

function priorityClass(p) {
  const key = (p || "").toLowerCase();
  if (key === "high") return "pill pill-priority-high";
  if (key === "medium") return "pill pill-priority-medium";
  if (key === "low") return "pill pill-priority-low";
  return "pill";
}

function statusClass(s) {
  const key = (s || "").toLowerCase().replace(/\s+/g, "-");
  return `pill pill-status-${key}`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/* ---------- Root Alpine component ---------- */

function app() {
  return {
    route: parseHash(),
    sidebarFilter: "",

    clients: [],
    clientsError: null,
    pageData: null,
    pageError: null,
    pageLoading: false,

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

    init() {
      this.loadClients();
      this.onRouteChange();
      window.addEventListener("hashchange", () => {
        this.route = parseHash();
        this.onRouteChange();
      });
    },
    async loadClients() {
      try {
        this.clients = await apiClient.clients.all();
      } catch (e) {
        this.clientsError = `Failed to load clients (${e.status || "network"})`;
      }
    },
    async onRouteChange() {
      this.pageData = null;
      this.pageError = null;
      const key = this.pageKey;
      try {
        if (key === "action-items") await this.loadActionItems();
        else if (key === "action-items-detail") await this.loadDetail();
      } catch (e) {
        this.pageError = `Failed to load (${e.status || "network"})`;
      }
    },

    tabUrl(href) { return tabHref(href, this.clientId); },
    sidebarHref(client) {
      const base = TAB_ROUTES.has(this.pathRoot) && this.clientId ? this.pathRoot : "/business-intelligence";
      return buildHash(base, { client_id: client.id });
    },
    isTabActive(href) { return this.pathRoot === href; },
    isClientActive(client) { return String(this.clientId) === String(client.id); },

    priorityClass, statusClass, formatDate, TABS,

    /* ============== Action items list ============== */
    listFilter: "critical",
    async loadActionItems() {
      this.pageLoading = true;
      try {
        const items = this.clientId
          ? await apiClient.actionItems.byClient(this.clientId)
          : await apiClient.actionItems.list();
        this.pageData = { items };
      } finally {
        this.pageLoading = false;
      }
    },
    get listItems() {
      const all = this.pageData?.items ?? [];
      return all.filter((it) => this.listFilter === "critical" ? !!it.critical : !it.critical);
    },

    /* ============== Detail + comments ============== */
    detailItem: null,
    detailComments: [],
    detailEditing: false,
    detailForm: { title: "", description: "", priority: "low", status: "pending", critical: false },
    detailSaving: false,
    commentText: "",
    commentPosting: false,
    threadCache: {},
    async loadDetail() {
      const id = Number(this.route.segments[1]);
      if (!Number.isFinite(id)) return;
      const [item, comments] = await Promise.all([
        apiClient.actionItems.get(id),
        apiClient.comments.list(id).catch(() => []),
      ]);
      this.detailItem = item;
      this.detailComments = comments;
      this.detailEditing = false;
      this.detailForm = {
        title: item?.title ?? "",
        description: item?.description ?? "",
        priority: item?.priority ?? "low",
        status: item?.status ?? "pending",
        critical: !!item?.critical,
      };
      this.threadCache = {};
    },
    async saveDetail() {
      if (!this.detailItem) return;
      this.detailSaving = true;
      try {
        await apiClient.actionItems.update(this.detailItem.id, this.detailForm);
        await this.loadDetail();
      } catch (e) {
        alert(`Save failed: ${e.status || e.message}`);
      } finally {
        this.detailSaving = false;
      }
    },
    async deleteDetail() {
      if (!this.detailItem) return;
      if (!confirm("Delete this action item? This cannot be undone.")) return;
      try {
        await apiClient.actionItems.remove(this.detailItem.id);
        window.location.hash = tabHref("/action-items", this.clientId);
      } catch (e) {
        alert(`Delete failed: ${e.status || e.message}`);
      }
    },
    async postComment() {
      if (!this.commentText.trim() || !this.detailItem) return;
      this.commentPosting = true;
      try {
        await apiClient.comments.post({
          action_item: this.detailItem.id,
          text: this.commentText.trim(),
        });
        this.commentText = "";
        this.detailComments = await apiClient.comments.list(this.detailItem.id);
      } catch (e) {
        alert(`Post failed: ${e.status || e.message}`);
      } finally {
        this.commentPosting = false;
      }
    },
    async loadThread(parentId) {
      try {
        this.threadCache[parentId] = await apiClient.comments.thread(parentId);
      } catch (e) {
        alert(`Failed to load thread: ${e.status || e.message}`);
      }
    },
    async postSubComment(parentId, text) {
      if (!text.trim()) return;
      try {
        await apiClient.comments.postSub({ comment_parent: parentId, text: text.trim() });
        await this.loadThread(parentId);
      } catch (e) {
        alert(`Reply failed: ${e.status || e.message}`);
      }
    },

    /* ============== New form ============== */
    newForm: { title: "", description: "", client_id: "", priority: "low", critical: false },
    newSaving: false,
    initNewForm() {
      this.newForm = {
        title: "", description: "",
        client_id: this.clientId ?? "",
        priority: "low", critical: false,
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

window.app = app;
window.commentRow = function (comment, root) {
  return {
    replying: false,
    replyText: "",
    get thread() { return root.threadCache[comment.id]; },
    get loading() { return root.threadCache[comment.id] === "loading"; },
    async toggleThread() {
      if (root.threadCache[comment.id]) {
        delete root.threadCache[comment.id];
      } else {
        root.threadCache[comment.id] = "loading";
        try {
          root.threadCache[comment.id] = await apiClient.comments.thread(comment.id);
        } catch (e) {
          alert(`Failed to load thread: ${e.status || e.message}`);
          delete root.threadCache[comment.id];
        }
      }
    },
    async submitReply() {
      if (!this.replyText.trim()) return;
      await root.postSubComment(comment.id, this.replyText.trim());
      this.replyText = "";
      this.replying = false;
    },
  };
};
