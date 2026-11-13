# Design

## Context

Decision record 0003 makes progress an append-only log of attempts; `contracts/export.schema.json` defines an attempt. `demo-books` produces packs and keeps them in memory. Nothing is stored yet.

## Goals / Non-Goals

**Goals:**

- One place that talks to IndexedDB, with an interface the screens can use without knowing it.
- Derived state that can always be rebuilt from the log.
- No way to lose or damage data by updating the app, opening two tabs or a failed write.

**Non-Goals:**

- Export, import, erasing, the mistakes list, persistent storage (milestone 2).
- Sync (milestone 5). The log is shaped for it and nothing more is built.

## Decisions

### D1. The database

IndexedDB, used directly through a wrapper of about 150 lines in `src/storage/db/` that turns requests and transactions into promises. No library: the wrapper is smaller than any, and decision record 0004 allows a helper only if it is smaller than what it replaces.

Database `english-drill-book`, schema version 1:

| Store | Key | Holds |
| --- | --- | --- |
| `attempts` | `id` | the log; indexes on `[pack, exercise]` and on `at` |
| `derived` | `[pack, exercise]` | the cached state of an exercise (D3) |
| `drafts` | `[pack, exercise]` | answers typed and not yet checked |
| `packs` | `id` | packs, validated before they are put |
| `settings` | name | theme and later settings |

### D2. Attempts (DATA-002)

The type `Attempt` in `src/domain/progress` is the attempt of `export.schema.json`, so an export is the log as it is. A function `newAttempt` builds one from the exercise, the answers, the verdicts and the action; the `id` (`crypto.randomUUID()`) and the time are passed in by the caller, since the domain has no clock and no randomness (C-08).

The interface of the store has `appendAttempt` and reads; it has no function that changes or removes an attempt. `put` on `attempts` is never called, only `add`, which fails on an existing key.

### D3. Derived state (DATA-003)

`deriveExercise(attempts, from?)` is a pure function from the attempts of one exercise, taken in time order (by `at`, then by `id`), to its state. It is a fold: the state of the earlier attempts, continued with the later ones, equals the state of all of them, so a cached state is brought up to date with one appended attempt. It follows PLAY-008 – PLAY-010 using only what attempts carry:

- **Groups.** Every override joins the check it corrects (`corrects`). In a group, the latest attempt speaks for the check: its `complete` says whether the check, with the learner's changes, has every item `ok`, and the latest override's `overridden` is the whole set of verdicts set by hand for that check; an item left out of it is no longer set by hand, which is how an undo is recorded. An override whose `corrects` names no earlier check of the exercise is left out of the derivation (it stays in the log).
- **Done.** The exercise is done when the group of some check is complete now, or some `mark-done` attempt exists. Counting as wrong an item of the completing check takes the completion back, an undo gives it back, and a later check with a wrong item does not undo an earlier completion (PLAY-010). `doneAt` is the time of the first check whose group is complete now, or of the first `mark-done` if that is earlier (PLAY-009).
- **Verdicts.** The latest verdict of an item is what the latest check that judged it said, changed only by the latest override of that same check; an override of an older check never changes what a later check said. An item is marked as set by hand only for that check.
- **Revealed.** Every item revealed by an attempt that is not left out.

`newAttempt` is stricter than the format where the app never writes what the format allows: an override must carry `corrects` and `overridden`, and no other action carries either.

`appendAttempt` writes the attempt and the new derived record in one transaction, so they cannot disagree after a crash.

The derived record stores the number of attempts it was built from, the `id` and time of the last, and `derivation`, the version of the derivation (a constant in `src/domain/progress`, 1 for the logic above). A read compares the number with the log's index, checks that the last attempt is in the log and that `derivation` is the current one; a record that is missing or does not match is rebuilt and written back. Tests delete, corrupt and age the cache and expect the same state. Version 1 of the schema is not released yet, so the shape of this record was changed in place, with its fixture, after review round 1; once released, a version is never changed.

### D4. Failures (DATA-004)

Every function of the store returns a promise that is rejected with a typed `StorageError`: `unavailable` (no IndexedDB, or blocked by the browser), `quota`, `newer-version`, `failed`. A transaction either commits whole or not at all; the interface resolves only on the transaction's `complete` event, never on the request's success.

The start screen is the only caller in this slice: "Демо-книги добавлены" is shown after the packs are stored. If storing fails, the message says in Russian that the books were read and could not be kept, why if known (no space; storage is switched off in this browser), and offers to try again; the books are not listed as added.

The browser can also close the connection on its own, when the visitor clears the site's data with the page open or the disk fails. The store notices it by the connection's `close` event, or by a transaction refused with `InvalidStateError` before that event comes; it then refuses everything with `failed`, and the app drops it, so the next call, such as trying again, opens the database again. For the same reason a view that shows the demo as added reads the store again when the page regains focus, and no longer shows it as kept once its packs are gone.

### D5. Schema versions (DATA-005)

The schema version is IndexedDB's own database version. `migrations[n]` upgrades from `n − 1` to `n` inside the `upgradeneeded` transaction, so an upgrade happens whole or not at all. A test opens a committed fixture of every earlier version and expects the data intact; with only version 1 today, the harness is proven by a test-only version 2.

Opening a database whose version is higher than the app's fails in the browser with `VersionError` before anything is read. The app then shows one full-screen message in Russian — the data was written by a newer version of the app; reload the page to get it — and offers nothing that writes.

When another tab of a newer app asks to upgrade, an open tab receives `versionchange`: it closes its connection, so that the upgrade is not blocked, and shows the same message.

### D6. Two tabs (DATA-012)

Corruption is ruled out by construction: attempts have unique keys and are only added; every write is one transaction; the derived record is checked against the log on read (D3), so a record written by one tab while another appended is detected and rebuilt.

To see the other tab's writes, a screen re-reads what it shows when the page becomes visible or the window gains focus. A `BroadcastChannel` message after each write lets a visible second window update at once; it is an addition, not what the requirement rests on.

### D7. The demo stays

After reading and validating, the two demo packs are put into `packs`. On start the start screen reads `packs`: with both demo packs present it shows them as added, without fetching or reading the PDFs. The stored pack is validated again when read; a pack that fails, such as one from an older reader, is read again from the PDF.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-02, C-03 | no new network use; an end-to-end test checks that adding the demo grows the site's storage by less than 5 MB |
| C-05 | the migration harness of D5 with a fixture per earlier version |
| C-06 | no runtime dependency; `pnpm size` |
| C-08 | IndexedDB only under `src/storage`; derivation and the attempt type under `src/domain` |
| C-10 | coverage of `src/domain` ≥ 95 %; the storage tests run in Node on `fake-indexeddb` and in the three browsers by end-to-end tests |
| C-13 | the end-to-end tests of this change run on Chromium, Firefox and WebKit |

## Risks

- **`fake-indexeddb` is not a browser.** The end-to-end tests exercise the real one for what is visible now; the attempt log meets a real browser in slice 1.5, whose tests write through it.
- **Deleting the database.** `versionchange` also fires when another tab deletes the database, and the app would then say a newer version wrote the data; nothing deletes it yet, and erasing data (DATA-010) must tell the two apart.
- **Reads take a write transaction.** Every read of an exercise's state opens a read-write transaction so that a stale record can be written back, so reads queue behind writes; at the size of this app that is acceptable.
- **Private windows.** Some browsers give a private window storage that is dropped when it closes. The app works there and keeps nothing afterwards; this is the browser's promise, not ours.
