# Architecture

> Detail behind the README. Decision records with context/alternatives are in [DECISIONS.md](DECISIONS.md).

## The workflow (UX decision)

One screen, three columns, no page navigation:

```
┌ Find owner ────┐ ┌ Owner & pets ───────┐ ┌ Pet, visits ──────────────┐
│ search (local)   │ │ details  [Edit]     │ │ details  [Edit]           │
│ [+ New owner]  │ │ pets  [+ Add pet]   │ │ Register visit (inline)   │
│ results        │ │                     │ │ Previous visits (newest↑) │
└────────────────┘ └─────────────────────┘ └───────────────────────────┘
```

- The receptionist keeps the customer's context visible while working: results stay while a pet is open.
- Frequent action (register visit) is an **inline form**, always visible. Rare actions (create/edit owner, add/edit pet) are **dialogs**, so context is not lost.
- Search accepts what a customer actually says — first name, surname, phone number (any formatting), city or pet name, in any order — and updates on every keystroke (see _Local search_).
- Selection lives in the **URL** (`/owners/:id/pets/:petId`): refresh, back/forward and deep links work.

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

| Decision                                                                               | Reason / trade-off                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TanStack Query for server state; no global store**                                   | All state is either server data (cache) or tiny local UI state (open dialog, search text). Redux/Zustand would only duplicate the cache.                                                                                                                                                                                                                                                                          |
| **One cache entry per owner** (`GET /owners/{id}` embeds pets + visits)                | Owner panel, pet list and pet panel all _derive_ from it. No denormalised copies to keep in sync.                                                                                                                                                                                                                                                                                                                 |
| **Invalidate after mutation instead of patching the cache**                            | Always consistent and independent of what a given build's PUT returns (the spec says 200 + resource; the client ignores the body). Cost: one extra GET per write — fine at this scale. Optimistic updates are an option later.                                                                                                                                                                                    |
| **Zod schemas are the source of truth for types** and responses are _parsed_, not cast | Types cannot drift from runtime checks; a contract change fails at the boundary with a clear error (`502 Unexpected response`) instead of `undefined` deep in the UI.                                                                                                                                                                                                                                             |
| **Form validation mirrors backend rules** (React Hook Form + Zod)                      | Immediate feedback; backend stays authoritative and its error text is displayed if it still rejects.                                                                                                                                                                                                                                                                                                              |
| **URL as the selection state**                                                         | Free refresh/back/deep-link; IDs from the URL are validated (`/^\d+$/`) and pet ownership is checked.                                                                                                                                                                                                                                                                                                             |
| **Vite proxy**                                                                         | Same-origin in dev, no backend change.                                                                                                                                                                                                                                                                                                                                                                            |
| **Mantine 7 for UI** (theme tokens, AppShell, Modal, form inputs, Timeline, dark mode) | Accessible primitives for free (focus trap/restore in Modal, labelled inputs, `role=alert`) and no build config. Features depend on it only through thin adapters (`Dialog`, `SelectableRow`), so swapping the library touches few files. Trade-off: bundle size (measured: 94 → 139 kB JS gzip, plus 29 kB CSS gzip, i.e. ≈ +75 kB vs. the plain-CSS version) — acceptable for an internal desk tool.            |
| **Optimistic visit registration** with rollback                                        | The most frequent action should feel instant. Entry gets a temporary negative id, rendered as "Saving…", then replaced by the server record. Not applied to edits: they happen behind a dialog, so optimism would be invisible.                                                                                                                                                                                   |
| **Client-side conflict check on edits** (`ConflictError`)                              | Workaround for API #6 (no ETag): before PUT, re-read the record and refuse if it differs from what the dialog opened with. A small race window remains; only server-side `If-Match` closes it.                                                                                                                                                                                                                    |
| **Explicit cache priming on select** (`usePrimeOwner`)                                 | Search results already contain the full owner, so selection renders instantly and refreshes in the background. Done as an explicit write, not `initialData` (which silently masked a 404 — found by a test).                                                                                                                                                                                                      |
| **Targeted invalidation**                                                              | A visit marks lists stale without refetching them; an owner edit refetches them. Saves requests without serving wrong data.                                                                                                                                                                                                                                                                                       |
| **Mutations never auto-retry**                                                         | POSTs are not idempotent — a retry could create duplicate visits/owners. Reads retry once.                                                                                                                                                                                                                                                                                                                        |
| **Local search** over a once-fetched, cached owner list (`lib/ownerSearch.ts`)         | The API's only filter is `lastName`, far too narrow for a desk (no phone/first name/city/pet). Local search is instant, makes no request per keystroke, and works across fields. Trade-off: O(n) memory/CPU and the full list (with pets+visits) is downloaded — fine for hundreds to low thousands of owners; beyond that a server-side search is required (API #1/#2). The pure functions are the seam to swap. |
| **Form rules copied from the OpenAPI schemas**                                         | Names: letters (+ space/hyphen/apostrophe, ≤3 words, ≤30), phone: digits ≤20, address ≤255, city ≤80, visit description ≤255, pet name ≤30.                                                                                                                                                                                                                                                                       |
| **Errors are rendered from mutation state, never swallowed silently**                  | Failed saves keep the dialog open and the typed text intact.                                                                                                                                                                                                                                                                                                                                                      |

### Testing strategy

- **Workflow tests (`App.test.tsx`)** — the receptionist's journeys through the real UI against an MSW fake: search→pet→visit, deep link, create owner, add pet, edit owner, validation blocks the request, server error keeps input, load error + retry, foreign pet id. Highest value per test: they exercise components, hooks, cache invalidation and API client together.
- **Unit tests** — HTTP client (empty/204 bodies, `ProblemDetail` mapping, contract violation, network failure), local search ranking/matching, form schemas (spec rules), date helpers, visit sorting.
- **Contract tests (`src/contract.test.ts`)** against a vendored copy of the backend's OpenAPI document (`contract/openapi.yml`, refresh steps in `contract/README.md`): every endpoint the test fake simulates must exist in the spec; our form rules must accept/reject exactly what the spec's own regexes and length limits do (checked on a corpus of inputs); required fields must match; `GET /owners` must still offer only `lastName` (if the backend adds a real search, the test fails and the local-search decision must be revisited). Mutation-checked: re-introducing the original wrong "phone ≤ 10 digits" rule makes it fail.
- Not tested (deliberately): CSS, visual layout, a11y beyond role/label queries, real-backend E2E (covered by the manual [smoke test](SMOKE_TEST.md); named in the README limitations).

## Local search (how it works)

- `GET /owners` is fetched once (cached 30 s, refreshed on window focus and after owner create/edit); results are filtered in memory.
- Every whitespace-separated token must match; `franklin george`, `george fran` and `fran geo` all find _George Franklin_.
- Tokens of digits/phone punctuation match the telephone's digits (`(608) 555-1023`, `1023`).
- Other tokens match last name (best rank) → first name / pet name → city, by word prefix, then by substring. Accents and apostrophes are ignored (`jose` → José, `oneil` → O'Neil).
- Rendering is capped at 50 rows with a visible count ("12 of 340 owners"); typing more narrows the list.
- Covered by 9 unit tests (`ownerSearch.test.ts`) and workflow tests that assert **typing triggers no additional API request**.

## UI states: implemented vs. recorded limitations

| State                                                                    | Status                                  | Where / evidence                                                                                |
| ------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Nothing selected yet                                                     | Implemented                             | `Workspace` placeholders                                                                        |
| Owner list loading / load error with Retry / recovery                    | Implemented                             | `OwnerSearch`; test _shows an error when the owner list cannot be loaded and recovers on Retry_ |
| No search results (+ call to action to register)                         | Implemented                             | `OwnerSearch`; test _creates a new owner when none exists_                                      |
| Owner loading / load error with Retry                                    | Implemented                             | `OwnerPanel`; test _shows an error with retry when the owner cannot be loaded_                  |
| Deep link to unknown or foreign pet                                      | Implemented                             | `PetPanel`; test _rejects a pet id that does not belong to the owner_                           |
| Owner has no pets / pet has no visits                                    | Implemented                             | `OwnerPanel`, `VisitList` (no dedicated test)                                                   |
| Client-side validation errors (inline, no request sent)                  | Implemented                             | forms; test _shows validation errors and does not call the API_                                 |
| Saving (button loader; optimistic "Saving…" visit)                       | Implemented                             | test _shows a new visit immediately (optimistic)_                                               |
| Server rejects a save (banner, input kept, optimistic entry rolled back) | Implemented                             | test _surfaces a server error from visit registration_                                          |
| Edit conflict (someone else changed the record)                          | Implemented (best-effort)               | state tests for owner and pet                                                                   |
| Network down / backend unreachable                                       | Implemented (message), unit-tested only | `http.ts` status 0                                                                              |
| Pet types loading / failing inside the pet dialog                        | Implemented, **not tested**             | `PetForm`                                                                                       |
| Unsaved-changes warning when closing a dialog                            | **Limitation**                          | Escape/Cancel discards typed data silently                                                      |
| Authentication / expired session                                         | **Limitation**                          | backend security is off by default                                                              |
| Delete owner / pet / visit                                               | **Limitation**                          | out of scope; needs confirmation UX                                                             |
| Duplicate-owner warning (same name + phone)                              | **Limitation**                          |                                                                                                 |
| Live updates when a colleague adds an owner                              | **Limitation**                          | list refreshes on focus/after 30 s only                                                         |
| Pagination / virtualised list                                            | **Limitation**                          | API #1; rendering is capped at 50 rows                                                          |
| Mobile-tuned layout, i18n                                                | **Limitation**                          | single column on narrow screens, English only                                                   |
