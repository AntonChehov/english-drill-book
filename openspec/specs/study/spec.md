# study Specification

## Purpose
The screen where the learner answers the exercises of a unit, has them checked and keeps the last word on every item.

## Requirements

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

### Requirement: PLAY-020 The explanation and the help

Study SHALL show what the pack says to the learner in the language of the interface: the unit's `theory` at the top of the exercises, in a block «Объяснение» that is open when the unit opens and can be folded, and under the task of each exercise its `help`, above the items. A span the pack marks `*…*` SHALL be shown in italics and marked with the language being learned. A unit without a `theory` SHALL have no such block, and an exercise without a `help` nothing between its task and its items.

#### Scenario: The explanation of a unit

- **GIVEN** the demo books are added
- **WHEN** the learner opens unit 1 of the course
- **THEN** before the card «Упражнения» a block «Объяснение» is open and shows the unit's explanation in Russian, paragraph by paragraph
- **AND** the English forms in it are in italics and marked `en`

#### Scenario: Folding the explanation

- **GIVEN** unit 1 of the course is open
- **WHEN** the learner folds «Объяснение»
- **THEN** only its title is shown, and the exercises move up
- **AND** when the unit is opened again, the block is open

#### Scenario: The help of an exercise

- **WHEN** exercise 1.1 of the course is shown
- **THEN** under its task and above item 1 the exercise's `help` is shown in Russian
- **AND** the prompt of item 1 is in English and marked `en`

#### Scenario: A pack without them

- **GIVEN** a unit with no `theory` whose exercises have no `help`
- **WHEN** it is shown
- **THEN** there is no block «Объяснение», and nothing stands between an exercise's task and its items

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
