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

`null` is "no verdict" (CHK-008). `expandPattern` gives one of the reasons `unclosed-group`, `nested-group`, `stray-character`, `dangling-slash`, `too-many-variants`. `compileKey` gives a list of errors `{ index, reason }`: one for each invalid pattern, with its index in `accept`, and `{ index: null, reason: 'key-too-large' }` when the key as a whole passes the limits of D4. Why a result and not an exception: a book has thousands of keys, and its reader reports all the bad ones at once.

### D2. Reading a pattern (CHK-001)

A pattern is split on white space outside groups into words. A word may contain groups (`book(s)`, `[a|an]`); a group may contain spaces. A `/` that is a word of its own is the loose alternative; a `/` inside a word (`and/or`) is ordinary text and is dropped by normalisation like any other punctuation. Inside a group, a `/` that is a word of its own (`[a / b|c]`) makes the pattern invalid (`stray-character`): a loose alternative cannot stand inside a group, and a spaced `/` has no literal meaning (CHK-001); a `/` inside a word of a group stays text.

Expansion, in this order:

1. Each loose alternative is resolved from left to right. With `L` words before the slash and `R` words after it, up to the next slash, its candidates are, for every `j` from 1 to `min(4, R)`, the pattern without the slash and the first `j` words after it, and then, for every `i` from 1 to `min(4, L)`, the pattern without the slash and the last `i` words before it: `min(4, L) + min(4, R)` candidates, each produced once. A following slash is resolved in each candidate in turn, so `a / b / c` gives `a`, `c`, `b`. A word with a group counts as one word. Each slash gives at least two candidates, so a pattern with twelve slashes is over the limit before anything is expanded.
2. In each candidate every group is expanded: `(x)` to `x` and nothing, `[a|b|c]` to each alternative.

Variants are counted as they are produced, before the duplicates a pattern writes (`[x|x]`, or two splits that give the same text) are removed, and expansion stops when the count passes 4000 (CHK-002). Why count before removing duplicates: it bounds the work, not only the result. The count of a candidate is the product of the sizes of its groups, taken before its variants are built.

### D3. Normalisation and readings (CHK-003, CHK-004)

Steps 1 – 5 of CHK-003 are applied to the text with its spaces. The result is split on white space, and each piece is stripped to its kept characters; pieces left empty are dropped. A **reading** is the pieces joined without spaces, together with their count, the number of words. Why the count is taken after contractions are expanded and before spaces are removed: CHK-006 compares numbers of words, and both sides must count `don't` the same way, as two.

- Lower case is `String.prototype.toLowerCase`, which does not depend on locale (CHK-013). `toLocaleLowerCase`, `Intl` and `localeCompare` are not used; a lint rule forbids them in this directory.
- Kept characters: letters of the Latin and Cyrillic scripts (`\p{Script=Latin}`, `\p{Script=Cyrillic}`), the digits `0`–`9`, the apostrophe.
- Contractions are matched at the end of a word only; `won't`, `can't`, `cannot` and `shan't` also at its start.
- Single quotation marks (CHK-003 step 3, D8 clarification 6). After typographic marks become ASCII, an apostrophe is read by its neighbours. Before a letter or digit and after the start of the text, white space or punctuation, it opens a quote and is removed. After a word, before the end of the text, white space or punctuation, it is removed if a quote is open (closing it) or if it follows no letter or digit, and otherwise kept: the apostrophe of a plural possessive, `the boys' room`. Between letters or digits it is always kept. Why before contractions: `'I can't'` must read as `I can not`, and the closing quote would hide the end of `can't`.
- The parts of a text between its `'s` and `'d` are stripped to their kept characters once, not once for each of its readings: a reading joins the parts and the chosen forms, and counts the words where they meet.

`'s` and `'d` (CHK-003 step 5): each occurrence is read independently, so `she's said he's ill` matches `she has said he is ill`. To bound the work, only the first four occurrences in a text are read independently (at most 81 readings); later ones keep the reading of the fourth. Why not one reading for all, as the private reader does: two different readings in one sentence are common in exercises on the present perfect.

### D4. The prepared key

`compileKey` expands every pattern of `accept`, takes the readings of every variant and stores them in a map from the text of a reading to the set of its word counts, with an index by number of words and then by length for the search of D5. It also records whether a blank is accepted: some variant has a reading with empty text. If any pattern is invalid the key is not built.

The size of a key is bounded (CHK-002, D8 clarification 5): its patterns together may give at most 4000 readings, of at most 20 000 characters in total, both counted as they are produced, duplicates included. Reading stops as soon as either limit is passed, and the key is reported as `key-too-large`; so preparing is bounded too. After the first invalid pattern nothing more is stored, but the size is still counted, so that every reason is reported at once. Why these limits: with them the search of D5 compares at most 81 readings of the answer with 20 000 characters of key, and a check stays under 5 ms by a margin (D7). A key of a book has a handful of variants; the limits refuse only keys that no exercise needs, such as four `'s` before 4000 variants (324 000 readings), which took a third of a second to check before the limits.

A key is prepared when an exercise is opened, not on every check. Preparing is not part of the 5 ms of CHK-014 (D8, clarification 4); its own time is measured and reported.

### D5. The verdict (CHK-005 – CHK-009)

1. The answer is blank when it is empty or white space only. Blank: `ok` if the key accepts a blank, otherwise no verdict.
2. `ok` if the text of some reading of the answer is in the key.
3. With `choices`, anything else is `bad`.
4. `near` if some reading of the answer has at least 4 characters and the key holds a reading with the same number of words exactly one edit away (one character inserted, removed or replaced). Only key readings with the same number of words and a length that differs by at most one are compared, and the comparison stops at the second difference; the full distance is never computed. The first difference is found one character at a time over up to 32 characters and by comparing halves as whole strings over longer stretches, and the rest after it is compared as a whole string: the engine compares strings several times faster than a loop in code.
5. Otherwise `bad`.

An answer of punctuation only (`?`) is not blank: it is `bad` unless the key accepts a blank.

### D6. Property tests (CHK-012, CHK-013)

`fast-check`, a development dependency, with a fixed seed so that a run does not depend on chance (C-10). Properties:

- every variant of a generated valid pattern is `ok` against that pattern (CHK-012);
- changing case, doubling spaces, adding final punctuation or swapping apostrophes for typographic ones never changes a verdict (CHK-003);
- the same key and answer give the same verdict when checked twice and in any order (CHK-013);
- `expandPattern` and `compileKey` never throw, whatever the string;
- a key near the limits of D4 accepts each of its variants, or is refused as `key-too-large` and nothing else.

The generated patterns contain contractions, `'s` and `'d`, groups, loose alternatives and words in single quotation marks, ASCII and typographic.

Why a library and not a hand-written generator: shrinking gives the smallest failing pattern, which is what makes a failure readable.

### D7. Speed (CHK-014, C-06)

A unit test builds the worst valid keys the limits of D4 allow and asserts, for each, that the median of 200 checks is under 5 ms:

- keys at the character limit whose variants share a beginning as long as the limit allows, then four `'s` (81 readings of each variant), then one of 1, 4 or 8 endings of four letters; the answer has the same beginning, four `'s`, the same number of words and the same length, and an ending two letters away from every one of them, so it is `bad`, every key reading of its shape is compared, and each comparison runs to the end;
- a key of 4000 readings of one shape, at the reading limit, with a `bad` answer of the same shape;
- a key with `'s` and `'d` in every variant and a `near` answer one edit from the last variant.

It also asserts that the key that was slowest before the limits, four `'s` before 4000 variants, is refused as `key-too-large`. The medians of checking and of preparing are printed in the test output. "The reference machine" is the CI runner.

Measured on the development machine, median of 200 checks: at most 0.74 ms (8 endings 0.63 – 0.65 ms, 4 endings 0.69 – 0.71 ms, 1 ending 0.47 – 0.48 ms, 4000 readings 0.07 – 0.08 ms, `near` 0.03 ms), a margin of about 7 times; under the coverage instrumentation that `pnpm test:coverage` and CI add, at most 3.9 ms (8 endings 3.4 – 3.9 ms, 4 endings 2.5 – 3.3 ms, 1 ending 1.2 – 1.3 ms, 4000 readings 0.5 – 0.6 ms, `near` 0.09 ms), a margin of only about 1.3 times. Preparing takes at most 11 ms, for the key of 4000 readings (14 ms under coverage). Under coverage the cost lies in the number of comparisons, each counted by the instrumentation, more than in their length. A key from a book has a handful of variants and is checked in microseconds.

### D8. Clarifications of the product description

Made in `docs/product/03-answer-checking.md` by this change, with the owner's approval of this design:

1. **The example of a typo.** The Purpose says `I do not no` is a typo. By CHK-006 it is not: `no` and `know` are two edits apart. The example becomes `I do not knaw`. The rule is right and the example was wrong; a distance of 2 would also turn `he walk` for `he walked` into a typo.
2. **CHK-002, what else is invalid.** Added: a `)`, `]` or `|` outside a group, a `|` inside `( )`, a spaced `/` inside any group, and a loose alternative with no word on one of its sides. CHK-001 already says these characters have no literal meaning; this says what happens when they appear.
3. **CHK-003 step 5, bound.** Added: the first four `'s` and `'d` of a text are read independently, later ones as the fourth (D3).
4. **CHK-014, what is timed.** "Checking one item" is the check against a prepared key. Preparing the key of an item is done once per exercise and is reported, not bounded by the 5 ms. "Any valid pattern" becomes "any valid key", since clarification 5 makes the size of a key part of its validity.
5. **CHK-002, the size of a key.** Added: the key of an item is invalid when its patterns together give more than 4000 readings, or readings of more than 20 000 characters in total (`key-too-large`, D4). Without it, a valid pattern with four `'s` took hundreds of milliseconds to check, against the 5 ms of CHK-014.
6. **CHK-003 step 3, single quotation marks.** Added: after typographic marks become ASCII, an apostrophe that works as a single quotation mark is removed (D3), before contractions are expanded. Without it, `He said, 'I'm tired.'` as a key made `He said, I'm tired.` `bad`, while the text of CHK-003 meant quotation marks not to count.

### D9. Known limits, left as they are

- `I dont know` against `I don't know` is `bad`, not `near`: the answer has three words and the key four. A missing apostrophe is treated as a mistake of grammar. Changing this needs a list of contractions written without an apostrophe; it can be a later change if practice asks for it.
- `let's` is not expanded to `let us`; a key that wants both lists both.
- Since spaces are removed, `a lot` and `alot` are equal. This is CHK-003 as written.
- A word that begins with an apostrophe, such as `'tis`, loses it: the apostrophe is read as an opening quotation mark (D3). A plural possessive inside a single-quoted text, `'the boys' room'`, closes the quote, so the final apostrophe is kept. Both are rare in exercises; a key that needs them can list the other form.

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
- **A timing test can fail on a busy machine.** Without instrumentation the margin is about 7 times (D7); under the coverage instrumentation of CI it is only about 1.3 times on the development machine, for keys at the limits that no book needs. If the test proves unsteady in CI, the search for a near match gets an index by deleted character instead of a scan, or the limits of D4 are lowered; the 5 ms is not raised.
- **The limits of a key refuse a key a book needs.** 4000 readings and 20 000 characters are far above a key of an exercise; a refused key is reported by the reader of slice 1.3, and its writer can drop the variants the exercise does not need.
