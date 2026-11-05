# Reception Desk — PetClinic frontend

A single-screen reception workflow for a veterinary clinic, built on the unmodified
[Spring PetClinic REST](https://github.com/spring-petclinic/spring-petclinic-rest) backend.
React 18 · TypeScript (strict) · Vite · **Mantine 7** (UI) · TanStack Query · React Hook Form + Zod · Vitest + Testing Library + MSW.

## Run it

Prerequisites: Node 20+, and either Java 17+ **or** Docker for the backend.

```bash
# 1. Backend (terminal A) — pick one
git clone https://github.com/spring-petclinic/spring-petclinic-rest.git
cd spring-petclinic-rest && ./mvnw spring-boot:run          # http://localhost:9966/petclinic
#   or:  docker run -p 9966:9966 springcommunity/spring-petclinic-rest

# 2. Frontend (terminal B)
npm install
npm run dev                                                 # http://localhost:5173
```

The Vite dev server proxies `/petclinic/*` to `localhost:9966`, so there is no CORS setup and **the backend is untouched**.
Different backend URL: `VITE_API_BASE=https://host/petclinic/api npm run dev` (this bypasses the proxy, so the backend must allow CORS).

| Command | Purpose |
|---|---|
| `npm test` | 37 tests (unit + workflow + state-layer) against an in-memory MSW fake of the API — no backend needed |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run build` | typecheck + production bundle |

Manual smoke test against the real backend (the automated tests use a fake, see *Limitations*):
search `Davis` → open Betty Davis → open pet → register a visit → add a pet → edit owner phone → create a new owner.

## The workflow (UX decision)

One screen, three columns, no page navigation:

```
┌ Find owner ────┐ ┌ Owner & pets ───────┐ ┌ Pet, visits ──────────────┐
│ search box     │ │ details  [Edit]     │ │ details  [Edit]           │
│ [+ New owner]  │ │ pets  [+ Add pet]   │ │ Register visit (inline)   │
│ results        │ │                     │ │ Previous visits (newest↑) │
└────────────────┘ └─────────────────────┘ └───────────────────────────┘
```

* The receptionist keeps the customer's context visible while working: results stay while a pet is open.
* Frequent action (register visit) is an **inline form**, always visible. Rare actions (create/edit owner, add/edit pet) are **dialogs**, so context is not lost.
* Search accepts what a customer actually says: surname, full name, or phone number.
* Selection lives in the **URL** (`/owners/:id/pets/:petId`): refresh, back/forward and deep links work.

## Architecture

```
src/
  api/          http.ts (fetch wrapper, ApiError)  schemas.ts (Zod → domain types)
                forms.ts (input validation)        petclinic.ts (the ONLY module that knows URLs/payloads)
  hooks/        queries.ts — TanStack Query hooks, query keys, invalidation rules
  features/     owners/ pets/ visits/ — UI by domain concept (panel + form per concept)
  components/   Dialog (Mantine Modal adapter), QueryState, SelectableRow — generic, domain-free
  theme.ts      single place for visual identity (Mantine theme tokens)
  Workspace.tsx layout + URL ⇄ selection;  App.tsx shell/providers/routes;  test/ MSW fake API + helpers
```

Layering is one-directional: `components` ← `features` → `hooks` → `api`. UI never builds URLs or touches `fetch`.

### Main technical decisions (and why)

| Decision | Reason / trade-off |
|---|---|
| **TanStack Query for server state; no global store** | All state is either server data (cache) or tiny local UI state (open dialog, search text). Redux/Zustand would only duplicate the cache. |
| **One cache entry per owner** (`GET /owners/{id}` embeds pets + visits) | Owner panel, pet list and pet panel all *derive* from it. No denormalised copies to keep in sync. |
| **Invalidate after mutation instead of patching the cache** | Always consistent (PUTs return 204 with no body anyway). Cost: one extra GET per write — fine at this scale. Optimistic updates are an option later. |
| **Zod schemas are the source of truth for types** and responses are *parsed*, not cast | Types cannot drift from runtime checks; a contract change fails at the boundary with a clear error (`502 Unexpected response`) instead of `undefined` deep in the UI. |
| **Form validation mirrors backend rules** (React Hook Form + Zod) | Immediate feedback; backend stays authoritative and its error text is displayed if it still rejects. |
| **URL as the selection state** | Free refresh/back/deep-link; IDs from the URL are validated (`/^\d+$/`) and pet ownership is checked. |
| **Vite proxy** | Same-origin in dev, no backend change. |
| **Mantine 7 for UI** (theme tokens, AppShell, Modal, form inputs, Timeline, dark mode) | Accessible primitives for free (focus trap/restore in Modal, labelled inputs, `role=alert`) and no build config. Features depend on it only through thin adapters (`Dialog`, `SelectableRow`), so swapping the library touches few files. Trade-off: bundle size (measured: 94 → 139 kB JS gzip, plus 29 kB CSS gzip, i.e. ≈ +75 kB vs. the plain-CSS version) — acceptable for an internal desk tool. |
| **Optimistic visit registration** with rollback | The most frequent action should feel instant. Entry gets a temporary negative id, rendered as "Saving…", then replaced by the server record. Not applied to edits: they happen behind a dialog, so optimism would be invisible. |
| **Client-side conflict check on edits** (`ConflictError`) | Workaround for API #6 (no ETag): before PUT, re-read the record and refuse if it differs from what the dialog opened with. A small race window remains; only server-side `If-Match` closes it. |
| **Explicit cache priming on select** (`usePrimeOwner`) | Search results already contain the full owner, so selection renders instantly and refreshes in the background. Done as an explicit write, not `initialData` (which silently masked a 404 — found by a test). |
| **Targeted invalidation** | A visit marks lists stale without refetching them; an owner edit refetches them. Saves requests without serving wrong data. |
| **Mutations never auto-retry** | POSTs are not idempotent — a retry could create duplicate visits/owners. Reads retry once. |
| **Search**: server-side for a single surname word, client-side filter otherwise | See API problem #2. |
| **Errors are rendered from mutation state, never swallowed silently** | Failed saves keep the dialog open and the typed text intact. |

### Testing strategy
* **Workflow tests (`App.test.tsx`)** — the receptionist's journeys through the real UI against an MSW fake: search→pet→visit, deep link, create owner, add pet, edit owner, validation blocks the request, server error keeps input, load error + retry, foreign pet id. Highest value per test: they exercise components, hooks, cache invalidation and API client together.
* **Unit tests** — HTTP client (204, error mapping, contract violation, network failure), search strategy (server vs client path), form schemas, date helper, visit sorting.
* Not tested (deliberately): CSS, visual layout, a11y beyond role/label queries, real-backend E2E (see below).

## Assumptions
1. The receptionist uses a desktop/tablet; narrow screens collapse to one column but are not tuned.
2. Security is disabled (backend default). With `petclinic.security.enable=true` Basic auth would be needed; not implemented.
3. Visit `date` is a calendar date (no time). Default = today (local time zone, not UTC).
4. Editing an owner sends only the five owner fields, not the pets. *(Verify against the running version: if `PUT /owners/{id}` replaces the pet collection, this would be a data-loss risk — see API #9.)*
5. Description max length 255 (taken from the DB schema); backend is authoritative.
6. Deleting owners/pets/visits is out of scope (not requested; destructive actions need confirmation UX).
7. Data volume is small enough to list all owners (API has no pagination).

## API problems found
> Found by reading the README/OpenAPI and source. Items marked ⚠ should be re-confirmed against your running instance before the interview.

| # | Problem | Workaround | Proposed API change |
|---|---|---|---|
| 1 | `GET /owners` is **unpaginated** | Debounced search; list everything only when the term is empty | `page`/`size`/`sort` + total count header |
| 2 | Search only by `lastName` prefix — not by first name, phone, or pet | Single word → server filter; digits/full name → fetch all and filter client-side (O(n)) | `GET /owners?q=` over name/phone/pet, or dedicated filters |
| 3 | Telephone must be ≤10 digits, digits only: rejects `+`, spaces, international numbers | Same rule in the form with a clear message | Accept E.164 / free text with a sane pattern |
| 4 | Inconsistent write responses: POST → 201 + body, PUT → 204 empty | Client handles both; refetch after PUT | PUT returns the updated resource (or ETag + 200) |
| 5 | Error body shape is not uniform / no per-field validation details | Probe `message`/`detail`/`title`/`exMessage`; show one message | RFC 9457 `application/problem+json` with `errors[field]` |
| 6 | **No optimistic concurrency** (no ETag/version): two receptionists editing the same owner → silent last-write-wins | None (documented risk) | `ETag` + `If-Match`, 412 on conflict |
| 7 | Visits have only a date: no time, vet, status | Show date only | Add `visitDateTime`, `vetId`, `status` |
| 8 | Path *and* body both carry owner/pet ids (`PUT /owners/{o}/pets/{p}` + `id` in body) → can disagree | Client always sends consistent ids | Take ids from the path only |
| 9 ⚠ | Owner PUT semantics around nested `pets` unclear | Send owner fields only | Document/enforce that PUT never modifies children |
| 10 | Pet and visit aggregates are reachable only via the owner for writes, but top-level `/pets`, `/visits` also exist → two ways to do one thing | Use owner-scoped routes only | Pick one canonical resource path |

## Known limitations
* **Fake vs real contract:** automated tests use an MSW fake. It can drift from the real backend; the manual smoke test above covers that gap. Next step: contract tests generated from the OpenAPI spec.
* No pagination / virtualisation of search results (API #1).
* Optimistic only for visit registration; owner/pet edits wait for the server (shown as a pending button).
* Conflict detection is best-effort (check-then-write); two saves within milliseconds can still collide (API #6).
* The UI was verified by automated tests and a production build, **not yet by eye in a browser** — do a visual pass (light/dark, narrow width) before the demo.
* No authentication UI; no delete flows; no duplicate-owner detection (same name + phone) — a real receptionist would want a warning.
* Concurrent edits can silently overwrite (API #6).
* Only the English UI; dates shown in ISO format.
* Visual design is functional, not polished; no mobile tuning.
* Search client-side fallback fetches all owners per keystroke-pause (cached 10 s).

## What I would improve next
1. Contract tests from `/v3/api-docs` (generate types + MSW handlers from OpenAPI) to remove fake/real drift.
2. Playwright smoke test against the Dockerised backend in CI.
3. Duplicate-owner warning on create; "recent owners" shortcut.
4. Keyboard shortcuts (`/` focus search, `n` new owner).
5. Toast notifications; optimistic edits with an in-place (non-modal) editor; unsaved-visit-draft preservation when switching pets (would justify a small Zustand slice).
6. Pagination once the API supports it; virtualised list.
7. Auth (Basic/OIDC) behind a flag matching `petclinic.security.enable`.
8. i18n and localised date formatting.
