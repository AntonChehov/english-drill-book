# Spec Delta

## ADDED Requirements

### Requirement: PACK-004 What the pack says to the learner

A pack MAY carry, in the language of the interface, what the book says to the learner: a unit's `title` and `theory` (plain paragraphs; a span marked `*…*` is in the language being learned) and an exercise's `help` (what to do, 1 to 1000 characters, on any kind). The demo packs SHALL carry all three for every unit and exercise; the exercises' material, the books' titles and pages SHALL stay in English. A stored demo pack of an earlier version SHALL be read again.

#### Scenario: The fields are accepted

- **GIVEN** a pack whose unit has a `theory` and whose exercises of each kind have a `help`
- **WHEN** it is validated
- **THEN** it is accepted

#### Scenario: A help too long

- **GIVEN** an exercise whose `help` is 1001 characters
- **WHEN** the pack is validated
- **THEN** it is refused with the path of that `help` and the rule `maxLength`

#### Scenario: The demo packs carry the texts

- **WHEN** the demo books are read
- **THEN** every unit of both packs has a Russian title and a `theory`, and every exercise a `help`, as `demo/<book>.pack.json` states them
- **AND** the prompts and the keys of the items are the English ones printed in the books

#### Scenario: The books are unchanged

- **WHEN** the demo books are built from sources with the Russian texts
- **THEN** the PDFs are byte for byte the ones published before, and their hashes in `documents.json` are the same

#### Scenario: A pack of the earlier version

- **GIVEN** the demo packs stored by the app at version `1.0.0`, with attempts on exercise 1.1
- **WHEN** the app is opened with the version `1.1.0` demo
- **THEN** the demo books are read again from the published PDFs and the packs carry the Russian texts
- **AND** the attempts on exercise 1.1 are still there
