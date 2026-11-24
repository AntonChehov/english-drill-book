# Proposal

## Why

Slice 1.7 is the last of milestone 1. Study shows a unit's pages beside its exercises, but the learner cannot do anything with them:
- enlarge a page;
- see the neighbouring page, where a rule or an exercise's start often sits;
- copy a word from the page;
- give the exercises more room, or hide either panel.

Size: large. The change has six requirements and adds three settings to the store and to `contracts/export.schema.json` (additive: a file exported before still validates).

## What Changes

- **Zoom** (DOC-002). The pages panel's header gets «Уменьшить», «Увеличить» and «По ширине». Zoom goes from 50 % to 300 % of the panel's width. The zoom is kept per book.
- **Neighbouring pages** (DOC-003). «Предыдущая страница» above the first shown page and «Следующая страница» below the last. Each press adds one page, up to the book's ends. The extra pages are kept until another unit is opened.
- **Selectable text** (DOC-009). A text layer from the PDF library lies over each drawn page, so text can be selected and copied.
- **The split** (DOC-006). From 1024 px a separator between the panels can be dragged with the pointer and moved with the arrow keys. «Скрыть страницы» and «Скрыть упражнения» collapse a panel to a strip with a button that restores it. The split and the collapsed panel are kept.
- **Only the shown pages, quickly** (DOC-004). Pages are already drawn only near the viewport. An end-to-end test now measures that the first page is visible within 2 s of opening a unit.
- **The library** (DOC-005). pdf.js already draws the pages, from the app's origin, and is loaded on demand. A test now checks that the start screen loads without it.
- **Settings.** `pageZoom` (per book), `studySplit` and `collapsedPanel` are added to the store's `Settings` and to the export schema.

Requirements delivered: DOC-002, DOC-003, DOC-004, DOC-005, DOC-006 and DOC-009, added to `pages`.

Left for later:
- **Reading a book by ranges.** Opening an own book by ranges of bytes rather than whole comes with own books (BOOK-002, milestone 3). The demo files, 31 KB and 39 KB, are smaller than one range read, so DOC-004's "never loaded whole" has nothing to save on them.
- **Collapsing below 1024 px.** There the panels are stacked (PROD-006).
- **Larger touch targets** (H-11's known deduction).
