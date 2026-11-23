# Spec Delta

## Purpose

The screen where the learner answers the exercises of a unit, has them checked and keeps the last word on every item.

## MODIFIED Requirements

### Requirement: PLAY-009 Done

An exercise SHALL be done when some check has every item `ok`, taking into account the learner's changes to that check's verdicts. The date of the first completing check SHALL be kept. Any exercise SHALL be done when the learner marks it done (PLAY-013, PLAY-021).

#### Scenario: Every item correct

- **WHEN** a check finds every item of an exercise correct
- **THEN** the exercise is done

#### Scenario: Completed by hand

- **GIVEN** a check with every item correct but one
- **WHEN** the learner counts that item as correct
- **THEN** the exercise is done

#### Scenario: Completion taken back and returned

- **GIVEN** an exercise done by a check
- **WHEN** the learner counts one of its items as wrong
- **THEN** the exercise is no longer done
- **AND** when they undo that, it is done again

#### Scenario: Marked done

- **GIVEN** an exercise of typed answers with no check
- **WHEN** the learner marks it done
- **THEN** the exercise is done, and the time of the mark is kept as when it was done

## ADDED Requirements

### Requirement: PLAY-021 Do the exercise in one action

Every exercise not yet done SHALL offer the action «Выполнить упражнение», to every learner. It SHALL make the exercise done without its answers being typed or checked, and the exercise SHALL then count as done in the unit's count, on Today and in Topics. The action SHALL be recorded in the log as a mark as done with the answers typed so far. For an open exercise it SHALL be the "mark as done" action of PLAY-013.

#### Scenario: An exercise left empty

- **GIVEN** unit 1 of the course is open and nothing is done
- **WHEN** the learner chooses «Выполнить упражнение» on exercise 1.1 without typing anything
- **THEN** exercise 1.1 says «сделано», the header says one of three is done, and no item has a verdict
- **AND** the button is no longer offered on exercise 1.1

#### Scenario: Counted on Today

- **GIVEN** exercise 1.1 of the course was done by «Выполнить упражнение»
- **WHEN** Today is shown
- **THEN** step 1 reads «сделано 1 из 3» and the link 1.1 says it is done

#### Scenario: Answers typed so far

- **GIVEN** the learner typed answers to two items of exercise 1.2 and did not check
- **WHEN** they choose «Выполнить упражнение»
- **THEN** the log holds a mark as done with those two answers and no verdicts, and the answers stay in their fields

#### Scenario: An open exercise

- **WHEN** an open exercise is shown and not done
- **THEN** its action to mark it done is «Выполнить упражнение»

#### Scenario: Could not be kept

- **GIVEN** the browser refuses the write
- **WHEN** the learner chooses «Выполнить упражнение»
- **THEN** the exercise says it could not be kept and offers to repeat, and is not shown as done
