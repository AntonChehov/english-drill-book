# Spec Delta

## ADDED Requirements

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
