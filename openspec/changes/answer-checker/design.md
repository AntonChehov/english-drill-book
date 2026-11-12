# Design

## Context

`docs/product/03-answer-checking.md` describes the checker. A checker of the same intent has been in daily use in the owner's private reader; this change rebuilds it as a typed, tested library and settles the cases that reader left to chance. Nothing in the app calls it yet.

## Goals / Non-Goals

**Goals:**

- The checker is a set of pure functions in `src/domain` (C-08) with every exported function tested (C-10).
- A key is prepared once and checked many times; the check itself stays far below 5 ms (C-06, CHK-014).
- An invalid key is reported as data, never thrown, so the reader of a book can list what is wrong.

**Non-Goals:**

- Connected text (CHK-010, CHK-011).
- Any interface. Wording of verdicts for the learner belongs to slice 1.5.
- Guessing intent beyond the rules: no dictionary, no synonyms, no language model.

## Decisions

### D1. Module and its interface

```
src/domain/checking/
  pattern.ts     expandPattern(pattern) -> { ok: true, variants } | { ok: false, error }
  normalise.ts   readings(text) -> Reading[]        Reading = { text, words }
  distance.ts    isOneEditApart(a, b) -> boolean
  key.ts         compileKey(accept) -> { ok: true, key } | { ok: false, errors }
  check.ts       checkAnswer(key, answer, { choices? }) -> 'ok' | 'near' | 'bad' | null
  index.ts       the exports above
```

`null` is "no verdict" (CHK-008). Errors carry the index of the pattern and one of the reasons `unclosed-group`, `nested-group`, `stray-character`, `dangling-slash`, `too-many-variants`. Why a result and not an exception: a book has thousands of keys, and its reader reports all the bad ones at once.

### D2. Reading a pattern (CHK-001)

A pattern is split on white space outside groups into words. A word may contain groups (`book(s)`, `[a|an]`); a group may contain spaces. A `/` that is a word of its own is the loose alternative; a `/` inside a word (`and/or`) is ordinary text and is dropped by normalisation like any other punctuation.

Expansion, in this order:

1. Each loose alternative is resolved from left to right. With `L` words before the slash and `R` after it, for every `i` from 1 to `min(4, L)` and `j` from 1 to `min(4, R)` two candidates are produced: the pattern without the slash and the `j` words after it, and the pattern without the slash and the `i` words before it. A following slash is resolved in each candidate in turn, so `a / b / c` gives `a`, `b`, `c`. A word with a group counts as one word.
2. In each candidate every group is expanded: `(x)` to `x` and nothing, `[a|b|c]` to each alternative.

Variants are counted as they are produced, before duplicates are removed, and expansion stops when the count passes 4000 (CHK-002). Why count before removing duplicates: it bounds the work, not only the result.

### D3. Normalisation and readings (CHK-003, CHK-004)

Steps 1 – 5 of CHK-003 are applied to the text with its spaces. The result is split on white space, and each piece is stripped to its kept characters; pieces left empty are dropped. A **reading** is the pieces joined without spaces, together with their count, the number of words. Why the count is taken after contractions are expanded and before spaces are removed: CHK-006 compares numbers of words, and both sides must count `don't` the same way, as two.

- Lower case is `String.prototype.toLowerCase`, which does not depend on locale (CHK-013). `toLocaleLowerCase`, `Intl` and `localeCompare` are not used; a lint rule forbids them in this directory.
- Kept characters: letters of the Latin and Cyrillic scripts (`\p{Script=Latin}`, `\p{Script=Cyrillic}`), the digits `0`–`9`, the apostrophe.
- Contractions are matched at the end of a word only.

`'s` and `'d` (CHK-003 step 5): each occurrence is read independently, so `she's said he's ill` matches `she has said he is ill`. To bound the work, only the first four occurrences in a text are read independently (at most 81 readings); later ones keep the reading of the fourth. Why not one reading for all, as the private reader does: two different readings in one sentence are common in exercises on the present perfect.

### D4. The prepared key

`compileKey` expands every pattern of `accept`, takes the readings of every variant and stores them in a map from the text of a reading to the set of its word counts, with an index by length for the search of D5. It also records whether a blank is accepted: some variant has a reading with empty text. If any pattern is invalid the key is not built.

A key is prepared when an exercise is opened, not on every check. Preparing is not part of the 5 ms of CHK-014 (D8, clarification 4); its own time is measured and reported.

### D5. The verdict (CHK-005 – CHK-009)

1. The answer is blank when it is empty or white space only. Blank: `ok` if the key accepts a blank, otherwise no verdict.
2. `ok` if the text of some reading of the answer is in the key.
3. With `choices`, anything else is `bad`.
4. `near` if some reading of the answer has at least 4 characters and the key holds a reading with the same number of words exactly one edit away (one character inserted, removed or replaced). Only key readings whose length differs by at most one are compared, and the comparison stops at the second difference; the full distance is never computed.
5. Otherwise `bad`.

An answer of punctuation only (`?`) is not blank: it is `bad` unless the key accepts a blank.

### D6. Property tests (CHK-012, CHK-013)

`fast-check`, a development dependency, with a fixed seed so that a run does not depend on chance (C-10). Properties:

- every variant of a generated valid pattern is `ok` against that pattern (CHK-012);
- changing case, doubling spaces, adding final punctuation or swapping apostrophes for typographic ones never changes a verdict (CHK-003);
- the same key and answer give the same verdict when checked twice and in any order (CHK-013);
- `expandPattern` and `compileKey` never throw, whatever the string.

Why a library and not a hand-written generator: shrinking gives the smallest failing pattern, which is what makes a failure readable.

### D7. Speed (CHK-014, C-06)

A unit test builds the worst valid keys it can — a pattern of 4000 variants, each with `'s` and `'d`, and an answer one edit from the last of them — and asserts that the median of 200 checks is under 5 ms. The expected time is tens of microseconds, so the margin absorbs a slow CI machine. The measured medians of checking and of preparing are printed in the test output. "The reference machine" is the CI runner.

### D8. Clarifications of the product description

Made in `docs/product/03-answer-checking.md` by this change, with the owner's approval of this design:

1. **The example of a typo.** The Purpose says `I do not no` is a typo. By CHK-006 it is not: `no` and `know` are two edits apart. The example becomes `I do not knaw`. The rule is right and the example was wrong; a distance of 2 would also turn `he walk` for `he walked` into a typo.
2. **CHK-002, what else is invalid.** Added: a `)`, `]` or `|` outside a group, a `|` inside `( )`, and a loose alternative with no word on one of its sides. CHK-001 already says these characters have no literal meaning; this says what happens when they appear.
3. **CHK-003 step 5, bound.** Added: the first four `'s` and `'d` of a text are read independently, later ones as the fourth (D3).
4. **CHK-014, what is timed.** "Checking one item" is the check against a prepared key. Preparing the key of an item is done once per exercise and is reported, not bounded by the 5 ms.

### D9. Known limits, left as they are

- `I dont know` against `I don't know` is `bad`, not `near`: the answer has three words and the key four. A missing apostrophe is treated as a mistake of grammar. Changing this needs a list of contractions written without an apostrophe; it can be a later change if practice asks for it.
- `let's` is not expanded to `let us`; a key that wants both lists both.
- Since spaces are removed, `a lot` and `alot` are equal. This is CHK-003 as written.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | every example in tests and specs is written for this repository; none comes from a book |
| C-06 | D7; the bundle does not change (`pnpm size`) |
| C-08 | the code is under `src/domain`, with no imports outside it (lint) |
| C-09 | `pnpm check` |
| C-10 | coverage of `src/domain` ≥ 95 % lines and branches; every export tested; fixed seed |
| C-11 | every requirement of the delta spec is named by a test (`pnpm trace`) |
| C-12 | no new runtime dependency |

## Risks

- **The loose alternative accepts too much.** It is the price CHK-001 states. Readers use `[a|b]` wherever they can.
- **A timing test can fail on a busy machine.** The margin is two orders of magnitude; if it ever fails, the cause is worth knowing.
