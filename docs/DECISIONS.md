# Decision log (ADR-lite)

Short records of non-obvious choices — the ones an interviewer is most likely to probe.

## D1 — Server state in TanStack Query, no global store

**Context:** all non-trivial state originates from the API. **Decision:** query cache + URL + component state.
**Rejected:** Redux/Zustand (duplicates the cache), React Context-only (manual caching/loading/error plumbing).
**Consequence:** very little hand-written state code; invalidation rules live in one file (`hooks/queries.ts`).

## D2 — Derive pet from owner instead of fetching it separately

`GET /owners/{id}` already contains pets and visits. A separate `GET /pets/{id}` would create two sources of truth.
**Consequence:** opening a pet costs 0 requests; pet panel must verify the pet belongs to the owner (done).

## D3 — Invalidate, don't optimistically patch

The PUT response (200 + resource per the spec) does not include the embedded pets/visits graph we render, so merging it is error-prone. Invalidation is simplest and always correct. Optimistic UI is listed as next step.

## D4 — Parse API responses with Zod

TypeScript types vanish at runtime; a changed backend would otherwise yield silent `undefined`. Parsing costs microseconds and gives a precise failure point.

## D5 — Local search over a cached owner list

**Context:** OpenAPI offers only `GET /owners?lastName=` (and `/v2/owners` with pagination in newer builds). A receptionist searches by first name, phone, city or pet name.
**Decision:** fetch the full list once (TanStack cache, 30 s stale, refetch on focus/after writes) and search in memory (`lib/ownerSearch.ts`: folded, tokenised, ranked, phone-aware).
**Rejected:** a hybrid (server filter for single words, local otherwise): two code paths, a request per keystroke-pause, and inconsistent behaviour between inputs.
**Consequence:** instant results and no request per keystroke; O(n) payload/CPU. **Revisit when:** owner count makes the download slow -> server-side search (API #1/#2). Pure functions are the seam.

## D6 — No automatic retry for mutations

POST is not idempotent; retry on a timeout may duplicate a visit. Reads retry once.

## D7 — URL holds selection, local state holds search text

Selection benefits from deep links/refresh. Search text is transient and survives selection changes because `Workspace` owns it.

## D8 — Errors never swallowed, but never thrown into the void

Mutation errors render inline and keep user input. `handleSubmit` handlers catch the rethrow _because_ the error is displayed from mutation state
(otherwise: unhandled promise rejection — found by a test, see `docs/ai/AI_LOG.md`).

## D9 — Mantine for UI, behind thin adapters

Chosen over MUI/Chakra/Tailwind: first-class accessibility primitives, theme tokens, zero build config, native dark mode.
`Dialog` and `SelectableRow` isolate the library from features. `NativeSelect` and `type=date` inputs were kept native on purpose (mobile-friendly, work with `register`).

## D10 — Optimistic updates only where they are visible

Visit registration: yes (inline form, instant feedback, rollback restores the cache snapshot, `cancelQueries` prevents a racing refetch from erasing the optimistic entry).
Owner/pet edits: no — they save behind a modal, so the user would not see the optimism.

## D11 — Client-side conflict detection

No ETag (API #6). Edit dialogs snapshot the record on open; on save the client refetches and compares editable fields; mismatch -> `ConflictError`, nothing is written, the cache is refreshed.
**Limit:** check-then-write is not atomic. Proposed real fix: `ETag` + `If-Match` -> 412.

## D12 — Prime the cache explicitly, never via `initialData`

`initialData` is re-applied by TanStack Query to an errored query that has no data, which replaced a real 404 with stale list data (caught by test `seeding does not mask failures`).
`usePrimeOwner` writes once at selection time and preserves the original `updatedAt`, so old data still triggers an immediate background refetch.

## D13 — Zustand considered for visit drafts, rejected for now

Unsaved visit text is lost when the receptionist switches pets. A store would fix that but adds a second source of truth for one small gain. Revisit if users report it.

## D14 — Validation rules come from the OpenAPI schemas, not from memory

First draft assumed phone <= 10 digits (wrong: <= 20, found by reading the spec). Rules now mirror `OwnerFields`/`PetFields`/`VisitFields` and are unit-tested.

## D15 — Contract tests against a vendored OpenAPI snapshot

The fake backend is what most tests rely on, so its fidelity matters. `contract.test.ts` checks the fake's endpoints and our form rules against the spec's own regexes and limits, and fails if the backend gains a real search endpoint.
**Not covered:** response-body schemas; differences between the snapshot and the build actually run. **Proved useful immediately:** a deliberate regression of the phone rule is caught (see README).
