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
PUT returns 204 (nothing to merge). Invalidation is simplest and always correct. Optimistic UI is listed as next step.

## D4 — Parse API responses with Zod
TypeScript types vanish at runtime; a changed backend would otherwise yield silent `undefined`. Parsing costs microseconds and gives a precise failure point.

## D5 — Search strategy
Server `lastName` prefix filter is cheap but too narrow for a reception desk. Digits/multi-word terms fall back to client filtering of the full list (O(n)).
**Revisit when:** owner count makes the full list expensive → needs API change (#2, #1).

## D6 — No automatic retry for mutations
POST is not idempotent; retry on a timeout may duplicate a visit. Reads retry once.

## D7 — URL holds selection, local state holds search text
Selection benefits from deep links/refresh. Search text is transient and survives selection changes because `Workspace` owns it.

## D8 — Errors never swallowed, but never thrown into the void
Mutation errors render inline and keep user input. `handleSubmit` handlers catch the rethrow *because* the error is displayed from mutation state
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
