# AI usage log

> **Status of this file:** drafted by the AI assistant from the real working sessions. The prompts in [`prompts.md`](prompts.md) are the
> author's actual messages. **The author must read this, correct anything that is not true for them, and add their own sessions in §8.**
> Do not claim anything in the interview that you cannot explain.

## 1. Tools and workflow

- **Claude** in the claude.ai web app with its code-execution sandbox (Node 20): wrote files, ran `tsc`, `vitest`, `eslint`, `prettier`,
  `vite build`, and downloaded the public OpenAPI file from GitHub. _[AUTHOR: add the model name shown in the app and any other tool used.]_
- **Inputs shared with the AI:** the public PetClinic README, the public assignment text, the public OpenAPI file. No secrets, personal
  data or employer material.
- **Loop:** author prompt → AI proposes and implements → AI runs the checks → author reviews and redirects. Verification was
  **mechanical** (tests, type checker, linter, spec comparison, mutation checks), not by reading code and trusting it.

## 2. Sessions

| #   | Author prompt                          | What the AI produced                                                                                                                                                       | Author decision / redirect                                                                      | Evidence                        |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------- |
| 1   | architecture brief                     | Stack, layering, API client, hooks, UI, MSW fake, tests, docs                                                                                                              | Accepted the architecture                                                                       | 28 tests                        |
| 2   | "which state management…"              | Explanation: four kinds of state, each in the fitting tool; alternatives (Redux, Zustand, Jotai, Context, SWR, XState) and why not now                                     | Q&A only, no code                                                                               | ADR D1                          |
| 3   | "beautify using some framework"        | Replaced hand-rolled CSS with Mantine 7 behind thin adapters                                                                                                               | Author asked for a framework; AI proposed Mantine (rationale: a11y primitives, no build config) | ADR D9, 37 tests                |
| 4   | "check if state layer can be enhanced" | Review found 4 weaknesses → optimistic visit registration, conflict check, explicit cache priming, targeted invalidation. Rejected Zustand for drafts and optimistic edits | Accepted the review                                                                             | ADR D10–D13                     |
| 5   | "no api to search owner… local search" | Read the real OpenAPI file, found only a `lastName` filter exists, **agreed**, replaced the hybrid search with fully local search; corrected earlier facts                 | **Author's decision**: local search. AI verified the spec and implemented                       | ADR D5, 63 tests                |
| 6   | "continue"                             | Contract tests against the vendored spec; mutation-checked                                                                                                                 | AI picked the highest-value open item from its own limitations list                             | ADR D15, 80 tests               |
| 7   | "cross check all… interview guide"     | Full audit (see §3), fixes, short README, requirements matrix, smoke test, this log, `AGENTS.md`, interview guide                                                          | Author asked for the audit                                                                      | 82 tests, `npm run check` green |

## 3. Where the AI was wrong, and how it was caught

This is the most useful part of the log: every row is a claim or change that looked fine and was not.

| #   | AI claim / change                                                                     | Reality                                                                                     | Caught by                          | Fix                                                                 |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| 1   | Phone is at most 10 digits (stated from memory)                                       | Spec: at most **20**                                                                        | Reading `openapi.yml`              | Form rule fixed; contract test pins it (mutation-checked)           |
| 2   | Names are free text                                                                   | Spec: letters-only pattern, ≤ 3 words, ≤ 30                                                 | Reading the spec                   | Rules + contract corpus test                                        |
| 3   | `PUT` returns 204                                                                     | Spec: 200 + resource                                                                        | Reading the spec                   | Docs corrected; client tolerant of any 2xx                          |
| 4   | Error bodies are inconsistent                                                         | Spec: `ProblemDetail` with `schemaValidationErrors`                                         | Reading the spec                   | Client shows `detail` + validation messages                         |
| 5   | "The API has no pagination"                                                           | Spec also defines a paginated `/v2/owners`                                                  | Reading the spec                   | Documented as build-dependent                                       |
| 6   | "No ETag in the API"                                                                  | `ETag` exists on GET responses only; `PUT` has no `If-Match`                                | Reading the spec                   | Conflict check kept as workaround                                   |
| 7   | `PUT /pets/{id}` body includes `id`                                                   | Request schema `PetFields` has no `id`                                                      | **Final audit** (spec cross-check) | `id` removed; body-contract test added (mutation-checked)           |
| 8   | `mutateAsync` inside RHF `handleSubmit` is fine                                       | Rejections escaped as unhandled promise rejections                                          | A test run                         | try/catch in the three forms; documented in `AGENTS.md`             |
| 9   | `initialData` gives instant owner selection                                           | TanStack re-applies it to an errored query, **masking a 404**                               | A test                             | Explicit `usePrimeOwner`; regression test                           |
| 10  | Search results held a stale DOM node in a test                                        | List unmounted between queries (flicker)                                                    | Flaky test                         | `keepPreviousData` (later removed with local search)                |
| 11  | Typing `oneil` finds "O'Neil" (implied by "ignores apostrophes")                      | It did not; my own test recorded the gap as "documented behaviour"                          | Self-review of that test           | Index both word forms + normalise the query                         |
| 12  | "Bundle grows ≈ 170 kB with Mantine"                                                  | Measured: ≈ +75 kB gzip                                                                     | `vite build` output                | README corrected                                                    |
| 13  | "12 unit tests" for search; "75 tests" in README                                      | 9 and 82                                                                                    | Counting from the JSON reporter    | Numbers corrected                                                   |
| 14  | Pet **edit** is covered                                                               | Only the _conflict_ path was tested, not the happy path; owner-list error was also untested | Requirement-vs-test cross-check    | Two tests added                                                     |
| 15  | `npm run lint` exists                                                                 | ESLint was not installed or configured                                                      | Final audit                        | ESLint (type-aware + a11y) + Prettier added; 4 findings fixed       |
| 16  | Repo contained three unused components and a duplicated shim block in `test/setup.ts` | Dead code                                                                                   | Final audit (unused-module scan)   | Deleted; shims consolidated                                         |
| 17  | `mkdir -p src/{a,b}` created the directories                                          | `/bin/sh` does not expand braces; files silently not written                                | stderr / `ls`                      | Re-created; trap recorded in `AGENTS.md`                            |
| 18  | README is "short"                                                                     | 23 KB                                                                                       | Requirement-vs-README cross-check  | Split into README + `docs/ARCHITECTURE.md` + `docs/API_PROBLEMS.md` |

**Pattern worth stating in the interview:** the AI's _facts about the external system_ were its weakest output (rows 1–7), its _code_ was mostly
sound but needed tests to expose subtle runtime behaviour (rows 8–11), and its _meta-claims_ (counts, sizes, "short", "covered") were wrong
until measured (rows 12–16). The countermeasure was always the same: replace trust with something executable.

## 4. Decisions and who owned them

| Decision                                             | Proposed by | Notes                                                                                   |
| ---------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------- |
| Local owner search (instead of hybrid server/client) | **Author**  | Correct: the API can only filter by last name. AI had built a hybrid and was redirected |
| Single-screen, three-column workflow                 | AI          | Accepted                                                                                |
| Server state in TanStack Query, no global store      | AI          | Accepted; reviewed against alternatives in session 2                                    |
| Mantine as UI library                                | AI          | Accepted after the author asked for "some framework"                                    |
| Optimistic visit registration; conflict check        | AI          | Accepted after the state-layer review                                                   |
| Rejecting Zustand for visit drafts                   | AI          | Accepted; recorded as ADR D13 with the revisit condition                                |

## 5. Still unverified (the AI could not do these)

- **Running against the real PetClinic backend** (sandbox has no Java/Docker) → `docs/SMOKE_TEST.md`, results to be filled by the author.
- **Looking at the UI in a browser** (light/dark, narrow width).
- **Response-body validation against the spec** and **spec snapshot vs. the build actually run**.

## 6. Reusable artifacts produced with the AI

| Artifact                       | Path                                | Why it is real work, not paperwork                                                   |
| ------------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------ |
| Steering file for AI agents    | `AGENTS.md`                         | Encodes the rules and the traps in §3 so the next agent session does not repeat them |
| Contract tests + spec snapshot | `src/contract.test.ts`, `contract/` | Born from §3 rows 1–7; mutation-checked                                              |
| MSW fake of the API            | `src/test/handlers.ts`              | Every endpoint it simulates is checked against the spec                              |
| Decision records               | `docs/DECISIONS.md`                 | Context, alternatives, consequences                                                  |
| Verbatim prompts               | `docs/ai/prompts.md`                |                                                                                      |
| Manual smoke checklist         | `docs/SMOKE_TEST.md`                | Fills the gap automation cannot                                                      |

## 7. Responsible-use notes

No confidential input was given to the tool. Output was never accepted on trust: each claim in §3 was replaced by an executable check.
The author is responsible for the result and must be able to explain all of it (see the interview guide, kept outside the repository).

## 8. Author's own sessions

_Add here, for every other AI interaction (other tools, IDE assistants, extra chats): date · tool · prompt · what you accepted · what you
rejected or changed · why. Export full chat transcripts to `docs/ai/transcript/` (for claude.ai: open the chat → export/copy → save as
`session-1.md`). Delete this paragraph when done._
