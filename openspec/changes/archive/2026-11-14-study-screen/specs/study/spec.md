# Spec Delta

## Purpose

The screen where the learner answers the exercises of a unit, has them checked and keeps the last word on every item.

## ADDED Requirements

### Requirement: PLAY-001 Two panels

Study SHALL have two panels: the book's pages on one side and exercises on the other. Opened for a unit, it SHALL show that unit's pages and its exercises in book order. Previous and next unit SHALL be one action away.

#### Scenario: A unit is opened

- **GIVEN** the demo books are added
- **WHEN** the learner opens unit 1 of the course
- **THEN** the pages of unit 1 and its exercises 1.1, 1.2 and 1.3 are shown, in that order

#### Scenario: The next unit

- **GIVEN** unit 1 is open
- **WHEN** the learner presses "next unit"
- **THEN** unit 2 is shown, and "previous unit" leads back

#### Scenario: The ends of the book

- **WHEN** the first unit is open, and then the last
- **THEN** "previous unit" is disabled on the first and "next unit" on the last

### Requirement: PLAY-002 Items

An `items` exercise SHALL show each item's prompt, if any, and an input: a text field, or the options when the item has `choices`.

#### Scenario: A typed item

- **WHEN** an exercise of typed answers is shown
- **THEN** each item has its number, its prompt and a text field

#### Scenario: An item with options

- **WHEN** an exercise with choices is shown
- **THEN** each item offers its options, one of which can be chosen without typing

### Requirement: PLAY-003 Verdicts

Checking an exercise SHALL grade every non-blank item and SHALL show a verdict per item: correct, almost (`near`), wrong. Verdicts SHALL be conveyed by text or icon as well as colour.

#### Scenario: Three verdicts

- **GIVEN** one item answered correctly, one with a single mistyped letter in a long word and one wrongly
- **WHEN** the exercise is checked
- **THEN** the rows say "Верно", "Почти" and "Неверно", each with its own sign

#### Scenario: A blank item

- **GIVEN** an item left empty
- **WHEN** the exercise is checked
- **THEN** that row has no verdict

### Requirement: PLAY-004 Almost

A `near` verdict SHALL tell the learner to check spelling. It SHALL NOT reveal the key, and the item SHALL NOT count as correct until the learner fixes it or counts it by hand.

#### Scenario: Almost is not correct

- **GIVEN** every item of an exercise is correct but one, which is almost
- **WHEN** the exercise is checked
- **THEN** that row asks to check the spelling and does not show the answer
- **AND** the exercise is not done

### Requirement: PLAY-005 Drafts

Answers SHALL be saved as drafts while typing and restored when the unit is reopened, before and after checking.

#### Scenario: Typed and not checked

- **GIVEN** the learner typed answers to half of an exercise without checking
- **WHEN** they reload the page and open the unit again
- **THEN** the answers are in their fields

#### Scenario: After a check

- **GIVEN** a checked exercise
- **WHEN** the unit is reopened
- **THEN** the answers and their verdicts are shown as they were

### Requirement: PLAY-006 Attempts

Each check SHALL be recorded as an attempt. Editing an answer after a check SHALL clear that item's verdict until the next check.

#### Scenario: A check is recorded

- **WHEN** an exercise is checked
- **THEN** the log holds an attempt with the answers and the verdict of every graded item

#### Scenario: Editing clears one verdict

- **GIVEN** a checked exercise
- **WHEN** the learner changes the answer of one item
- **THEN** that row's verdict disappears at once and the other rows keep theirs
- **AND** the next check judges the new answer

#### Scenario: The check could not be kept

- **GIVEN** the browser refuses the write
- **WHEN** the learner checks an exercise
- **THEN** the exercise says the result could not be kept and offers to repeat, and repeating after the fault is gone records the check

### Requirement: PLAY-007 One answer at a time

The learner SHALL be able to reveal the key of any single item at any time, before or after checking. There SHALL be no action that reveals a whole exercise at once. The attempt SHALL record which items were revealed.

#### Scenario: Before any check

- **WHEN** the learner asks for the answer of item 3 of an unchecked exercise
- **THEN** the key of item 3 is shown and of no other item
- **AND** the log records that item 3 was revealed

#### Scenario: No way to reveal all

- **WHEN** an exercise is shown, checked or not
- **THEN** no control reveals the answers of all its items

### Requirement: PLAY-008 The last word

Next to every checked item the learner SHALL be able to change its verdict by hand, in either direction, and to undo the change. An item judged by hand SHALL be visibly distinct from one judged by the app.

#### Scenario: Counting a wrong answer as correct

- **GIVEN** a checked item marked wrong
- **WHEN** the learner counts it as correct
- **THEN** the row says it is correct and counted by hand

#### Scenario: Counting an accepted answer as wrong

- **GIVEN** a checked item marked correct
- **WHEN** the learner counts it as wrong
- **THEN** the row says it is wrong and judged by hand

#### Scenario: Undo

- **GIVEN** an item whose verdict was changed by hand
- **WHEN** the learner undoes the change
- **THEN** the row shows the app's verdict again, with no mark of a judgement by hand

### Requirement: PLAY-009 Done

An exercise SHALL be done when some check has every item `ok`, taking into account the learner's changes to that check's verdicts. The date of the first completing check SHALL be kept. An `open` exercise SHALL be done when the learner marks it done.

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

### Requirement: PLAY-010 Done stays done

A done exercise SHALL stay done if the learner later answers it wrongly.

#### Scenario: A later wrong answer

- **GIVEN** a done exercise
- **WHEN** the learner changes an answer to a wrong one and checks again
- **THEN** that row is wrong and the exercise is still done

### Requirement: PLAY-011 States and counts

The unit header SHALL show how many of its exercises are done. Each exercise SHALL show its own state: untouched, in progress, done.

#### Scenario: The three states

- **GIVEN** a unit with one exercise done, one with some answers typed and one untouched
- **WHEN** the unit is shown
- **THEN** the header says one of three is done, and each exercise names its state

### Requirement: PLAY-013 Open exercises

An `open` exercise SHALL show a field, a "show sample" action when the pack provides a sample, and a "mark as done" action.

#### Scenario: Writing freely

- **WHEN** the learner writes in an open exercise
- **THEN** no verdict is given, and the sample appears only when asked for

#### Scenario: Marked as done

- **WHEN** the learner marks the open exercise as done
- **THEN** it is done and counts in the unit's count

#### Scenario: A connected text, for now

- **WHEN** the exercise that asks for a connected text is shown
- **THEN** it is presented like an open exercise, with the model as its sample

### Requirement: PLAY-015 No help from the browser

Input fields SHALL disable browser autocorrect, autocapitalise and spellcheck.

#### Scenario: The fields of an exercise

- **WHEN** an exercise is shown
- **THEN** every answer field has autocorrect, autocapitalise, autocomplete and spellcheck switched off
