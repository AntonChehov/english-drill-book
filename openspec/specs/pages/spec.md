# pages Specification

## Purpose
Showing the pages of a book, drawn from its PDF, beside the exercises of the unit being studied.

## Requirements

### Requirement: DOC-001 The pages of a unit

The pages panel SHALL show the pages the pack gives for the current unit or exercise, rendered from the book's file, in order, scrolling vertically.

#### Scenario: The unit's own pages

- **WHEN** unit 3 of the demo course is opened
- **THEN** the panel shows the pages of unit 3 and of no other unit, in the book's order

#### Scenario: To the exercise

- **WHEN** the learner presses the number of an exercise
- **THEN** the pages scroll to the page on which that exercise starts

#### Scenario: Quickly

- **WHEN** a unit is opened with the book already fetched
- **THEN** its first page is visible within 2 seconds

### Requirement: DOC-008 The demo needs a connection

The demo books' pages SHALL be fetched from the app's own origin. Without a network connection the panel SHALL say that the demo needs one.

#### Scenario: Offline

- **GIVEN** the demo is added and the network is off
- **WHEN** a unit is opened
- **THEN** the pages panel says the demo book's pages need a connection, and the exercises beside it can be answered and checked

#### Scenario: Back online

- **GIVEN** the panel said the pages need a connection
- **WHEN** the network is back and the learner repeats
- **THEN** the pages are shown without reloading the page

### Requirement: PLAY-018 The course's pages beside the drills

The pages panel SHALL have a source switch. While working on an exercise from a supplementary book the learner SHALL be able to show, instead of that exercise's own page, the pages of the topic's unit in the grammar course, and switch back.

#### Scenario: The course's pages

- **GIVEN** unit 1 of the drill book is open, showing its page 2, with «Сборник упражнений» pressed
- **WHEN** the learner presses «Курс: раздел 1»
- **THEN** the panel shows pages 3 and 4 of the course in place of the drill book's page, and «Курс: раздел 1» is pressed

#### Scenario: Back to the drill book

- **GIVEN** the panel shows the course's pages beside unit 1 of the drill book
- **WHEN** the learner presses «Сборник упражнений», or the number of exercise 1.2
- **THEN** the panel shows the drill book's page 2 again, scrolled to exercise 1.2 after its number, and «Сборник упражнений» is pressed

#### Scenario: Each opening shows the unit's own pages

- **GIVEN** the learner showed the course's pages beside unit 1 of the drill book
- **WHEN** unit 1 of the drill book is opened again
- **THEN** the panel shows the drill book's page

#### Scenario: Only beside the drills

- **WHEN** unit 1 of the course is open
- **THEN** its pages panel has no source switch

#### Scenario: By keyboard

- **GIVEN** unit 1 of the drill book is open
- **WHEN** the learner reaches the switch by Tab and presses Enter on «Курс: раздел 1»
- **THEN** the course's pages are shown and the switch says by its pressed state which pages are shown

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
