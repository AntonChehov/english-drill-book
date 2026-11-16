# Proposal

## Why

Validation of `study-screen` showed answers with a grammar error one letter away from the key reported as **≈ Почти — проверьте написание**: «She is a artist» for *an artist*, «I have an car» for *a car*, «He as an engineer», «live» for *lives*, «plays» for *play*, «brushs» for *brushes*. CHK-006 calls an answer `near` when it is one edit from a variant of the key and has as many words, so any one-letter difference counts as a typo. But the article, the auxiliary and the ending of a verb or a noun are what the exercises drill. Told to check the spelling, a learner looks for a typo that is not there and misses the point of the item; and «Почти» is not counted, so nothing is lost by calling it wrong instead.

## What Changes

- **CHK-006 is narrowed.** An answer one edit from a variant is `near` only when the edit falls inside one word that has at least 4 letters in the key, and that word does not differ from the key's only by an ending `-s`, `-es`, `-d` or `-ed` (one has the ending and the other has another or none: *live/lives*, *play/plays*, *brushs/brushes*, *workd/worked*). Everything else that is not `ok` is `bad` (CHK-007), as before.
- **Study** says the same in its hint: «Почти» is for a slip in a longer word; a wrong short word or ending is «Неверно».
- **Roadmap**: what validation of `study-screen` found outside this change is recorded as technical debt.

Requirements delivered: **CHK-006** (modified, `03-answer-checking.md`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `answer-checking`: CHK-006 Almost right.

## Impact

- Changed: `src/domain/checking/check.ts` and its tests; `docs/product/03-answer-checking.md` (CHK-006); the hint of Study; end-to-end tests that type an almost-right answer; `docs/roadmap.md`.
- Answers already in a learner's log keep the verdicts they were given: a verdict is stored with its attempt (DATA-002).
- Depends on `study-screen` being merged.
