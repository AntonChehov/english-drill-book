# 07 — Pages

## Purpose

The learner wants to see the page: the layout, the pictures, the rule box. The pages panel of Study shows the pages of the learner's own file that belong to the current unit or exercise. Adding books and recognising editions is covered in `02-content-packs.md`; this file covers showing pages.

## Requirements

- **DOC-001 [M1]** The pages panel shows the pages the pack gives for the current unit or exercise, rendered from the book's file, in order, scrolling vertically.
- **DOC-002 [M1]** The panel has zoom in, zoom out and fit to width. The zoom is remembered per book.
- **DOC-003 [M1]** The panel can extend the shown range by one page before or after. Why: a rule or the start of an exercise often sits on the neighbouring page.
- **DOC-004 [M1]** Only the pages being shown are read from the file and drawn; the book is never loaded whole and is never split or converted. The first page is visible within 2 seconds of opening a unit on the reference machine.
- **DOC-005 [M1]** Pages are drawn by the same PDF library that reads the books (`BOOK-003`), not by the browser's built-in viewer. Why: the built-in viewer cannot be limited to a unit's pages or controlled by the app, and the library is needed anyway to read keys. The library is served from the app's own origin and is loaded after the first screen is shown.
- **DOC-006 [M1]** On screens from 1024 px the border between the pages panel and the exercises can be dragged; the split is remembered. Either panel can be collapsed.
- **DOC-007 [M3]** When the browser requires access to the file to be granted again, the panel shows one button that asks for it. Exercises, checking and progress work in the meantime.
- **DOC-008 [M1]** The demo books' pages are fetched from the app's own origin. Without a network connection the panel says that the demo needs one.
- **DOC-009 [M1]** Text on a page can be selected and copied.
