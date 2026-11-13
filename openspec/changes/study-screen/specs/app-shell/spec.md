# Spec Delta

## ADDED Requirements

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
