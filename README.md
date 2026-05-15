# SGE CRM — Admin Frontend (HTML + Alpine.js + HTMX)

A plain static site for the SGE Mini-CRM admin. No build step, no Node, no
framework. Three files do the whole job.

**Two libraries, two jobs:**
- **Alpine.js** drives client-only state — hash routing, sidebar search, the
  Critical/Regular toggle, the New Action Item form.
- **HTMX** drives server interactions — loading the action items table,
  loading the action item detail, loading comments and threads, posting
  comments and edits. Each call hits a Jinja2-rendered endpoint on the
  FastAPI that returns ready-to-swap HTML.

## What's in this folder

```
index.html          The whole UI shell + page templates (hash-routed SPA)
assets/styles.css   Dark navy + mint palette, 18px base, all custom styles
assets/app.js       Alpine.js components, hash router, API client
README.md           This file
```

That's it — open `index.html` in any browser and it runs. Drop the folder on
any static host (GitHub Pages, Netlify, Cloudflare Pages, S3, a USB stick) and
it serves.

## Configuration

The FastAPI base URL is a single constant at the top of
[`assets/app.js`](./assets/app.js):

```js
const API_BASE_URL = "https://dipper-tidy-unwoven.ngrok-free.dev";
```

If the ngrok tunnel rotates or you move the backend to a real host, edit that
one line.

## Backend requirement: CORS

Because everything runs in the browser and talks to the FastAPI directly, the
backend must allow this origin. Already added to
[`sge-project-001/main.py`](../sge-project-001/main.py):

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4321",
        "http://127.0.0.1:4321",
        "https://sge-project-frontend.vercel.app",
    ],
    allow_origin_regex=r"https://sge-project-frontend-.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Add additional origins to `allow_origins` if you host the static files
elsewhere. Restart the FastAPI server for the change to take effect.

## How the app works

- **Hash routing**: every page lives at a hash URL — `#/`, `#/action-items`,
  `#/action-items/123?client_id=44`, etc. Works on any static host with zero
  rewrite configuration.
- **Single Alpine root**: the entire app is one `<body x-data="app()">`. The
  `app()` factory in `assets/app.js` holds all state and methods.
- **Per-client scoping**: selecting a client in the sidebar adds
  `?client_id=N` to the hash. Tabs (BI / Action Items / Reports / Rank
  Tracker / Website Status) only appear once a client is selected;
  clicking another client preserves whichever tab you're on. First-time
  selection lands on Business Intelligence.
- **Pages**:
  - `#/` — landing
  - `#/action-items` — list (Critical / Regular toggle, status pills, datetime)
  - `#/action-items/:id` — detail + edit + delete + threaded comments
  - `#/action-items/new` — create form
  - `#/business-intelligence` — insights w/ category sub-tabs + pagination
  - `#/reports` — submitted reports list (paginated)
  - `#/reports/:id` — report detail + attachments + reviews thread
  - `#/rank-tracker`, `#/website-status` — stubs until those FastAPI
    endpoints exist
  - `#/clients` — clients table
  - `#/login`, `#/auth/callback` — auth stubs

## Known gaps

- **Action-item detail page lacks `created_at`**: the list select now
  exposes it (`database.py` `DB_loop_action_items.select`), but
  `DB_action_items.get()` and `.update()` selects still omit
  `created_at` — so the column on the list view shows a real date but
  the detail page does not. Add `created_at` to those two selects to
  fix.
- **Backend pagination bug**: `range_from = (page-1) * (limit*(page-1))`
  at `database.py:71` (and repeated for BI/reports) skips the wrong
  amount on page > 1. Frontend sidesteps it by passing `limit=100` and
  paginating client-side.
- **Rank Tracker, Website Status** are stubs — no backend endpoints yet.
- **Auth** isn't wired. All routes are open.

## Deploying

Anywhere. A few examples:

```bash
# GitHub Pages (push the folder to a gh-pages branch)
git init gh-pages-only
cd gh-pages-only
cp -r ../{index.html,assets,README.md} .
git checkout -b gh-pages
git add . && git commit -m "publish"
git remote add origin <your repo url>
git push -u origin gh-pages

# Netlify drag-and-drop: zip the folder and drop it on https://app.netlify.com/drop
# Cloudflare Pages: npx wrangler pages deploy . --project-name sge-crm-admin
# Vercel:           npx vercel --prod
# Local preview:    npx serve .  (or python3 -m http.server 8080)
```

No build step, so whatever folder you have here is exactly what gets served.

## CDN dependencies

Loaded at runtime from CDNs in `index.html`:
- [HTMX 2.0.3](https://unpkg.com/htmx.org@2.0.3/dist/htmx.min.js) — pinned, ~14 KB minified+gzipped.
- [Alpine.js 3.14.1](https://cdn.jsdelivr.net/npm/alpinejs@3.14.1/dist/cdn.min.js)
  — pinned, ~14 KB minified+gzipped.
- [Inter](https://fonts.google.com/specimen/Inter) +
  [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) from
  Google Fonts.

## Backend HTML endpoints (used by HTMX)

These were added alongside the existing JSON endpoints in
[`sge-project-001/main.py`](../sge-project-001/main.py) and render Jinja2
templates from `sge-project-001/templates/`:

| Endpoint | Verb | Template | Used by |
|---|---|---|---|
| `/action-items/html/?client_id=&filter=critical\|regular` | GET | `action_items_rows.html` | Action items table body |
| `/action-items/id/{id}/html/?client_id=` | GET | `action_item_detail.html` | Action item detail page |
| `/action-items/update/{id}/html/` | POST | `action_item_detail.html` | Edit form submit |
| `/action-items/{id}/html/` | DELETE | (empty + `HX-Redirect`) | Delete button |
| `/comments/loop/{id}/html/` | GET | `comments_list.html` | Comments list under a detail |
| `/comments/thread/{id}/html/` | GET | `comments_thread.html` | Reply thread for one comment |
| `/comments/post/html/` | POST | `comments_list.html` | New comment form (refreshes list) |
| `/comments/post-sub/html/` | POST | `comments_thread.html` | Reply form (refreshes thread) |

The existing JSON endpoints are unchanged — they're still used by Alpine for
the sidebar's `/clients/all/` fetch and the New Action Item form's
`POST /action-items/new/`.

**Restart the FastAPI server** after pulling the backend changes so the new
routes and Jinja2 mount take effect.

Want to host these locally instead of via CDN? Download the files into
`assets/` and update the `<script>` / `<link>` tags in `index.html`. Nothing
in the app logic depends on the CDN URLs.
