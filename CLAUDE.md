# English Drill Book — notes for agents

Offline-first PWA for Russian speakers learning English from grammar workbooks (Vue 3 + TypeScript + Vite). Built specification-first with OpenSpec: read `docs/process.md`, then `docs/roadmap.md`.

- Work only inside an approved OpenSpec change (`openspec/changes/<name>/`), small (schema `lite`: proposal and tasks) or large, as `docs/process.md` defines. No code before the owner has approved its proposal, design (omitted for a small change and for one of only texts or only documentation) and tasks. Word limits are ceilings, not targets (proposal 300 words small or 400 large, design 1 000, tasks 300): write as short as you can.
- `docs/product/`, `docs/constitution.md`, `contracts/` and `openspec/specs/` are owner-controlled. Change them only through an approved change or when the owner asks.
- Requirement IDs (`CHK-005`) come from `docs/product/`; keep them in requirement titles and name them in tests (`@req CHK-005`).
- Review goes in rounds (constitution C-18, `docs/process.md` steps 5 and 6, which give the form of `review.md` and the severities). A reviewing agent with a fresh context, not the author, writes each round and edits nothing else: `Reviewed: <hash>` as printed by `pnpm review:hash <name>`, `Verdict:`, findings `### F<n> <title>` each with `Severity: critical` or `Severity: minor`, and the outcome of every open finding in later rounds. Rounds 1 and 2: every finding is fixed or declined with a reason; from round 3 on an open minor finding is declined as technical debt in `docs/tech-debt.md`, new minor observations go under `### Notes` only, and critical findings are fixed in any round. The last commit of the branch is the archive commit (`openspec archive`).
- Never add text from a published textbook to this repository, in content, tests, fixtures, comments or screenshots (C-01). The owner's books live outside this repository; do not copy from them.
- Do not read anything outside this repository. Acceptance scenarios exist elsewhere and are not for you.
- Repository language is English; the app's interface is Russian only. Talk to the owner in Russian.
- OpenSpec telemetry stays off (`OPENSPEC_TELEMETRY=0`).
