# Design

## Context

`checkAnswer` (`src/domain/checking/check.ts`) returns `near` when some reading of the answer of at least 4 characters is one edit (`isOneEditApart`) from a reading of a variant with as many words. Readings are normalised (lower case, apostrophes, spaces, contractions; CHK-003, CHK-004), so the comparison is between normalised texts.

## Decisions

### D1. Where the edit falls

Readings have no spaces, so the words of the answer are taken from its text with its spaces, after the same steps of normalisation, and matched to the reading, `'s` and `'d` read as the reading reads them. A letter inserted or removed next to the same letter could be at any of them (*like swimming* / *likes swimming*): the places of the edit run from the end of the common beginning back to the start of the common end, and every word they touch is a word the edit could fall in. The key's word is the answer's word with the edit applied; the edit is `near` only if it is a slip in every such word, and where two words meet, in both.

### D2. The word must be long enough

`near` needs `keyWord` to have at least 4 characters. Articles, auxiliaries, pronouns and prepositions are all shorter, and confusing them is a grammar error (*a/an*, *is/as*, *am/an*). `NEAR_MIN_LENGTH` (4, on the whole text) stays: it keeps a one-word answer such as *cut* for *cat* `bad`.

### D3. Not an ending

`near` is refused when `keyWord` and `answerWord` are one stem with two different endings from `""`, `s`, `es`, `d`, `ed`. Checked by trying, for each ending of `keyWord`, the stem left after removing it, and asking whether `answerWord` is that stem with another ending. This covers *live/lives*, *play/plays*, *brushs/brushes*, *workd/worked*, and, as a cost, a slip that happens to add or drop such an ending, such as *cars* typed for *car*, which becomes `bad`; a learner shown «Неверно» for it can count it by hand (PLAY-008).

### D4. Speed

The words of the answer are found once per check, and where they end in a reading once per reading, only when a candidate one edit away is found. Each candidate then costs a walk over the words before the edit and a few string comparisons. A speed test checks an answer of 80 words against 8 patterns, each with 25 options one letter from it in a different word, near the largest key allowed, within CHK-014 (5 ms).

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-10, C-11 | unit tests named `@req CHK-006` for every rule of D1–D3, coverage of `src/domain` ≥ 95 % |
| C-06 | `pnpm test:speed` passes |
