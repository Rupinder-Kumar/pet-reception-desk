# Requirements → implementation → evidence

Every line of the assignment, where it is implemented, and what proves it. **Evidence = a named automated test unless stated.**
Status at time of writing: `npm run check` is green (typecheck, ESLint, Prettier, **82 tests**, production build).

## A. What the receptionist must be able to do

| Requirement                                      | Implementation                                           | Evidence (test names abbreviated)                                                                                                                |
| ------------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Find an owner                                    | `OwnerSearch`, `lib/ownerSearch.ts` (local, multi-field) | `ownerSearch.test` (9); `state.test` _local search_: filters locally / by phone, pet name, city, first name, reversed full name / match count    |
| Create an owner when the customer does not exist | `OwnerForm` (create), empty-state call to action         | `App.test` _creates a new owner when none exists and selects them_; _shows validation errors and does not call the API_                          |
| See owner details and pets                       | `OwnerPanel`                                             | `App.test` _finds an owner, opens a pet and registers a visit…_; `state.test` _renders a selected owner instantly from the cached list_          |
| Open a pet; see details and previous visits      | `PetPanel`, `VisitList` (newest first)                   | `App.test` _…opens a pet…_, _restores owner and pet from the URL_; `VisitList.test` (sorting)                                                    |
| Register a new visit                             | `VisitForm`, `useAddVisit` (optimistic + rollback)       | `App.test` _…registers a visit…_, _surfaces a server error from visit registration…_; `state.test` _shows a new visit immediately (optimistic)…_ |
| Add a new pet to an existing owner               | `PetForm` (create)                                       | `App.test` _adds a pet to an existing owner and selects it_                                                                                      |
| Edit relevant owner information                  | `OwnerForm` (edit)                                       | `App.test` _edits owner details and reflects them immediately_; `state.test` _refuses to overwrite an owner that someone else changed…_          |
| Edit relevant pet information                    | `PetForm` (edit)                                         | `App.test` _edits a pet and shows the new name immediately_; `state.test` _refuses to overwrite a pet that someone else changed_                 |

## B. Workflow constraint

| Requirement                                                               | Implementation                                                                             | Evidence                                                                                                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Work without continuous navigation between unrelated screens              | One screen, three columns (`Workspace`); rare actions in dialogs; visit form always inline | `App.test` first test asserts the search results are **still on screen** after the visit is registered; manual: smoke test S6–S8 |
| We do not specify UI/navigation: design the workflow you think is correct | Rationale in `docs/ARCHITECTURE.md` ("The workflow")                                       | Document                                                                                                                         |
| Selection survives refresh / can be shared                                | URL holds owner and pet                                                                    | `App.test` _restores owner and pet from the URL_; _rejects a pet id that does not belong to the owner_                           |

## C. TypeScript, used intentionally

| Practice                                                         | Where                                        | Evidence                                                  |
| ---------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------- |
| `strict`, `noUncheckedIndexedAccess`, `noUnused*`                | `tsconfig.json`                              | `npm run typecheck`                                       |
| Types **inferred from runtime schemas** (cannot drift)           | `api/schemas.ts`, `api/forms.ts` (`z.infer`) | `http.test` _rejects responses that violate the contract_ |
| Generic client typed by schema output: `requestJson<T>`          | `api/http.ts`                                | typecheck + lint `no-unsafe-*` rules                      |
| Error taxonomy as classes (`ApiError`, `ConflictError`)          | `api/http.ts`                                | `http.test`; `state.test` conflict tests                  |
| No `any`, `import type`, no floating promises, a11y lint         | `eslint.config.js` (type-aware)              | `npm run lint` with `--max-warnings 0`                    |
| Only two deliberate casts, both where `unknown` JSON is narrowed | `api/http.ts` (`messageFrom`)                | Code review                                               |

## D. "Your decisions"

| You decide…                               | Where documented                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Frontend stack, architecture, state model | README _Architecture_; `docs/ARCHITECTURE.md`; ADRs D1–D15 in `docs/DECISIONS.md`                       |
| Which UI states to implement vs. record   | `docs/ARCHITECTURE.md` → **UI-state matrix** (implemented with evidence / limitations)                  |
| What to test and how much                 | `docs/ARCHITECTURE.md` → _Testing strategy_ (workflow, unit, contract; what is deliberately not tested) |
| How to work with the API                  | `api/` layer; `docs/API_PROBLEMS.md`; contract tests                                                    |

## E. Incomplete requirements / API problems

| Requirement                                                          | Evidence                                                                                                                            |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Reasonable decision + document where requirements/API are incomplete | README _Assumptions_ (7 items)                                                                                                      |
| Each API problem: **problem, workaround, proposed change**           | README table (8 rows) and `docs/API_PROBLEMS.md` with spec references and a correction history                                      |
| Problems are real, not guessed                                       | Derived from `contract/openapi.yml`; pinned by `src/contract.test.ts` (endpoints, request bodies, limits, "only `lastName` filter") |

## F. AI usage

| Requirement                                                        | Evidence                                                                                                                                                     |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Include artifacts created with AI; no artifact-for-artifact's-sake | `AGENTS.md` (steering file), `docs/ai/prompts.md` (verbatim), `docs/ai/AI_LOG.md` (18 AI errors and how each was caught), contract tests/spec snapshot, ADRs |
| Author understands and can explain everything                      | Interview guide (kept outside the repo); **author must add own sessions/transcripts (`AI_LOG` §8)**                                                          |
| No secrets / personal / confidential data given to AI              | `AI_LOG` §1, `AGENTS.md` "Don'ts" — _author to confirm_                                                                                                      |

## G. What to submit

| Item                                                                                        | Status                            | Where                                                   |
| ------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| 1. Repository: source + automated tests                                                     | ✅ (run `git init`, commit, push) | `src/`, 82 tests                                        |
| 2. Instructions to run with PetClinic                                                       | ✅                                | README _Run it_; `docs/SMOKE_TEST.md`                   |
| 3. AI-process artifacts                                                                     | ⚠️ partly the author's            | `docs/ai/`, `AGENTS.md`; add own sessions + transcripts |
| 4. Short README: architecture/decisions, assumptions, API problems, limitations, next steps | ✅ (≈ 8 KB)                       | `README.md` — all five sections present                 |

## H. Interview readiness

| Interview item                      | Preparation                                                            |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Demonstrate the application         | Demo script in the interview guide + `docs/SMOKE_TEST.md` as rehearsal |
| Explain code / architecture / state | Code reading order and request trace in the guide                      |
| Discuss API decisions               | `docs/API_PROBLEMS.md`, ADR D5, D11, D14, D15                          |
| Identify weaknesses                 | README limitations + ranked weakness list in the guide                 |
| Make a small change                 | Three rehearsed drills (tested) + nine more outlined in the guide      |
| Explain AI usage                    | `docs/ai/AI_LOG.md` §3 pattern + 2-minute script in the guide          |

## I. Verification status

| Check                                                           | Result                                    |
| --------------------------------------------------------------- | ----------------------------------------- |
| `tsc --noEmit` (strict)                                         | ✅ pass                                   |
| ESLint, type-aware + jsx-a11y, 0 warnings                       | ✅ pass                                   |
| Prettier                                                        | ✅ pass                                   |
| Tests (9 files)                                                 | ✅ 82 / 82                                |
| Production build                                                | ✅ pass                                   |
| Contract tests mutation-checked (phone limit, `PUT /pets` body) | ✅ both fail when the bug is reintroduced |
| **Run against a real PetClinic backend**                        | ❌ **not yet — do `docs/SMOKE_TEST.md`**  |
| **Visual check (light/dark, narrow width)**                     | ❌ **not yet — smoke test S18**           |
