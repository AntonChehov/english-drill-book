# Design

## Context

- `index.html` has `lang="ru"`; Study, Today and the book cards mark pack content `lang="en"`.
- `base.css` keeps colours as variables on `:root`, the dark set under `@media (prefers-color-scheme: dark)`.
- The store has `Settings.theme` (`system` | `light` | `dark`) with `getSetting`/`putSetting`; the export schema carries it.
- `main.ts` opens the store and mounts the app; storage failures are said where they occur.
- The pages panel reports its failures with «Повторить» and, offline, that the demo needs a network (DOC-008).
- The demo packs are read from the PDFs once, on adding, and kept; the PDFs are fetched again only to draw pages.
- There is no service worker, no `errorHandler`, no `onErrorCaptured`.

## Goals / Non-Goals

**Goals:** PROD-002 – PROD-005, PROD-009, PROD-011 as worded in `docs/product/01-product.md`, with the C-04 offline test.

**Non-Goals:**
- adding own books;
- a two-step confirmation component, until a destructive action exists;
- a prompt for a new version;
- a web manifest and installing;
- the demo PDFs offline (PACK-003).

## Decisions

### D1 A service worker written for the app

**The worker.** A Vite plugin in `vite.config.ts` bundles `src/sw/worker.ts` into `sw.js` at build time. It writes two things into it:
- the list of emitted files: chunks, assets including the pdf.js chunk and worker, `index.html` and `favicon.svg`, but not `demo/*.pdf`;
- a cache name hashed from that list.

**What it does.**
- `install` caches the list.
- `activate` deletes other caches, claims clients and skips waiting.
- `fetch`, for a same-origin GET:
  - a navigation gets the cached `index.html`, else the network;
  - a listed file comes from the cache;
  - anything else goes to the network untouched, so the PDFs and DOC-008 behave as now.

**Registration.** `main.ts` registers `sw.js` relative to `import.meta.env.BASE_URL`. It does so after mounting, in production builds only, and only when the browser supports it. A failed registration is ignored.

*Why not `vite-plugin-pwa`:* it brings Workbox and a C-12 decision record, for about 60 lines of behaviour. Hash routing makes every navigation `index.html`.

**Offline Today.** Offline, Today shows the demo as not added and «Открыть раздел» does nothing (`docs/tech-debt.md`); the implementer finds the network read behind it and reads the store instead.

*A new version* runs on the next start. An open tab keeps its loaded chunks, and a reload fixes it.

### D2 The theme

**CSS.**
- The light variables stay on `:root`.
- The dark set applies under `:root[data-theme="dark"]`, and under `prefers-color-scheme: dark` with `:root:not([data-theme="light"])`.
- If one selector cannot express both, the values are written twice, and a unit test asserts the two blocks are equal.
- `color-scheme` follows the theme.

**Applying it.** `src/ui/theme.ts` has `applyTheme(theme)`, which sets or removes `data-theme` on `<html>`. Before `mount`, `main.ts` awaits `getSetting("theme")`, at most 300 ms, and applies it. A failed or slow read means `system`.

**The control.** «О приложении» gets a section «Оформление»: a radio group «Как в системе», «Светлая», «Тёмная».
- A choice applies the theme at once and is kept with `putSetting`.
- A failure to keep it is said beside the group; the theme still applies for this visit.

*Why there:* the phone bar has no room (PROD-012), M1 has no settings screen, and the override is rare.

### D3 Failures stay where they happen

`FailureBoundary.vue` uses `onErrorCaptured`. When its slot throws while rendering or in a hook, it shows instead:
- a `role="alert"` «Не удалось показать эту часть.»;
- «Попробовать снова», which remounts the slot by a new key.

**Where it is used.**
- In `App.vue` around `<RouterView>`, keyed by route; the top bar stays.
- In Study around each column, so the other stays usable.

**Global handlers.** `app.config.errorHandler` and a `unhandledrejection` listener log to the console only. The parts already show their own storage failures.

**A stored pack that no longer reads.** Today and the book cards leave it out; its card says «Книгу не удалось прочитать», and the rest of Today stays. The implementer first checks what `demoBooks`/`useStoredProgress` do now and adds only what is missing. Study already validates the shown pack.

### D4 No browser dialogs

Turn on oxlint `no-alert` as an error; it covers `alert`, `confirm` and `prompt`. A unit test names PROD-009 and reads the configuration, so the rule cannot be dropped silently.

### D5 Languages

`e2e/languages.spec.ts` adds the demo and opens Today, Topics, a unit of each book and «О приложении». It asserts:
- `html[lang="ru"]`;
- known English strings of the demo packs each sit inside an element with `lang="en"`.

The implementer fixes any gap found. Interface text, the canvas's `aria-label` included, stays Russian.

### D6 First launch

With no book added, Today shows one line under the demo offer: «Свои книги можно будет добавить в библиотеке — она появится в следующей версии.» It has no link, because no library exists yet.

### D7 Housekeeping

- **Workflow.** In `main.yml`, `upload-pages-artifact` gets `name: github-pages-${{ github.run_attempt }}` and `deploy-pages` the same `artifact_name`. A rerun today finds two artifacts named `github-pages`.
- **Roadmap.** `docs/roadmap.md` says slice 1.8 is in progress; the archive commit says done.

## Tests

- **C-04, PROD-003.** `e2e/offline.spec.ts` on the production preview:
  1. add the demo;
  2. wait for `navigator.serviceWorker.ready` and control;
  3. go offline and reload;
  4. Today shows the stored books and progress;
  5. «Открыть раздел» opens the unit and an answer is kept;
  6. the pages panel says a network is needed.
- **PROD-005.**
  - A unit test of `applyTheme`.
  - E2e: «Тёмная» is applied and kept over a reload.
  - E2e: «Светлая» wins over emulated dark.
- **PROD-011.**
  - Boundary component test: a throwing child shows the message, its sibling stays, and retry remounts.
  - A test of the unreadable pack's card.
- **PROD-009.** The configuration test.
- **PROD-004.** The languages spec.
- **PROD-002.** A StartView test with no books.

## Risks

- **A worker in other e2e specs.** Each Playwright context is fresh, so no worker outlives a test.
- **The wait before mount.** The store opens in milliseconds, and the 300 ms limit bounds a slow one.
