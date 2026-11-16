# Spec Delta

## MODIFIED Requirements

### Requirement: CHK-006 Almost right

The verdict SHALL be `near` when the answer is not `ok`, the normalised answer has at least 4 characters, and some variant has the same number of words as the answer and a Levenshtein distance of exactly 1 from it, the edit falling inside one word that has at least 4 characters in the variant and that does not differ from the variant's word only by an ending, one of `-s`, `-es`, `-d`, `-ed` or none in each.

#### Scenario: One wrong letter

- **GIVEN** the key `the weather is beautiful`
- **WHEN** the answer `the weather is beatiful` is checked
- **THEN** it is `near`

#### Scenario: A missing word is not a typo

- **GIVEN** the key `she is a doctor`
- **WHEN** the answer `she is doctor` is checked
- **THEN** it is `bad`

#### Scenario: A missing auxiliary is not a typo

- **GIVEN** the key `I am ill`
- **WHEN** the answer `I ill` is checked
- **THEN** it is `bad`

#### Scenario: A short answer

- **GIVEN** the key `cat`
- **WHEN** the answer `cut` is checked
- **THEN** it is `bad`

#### Scenario: Two wrong letters

- **GIVEN** the key `I do not know`
- **WHEN** the answer `I do not no` is checked
- **THEN** it is `bad`

#### Scenario: The wrong article is not a typo

- **GIVEN** the key `she is an artist`
- **WHEN** the answer `she is a artist` is checked
- **THEN** it is `bad`

#### Scenario: A short word one letter off is not a typo

- **GIVEN** the key `he is an engineer`
- **WHEN** the answer `he as an engineer` is checked
- **THEN** it is `bad`

#### Scenario: A wrong ending is not a typo

- **GIVEN** the key `she lives in Paris`
- **WHEN** the answer `she live in Paris` is checked
- **THEN** it is `bad`

#### Scenario: The ending -es is not a typo

- **GIVEN** the key `two brushes`
- **WHEN** the answer `two brushs` is checked
- **THEN** it is `bad`

#### Scenario: A slip inside a longer word is a typo

- **GIVEN** the key `she is an architect`
- **WHEN** the answer `she is an arhitect` is checked
- **THEN** it is `near`
