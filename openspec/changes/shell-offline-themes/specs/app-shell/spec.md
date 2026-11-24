# Spec Delta

## Purpose

The window every screen of the app lives in: navigation that stays in one window, a stable address for every view, and a defined outcome for addresses that lead nowhere.

## ADDED Requirements

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
