# SGE Mini-CRM — Admin Frontend

Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui.
Admin dashboard for the [SGE Mini-CRM FastAPI backend](../sge-project-001).

## What's in v1

- **/clients** — list of clients (from `GET /clients/all/`)
- **/action-items** — table with search, client filter, pagination
- **/action-items/new** — create form
- **/action-items/[id]** — detail + threaded comments + edit / delete
- **/login** + **/auth/callback** — stubs; auth wiring is deferred to a later pass

All backend calls happen **server-side** (Server Components + Server Actions),
so the browser never talks to FastAPI directly. This means we don't need to
configure CORS on the backend for v1.

## Prerequisites

- Node 22+ and npm 10+
- The FastAPI backend running at `http://127.0.0.1:8000` (or override via
  `API_BASE_URL` in `.env.local`)

## Local setup

```bash
cp .env.example .env.local         # default points at 127.0.0.1:8000
npm install                        # already done by the scaffolder
npm run dev                        # http://localhost:3000
```

## Environment

| Variable        | Default                  | Notes                                  |
| --------------- | ------------------------ | -------------------------------------- |
| `API_BASE_URL`  | `http://127.0.0.1:8000`  | FastAPI base URL, no trailing slash    |

`API_BASE_URL` is **server-only** on purpose — no `NEXT_PUBLIC_` prefix. When
auth is added later, the Supabase bearer will be attached server-side from a
cookie, so the token never ships to the browser.

## File layout

```
src/
  app/
    layout.tsx                       Admin shell + Toaster
    page.tsx                         Redirects to /action-items
    clients/page.tsx
    action-items/
      page.tsx                       List
      new/page.tsx                   Create form
      [id]/page.tsx                  Detail + comments
      _components/                   Shared UI for the action-items routes
    login/page.tsx                   Stub
    auth/callback/page.tsx           Stub
  components/
    admin-shell.tsx
    ui/                              shadcn primitives
  lib/
    api.ts                           Typed client mirroring the 12 endpoints
    actions.ts                       Server Actions (mutations + thread fetch)
    schemas.ts                       Zod schemas + TS types
    env.ts                           API_BASE_URL with sensible fallback
```

## Backend endpoint coverage

| Backend endpoint                                          | Frontend usage                              |
| --------------------------------------------------------- | ------------------------------------------- |
| `GET /action-items/`                                      | `/action-items` (default view)              |
| `GET /action-items/search/?query=`                        | `/action-items?q=…`                         |
| `GET /action-items/client/{id}`                           | `/action-items?client_id=…`                 |
| `GET /action-items/id/{id}`                               | `/action-items/[id]`                        |
| `POST /action-items/new/`                                 | `/action-items/new` form                    |
| `POST /action-items/update/{id}`                          | Edit panel on detail page                   |
| `GET /action-items/delete/{id}` *(yes, GET — backend's choice)* | Delete button on detail page         |
| `POST /comments/post/`                                    | Comments form on detail page                |
| `POST /comments/post-sub/`                                | Reply form per comment                      |
| `GET /comments/loop/{action_item_id}`                     | Parent comments on detail page              |
| `GET /comments/thread/{parent_id}`                        | Lazy-loaded replies under a parent          |
| `GET /clients/all/`                                       | `/clients` and the client filter dropdown   |
| `GET /auth/login`, `GET /auth/callback`, `GET /user/me`   | **Not wired yet** — deferred to auth pass   |

## Known backend issues to address

These do not block the frontend running, but will affect behavior:

1. **Pagination bug** in `src/includes/classes/database.py:71` —
   `range_from = (page-1) * (limit*(page-1))` compounds. Page 2 onwards will
   return wrong ranges. Fix: `range_from = (page-1) * limit`.
2. **Verb mismatches** — `update` is `POST`, `delete` is `GET`. The frontend
   matches the backend as-is; consider normalizing to `PATCH` / `DELETE` later.
3. **No CORS** configured on FastAPI. Not needed for v1 since all calls are
   server-side, but required if anything ever calls the API from the browser.

## Auth (deferred)

The plan when we wire it:

- Add `@supabase/ssr` and a server-only Supabase client.
- `/login` triggers `signInWithOAuth({ provider: "google" })` with redirect to
  `/auth/callback`.
- `/auth/callback` exchanges the `code` for a session and writes httpOnly
  cookies via Supabase's `@supabase/ssr` helpers.
- A `middleware.ts` guards `/action-items/*` and `/clients/*` (everything but
  `/login`, `/auth/*`, and static files).
- `src/lib/api.ts` is extended to attach `Authorization: Bearer <jwt>` server-side,
  read from the Supabase session cookie.
- Until then, the FastAPI endpoints in `main.py` aren't protected with
  `Depends(verify_session)`, so the frontend works unauthenticated.

## Scripts

```
npm run dev      # turbopack dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```
