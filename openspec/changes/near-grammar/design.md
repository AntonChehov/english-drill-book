# Design

## Context

`checkAnswer` (`src/domain/checking/check.ts`) returns `near` when some reading of the answer of at least 4 characters is one edit (`isOneEditApart`) from a reading of a variant with as many words. Readings are normalised (lower case, apostrophes, spaces, contractions; CHK-003, CHK-004), so the comparison is between normalised texts.

## Decisions

### D1. Where the edit falls

Both texts have the same number of words, so one edit changes exactly one word, or, when it inserts or removes a space, joins or splits words and changes the count. Words are split on single spaces (readings are normalised). The changed word is the first word that differs; the key's word at that place is `keyWord`, the answer's is `answerWord`. A pair of texts whose differing words are more than one is not `near`.

### D2. The word must be long enough

`near` needs `keyWord` to have at least 4 characters. Articles, auxiliaries, pronouns and prepositions are all shorter, and confusing them is a grammar error (*a/an*, *is/as*, *am/an*). `NEAR_MIN_LENGTH` (4, on the whole text) stays: it keeps a one-word answer such as *cut* for *cat* `bad`.

### D3. Not an ending

`near` is refused when `keyWord` and `answerWord` are one stem with two different endings from `""`, `s`, `es`, `d`, `ed`. Checked by trying, for each ending of `keyWord`, the stem left after removing it, and asking whether `answerWord` is that stem with another ending. This covers *live/lives*, *play/plays*, *brushs/brushes*, *workd/worked*, and, as a cost, a true typo at the end, such as *houss* for *house*, which becomes `bad`; a slip in an ending is rare and a learner shown «Неверно» for it can count it by hand (PLAY-008).

### D4. Speed

The extra work happens only for a candidate already one edit away, at most a few per answer: splitting two short texts and comparing a few strings. CHK-014 (5 ms) is unaffected; the speed tests run as before.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-10, C-11 | unit tests named `@req CHK-006` for every rule of D1–D3, coverage of `src/domain` ≥ 95 % |
| C-06 | `pnpm test:speed` passes |
