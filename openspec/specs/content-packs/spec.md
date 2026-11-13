# content-packs Specification

## Purpose
What a pack must satisfy before the app uses it, and how the demo books become packs.

## Requirements

### Requirement: PACK-001 Validation of packs

Every pack, bundled or built from a file, SHALL be validated against `pack.schema.json` and the semantic rules of PACK-002 before it is stored or used. An error SHALL name the JSON path and the rule that failed.

#### Scenario: A valid pack

- **WHEN** each `*.valid.json` pack example of the contract is validated
- **THEN** it is accepted

#### Scenario: A schema error is located

- **GIVEN** a pack whose second unit has no `title`
- **WHEN** it is validated
- **THEN** it is refused with the path `/units/1` and the rule `required`

#### Scenario: Several errors

- **GIVEN** a pack with an error in two different exercises
- **WHEN** it is validated
- **THEN** both are reported, each with its own path

#### Scenario: The validator and the schema agree

- **GIVEN** any pack example of the contract, valid or invalid
- **WHEN** it is validated by the app and by a general JSON Schema validator
- **THEN** the app reports a schema error exactly when the general validator refuses the pack
- **AND** an example that breaks only a semantic rule passes the general validator and is refused by the app with that rule

#### Scenario: The demo books are validated too

- **WHEN** the demo books are read
- **THEN** each pack passes validation before it is shown

### Requirement: PACK-002 Semantic rules

Beyond the schema a pack SHALL satisfy: (1) unit IDs are unique in the pack, exercise IDs are unique in the pack, item IDs are unique in their exercise; (2) the `accept` of every item builds a valid key (CHK-002); (3) for an item with `choices`, at least one choice is accepted by the key.

#### Scenario: A repeated unit ID

- **GIVEN** a pack with two units of ID `3`
- **WHEN** it is validated
- **THEN** it is refused with the path of the second unit's `id` and the rule `unique-unit-id`

#### Scenario: A repeated exercise ID in another unit

- **GIVEN** a pack whose units 1 and 2 both have an exercise `1.1`
- **WHEN** it is validated
- **THEN** it is refused with the rule `unique-exercise-id`

#### Scenario: Item IDs repeat across exercises

- **GIVEN** a pack whose every exercise numbers its items from 1
- **WHEN** it is validated
- **THEN** it is accepted

#### Scenario: A repeated item ID in one exercise

- **GIVEN** an exercise with two items of ID `2`
- **WHEN** the pack is validated
- **THEN** it is refused with the rule `unique-item-id`

#### Scenario: A key that cannot be built

- **GIVEN** an item with the pattern `she (is late`
- **WHEN** the pack is validated
- **THEN** it is refused with the path of that pattern and the rule `invalid-key`

#### Scenario: Choices none of which is right

- **GIVEN** an item with the choices `a` and `an` and `accept` of `the`
- **WHEN** the pack is validated
- **THEN** it is refused with the rule `no-accepted-choice`

### Requirement: PACK-003 The demo book

The demo book SHALL be added with one action and SHALL need no file from the learner. It SHALL need a network connection when it is added and when its pages are shown; it is not kept for offline use.

#### Scenario: One action

- **GIVEN** a visitor on the start screen
- **WHEN** they press "Попробовать демо"
- **THEN** the demo course and the demo drill book are listed with their units and the number of exercises of each
- **AND** no file was asked for

#### Scenario: What was read is what was written

- **WHEN** the demo books are read
- **THEN** every unit, exercise, item and key of their source is in the packs, with the IDs printed in the books

#### Scenario: Found by content

- **GIVEN** the text of a demo book with two empty pages put in front
- **WHEN** it is read
- **THEN** the pack is the same except that every page range is two pages later

#### Scenario: Only the app's own origin

- **WHEN** the demo is added
- **THEN** every request goes to the app's own origin

#### Scenario: The demo cannot be loaded

- **GIVEN** the request for a demo book fails
- **WHEN** the visitor presses "Попробовать демо"
- **THEN** the reason is explained in Russian where the demo was being added, with a way to try again
- **AND** no browser dialog appears and the rest of the screen stays usable

#### Scenario: A file that is not the demo book

- **GIVEN** the file fetched for a demo book differs from the one published with the app
- **WHEN** the visitor presses "Попробовать демо"
- **THEN** the file is refused as damaged or of another version before it is read, and nothing of it is shown

#### Scenario: Trying again

- **GIVEN** the demo could not be loaded and the network is back
- **WHEN** the visitor tries again
- **THEN** the demo is added without reloading the page

#### Scenario: The first screen stays light

- **WHEN** the start screen is loaded and nothing is pressed
- **THEN** no file of the PDF library and no demo book is requested
