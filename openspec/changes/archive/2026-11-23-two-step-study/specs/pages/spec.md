# Spec Delta

## Purpose

Showing the pages of a book, drawn from its PDF, beside the exercises of the unit being studied.

## ADDED Requirements

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
