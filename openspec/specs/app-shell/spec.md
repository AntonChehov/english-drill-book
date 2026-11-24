# app-shell Specification

## Purpose
The window every screen of the app lives in: navigation that stays in one window, a stable address for every view, and a defined outcome for addresses that lead nowhere.

## Requirements

### Requirement: PROD-001 Single window

The app SHALL be a single-page application. All study SHALL happen in one window; no screen SHALL open another window or tab.

#### Scenario: Navigation stays in the window

- **WHEN** the learner follows any navigation link of the app
- **THEN** the destination is shown in the same window
- **AND** no other window or tab is opened

### Requirement: PROD-008 Addressable views

Each screen SHALL have its own URL. Reloading the page or opening that URL in another browser SHALL restore the same view.

#### Scenario: Reload keeps the view

- **GIVEN** the learner is on a screen other than the start screen
- **WHEN** they reload the page
- **THEN** the same screen is shown

#### Scenario: A copied address opens the same view

- **WHEN** the address of a screen is opened in a clean browser profile
- **THEN** that screen is shown

#### Scenario: Unknown address

- **WHEN** an address that matches no screen is opened
- **THEN** a not-found view is shown in Russian with a link to the start screen
- **AND** the page is not blank

### Requirement: PROD-006 Layout by width

Layout SHALL adapt from 360 px wide upward. In Study, pages and exercises SHALL sit side by side from 1024 px and stack below that.

#### Scenario: A wide window

- **WHEN** Study is shown 1280 px wide
- **THEN** the pages and the exercises are side by side

#### Scenario: A phone

- **WHEN** Study is shown 360 px wide
- **THEN** the pages and the exercises are stacked, both reachable, and nothing scrolls sideways

### Requirement: PROD-007 Keyboard

Every action SHALL be available from the keyboard. In Study, Enter SHALL check the current exercise and Tab SHALL move through its fields in order.

#### Scenario: An exercise by keyboard

- **GIVEN** the focus is in the first field of an exercise
- **WHEN** the learner types, presses Tab between fields and Enter in the last
- **THEN** the fields were visited in order and the exercise is checked

#### Scenario: From the start screen to the next unit

- **WHEN** the learner uses only the keyboard
- **THEN** they can open a unit, answer and check an exercise, reveal an answer, change a verdict and go to the next unit, with the focused element always visibly marked

### Requirement: PROD-002 First launch

On first launch with no data the app SHALL open Today, which offers to try the demo book with one action and says where the learner's own books will be added.

#### Scenario: Own books not yet possible

- **GIVEN** no book is added
- **WHEN** Today is shown
- **THEN** it offers «Попробовать демо» and says in one line that own books are added in the library, which comes in a later version, with no link

### Requirement: PROD-003 Offline after the first load

After its first successful load the app SHALL open and work without a network connection, with the packs and the work kept in the browser. The demo books' pages are the exception (`PACK-003`, `DOC-008`).

#### Scenario: Reload offline

- **GIVEN** the app was loaded once and the demo added
- **WHEN** the network is lost and the page is reloaded
- **THEN** Today shows the stored books and progress, «Открыть раздел» opens the unit, an answer is checked and kept, and the pages panel says the demo needs a network

### Requirement: PROD-004 Languages

The interface SHALL be in Russian. Pack content SHALL be shown as authored, and marked `lang="en"`, the interface `lang="ru"`.

#### Scenario: Interface text about pack content

- **WHEN** a page of a unit is shown
- **THEN** its accessible name is Russian interface text, while the unit's title beside it is marked English

### Requirement: PROD-005 Themes

Light and dark themes SHALL follow the system setting and SHALL be overridable on «О приложении»; the choice is kept.

#### Scenario: The choice outlasts a reload

- **GIVEN** the system is dark
- **WHEN** the learner chooses «Светлая» and reloads
- **THEN** the light theme is shown from the first screen

#### Scenario: Not kept

- **GIVEN** the store cannot be written
- **WHEN** the learner chooses «Тёмная»
- **THEN** the dark theme is shown and a message beside the choice says it was not kept

### Requirement: PROD-009 No browser dialogs

The app SHALL never show a blocking browser dialog (`alert`, `confirm`, `prompt`). Destructive actions SHALL use an inline two-step confirmation.

#### Scenario: Guarded by the gate

- **WHEN** code calling `alert`, `confirm` or `prompt` is added
- **THEN** `pnpm lint` fails

### Requirement: PROD-011 A failure stays in its part

A failure in one part SHALL show a message in that part and leave the rest of the app usable. No failure SHALL produce a blank page.

#### Scenario: A part fails to draw

- **GIVEN** the exercises of a unit fail while being drawn
- **THEN** their column says «Не удалось показать эту часть.» with «Попробовать снова», and the pages panel and the top bar stay usable

#### Scenario: A stored pack no longer reads

- **GIVEN** one stored demo pack fails validation
- **WHEN** Today is shown
- **THEN** that book's card says «Книгу не удалось прочитать» and the other book and the rest of Today stay usable
