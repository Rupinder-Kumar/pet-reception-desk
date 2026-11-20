# AGENTS.md — instructions for AI coding assistants

Works with Claude Code, Cursor, Copilot agents and similar. Project: **Reception Desk**, a React + TypeScript frontend for the
unmodified Spring PetClinic REST backend (external; **never change it**).

This file is enough for most tasks. The `docs/` files are written for people: open one only when the task needs it, and read
the relevant section, not the whole file.

| When you are…                             | Read                                                        |
| ----------------------------------------- | ----------------------------------------------------------- |
| changing an architecture rule below       | `docs/DECISIONS.md` (find the ADR by number; add a new one) |
| working on owner search                   | `docs/ARCHITECTURE.md` → "Local search (how it works)"      |
| hitting surprising backend behaviour      | `docs/API_PROBLEMS.md`                                      |
| changing API calls or payloads            | `contract/openapi.yml` (only the paths/schemas you touch)   |
| asked to check a requirement              | `docs/REQUIREMENTS_MATRIX.md` (the matching section)        |
| testing manually against the real backend | `docs/SMOKE_TEST.md`                                        |

`README.md`, `docs/ai/AI_LOG.md` and `docs/ai/prompts.md` are for human readers; skip them unless asked.

## Commands

| Command          | Use                                                                 |
| ---------------- | ------------------------------------------------------------------- |
| `npm run dev`    | dev server on :5173, proxies `/petclinic` to `localhost:9966`       |
| `npm run check`  | **definition of done**: typecheck + lint + prettier + tests + build |
| `npm test`       | all tests (no backend needed, MSW fake)                             |
| `npm run format` | Prettier (printWidth 140, single quotes)                            |

## Architecture rules (changing one needs an ADR in `docs/DECISIONS.md`)

1. **Layers:** `components` ← `features` → `hooks` → `api`. UI never calls `fetch` or builds URLs. Only `api/http.ts` calls `fetch`; only `api/petclinic.ts` knows paths and payloads.
2. **Server state lives only in TanStack Query** (`hooks/queries.ts`). Never copy server data into `useState`, context or a store. Selection lives in the URL, form state in React Hook Form.
3. **Types come from Zod** (`z.infer` in `api/schemas.ts`). Every response is parsed. No `any`; `import type` for types; a cast is allowed only where `unknown` JSON is narrowed.
4. **Form rules mirror the OpenAPI schemas.** Source of truth: `contract/openapi.yml`, not memory. If you change a rule, `src/contract.test.ts` must still pass.
5. **Writes:** never auto-retry (POST is not idempotent); invalidate through the helpers in `queries.ts`; optimistic updates only for visit registration; owner/pet edits go through the conflict check.
6. **Errors** are rendered from query/mutation state. Never swallow one silently; never rethrow into RHF's `handleSubmit` (see traps).
7. **UI:** Mantine only through the adapters (`Dialog`, `SelectableRow`, `QueryState`) or theme tokens in `theme.ts`. Every input has a label; errors use `role="alert"`.

## Testing rules

- Prefer workflow tests (`App.test.tsx`, `state.test.tsx`) via `renderApp()` and the MSW fake in `src/test/handlers.ts`. Query by role/label/text, never by test id or CSS class. No sleeps: `findBy*` / `waitFor`.
- A new API call needs (a) a handler in the fake (it must exist in the spec — the contract test checks), and (b) a request-body assertion in `contract.test.ts`.
- **Mutation-check every new contract test:** break the code on purpose, watch it fail, restore.

## Known traps (each cost real time)

- TanStack Query v5 re-applies `initialData` to an errored query with no data, which **hides 404s**. Use `usePrimeOwner` (explicit write) instead.
- `mutateAsync` inside `handleSubmit` rethrows → unhandled promise rejection. Catch it (the error is shown from mutation state).
- Mantine in jsdom needs `matchMedia`/`ResizeObserver` shims and `MantineProvider env="test"` (`src/test`).
- Never display dates via `new Date('yyyy-mm-dd')` (UTC shift). Use `lib/date.ts`.
- Backend facts: phone ≤ 20 digits; names letters-only ≤ 30; `PUT` returns 200 + body; errors are `ProblemDetail`; `PUT /pets` body is `PetFields` (no `id`).
- Shell: `mkdir -p a/{b,c}` does not expand under `/bin/sh`; check that files were really written.

## Don'ts

No backend changes · no global store without an ADR · no hard-coded host/port · no new dependency without a line in `docs/DECISIONS.md` ·
**no secrets, personal data or employer-confidential material in prompts**.
