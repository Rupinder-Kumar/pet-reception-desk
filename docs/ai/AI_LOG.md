# AI usage log

> **Instructions for the author before submitting:** this file is the *honest record* of how AI was used. Entries 1–4 below
> describe the real session that produced the first scaffold. Replace/extend them with your own sessions, and attach the real
> artifacts (exported chat transcripts, `CLAUDE.md`/rules files, prompts, agent plans) in this folder. Delete anything that is not true for you.
> Do not paste secrets or employer data into any tool.

## Tools
* Claude (chat + code execution sandbox) — architecture proposal, scaffold, tests, README draft.
* *(add: Copilot / Cursor / Claude Code / etc. if you used them)*

## 1. Architecture + scaffold (prompt, abridged)
> "Act as an experienced frontend team lead. Design and architect a Reception Desk frontend (TypeScript, React) on the Spring PetClinic REST API —
> receptionist can find/create owner, see owner & pets, open pet & visits, register visit, add pet, edit owner/pet — without navigating between unrelated screens.
> Follow best coding guidelines, document each component. Include README: architecture, assumptions, API problems, limitations, next steps."

**What AI produced:** stack choice, folder layout, API client, Zod schemas, hooks, components, MSW fake, 28 tests, README/ADR drafts.

## 2. Verification (what I checked rather than trusted)
* Ran `tsc --noEmit`, `vitest`, `vite build` — all green after the fixes below.
* **Bug caught by tests:** `mutateAsync` rejections escaped `handleSubmit` as *unhandled promise rejections* (error was displayed but the console reported it).
  Fixed with try/catch in the 3 forms; rationale recorded in `DECISIONS.md` D8.
* **UX issue found while fixing a flaky test:** search results unmounted on every new query (flicker). Fixed with `placeholderData: keepPreviousData`.
* **Tooling slip:** a `mkdir -p src/{a,b}` brace expansion silently failed under `/bin/sh`, so half the files were not written; noticed from stderr and re-created.

## 3. Where I would not trust the AI output without checking
* API facts (field names, validation rules, status codes) came from the README/OpenAPI knowledge, **not** from a run against the real backend.
  → Manual smoke test and the ⚠ items in README must be verified by running PetClinic.
* The MSW fake mirrors assumed behaviour; it is not generated from the OpenAPI spec.

## 4. Things I should be able to explain in the interview
Query-key design & invalidation, why pet is derived from owner, Zod-as-source-of-truth, search fallback complexity, why mutations don't retry,
what the URL-parsing guard protects against, Dialog a11y gaps.

## 5. Session 2 — Mantine UI + state-layer review (prompts, abridged)
> "Can we beautify it using some framework?" → "Also check if the state layer can be enhanced."

**State-layer review findings (accepted):** selection waited on a redundant GET; visit registration waited on server; lost updates only documented; over-invalidation.
**Rejected:** Zustand for visit drafts (second source of truth for one small gain), optimistic edits (invisible behind a modal).
**Bug found by tests during the change:** using `initialData` for instant select masked a 404 with stale list data (TanStack re-applies `initialData` to an errored, data-less query).
Replaced with explicit `usePrimeOwner` and added a regression test. 37 tests green, `tsc --noEmit` clean, production build OK.
**Not verified:** the visual result in a real browser. Must be checked by eye.

## 6. My own sessions
*(add real entries: date, tool, prompt, what you accepted/rejected/changed and why)*
