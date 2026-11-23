# Spec Delta

## Purpose

What the learner is offered to do on opening the app.

## ADDED Requirements

### Requirement: PROG-007 Today's topic opens Study

Opening today's topic SHALL lead to Study in the same window, at the topic's first unfinished step (PLAY-017), and Study SHALL offer a way back to Today.

#### Scenario: At the course step

- **GIVEN** today's topic is topic 1 and nothing is done
- **WHEN** the learner chooses «Открыть раздел» on Today
- **THEN** unit 1 of the course opens in the same window at exercise 1.1, with step 1 marked «сейчас»

#### Scenario: At the drills step

- **GIVEN** today's topic is topic 1 and every exercise of unit 1 of the course is done
- **WHEN** the learner chooses «Открыть раздел» on Today
- **THEN** unit 1 of the drill book opens at exercise 1.1, with step 2 marked «сейчас»

#### Scenario: The way back

- **GIVEN** Study was opened from Today
- **WHEN** the learner chooses «Сегодня» in the top bar
- **THEN** Today is shown in the same window with the work done in Study counted

## RENAMED Requirements

- FROM: `### Requirement: PROG-014 Today before programs`
- TO: `### Requirement: PROG-014 The units of the added books`

## MODIFIED Requirements

### Requirement: PROG-014 The units of the added books

Today SHALL list the units of each added book in order, with their done counts and links to Study; while a program is active, below it.

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

#### Scenario: Below the program

- **GIVEN** the demo books are added
- **WHEN** Today is shown
- **THEN** the book cards follow the goal card, the today card and the daily checklist
