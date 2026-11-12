# Proposal

## Why

The demo books are read and then forgotten at the next reload, and there is nowhere to keep what a learner does. The study screen of slice 1.5 needs both: the packs must stay, and every check must be recorded. The learner's history is the one thing the app cannot regenerate, so the way it is stored is built and proven before any screen writes to it.

## What Changes

- **A database in the browser** (IndexedDB) behind a small typed interface in `src/storage`: packs, the attempt log, drafts, settings, and a cache of derived state.
- **The attempt log.** An attempt is appended and never changed. What the screens show about an exercise — done or not, the latest verdict of each item — is derived from the log by pure functions in `src/domain/progress`, and cached; a cache that is missing or stale is rebuilt from the log.
- **A versioned schema.** Data written by an older version is migrated in place when opened; data written by a newer version stops the app with a message and is left untouched.
- **Failures are shown.** A write that fails is reported next to the action that caused it, with a way to retry, and nothing is shown as kept before the write has succeeded.
- **Two tabs.** Both can be open; neither corrupts the other's data, and each sees the other's writes when it regains focus.
- **Visible in this slice:** the demo books stay added after a reload and appear in a second tab. The attempt log has no screen yet; it is proven by tests and used from slice 1.5.

Requirements delivered, from `docs/product/06-progress-and-data.md`: **DATA-001**, **DATA-002**, **DATA-003**, **DATA-004**, **DATA-005**, **DATA-012**.

Left for later changes: the screen that writes attempts (slice 1.5); the mistakes list, export, import, erasing, persistent storage (milestone 2); references to the learner's files (milestone 3).

## Capabilities

### New Capabilities

- `progress-data`: where the learner's data is kept, how the history is recorded and what is derived from it.

### Modified Capabilities

None. PACK-001 of `content-packs` already says a pack is validated before it is stored; from this change the demo packs are stored.

## Impact

- New: `src/storage/db/`, `src/domain/progress/`, tests, end-to-end tests for keeping the demo and for two tabs.
- Changed: the demo section of the start screen (the demo stays; storage failures).
- Runtime dependencies: none. Development dependency: `fake-indexeddb`, to run the storage tests in Node.
- Depends on the change `demo-books` being merged.
