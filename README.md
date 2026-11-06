# Reception Desk — PetClinic frontend

A single-screen reception workflow for a veterinary clinic, built on the **unmodified**
[Spring PetClinic REST](https://github.com/spring-petclinic/spring-petclinic-rest) backend.
React 18 · TypeScript (strict) · Vite · Mantine 7 · TanStack Query · React Hook Form + Zod · Vitest + Testing Library + MSW.

## Run it

Prerequisites: Node 20+, and Java 17+ **or** Docker for the backend.

```bash
# Terminal A — backend (pick one)
git clone https://github.com/spring-petclinic/spring-petclinic-rest.git
cd spring-petclinic-rest && ./mvnw spring-boot:run      # http://localhost:9966/petclinic
#   or: docker run -p 9966:9966 springcommunity/spring-petclinic-rest

# Terminal B — frontend
npm install
npm run dev                                             # http://localhost:5173
```

The Vite dev server proxies `/petclinic/*` to `localhost:9966` (no CORS setup, backend untouched).
Other backend URL: `VITE_API_BASE=https://host/petclinic/api npm run dev` (then the backend must allow CORS).

| Command              | Purpose                                                                                      |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `npm test`           | 82 tests against an in-memory fake of the API (no backend needed)                            |
| `npm run check`      | typecheck + ESLint (type-aware, a11y) + Prettier + tests + production build — the "done" bar |
| `docs/SMOKE_TEST.md` | 10-minute manual checklist against the **real** backend                                      |

## What the receptionist gets

One screen, three columns, no page navigation: **find owner → owner & pets → pet & visits**.

- **Search** by first name, surname, phone (any format), city or pet name, in any order — instant, local (the API can only filter by last name).
- **Create** an owner right from an empty search; **edit** owner and pet in dialogs; **add a pet**; **register a visit** in an always-visible inline form (optimistic, with rollback).
- Selection lives in the URL (`/owners/1/pets/2`): refresh, back/forward and deep links work.

## Architecture and main decisions

`api/` (only place that knows URLs; responses parsed with Zod) → `hooks/` (TanStack Query: keys, invalidation, optimistic update) → `features/` (UI per domain concept) → `components/` (generic adapters over Mantine). Layering is one-directional.

- **State model:** server state in the TanStack Query cache, selection in the URL, forms in React Hook Form, the rest is local `useState`. **No global store** — it would only duplicate the cache. One cache entry per owner feeds all three columns (`GET /owners/{id}` embeds pets and visits).
- **Local search** over a once-fetched, cached owner list: instant, no request per keystroke, works across fields. Trade-off: O(n) — fine for hundreds to low thousands of owners.
- **Zod schemas are the source of truth for types**; API responses are parsed, not cast. Form rules are copied from the OpenAPI schemas and **pinned by contract tests** against a vendored copy of the spec.
- **Invalidate instead of patching the cache** after writes; **optimistic only for visit registration** (hottest path, rolled back on failure). Mutations never auto-retry (POST is not idempotent).
- **Client-side conflict check** before saving an edit (the API has no `If-Match`); best-effort, not atomic.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (state model, testing strategy, UI-state matrix) · [docs/DECISIONS.md](docs/DECISIONS.md) (ADRs).

## Assumptions

1. Desktop/tablet use; narrow screens collapse to one column but are not tuned.
2. Backend security is off (default); no auth UI.
3. A visit has a calendar date only; default is today in the local time zone.
4. Owner edits send only the five `OwnerFields`; `pets` is read-only in the spec, so `PUT` cannot overwrite it.
5. Validation limits come from the OpenAPI schemas (spring-petclinic-rest master). **Re-check against the build you run** (`contract/README.md`).
6. Deleting owners, pets and visits is out of scope.
7. The clinic is small enough to list all owners (the API's `GET /owners` is unpaginated).

## API problems found

Full table with spec references: [docs/API_PROBLEMS.md](docs/API_PROBLEMS.md).

| #   | Problem                                                                                                              | Workaround                               | Proposed API change                           |
| --- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| 1   | `GET /owners` is unpaginated and embeds all pets and visits (`/v2/owners` is paginated in the spec, build-dependent) | Fetch once, cache, render ≤ 50 rows      | Use paginated list + lightweight summary      |
| 2   | Search is only `?lastName=` — no first name, phone, city or pet                                                      | Local search over the cached list        | `GET /owners?q=` across name/phone/city/pet   |
| 3   | Strict validation: phone digits-only ≤ 20 (no `+`, spaces), names letters-only ≤ 3 words                             | Same rules in the form, clear messages   | E.164 / free-form phone, looser name rules    |
| 4   | A visit has only a date (no time, vet, status)                                                                       | Order by date, then id                   | `visitDateTime`, `vetId`, `status`            |
| 5   | Validation errors are strings with JSON paths, not per-field keys                                                    | Banner with `detail` + messages          | RFC 9457 problem details with `errors{field}` |
| 6   | **No optimistic concurrency** on writes (`ETag` only on GET, `PUT` ignores `If-Match`)                               | Client-side conflict check (best-effort) | `If-Match` → `412 Precondition Failed`        |
| 7   | Two route families for the same resources, no canonical one                                                          | Owner-scoped routes only                 | One canonical path per resource               |
| 8   | Security off by default, demo user `admin/admin`                                                                     | Out of scope                             | Auth on outside the dev profile               |

## Known limitations

- App tests use an MSW fake. Contract tests pin its endpoints, request bodies and our validation rules to the spec, but **response bodies are not schema-validated** and the spec snapshot may differ from the build you run — hence the manual smoke test.
- Local search holds the whole list in memory (not for tens of thousands of owners).
- Edit conflicts are caught best-effort (check-then-write); only server-side `If-Match` closes the race.
- Closing a dialog discards typed data without a warning; no delete flows, duplicate-owner warning, auth UI, live updates, i18n or mobile tuning.
- Visually verified by tests and build only until you run the smoke test and look at light/dark and narrow widths.

The full UI-state matrix (what is handled, what is recorded) is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#ui-states-implemented-vs-recorded-limitations).

## What I would improve next

1. Validate fake **response bodies** against the spec (JSON Schema) or generate types and handlers from OpenAPI.
2. Playwright smoke test against the Dockerised backend in CI.
3. Unsaved-changes guard on dialogs; duplicate-owner warning; "recent owners".
4. Keyboard shortcuts (`/` search, `n` new owner); toasts.
5. Pagination or server-side search once the API offers it.
6. Auth behind a flag matching `petclinic.security.enable`; i18n.

## Repository map

`src/` application and tests · `contract/` OpenAPI snapshot used by contract tests · `docs/` architecture, decisions, API problems, requirements matrix, smoke test · `docs/ai/` AI usage artifacts · `AGENTS.md` instructions for AI coding assistants.
