# Spec Delta

## Purpose

The screen where the learner answers the exercises of a unit, has them checked and keeps the last word on every item.

## ADDED Requirements

### Requirement: PLAY-017 Two steps of a topic

Opened for a topic of a program, Study SHALL be a sequence of two steps: first the topic's unit in the grammar course, then the topic's exercises in the supplementary books. When the last exercise of the first step is done, Study SHALL offer the second step. The learner SHALL be able to move between the steps at any time; the order is a guide, not a lock.

#### Scenario: The steps of a course unit

- **GIVEN** the demo books are added
- **WHEN** the learner opens unit 1 of the course, from Today, from the book cards or from another unit
- **THEN** Study shows «Тема: Глагол to be: am, is, are» with «1. Курс: правило и упражнения» marked «сейчас» and «2. Сборник упражнений: практика» as a link

#### Scenario: To the drills and back

- **GIVEN** unit 1 of the course is open and none of its exercises is done
- **WHEN** the learner follows «2. Сборник упражнений: практика»
- **THEN** unit 1 of the drill book opens in the same window at exercise 1.1, with step 2 marked «сейчас»
- **AND** «1. Курс: правило и упражнения» leads back to unit 1 of the course

#### Scenario: Another topic

- **GIVEN** unit 1 of the course is open
- **WHEN** the learner presses "next unit"
- **THEN** Study shows the steps of the topic «Present simple»

#### Scenario: The next step offered

- **GIVEN** exercises 1.1 and 1.2 of the course are done and unit 1 of the course is open
- **WHEN** the learner finishes exercise 1.3
- **THEN** below the exercises Study says «Курс по этой теме пройден. Дальше — практика в сборнике упражнений.», announced to a screen reader, with the link «Перейти к практике»
- **AND** the link opens unit 1 of the drill book at exercise 1.1

#### Scenario: No offer before the course unit is done

- **GIVEN** exercise 1.3 of the course is not done
- **WHEN** unit 1 of the course is open
- **THEN** Study offers no next step below the exercises, and step 2 is still a link

#### Scenario: Not by colour alone

- **WHEN** Study shows the steps of a topic
- **THEN** the current step is marked by the word «сейчас» and exposed as the current step, and the other step is a link reached by Tab
