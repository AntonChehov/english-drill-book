# Spec Delta

## Purpose

The list of the active program's topics, where the learner sees where each stands and chooses the one to work on.

## ADDED Requirements

### Requirement: PROG-008 Topics

Topics SHALL list every topic in order, grouped by level, with its state (not started, in progress, passed) and done counts. The learner SHALL be able to set any topic not passed as the focus; a passed topic is shown as passed and cannot be chosen.

#### Scenario: Grouped by level

- **GIVEN** the demo books are added and exercise 1.1 of the course is done
- **WHEN** the learner opens «Темы»
- **THEN** there is a group A1 with topics 1 and 2 and a group A2 with topics 3 and 4, in that order
- **AND** topic 1 reads «в процессе» with «курс 1 из 3 · практика 0 из 2» and is marked «тема дня», and topic 2 reads «не начата»

#### Scenario: A passed topic

- **GIVEN** topic 1 is passed
- **WHEN** Topics is shown
- **THEN** topic 1 reads «✓ пройдена» and offers no choice as the focus

#### Scenario: Choosing the focus

- **GIVEN** nothing is done
- **WHEN** the learner chooses topic 3 in Topics, by pointer or by keyboard
- **THEN** Today is shown with topic 3 as today's topic
- **AND** after a reload Today still shows topic 3

#### Scenario: The choice could not be kept

- **GIVEN** the browser refuses the write
- **WHEN** the learner chooses a topic
- **THEN** Topics stays shown, says beside that topic that the choice could not be kept, and choosing it again after the fault is gone works

#### Scenario: Before the demo is added

- **GIVEN** a clean browser
- **WHEN** the learner opens «Темы»
- **THEN** it says the topics appear once the demo is added and links to Today

#### Scenario: Reached from Today

- **GIVEN** the demo books are added
- **WHEN** the learner chooses «другая тема» on Today's card, or «Темы» in the top bar
- **THEN** Topics is shown in the same window
