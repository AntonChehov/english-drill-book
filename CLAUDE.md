# English Drill Book — notes for agents

Offline-first PWA for Russian speakers learning English from grammar workbooks (Vue 3 + TypeScript + Vite). Built specification-first with OpenSpec: read `docs/process.md`, then `docs/roadmap.md`.

- Work only inside an approved OpenSpec change (`openspec/changes/<name>/`). No code before the owner has approved its proposal, design and tasks.
- `docs/product/`, `docs/constitution.md`, `contracts/` and `openspec/specs/` are owner-controlled. Change them only through an approved change or when the owner asks.
- Requirement IDs (`CHK-005`) come from `docs/product/`; keep them in requirement titles and name them in tests (`@req CHK-005`).
- When the tasks of a change are done, run the code-review skill on the whole diff and commit `review.md` in the change directory (constitution C-18).
- Never add text from a published textbook to this repository, in content, tests, fixtures, comments or screenshots (C-01). The owner's books live outside this repository; do not copy from them.
- Do not read anything outside this repository. Acceptance scenarios exist elsewhere and are not for you.
- Repository language is English; the app's interface is Russian only. Talk to the owner in Russian.
- OpenSpec telemetry stays off (`OPENSPEC_TELEMETRY=0`).
