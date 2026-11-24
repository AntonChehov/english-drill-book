# Proposal

## Why

Slice 1.8 has delivered the bar on a phone (`phone-bar`, PROD-012); the rest of the shell is missing. Validation showed it: a reload without a network shows the browser's error page (`docs/tech-debt.md`). The app follows the system theme only, a failure while drawing a screen leaves it blank, and nothing guards against a browser dialog. This change completes slice 1.8 and, with slice 1.7, milestone 1.

Size: large. It has six requirements and adds a service worker and a build step; no schema or storage format changes (`Settings.theme` exists in the store and in `contracts/export.schema.json`).

## What Changes

- **Offline after the first load** (PROD-003, C-04). A service worker, written for the app, keeps the built app; a reload offline opens it with the stored books and progress, and «Открыть раздел» works; this closes two offline entries of `docs/tech-debt.md`. The demo PDFs are not kept (PACK-003): offline, the pages panel says the demo needs a network (DOC-008).
- **The theme** (PROD-005). «Оформление» on «О приложении»: «Как в системе», «Светлая», «Тёмная», kept in the store and applied before the first screen is drawn.
- **Failures stay where they happen** (PROD-011). A failure while drawing the screen, or a stored pack that no longer reads, shows a message in place of that part, with a way out; the top bar stays usable. No failure produces a blank page.
- **No browser dialogs** (PROD-009). The lint gate refuses `alert`, `confirm` and `prompt`. M1 has no destructive action; the inline two-step confirmation comes with the first one.
- **Languages** (PROD-004). A test of every screen checks that pack content is marked `lang="en"` and the interface is Russian; gaps it finds are fixed.
- **First launch** (PROD-002). Today with no data already offers the demo in one action; it now says, in one line, that the learner's own books are added in the library, which comes in a later version.
- **Housekeeping.** `docs/roadmap.md` stops calling slice 1.8 done before it is; the deploy of `main` can be rerun (its Pages artifact is named per attempt).

Requirements delivered: PROD-002, PROD-003, PROD-004, PROD-005, PROD-009, PROD-011 (added to `app-shell`).

Left for later: adding own books (BOOK-002, milestone 3) and offline work on them, for which this change lays the ground; the two-step confirmation component; an update prompt for a new version (the new version is taken on the next start).
