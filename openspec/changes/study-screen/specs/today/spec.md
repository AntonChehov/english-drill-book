# Spec Delta

## Purpose

What the learner is offered to do on opening the app.

## ADDED Requirements

### Requirement: PROG-014 Today before programs

Until programs are delivered, Today SHALL list the units of the demo book in order with their done counts and links to Study.

#### Scenario: Units lead to Study

- **GIVEN** the demo books are added
- **WHEN** the learner chooses a unit on the start screen
- **THEN** Study opens for that unit

#### Scenario: Done counts

- **GIVEN** the learner completed two exercises of unit 1
- **WHEN** they return to the start screen
- **THEN** unit 1 shows two of three done, and the book shows its total

#### Scenario: Where to continue

- **GIVEN** unit 1 is finished and unit 2 is not
- **WHEN** the start screen is shown
- **THEN** unit 2 is marked as the one to continue
