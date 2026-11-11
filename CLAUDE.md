# English Drill Book — notes for agents

Offline-first PWA for Russian speakers learning English from grammar workbooks (Vue 3 + TypeScript + Vite). Built specification-first with OpenSpec: read `docs/process.md`, then `docs/roadmap.md`.

- Work only inside an approved OpenSpec change (`openspec/changes/<name>/`). No code before the owner has approved its proposal, design and tasks.
- `docs/product/`, `docs/constitution.md`, `contracts/` and `openspec/specs/` are owner-controlled. Change them only through an approved change or when the owner asks.
- Requirement IDs (`CHK-005`) come from `docs/product/`; keep them in requirement titles and name them in tests (`@req CHK-005`).
- Review goes in rounds (constitution C-18, `docs/process.md` step 4). When the tasks of a change are done and committed, a reviewing agent with a fresh context, not the author, runs the review skill on the whole diff and adds `## Round <n>` to `openspec/changes/<name>/review.md`: `Reviewed: <hash>` as printed by `pnpm review:hash <name>` (online: it fetches `main` first, as CI does), and `Verdict: changes requested` or `Verdict: approved`, then its findings as `### F<n> <title>`; it edits nothing else. The author then fixes or declines each finding and asks for the next round, which states every finding still open, before its own findings, as `- F<n>: fixed`, `- F<n>: not fixed — <what remains>` or `- F<n>: declined — <reason>`, exactly. Repeat until a round approves; the approving round adds `## Requirement coverage` and `## Outside the listed requirements`. The check reads nothing else: any other section, line or heading fails it. Any later change to a reviewed file, its mode included, changes the hash and needs another round.
- Never add text from a published textbook to this repository, in content, tests, fixtures, comments or screenshots (C-01). The owner's books live outside this repository; do not copy from them.
- Do not read anything outside this repository. Acceptance scenarios exist elsewhere and are not for you.
- Repository language is English; the app's interface is Russian only. Talk to the owner in Russian.
- OpenSpec telemetry stays off (`OPENSPEC_TELEMETRY=0`).
