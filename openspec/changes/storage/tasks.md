# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Progress in the domain

- [x] 1.1 Write the type `Attempt` and `newAttempt` in `src/domain/progress` as in design D2; verify with unit tests named `@req DATA-002` that a built attempt is valid against `contracts/export.schema.json` (with `ajv`) — `attempt.test.ts`: every action and generated input validate with `ajv`; each field the format refuses is refused by both
- [x] 1.2 Write `deriveExercise` as in design D3; verify with unit tests named `@req DATA-003`, and with a property: the state does not depend on how the same attempts are split between reads — `derive.test.ts`, with the property over generated attempts and cuts; `src/domain/progress` 100 % lines and branches

## 2. The database

- [x] 2.1 Add `fake-indexeddb` for tests; write the wrapper and the schema of version 1 in `src/storage/db/` as in design D1 and the errors of D4; verify that a write resolves only when its transaction completes and that each kind of failure gives its `StorageError` — `idb.test.ts`: resolution after `complete`, an abort after every request succeeded rejects and keeps nothing, and `unavailable`, `quota`, `newer-version` and `failed` each from its cause; a lint rule closes `indexedDB` outside `src/storage/db`
- [x] 2.2 Write the store's interface: packs, attempts with the derived record in one transaction, drafts, settings; verify with tests named `@req DATA-002`, `@req DATA-003` and `@req DATA-004` covering the scenarios of the delta spec, including a deleted and a stale cache and a write that fails halfway — `store.test.ts`, the derived record's write failing after the attempt's add leaves both stores as they were
- [x] 2.3 Write the migration harness of design D5 with a committed fixture of version 1 and a test-only version 2; verify with tests named `@req DATA-005` for older data, newer data and the upgrade asked for by another connection — `migrations.test.ts` over `fixtures/version-1.json`; version 2 lives in `db.fixture.ts` only, and a failing version 2 leaves version 1 untouched
- [x] 2.4 Verify with a test named `@req DATA-012` that two connections appending to one exercise lose nothing and read the same state — `two-connections.test.ts`, appending in turn and at the same time

## 3. The demo stays

- [x] 3.1 Keep the demo packs as in design D7 and show them as added on start; show the failures of design D4 and the message of D5; verify with end-to-end tests named `@req DATA-001`, `@req DATA-004`, `@req DATA-005` and `@req DATA-012` on Chromium, Firefox and WebKit covering "The demo is kept", "Nothing is sent", "Little is stored", "The demo cannot be kept", "Newer data" and "Seen in the other tab" — `e2e/storage.spec.ts`, tagged `@demo`, green on Chromium and Firefox here (WebKit does not start on this machine; CI runs it); storage refused by an init script that makes `indexedDB.open` throw `SecurityError`, newer data written by an init script before the app starts
- [x] 3.2 Add the new states of the start screen to the accessibility check and the screenshots, both themes; verify no serious or critical violation — `start-demo-kept`, `start-demo-not-kept` and `newer-version` in `demoStates`; axe green in both themes, screenshots made

## 4. Review and evidence

- [ ] 4.1 Run `pnpm verify` from a clean build; verify it passes and coverage of `src/domain` is at least 95 %
- [ ] 4.2 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 4.3 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; the same reviewing agent, resumed, writes each later round until one approves the latest content; verify the `evidence` check is green
- [ ] 4.4 **(owner)** Read the pull request and the declined findings, approve and merge
