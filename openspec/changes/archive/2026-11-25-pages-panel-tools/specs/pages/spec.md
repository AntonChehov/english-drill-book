# Spec Delta

## Purpose

Showing the pages of a book, drawn from its PDF, beside the exercises of the unit being studied.

## ADDED Requirements

### Requirement: DOC-002 Zoom

The pages panel SHALL have zoom in, zoom out and fit to width, from 50 % to 300 % of the panel's width. The zoom SHALL be remembered per book.

#### Scenario: Per book

- **GIVEN** the learner set the course's pages to 150 %
- **WHEN** the page is reloaded and a unit of the drill book is opened
- **THEN** the drill book's pages are at 100 %, and a unit of the course opens at 150 %

#### Scenario: At the ends

- **WHEN** the zoom is 300 %
- **THEN** «Увеличить» is disabled

### Requirement: DOC-003 A page before or after

The pages panel SHALL extend the shown range by one page before or after on each press, up to the first and the last page of the book.

#### Scenario: The book's first page

- **WHEN** the shown range starts at page 1
- **THEN** there is no «Предыдущая страница»

#### Scenario: Another unit

- **GIVEN** the learner added the next page in unit 1
- **WHEN** unit 2 is opened
- **THEN** only unit 2's own pages are shown

### Requirement: DOC-004 Only the shown pages

Only the pages being shown SHALL be drawn, and the first page SHALL be visible within 2 seconds of opening a unit. The book SHALL never be split or converted.

#### Scenario: A page far below

- **GIVEN** pages were added below the unit's own
- **WHEN** they are not scrolled near the viewport
- **THEN** they are not drawn

### Requirement: DOC-005 The PDF library

Pages SHALL be drawn by the PDF library that reads the books, served from the app's own origin and loaded after the first screen is shown.

#### Scenario: Today without the library

- **GIVEN** the demo is added
- **WHEN** Today is opened
- **THEN** the PDF library is not loaded until a unit is opened

### Requirement: DOC-006 The split

On screens from 1024 px the border between the pages panel and the exercises SHALL be draggable, by pointer and by keyboard, and the split SHALL be remembered. Either panel SHALL be collapsible and restorable.

#### Scenario: By keyboard

- **GIVEN** the separator has focus
- **WHEN** the learner presses Arrow Right
- **THEN** the pages take 5 % more of the row, up to 75 %

#### Scenario: Collapse and restore

- **WHEN** the learner presses «Скрыть страницы»
- **THEN** the pages panel becomes a strip with «Показать страницы», which has focus, and the state is kept over a reload

### Requirement: DOC-009 Selectable text

Text on a page SHALL be selectable and copyable.

#### Scenario: A word copied

- **WHEN** the learner double-clicks a word on a page
- **THEN** that word is selected and can be copied
