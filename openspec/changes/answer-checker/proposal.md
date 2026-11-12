# Proposal

## Why

Everything a learner does in the app ends in a verdict on what they typed. The verdict must tell a right answer in another shape from a typo, and a typo from a grammar mistake, without a network and the same way every time. The checker has no dependency on screens, storage or books, so it can be built and proven first, and every later slice (the reader of the demo books, the study screen) builds on a checker that is already trusted.

## What Changes

- A pure function library in `src/domain/checking`: key patterns and their expansion, normalisation of answers and keys, the verdicts `ok`, `near` and `bad`, the blank answer, items with choices.
- Property tests of the checker and a measurement of its speed.
- Six clarifications of `docs/product/03-answer-checking.md` that writing the scenarios and the first review showed to be needed (design D8). They change no intent; they settle cases the text leaves open or states inconsistently, and bound the size of a key so that CHK-014 holds.

Requirements delivered, from `docs/product/03-answer-checking.md`: **CHK-001**, **CHK-002**, **CHK-003**, **CHK-004**, **CHK-005**, **CHK-006**, **CHK-007**, **CHK-008**, **CHK-009**, **CHK-012**, **CHK-013**, **CHK-014**.

Left for later changes:

- Connected text, CHK-010 and CHK-011 (milestone 2).
- Any screen: nothing in the app calls the checker yet. The study screen of slice 1.5 does.
- Validation of packs against the pattern syntax when a book is read (slice 1.3 uses the functions of this change).

## Capabilities

### New Capabilities

- `answer-checking`: how a key says what is accepted, how an answer and a key are compared, and which verdict the learner gets.

### Modified Capabilities

None.

## Impact

- New: `src/domain/checking/` with its unit tests.
- Changed: `docs/product/03-answer-checking.md` (the clarifications of design D8).
- Runtime dependencies: none. Development dependency: `fast-check` for the property tests.
- The bundle does not change: no screen imports the checker yet, so it is not in the build. The pull request has no visual change.
- Validation (step 6 of `docs/process.md`): there is nothing for a validating agent to drive in a browser. The holdout scenarios that probe CHK are run with slice 1.5, when answers can be typed.
