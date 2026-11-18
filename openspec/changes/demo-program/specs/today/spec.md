# Spec Delta

## Purpose

What the learner is offered to do on opening the app.

## ADDED Requirements

### Requirement: PROG-005 Today's topic

Today's topic SHALL be the first topic in order that is not passed. When every topic is passed, Today SHALL say the program is complete. (The focus topic of PROG-005 comes with Topics, in the next change.)

#### Scenario: The first topic not passed

- **GIVEN** topic 1 of the demo program is passed and topic 2 is not
- **WHEN** Today is shown
- **THEN** today's topic is topic 2

#### Scenario: Not passed is not the same as not started

- **GIVEN** topic 1 is in progress and topic 2 is passed
- **WHEN** Today is shown
- **THEN** today's topic is topic 1

#### Scenario: Program complete

- **GIVEN** every topic of the demo program is passed
- **WHEN** Today is shown
- **THEN** Today says «Программа пройдена: все темы зачтены.» and shows no topic

### Requirement: PROG-006 What Today shows

Today SHALL show: the goal, the current level on the scale with the share of each level, and today's topic with its lead unit and supplements and their states. (The daily checklist of PROG-006 comes with PROG-009, in the next change.)

#### Scenario: A fresh start

- **GIVEN** the demo books were just added
- **WHEN** Today is shown
- **THEN** it shows the goal «A1 → A2», the level «ниже A1», a row per level with «пройдено 0 из 2 тем», and today's topic «Глагол to be: am, is, are» at A1, «не начата», with step 1 «сделано 0 из 3» and step 2 «сделано 0 из 2 нужных» and the note «Для зачёта темы достаточно 2 из 3.»

#### Scenario: Progress shown

- **GIVEN** the three exercises of unit 1 of the course and two drill exercises of topic 1 are done
- **WHEN** Today is shown
- **THEN** the row A1 reads «пройдено 1 из 2 тем», the level is «почти A1», and today's topic is the second

#### Scenario: Steps lead to Study

- **GIVEN** Today shows topic 1
- **WHEN** the learner chooses «Открыть раздел», exercise 1.2 of step 1, or «Упр. 1.2» of step 2
- **THEN** Study opens in the same window at unit 1 of the course, at exercise 1.2 of the course, or at exercise 1.2 of the drill book

#### Scenario: Not by colour alone

- **GIVEN** exercise 1.1 of the course is done and 1.2 is not
- **WHEN** Today is shown
- **THEN** each exercise link says by a sign and its accessible name whether it is done, and each level's share is given as text beside its bar

### Requirement: PROG-013 One active program

Exactly one program SHALL be active at a time. With no active program, Today SHALL offer the units of the added books directly.

#### Scenario: The demo program is active with the demo books

- **GIVEN** the demo books are stored
- **WHEN** Today is shown, also after a reload
- **THEN** the demo program's goal and today cards are shown above the book cards

#### Scenario: No books, no program

- **GIVEN** a clean browser
- **WHEN** Today is shown
- **THEN** there is no goal card and no today card, only the offer to try the demo
