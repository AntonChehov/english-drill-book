# program Specification

## Purpose
The built-in study program that joins books into topics, and the rules of progress over it.

## Requirements

### Requirement: PROG-001 Topic passed

A topic SHALL be passed when every exercise of its lead unit is done and at least `min(supplementMin, number of its supplements in books the learner has added)` of those supplements are done.

#### Scenario: The lead unit alone is not enough

- **GIVEN** the demo program, `supplementMin` 2, and topic 1 with supplements 1.1, 1.2 and 1.3 of the drill book
- **WHEN** every exercise of unit 1 of the course is done and one of the supplements is done
- **THEN** topic 1 is not passed

#### Scenario: Two drills complete the topic

- **GIVEN** every exercise of unit 1 of the course is done
- **WHEN** a second supplement of topic 1 is done
- **THEN** topic 1 is passed, the third supplement not being needed

#### Scenario: Fewer supplements than the minimum

- **GIVEN** a topic with one supplement and `supplementMin` 2
- **WHEN** its lead unit and its one supplement are done
- **THEN** the topic is passed

### Requirement: PROG-002 Share of a level

The share of a level SHALL be the passed topics of that level divided by all topics of that level. A level with no topics SHALL have share 1.

#### Scenario: Half of a level

- **GIVEN** the demo program, two topics at A1
- **WHEN** one of them is passed
- **THEN** the share of A1 is 0.5

#### Scenario: A level without topics

- **GIVEN** a program whose scale has a level no topic is at
- **WHEN** shares are computed
- **THEN** that level's share is 1

### Requirement: PROG-003 Current level

The current level SHALL be the highest level L such that the share of L and of every level below it is at least `levelThreshold`. If no level qualifies, the current level SHALL be "below" the lowest level of the scale.

#### Scenario: Below the scale

- **GIVEN** the demo program and no topic passed
- **WHEN** the current level is computed
- **THEN** it is below A1

#### Scenario: A level reached

- **GIVEN** both A1 topics are passed and no A2 topic
- **WHEN** the current level is computed
- **THEN** it is A1

#### Scenario: A gap below stops the climb

- **GIVEN** both A2 topics are passed and one A1 topic of two
- **WHEN** the current level is computed
- **THEN** it is below A1

### Requirement: PROG-004 The plus

The current level SHALL carry a "+" when the share of the next level is at least `plusThreshold`.

#### Scenario: Half of the next level

- **GIVEN** both A1 topics and one A2 topic of two are passed, `plusThreshold` 0.5
- **WHEN** the current level is shown
- **THEN** it is A1+

#### Scenario: Below with the plus

- **GIVEN** one A1 topic of two is passed
- **WHEN** the current level is shown
- **THEN** it is below A1 with the plus, shown as «почти A1»

#### Scenario: No plus at the top

- **GIVEN** every topic is passed
- **WHEN** the current level is shown
- **THEN** it is A2, without a plus

### Requirement: PROG-010 Built-in programs checked

Built-in programs SHALL be validated in CI against the schema and these rules: topic IDs are unique; every `level` is on `scale`; `goal.from` and `goal.to` are on `scale` in that order; every unit and exercise a topic refers to exists in the expected structure of its book's profile.

#### Scenario: The demo program passes

- **GIVEN** the built-in demo program
- **WHEN** the unit tests run in CI
- **THEN** it is valid against `contracts/program.schema.json` and breaks none of the rules

#### Scenario: A broken program is caught

- **GIVEN** a copy of the demo program with a duplicate topic ID, a level off the scale, the goal reversed, a pack it does not require, a unit the profile does not have, or an exercise past its unit's count
- **WHEN** the check runs on it
- **THEN** it reports that rule broken

### Requirement: PROG-015 The demo program

The demo program SHALL run over two demo books, a short course and a short drill book, so that the public demo shows the joining of books.

#### Scenario: Topics join the two books

- **GIVEN** the built-in demo program
- **WHEN** its topics are read
- **THEN** there are four, in course order, topic N led by unit N of the course with exercises N.1, N.2 and N.3 of the drill book as its supplements, topics 1 and 2 at A1 and topics 3 and 4 at A2, the goal A1 → A2
