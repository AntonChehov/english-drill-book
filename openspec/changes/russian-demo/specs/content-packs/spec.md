# Spec Delta

## ADDED Requirements

### Requirement: PACK-004 The language of the demo books

The demo books SHALL address the learner in Russian: the titles, the pages about the books, the explanations of grammar, the tasks of the exercises, the ideas of an open exercise and the headings of the answer key. The material of the exercises SHALL be in English: prompts, choices, connected texts and their models, sample answers and answers. A pack SHALL say the language of its titles and tasks and of its exercise material, and the interface SHALL mark each text with that language.

#### Scenario: A unit of the demo in Russian

- **GIVEN** the demo is added
- **WHEN** unit 1 of the demo course is opened
- **THEN** the unit's title and the task of exercise 1.1 are in Russian and marked `ru`
- **AND** the prompt of item 1 is in English and marked `en`

#### Scenario: The explanation page

- **WHEN** the pages of unit 2 of the demo course are shown
- **THEN** the explanation is in Russian, with the English forms and example sentences in English

#### Scenario: The key

- **WHEN** the answer of item 1 of exercise 1.1 is shown
- **THEN** it is the English answer printed in the book's key

#### Scenario: A pack without a language

- **WHEN** a pack that names no language is validated
- **THEN** it is accepted, its titles and tasks taken as English and its material as English
