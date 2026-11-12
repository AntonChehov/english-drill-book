# Spec Delta

## Purpose

How a key says what is accepted, how an answer and a key are compared, and which verdict the learner gets. The checker is deterministic, works without a network and does not depend on the interface.

## ADDED Requirements

### Requirement: CHK-001 Pattern syntax

Each gradable item SHALL have `accept`, a non-empty list of patterns; an answer is correct if it matches any variant of any pattern. A pattern SHALL support `(text)`, optional; `[a|b|c]`, exactly one alternative, possibly empty; and `a / b`, a loose alternative, tried for every split of 1 to 4 words on each side. Groups SHALL NOT nest. The characters `( ) [ ] |` and a spaced `/` SHALL have no literal meaning. An empty pattern SHALL mean that a blank field is correct.

#### Scenario: Optional text

- **GIVEN** the pattern `yes, (of course) I can`
- **WHEN** it is expanded
- **THEN** the variants are `yes, of course I can` and `yes, I can`

#### Scenario: Optional ending inside a word

- **GIVEN** the pattern `two book(s)`
- **WHEN** it is expanded
- **THEN** the variants are `two books` and `two book`

#### Scenario: One of several

- **GIVEN** the pattern `she [is|was] late`
- **WHEN** it is expanded
- **THEN** the variants are `she is late` and `she was late`

#### Scenario: An empty alternative

- **GIVEN** the pattern `[the|] sugar`
- **WHEN** it is expanded
- **THEN** the variants are `the sugar` and `sugar`

#### Scenario: A loose alternative covering several words

- **GIVEN** the pattern `we have / we've got a dog`
- **WHEN** the answers `we have a dog` and `we've got a dog` are checked
- **THEN** both are `ok`

#### Scenario: A loose alternative covering one word

- **GIVEN** the pattern `a few / some people came`
- **WHEN** the answers `a few people came` and `some people came` are checked
- **THEN** both are `ok`

#### Scenario: A chain of loose alternatives

- **GIVEN** the pattern `red / green / blue`
- **WHEN** the answers `red`, `green` and `blue` are checked
- **THEN** each is `ok`

#### Scenario: A slash inside a word is text

- **GIVEN** the pattern `and/or`
- **WHEN** it is expanded
- **THEN** there is one variant, and the answer `and or` is `ok`

#### Scenario: Any pattern of the list is enough

- **GIVEN** an item with `accept` of `at home` and `in the house`
- **WHEN** the answer `in the house` is checked
- **THEN** it is `ok`

### Requirement: CHK-002 Invalid patterns

A pattern SHALL be invalid if a group is unclosed or nested, if `)`, `]` or `|` stands outside a group or `|` inside `( )`, if a loose alternative has no word on one of its sides, or if it expands to more than 4000 variants. An invalid pattern SHALL be reported with its reason and SHALL NOT be used for checking.

#### Scenario: Unclosed group

- **WHEN** the pattern `she (is late` is expanded
- **THEN** it is reported as invalid with the reason "unclosed group"

#### Scenario: Nested group

- **WHEN** the pattern `she [is (not)|was] late` is expanded
- **THEN** it is reported as invalid with the reason "nested group"

#### Scenario: A character outside its group

- **WHEN** the patterns `is) late`, `is] late`, `is | was` and `(is|was)` are expanded
- **THEN** each is reported as invalid with the reason "stray character"

#### Scenario: A slash with nothing beside it

- **WHEN** the patterns `/ late` and `late /` are expanded
- **THEN** each is reported as invalid with the reason "dangling slash"

#### Scenario: Too many variants

- **GIVEN** a pattern of twelve groups of two alternatives each, 4096 variants
- **WHEN** it is expanded
- **THEN** it is reported as invalid with the reason "too many variants"

#### Scenario: Exactly at the limit

- **GIVEN** a pattern that expands to 4000 variants
- **WHEN** it is expanded
- **THEN** it is valid

#### Scenario: One bad pattern spoils the key

- **GIVEN** an item with `accept` of `at home` and `in (the house`
- **WHEN** its key is prepared
- **THEN** the key is not built and the second pattern is reported

### Requirement: CHK-003 Normalisation

Before comparison the answer and each variant SHALL be normalised: (1) Unicode NFC, lower case; (2) `ё` to `е`; (3) typographic apostrophes and quotes to ASCII; (4) contractions expanded; (5) `'s` read three ways (`'s`, ` is`, ` has`) and `'d` two ways (` would`, ` had`), independently for the first four occurrences of a text and later ones as the fourth; (6) everything except letters, digits and apostrophes removed, spaces included.

#### Scenario: Case, spaces and final punctuation

- **GIVEN** the key `She is at home.`
- **WHEN** the answers `SHE IS AT HOME`, `she  is at home` and `She is at home` are checked
- **THEN** each is `ok`

#### Scenario: A contraction for the long form and the reverse

- **GIVEN** the keys `I do not know` and `they won't come`
- **WHEN** `I don't know` is checked against the first and `they will not come` against the second
- **THEN** both are `ok`

#### Scenario: Every contraction of step 4

- **WHEN** `won't`, `can't`, `cannot`, `shan't`, `isn't`, `I'm`, `you're`, `we've` and `they'll` are normalised
- **THEN** they equal `will not`, `can not`, `can not`, `shall not`, `is not`, `I am`, `you are`, `we have` and `they will`

#### Scenario: An ellipsis

- **GIVEN** the key `well... yes`
- **WHEN** the answer `well… yes` is checked
- **THEN** it is `ok`

#### Scenario: Cannot

- **GIVEN** the key `I can't swim`
- **WHEN** the answers `I cannot swim` and `I can not swim` are checked
- **THEN** both are `ok`

#### Scenario: A typographic apostrophe

- **GIVEN** the key `it isn't cold`
- **WHEN** the answer `it isn’t cold` is checked
- **THEN** it is `ok`

#### Scenario: The readings of 's

- **GIVEN** the keys `he is tired`, `he has gone` and `it is Anna's bag`
- **WHEN** `he's tired`, `he's gone` and `it's Anna's bag` are checked, each against its key
- **THEN** each is `ok`

#### Scenario: Two different readings in one answer

- **GIVEN** the key `she has said he is ill`
- **WHEN** the answer `she's said he's ill` is checked
- **THEN** it is `ok`

#### Scenario: The readings of 'd

- **GIVEN** the keys `I would like tea` and `I had seen it`
- **WHEN** `I'd like tea` is checked against the first and `I'd seen it` against the second
- **THEN** both are `ok`

#### Scenario: A composed and a decomposed letter

- **GIVEN** a key with `é` as one code point
- **WHEN** the answer has `e` followed by a combining acute accent
- **THEN** it is `ok`

### Requirement: CHK-004 Letters

"Letters" SHALL mean Latin and Cyrillic letters.

#### Scenario: An answer in Russian

- **GIVEN** the key `Она дома.`
- **WHEN** the answers `она дома` and `ОНА ДОМА` are checked
- **THEN** both are `ok`

#### Scenario: Ё and Е

- **GIVEN** the key `всё`
- **WHEN** the answer `все` is checked
- **THEN** it is `ok`

#### Scenario: Other characters are dropped

- **GIVEN** the key `tea`
- **WHEN** the answer `tea ☕` is checked
- **THEN** it is `ok`

### Requirement: CHK-005 Correct answer

The verdict SHALL be `ok` when some reading of the answer equals some reading of some variant after normalisation.

#### Scenario: Equal after normalisation

- **GIVEN** the key `He's been here.`
- **WHEN** the answer `he has been here` is checked
- **THEN** it is `ok`

### Requirement: CHK-006 Almost right

The verdict SHALL be `near` when the answer is not `ok`, the normalised answer has at least 4 characters, and some variant has the same number of words as the answer and a Levenshtein distance of exactly 1 from it.

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

### Requirement: CHK-007 Wrong answer

The verdict SHALL be `bad` for anything else that is not blank.

#### Scenario: Another word

- **GIVEN** the key `she goes`
- **WHEN** the answer `she went` is checked
- **THEN** it is `bad`

#### Scenario: Punctuation only

- **GIVEN** the key `she goes`
- **WHEN** the answer `?` is checked
- **THEN** it is `bad`

### Requirement: CHK-008 Blank answer

A blank answer SHALL NOT be checked and SHALL have no verdict, unless the key accepts blank (CHK-001), in which case it SHALL be `ok`.

#### Scenario: Nothing typed

- **GIVEN** the key `she goes`
- **WHEN** an empty answer and an answer of spaces only are checked
- **THEN** neither has a verdict

#### Scenario: The key accepts a blank

- **GIVEN** an item with `accept` of the empty pattern and `the`
- **WHEN** an empty answer, the answer `the` and the answer `a` are checked
- **THEN** the first two are `ok` and the third is `bad`

### Requirement: CHK-009 Items with choices

For `choices` items the verdict SHALL be `ok` or `bad` by the same comparison; `near` SHALL NOT apply.

#### Scenario: The right and the wrong option

- **GIVEN** an item with the choices `than` and `then` and `accept` of `than`
- **WHEN** `than` is checked, and then `then`
- **THEN** the first is `ok` and the second is `bad`, although it is one letter away

#### Scenario: No option chosen

- **GIVEN** the same item
- **WHEN** nothing is chosen
- **THEN** there is no verdict

### Requirement: CHK-012 A key accepts itself

Every variant of every pattern SHALL be `ok` against its own pattern.

#### Scenario: Generated patterns

- **GIVEN** any valid pattern
- **WHEN** each of its variants is checked against it as an answer
- **THEN** each is `ok`

### Requirement: CHK-013 Determinism

Checking SHALL be deterministic and SHALL NOT depend on locale or time.

#### Scenario: Repeated checks

- **GIVEN** a key and an answer
- **WHEN** the answer is checked twice, before and after other checks
- **THEN** the verdict is the same

#### Scenario: A letter whose case depends on the language

- **WHEN** the answer `IT IS` is checked against the key `it is`
- **THEN** it is `ok` whatever the language of the system, Turkish included

### Requirement: CHK-014 Speed

Checking one item against its prepared key SHALL take under 5 ms on the reference machine for any valid pattern (constraint C-06).

#### Scenario: The largest valid key

- **GIVEN** a key whose pattern expands to 4000 variants, each with `'s` and `'d`
- **WHEN** an answer one edit away from one of them is checked 200 times
- **THEN** the median time of a check is under 5 ms
