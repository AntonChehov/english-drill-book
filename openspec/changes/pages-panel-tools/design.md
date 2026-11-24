# Design

## Context

- `PagesPanel.vue` draws each page on a canvas at the panel's width and the pixel ratio when it nears the viewport; `bookOf(pack)` opens the demo PDF once; `PdfPages` (`src/storage/pdf/render.ts`) has `size` and `draw`.
- pdf.js is imported on demand, its worker an asset of the app; the CSP is `default-src 'self'`.
- From 1024 px `.exercises-column` is `flex: 0 0 clamp(26rem, 36vw, 34rem)`, the pages take the rest.
- Settings are stored by `name`, typed by `Settings`; the export schema's `settings` has `additionalProperties: false`.

## Goals / Non-Goals

**Goals:** DOC-002, DOC-003, DOC-004, DOC-005, DOC-006 and DOC-009, as worded in `docs/product/07-source-documents.md`.

**Non-Goals:**
- reading own books by byte ranges (milestone 3);
- pinch or ctrl + wheel zoom, which stays the browser's;
- collapsing below 1024 px;

## Decisions

### D1 Three settings

`Settings` and `contracts/export.schema.json#/properties/settings` gain:
- `pageZoom`: an object from pack id (`slug`) to a number from 0.5 to 3. It is kept per book.
- `studySplit`: the pages column's share of the row, a number from 0.3 to 0.75.
- `collapsedPanel`: `"pages"` or `"exercises"`. It is absent when neither is collapsed.

Additive; the store's version stays.

A small composable, `src/ui/study/preferences.ts`, reads each setting once per Study and writes on change:
- the split and the zoom are written debounced, 300 ms after the last change;
- a read failure gives the defaults; a write failure is not shown: the setting applies for the visit, and a lost layout choice costs little.

### D2 Zoom

The panel's header gets a toolbar `role="toolbar"`, `aria-label="Масштаб"`:
- «Уменьшить» (−) and «Увеличить» (+). They step through 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, and are disabled at the ends.
- «По ширине», `aria-pressed` while the zoom is 1.
- Between them, the current zoom in a `role="status"`, as «100 %».

The draw width is `width × zoom`. A changed zoom re-draws the pages near the viewport, as a changed width does now. The list scrolls sideways when the zoom is above 1. The page at the top of the viewport stays there across a change.

### D3 Neighbouring pages

`PdfPages` gains `count`, the book's number of pages. The panel keeps `before` and `after` counts of extra pages. It shows `first − before … last + after`, clamped to 1 … `count`:
- «Предыдущая страница» as a button above the list, hidden when the first page is 1;
- «Следующая страница» below the list, hidden at `count`.

After «Предыдущая страница» the view stays on the page that was first. The counts reset when `props.pages` changes, that is, with another unit or another source.

`scrollToPage` is unchanged.

### D4 The text layer

`PdfPages.draw` gains a text-layer target. After the sharp pass, `render.ts` builds pdf.js's `TextLayer` from `page.getTextContent()` into a `div.text-layer` laid over the canvas. It has the canvas's scale, `lang="en"` and `aria-hidden="true"`: the canvas keeps its `aria-label`, and a page is not read twice.

Its CSS is the minimum of pdf.js's text-layer rules (transparent text, absolute spans, `--scale-factor`), in our stylesheet. pdf.js sets styles through the CSSOM, which the CSP allows.

It is rebuilt with each sharp redraw and cancelled with the draw's signal.

### D5 The split and collapsing

**The separator.** From 1024 px the row is a grid: `grid-template-columns: var(--pages) auto 1fr`, with `--pages` set from `studySplit` (default 0.6). Between the columns is a separator:
- `role="separator"`, `aria-orientation="vertical"`, `aria-label="Граница между страницами и упражнениями"`;
- `aria-valuemin="30"`, `aria-valuemax="75"`, and `aria-valuenow` the pages' percent;
- `tabindex="0"` and a 12 px hit area with a visible focus ring.

**Moving it.**
- A pointer drag uses `setPointerCapture`, with `--pages` updated each frame.
- Arrow Left and Right move it by 5 %; Home and End go to 30 % and 75 %.
- The value is clamped, and the exercises column also keeps a minimum of 22rem.

**Collapsing.**
- «Скрыть страницы» sits at the end of the pages header and «Скрыть упражнения» at the end of the exercises header.
- A collapsed panel becomes a 2.75rem strip holding one button, «Показать страницы» or «Показать упражнения», with the separator hidden.
- Only one panel can be collapsed at a time.
- Focus moves to the restore button on collapse and back to the hide button on restore.

Below 1024 px none of this is shown.

### D6 Measuring DOC-004 and DOC-005

- **DOC-004.** `PagesPanel` marks `performance.mark("first-page")` when the first page's first pass is drawn. An end-to-end test, skipped on WebKit (its drawing speed is in `docs/tech-debt.md`), opens unit 1 of each demo book from Today. It asserts the time from the click to the mark is under 2000 ms. It also asserts that a page added far below is not drawn before it is scrolled near.
- **DOC-005.** An end-to-end test loads Today with the demo already in the store. It asserts that no request for the pdf.js chunk or its worker is made, and that opening a unit then requests both from the app's origin.

## Tests

- Unit tests of the zoom steps and the split clamp (pure functions in `src/ui/study/layout.ts`), named `@req DOC-002` and `@req DOC-006`.
- A schema test in which an export with the three new settings validates and a zoom of 4 fails, named `@req DOC-002`.
- End-to-end tests:
  - **DOC-002.** «Увеличить» twice gives «150 %», the page is wider than the panel, and after a reload the same book is at 150 % and the other book at 100 %.
  - **DOC-003.** The previous page and the next page are added and are hidden at the book's ends.
  - **DOC-009.** A word on a page selected with a double click is in `getSelection()`.
  - **DOC-006.** A drag and the arrow keys move the separator, which is kept over a reload. A collapse and a restore work by keyboard, and focus follows them.
  - **DOC-004, DOC-005.** As in D6.
- axe on Study in both themes.

## Risks

- A zoom below 1024 px scrolls inside the panel only; the page never scrolls sideways (PROD-006).
