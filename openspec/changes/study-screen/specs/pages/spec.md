# Spec Delta

## Purpose

Showing the pages of a book beside its exercises.

## ADDED Requirements

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
