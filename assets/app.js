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
  "/reports",
  "/rank-tracker",
  "/website-status",
]);

const TABS = [
  { href: "/business-intelligence", label: "Business Intelligence" },
  { href: "/action-items", label: "Action Items" },
  { href: "/reports", label: "Reports" },
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
  bi: {
    byClient: (clientId, params = {}) =>
      api(`/business-intelligence/client/${clientId}?${qs({ limit: 100, ...params })}`).then(listFromResponse),
    byClientCategory: (clientId, category, params = {}) =>
      api(`/business-intelligence/client/${clientId}/category/${encodeURIComponent(category)}?${qs({ limit: 100, ...params })}`).then(listFromResponse),
  },
  reports: {
    byClient: (clientId, params = {}) =>
      api(`/reports/client/${clientId}?${qs({ limit: 100, ...params })}`).then(listFromResponse),
    get: (id) => api(`/reports/${id}`),
    submit: (input) => api("/reports/submit/", { method: "POST", body: input }),
  },
  reviews: {
    listForReport: (reportId) => api(`/reviews/${reportId}`).then(listFromResponse),
    submit: (input) => api("/reviews/submit/", { method: "POST", body: input }),
  },
  rankTracker: {
    byClient: (clientId, params = {}) =>
      api(`/rank-tracker/client/${clientId}?${qs({ limit: 100, ...params })}`).then(listFromResponse),
  },
  websiteStatus: {
    byClient: (clientId, params = {}) =>
      api(`/website-status/client/${clientId}?${qs({ limit: 100, ...params })}`).then(listFromResponse),
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
    sidebarLetter: "",
    sidebarPage: 1,
    sidebarPageSize: 10,

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
    get sidebarAlphabet() {
      return "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    },
    get availableLetters() {
      const set = new Set();
      for (const c of this.clients) {
        const first = (c.name || "").trim().charAt(0).toUpperCase();
        if (first >= "A" && first <= "Z") set.add(first);
      }
      return set;
    },
    get filteredClients() {
      const q = this.sidebarFilter.trim().toLowerCase();
      const letter = this.sidebarLetter;
      return this.clients.filter((c) => {
        const name = (c.name || "").toLowerCase();
        if (q && !name.includes(q)) return false;
        if (letter && !name.startsWith(letter.toLowerCase())) return false;
        return true;
      });
    },
    get pagedClients() {
      const start = (this.sidebarPage - 1) * this.sidebarPageSize;
      return this.filteredClients.slice(start, start + this.sidebarPageSize);
    },
    get sidebarTotalPages() {
      return Math.max(1, Math.ceil(this.filteredClients.length / this.sidebarPageSize));
    },
    setSidebarLetter(letter) {
      this.sidebarLetter = this.sidebarLetter === letter ? "" : letter;
      this.sidebarPage = 1;
    },
    resetSidebarFilters() {
      this.sidebarLetter = "";
      this.sidebarFilter = "";
      this.sidebarPage = 1;
      if (window.location.hash !== "#/") window.location.hash = "#/";
    },
    prevSidebarPage() {
      if (this.sidebarPage > 1) this.sidebarPage--;
    },
    nextSidebarPage() {
      if (this.sidebarPage < this.sidebarTotalPages) this.sidebarPage++;
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
      if (seg[0] === "reports") {
        if (seg.length === 1) return "reports";
        return "reports-detail";
      }
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
        else if (key === "stub-bi") await this.loadBI();
        else if (key === "reports") await this.loadReports();
        else if (key === "reports-detail") await this.loadReportDetail();
        else if (key === "stub-rt") await this.loadRankTracker();
        else if (key === "stub-ws") await this.loadWebsiteStatus();
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

    /* ============== Business Intelligence ============== */
    biItems: [],
    biCategory: null,
    biExpanded: {},
    biPage: 1,
    biPageSize: 5,
    async loadBI() {
      this.biItems = [];
      this.biCategory = null;
      this.biExpanded = {};
      this.biPage = 1;
      if (!this.clientId) return;
      const items = await apiClient.bi.byClient(this.clientId);
      this.biItems = items;
      if (this.biCategories.length > 0) {
        this.biCategory = this.biCategories[0];
      }
    },
    get biCategories() {
      const seen = new Set();
      for (const i of this.biItems) {
        const c = i.insight_category;
        if (c) seen.add(c);
      }
      return Array.from(seen).sort((a, b) => a.localeCompare(b));
    },
    get biFiltered() {
      if (!this.biCategory) return this.biItems;
      return this.biItems.filter((i) => i.insight_category === this.biCategory);
    },
    get biPaged() {
      const start = (this.biPage - 1) * this.biPageSize;
      return this.biFiltered.slice(start, start + this.biPageSize);
    },
    get biTotalPages() {
      return Math.max(1, Math.ceil(this.biFiltered.length / this.biPageSize));
    },
    setBiCategory(cat) {
      this.biCategory = cat;
      this.biPage = 1;
      this.biExpanded = {};
    },
    prevBiPage() { if (this.biPage > 1) this.biPage--; },
    nextBiPage() { if (this.biPage < this.biTotalPages) this.biPage++; },
    toggleBI(id) {
      this.biExpanded[id] = !this.biExpanded[id];
    },

    /* ============== Reports ============== */
    reportsItems: [],
    reportsLoading: false,
    reportsPage: 1,
    reportsPageSize: 10,
    reportDetail: null,
    reportReviews: [],
    reportLoading: false,
    reviewText: "",
    reviewPosting: false,
    async loadReports() {
      this.reportsItems = [];
      this.reportsPage = 1;
      if (!this.clientId) return;
      this.reportsLoading = true;
      try {
        this.reportsItems = await apiClient.reports.byClient(this.clientId);
      } finally {
        this.reportsLoading = false;
      }
    },
    get reportsPaged() {
      const start = (this.reportsPage - 1) * this.reportsPageSize;
      return this.reportsItems.slice(start, start + this.reportsPageSize);
    },
    get reportsTotalPages() {
      return Math.max(1, Math.ceil(this.reportsItems.length / this.reportsPageSize));
    },
    prevReportsPage() { if (this.reportsPage > 1) this.reportsPage--; },
    nextReportsPage() { if (this.reportsPage < this.reportsTotalPages) this.reportsPage++; },
    async loadReportDetail() {
      const id = Number(this.route.segments[1]);
      if (!Number.isFinite(id)) return;
      this.reportLoading = true;
      this.reportDetail = null;
      this.reportReviews = [];
      this.reviewText = "";
      try {
        const [report, reviews] = await Promise.all([
          apiClient.reports.get(id),
          apiClient.reviews.listForReport(id).catch(() => []),
        ]);
        this.reportDetail = report;
        this.reportReviews = Array.isArray(reviews) ? reviews : [];
      } finally {
        this.reportLoading = false;
      }
    },
    async postReview() {
      if (!this.reviewText.trim() || !this.reportDetail) return;
      this.reviewPosting = true;
      try {
        await apiClient.reviews.submit({
          id: this.reportDetail.id,
          content: this.reviewText.trim(),
        });
        this.reviewText = "";
        this.reportReviews = await apiClient.reviews.listForReport(this.reportDetail.id);
      } catch (e) {
        alert(`Post review failed: ${e.status || e.message}`);
      } finally {
        this.reviewPosting = false;
      }
    },
    reportFileUrls(report) {
      const raw = report?.file_urls;
      if (!Array.isArray(raw)) return [];
      return raw.map((f) => (typeof f === "string" ? { url: f } : f)).filter((f) => f && f.url);
    },

    /* ============== Rank Tracker ============== */
    rtItems: [],
    rtBackendMissing: false,
    rtLoading: false,
    async loadRankTracker() {
      this.rtItems = [];
      this.rtBackendMissing = false;
      if (!this.clientId) return;
      this.rtLoading = true;
      try {
        this.rtItems = await apiClient.rankTracker.byClient(this.clientId);
      } catch (e) {
        if (e.status === 404 || e.status === 405) {
          this.rtBackendMissing = true;
        } else {
          throw e;
        }
      } finally {
        this.rtLoading = false;
      }
    },
    rtChangeClass(n) {
      if (typeof n !== "number") return "page-sub";
      if (n > 0) return "pill pill-status-completed";
      if (n < 0) return "pill pill-priority-high";
      return "page-sub";
    },
    rtChangeLabel(n) {
      if (typeof n !== "number" || n === 0) return "0";
      return (n > 0 ? "↗ +" : "↘ ") + n;
    },

    /* ============== Website Status ============== */
    wsItems: [],
    wsBackendMissing: false,
    wsLoading: false,
    async loadWebsiteStatus() {
      this.wsItems = [];
      this.wsBackendMissing = false;
      if (!this.clientId) return;
      this.wsLoading = true;
      try {
        this.wsItems = await apiClient.websiteStatus.byClient(this.clientId);
      } catch (e) {
        if (e.status === 404 || e.status === 405) {
          this.wsBackendMissing = true;
        } else {
          throw e;
        }
      } finally {
        this.wsLoading = false;
      }
    },
    wsStatusClass(s) {
      const key = (s || "").toLowerCase();
      if (key === "up" || key === "healthy" || key === "ok") return "pill pill-status-completed";
      if (key === "degraded" || key === "slow" || key === "warning") return "pill pill-status-pending";
      if (key === "down" || key === "error" || key === "fail") return "pill pill-priority-high";
      return "pill";
    },
    wsCodeClass(code) {
      if (typeof code !== "number") return "page-sub";
      if (code >= 200 && code < 300) return "pill pill-status-completed";
      if (code >= 300 && code < 400) return "pill pill-status-pending";
      if (code >= 400) return "pill pill-priority-high";
      return "pill";
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
