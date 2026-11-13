# Review

## Round 1

Reviewed: dfb7266b1245
Verdict: changes requested

### F1 A check that completed an exercise cannot be taken back by an override, as PLAY-009 requires

- Where: src/domain/progress/derive.ts:64, src/domain/progress/derive.ts:65, openspec/changes/storage/design.md:44
- Problem: `done` is set by any attempt with `complete: true` and never cleared, and `corrects` is not read. PLAY-009 (M1, product text 04) says an exercise is done when some check has every item `ok` "taking into account the learner's changes to that check's verdicts", and that "counting as wrong an item of a check that completed it takes the completion back". The attempt format can express this (an override with `corrects` and `overridden`), but the derivation cannot. Sequence: check A at 10:00, `results {1: ok, 2: ok}`, `complete: true`; override B at 10:01, `corrects: A`, `overridden {1: bad}`, `complete: false`. `deriveExercise([A, B])` gives `done: true`, and PLAY-009 needs `false`. A second case comes from ignoring `corrects`: an override of an earlier check, whose `results` repeat that check's verdicts as the version-1 fixture writes them (fixture attempt `…e02`), overwrites the verdicts of a later check. With check A `{1: bad, 2: bad}`, check B `{1: ok, 2: ok}`, then override C of A with `results {1: bad, 2: bad}` and `overridden {1: ok}`, item 2 comes out `bad`, although its latest check says `ok`.
- Why now: this change fixes the derivation, the shape of the cached record and the meaning of `complete` that slice 1.5 will write. The cache is checked only by attempt count and last id (store.ts:134, :138), so a later change to `deriveExercise` would not rebuild records that are already stored. Design D3 promises that derived state can always be rebuilt from the log.
- What should happen: the done state applies the overrides to the check they correct (`corrects`), so an override can make that check complete or take its completion back. Verdicts from an override replace only the items it overrides. The spec scenario "Done stays done" keeps its meaning for a new wrong check, and gets a scenario for the take-back. If the owner wants done to be monotonic instead, PLAY-009 and design D3 must say so. Either way, the derived record should carry the version of the derivation it was built with, and a record of another version should be rebuilt.

### F2 After the browser closes the connection, storing never works again until the page is reloaded

- Where: src/ui/storage.ts:27, src/storage/db/idb.ts:57
- Problem: the store's connection only listens for `versionchange`. When the browser force-closes it (the IndexedDB `close` event), nothing notices. This happens when the visitor clears the site's data in the browser settings or DevTools while the tab is open, or after an I/O failure. `getStore()` keeps returning the resolved promise of the closed store, so every `transaction()` throws `InvalidStateError`, which maps to `failed`. Sequence: add the demo, clear the site data from the browser settings with the tab open, reload nothing, go to another view and back. Or, in a second tab that never added the demo, press "Попробовать демо" after the clear. The message says "Попробуйте ещё раз", and every retry fails the same way. DATA-004 requires the action to be retryable, and the comment at src/ui/storage.ts:24 claims "the next call tries again", which is only true when the open itself failed.
- What should happen: on the connection's `close` event, the store is marked closed and `opening` is reset, so the next call opens the database again. Add a test that force-closes the connection (fake-indexeddb can close it the way the browser does) and expects the retry to succeed.

### F3 The fixture test says the attempts are valid but never checks them

- Where: src/storage/db/migrations.test.ts:37
- Problem: the test "the packs and attempts of the fixtures are valid" validates only `packs`. Its loop never reads `attempts`, so a fixture attempt that the export format refuses passes. Mutation: give the first attempt of `fixtures/version-1.json` an extra property, or `at: "yesterday"`. The test stays green. Today the three attempts are valid against `$defs.attempt` (checked with ajv in a scratch probe), but the next fixture (version 2, which the test above requires) has no guard. A fixture with an invalid attempt would prove a migration on data no app version can write.
- What should happen: the test validates every fixture attempt against `$defs.attempt` of `contracts/export.schema.json` with ajv, as attempt.test.ts does. Otherwise its title should drop "attempts".

### Notes

- Range read: `git diff origin/main...HEAD` in full (42 files). Every file under `src/storage/db`, `src/domain/progress`, the new UI files and `e2e/storage.spec.ts` / `e2e/demo.ts` were read whole. I did not use a review skill; the review was done by hand. Run here: `pnpm test` (41 files, 698 tests pass), `pnpm lint`, `pnpm check` (typecheck, lint, format, `openspec validate`, traceability 23 IDs, audit), `pnpm build`, `pnpm size` (initial JS 40.04 kB gzip, CSS 0.82 kB; `kept` is a lazy 0.34 kB chunk importing only `profiles`, not pdf.js). `pnpm exec playwright test --project=chromium`: 47 pass. WebKit and Firefox were not run here.
- Mutations, each restored afterwards: always continuing the cached state incrementally (store.ts:142) fails 2 tests; `add` to `put` fails the duplicate-id test; dropping the count check fails 3 tests; dropping the last-id check fails the corrupt-cache test; dropping the `replaced` guard fails 2 tests; not closing on `versionchange` fails 2 tests by timeout. These storage tests can fail.
- Checked and fine:
  - `transact` resolves only on `complete`, and rejects on abort with the first error.
  - A throw in `after` aborts the transaction.
  - A quota error at commit maps to `quota` through `transaction.error`.
  - The attempt and its derived record share one transaction. Readwrite transactions on overlapping stores are serialized across connections, so a second connection cannot slip in between the read and the write.
  - An out-of-order or equal-time attempt triggers a full rebuild, ordered by `at` with the fraction padded, then by `id`.
  - Nothing in `Store` changes or removes an attempt.
  - Every open is closed on `versionchange`, so an upgrade does not hang.
  - Data at a newer version stops at open with `VersionError`, and the full-screen message replaces the router, so no view, including one reached by a direct link, offers a write.
  - `db.fixture.ts` and the test-only version 2 are not in the bundle.
  - `newAttempt` output and every action validate with ajv.
  - The e2e simulations are honest. Refused storage throws `SecurityError` from `open` as Firefox does, newer data is a real version-2 database, and "seen in the other tab" removes `BroadcastChannel` from the second page so only focus can update it.
  - Russian text and no browser dialogs.
  - Focus moves to the retry button on failure and to the heading of the newer-version message.
- Not raised: `versionchange` also fires when another tab deletes the database (`newVersion` is null), and the app would then say a newer version wrote the data. Nothing deletes the database yet; DATA-010 (erase) will need to tell the two apart.
- Not raised: a tab showing "Демо-книги добавлены" does not re-check the store on focus (`check` returns early in phase `added`), so after the site data is cleared it keeps saying the books are kept until a reload. Related to F2.
- Not raised: `getExerciseState` opens a readwrite transaction for every read, so reads queue behind writes. That is acceptable at this size.
- C-01: the fixture, test packs and e2e data read as written for this repository.

## Round 2

Reviewed: 01cc2c9644ac
Verdict: approved

- F1: fixed
  The round-1 inputs, run through `deriveExercise` with Node in a scratch probe, now give the following. Take-back: `done: false`, item 1 `bad`, set by hand. Undo: done again, `doneAt` the check's time. Override of an older check: items 1 and 2 `ok`, nothing set by hand. Also checked: counting the last wrong item as correct completes; a later wrong check keeps done; two overrides of one check, the latest wins; the same log continued from a cut and shuffled gives the same state. The cached record carries `derivation`, and dropping that comparison fails "a cache of another derivation … is rebuilt". `newAttempt` refuses `corrects`/`overridden` outside an override.
- F2: fixed
  The store notices `close` and `InvalidStateError`, and `getStore` drops it. Removing the `onClose` reset in `src/ui/storage.ts` fails two unit tests and both new Chromium tests, which clear the site data through the DevTools protocol, so the end-to-end tests are not passing vacuously. No write is reported as kept: a transaction on a closed connection aborts and rejects. `markClosed` runs once per store, so one closed connection resets `opening` once.
- F3: fixed
  Changing an `at` of the version-1 fixture to `yesterday` now fails "the packs and attempts of the fixtures are valid".

### Notes

- Range read: `git diff 301db0b..HEAD` (20 files), with `derive.ts`, the store, `idb.ts`, `src/ui/storage.ts` and `DemoBooks.vue` re-read whole. Round 1 still stands for the rest of the diff. Run here: `pnpm test` (717 pass), `pnpm lint`, `pnpm check`, `pnpm build`, `pnpm size` (initial JS 40.42 kB gzip), `pnpm exec playwright test --project=chromium` (49 pass). Mutations, each restored: ignoring `corrects` fails 2 tests; replacing the earliest `doneAt` with the latest fails 2; dropping the `close` listener fails 2; not calling `onClose` from the store fails 4.
- Not raised, by the rule of design D3: an override is ordered by its own `at`. An override written in the same millisecond as its check with a smaller id, or after the device clock stepped back between the check and the override, sorts before the check. It is then left out, and the learner's change disappears from the state although it stays in the log. A human cannot click within one millisecond, and a clock stepping back is rare. Slice 1.5 could rule it out by writing an override's `at` no earlier than its check's.
- Not raised: after the store is reopened, the start screen's `BroadcastChannel` subscription stays on the closed store's channel (`onStoredDataChange` subscribes once). A visible second window then updates on focus only, not at once. DATA-012 rests on focus (design D6), so the requirement holds.
- Not raised: a tab showing the demo as added now turns back to "not added" on focus when the stored packs are `stale`. Two builds of the app open after a deploy could therefore re-read and overwrite each other's demo packs, once per start or click. Nothing is lost: the packs are regenerated from the PDFs.

## Requirement coverage

| Requirement | Implemented | Tests |
| --- | --- | --- |
| DATA-001 | src/storage/db/store.ts (packs, drafts, settings), src/ui/components/DemoBooks.vue `check` (also on focus when shown as added), src/domain/books/demo/kept.ts | store.test.ts "packs, drafts and settings"; kept.test.ts; e2e/storage.spec.ts DATA-001 (kept, revalidated, nothing sent, little stored, not shown as kept after the site data is cleared); e2e/demo.spec.ts reload |
| DATA-002 | src/domain/progress/attempt.ts `newAttempt`, src/storage/db/store.ts `appendAttempt` (`add` only) | attempt.test.ts; store.test.ts "the attempt log" |
| DATA-003 | src/domain/progress/derive.ts (groups of a check and its overrides, `DERIVATION`), src/storage/db/store.ts `currentState` | derive.test.ts (take-back, undo, older check, fold property); store.test.ts "the cached state of an exercise" (another derivation); migrations.test.ts older data (stale fixture cache) |
| DATA-004 | src/storage/db/idb.ts `transact` and `close`, errors.ts, store.ts `markClosed`, src/ui/storage.ts `getStore`, src/ui/demo/messages.ts `keepFailureMessage`, DemoBooks.vue `add` | idb.test.ts; store.test.ts "failed writes" and "a connection the browser closes"; src/ui/storage.test.ts; messages.test.ts; e2e/storage.spec.ts DATA-004 and the site data cleared |
| DATA-005 | src/storage/db/schema.ts, idb.ts `openDatabase`, src/ui/storage.ts, src/ui/components/NewerVersion.vue | migrations.test.ts; idb.test.ts newer-version; e2e/storage.spec.ts DATA-005 |
| DATA-012 | src/storage/db/store.ts (one transaction per write, `onOtherTabWrite`), src/ui/storage.ts `onStoredDataChange` | two-connections.test.ts; e2e/storage.spec.ts DATA-012 |

## Outside the listed requirements

- `.oxlintrc.json`: the global `indexedDB` is closed to `src/storage` and `src/ui` outside `src/storage/db` (C-08), with tests in `scripts/lint-config.test.mjs`.
- `fake-indexeddb` is added as a development dependency.
- The `.action` button style moves to `src/ui/styles/base.css`.
- The demo state gains a `loading` phase and `summaryOf`.
- The accessibility and screenshot states of the start screen are extended in `e2e/demo.ts`.
