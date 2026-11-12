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

`null` is "no verdict" (CHK-008). `expandPattern` gives one of the reasons `pattern-too-long`, `unclosed-group`, `nested-group`, `stray-character`, `dangling-slash`, `too-many-variants`; a valid result lists the variants without duplicates and, for each, how many times it was produced (D4 counts them). A pattern of more than 500 characters, counted as code points like the `maxLength` of a pattern in `contracts/pack.schema.json`, is `pattern-too-long` without being read further. `compileKey` gives a list of errors `{ index, reason }`: one for each invalid pattern, with its index in `accept`, and `{ index: null, reason: 'key-too-large' }` when the key as a whole passes the limits of D4. Why a result and not an exception: a book has thousands of keys, and its reader reports all the bad ones at once.

### D2. Reading a pattern (CHK-001)

A pattern is split on white space outside groups into words. A word may contain groups (`book(s)`, `[a|an]`); a group may contain spaces. A `/` that is a word of its own is the loose alternative; a `/` inside a word (`and/or`) is ordinary text and is dropped by normalisation like any other punctuation. Inside a group, a `/` that is a word of its own (`[a / b|c]`) makes the pattern invalid (`stray-character`): a loose alternative cannot stand inside a group, and a spaced `/` has no literal meaning (CHK-001); a `/` inside a word of a group stays text.

Expansion, in this order:

1. Each loose alternative is resolved from left to right. With `L` words before the slash and `R` words after it, up to the next slash, its candidates are, for every `j` from 1 to `min(4, R)`, the pattern without the slash and the first `j` words after it, and then, for every `i` from 1 to `min(4, L)`, the pattern without the slash and the last `i` words before it: `min(4, L) + min(4, R)` candidates, each produced once. A following slash is resolved in each candidate in turn, so `a / b / c` gives `a`, `c`, `b`. A word with a group counts as one word. Every candidate keeps at least one word before each later slash, so the slash before a segment of `R` words gives at least `1 + min(4, R)` candidates: when the product of these over all slashes passes 4000, the pattern is over the limit before anything is resolved.
2. In each candidate every group is expanded: `(x)` to `x` and nothing, `[a|b|c]` to each alternative.

Variants are counted as they are produced, before the duplicates a pattern writes (`[x|x]`, or two splits that give the same text) are removed, and expansion stops when the count passes 4000 (CHK-002). Why count before removing duplicates: it bounds the work, not only the result. The count of a candidate is the product of the sizes of its groups. The candidates are first only counted, and the variants are built in a second pass when the count stays within the limit, so a pattern over the limit builds nothing. A single invalid pattern costs at most about 0.4 ms (D7).

### D3. Normalisation and readings (CHK-003, CHK-004)

Steps 1 – 5 of CHK-003 are applied to the text with its spaces. The result is split on white space, and each piece is stripped to its kept characters; pieces left empty are dropped. A **reading** is the pieces joined without spaces, together with their count, the number of words. Why the count is taken after contractions are expanded and before spaces are removed: CHK-006 compares numbers of words, and both sides must count `don't` the same way, as two.

- Lower case is `String.prototype.toLowerCase`, which does not depend on locale (CHK-013). `toLocaleLowerCase`, `Intl` and `localeCompare` are not used; a lint rule forbids them in this directory.
- Kept characters: letters of the Latin and Cyrillic scripts (`\p{Script=Latin}`, `\p{Script=Cyrillic}`), the digits `0`–`9`, the apostrophe.
- Contractions are matched at the end of a word only; `won't`, `can't`, `cannot` and `shan't` also at its start.
- Single quotation marks (CHK-003 step 3, D8 clarifications 6 and 9). After typographic marks become ASCII, an apostrophe is read by its neighbours. Here a letter or digit is any letter, combining mark or number of any script (`\p{L}`, `\p{M}`, `\p{N}`), not only the kept characters of CHK-004: the texts say so rather than narrow the code, which changes no scenario. Between letters or digits it is always kept. After a letter or digit and before anything else (the end, white space or punctuation) it closes an open quote and is removed, or, with no quote open, is kept: the apostrophe of a plural possessive, `the boys' room`. After anything else (the start, white space or punctuation) it is removed: before a letter or digit it opens a quote; before white space or the end it closes one if one is open; before punctuation it closes an open quote, or else opens one, so `'...I can't'` and `'— I can't'` are quotes as `'I can't'` is. Why before contractions: `'I can't'` must read as `I can not`, and the closing quote would hide the end of `can't`.
- The stretches of a text between its `'s` and `'d` are read once, not once for each of its readings: each is kept as its kept characters, whether its first and last runs keep any, and the number of whole words between them, and two stretches join in constant time. The text after the fourth occurrence is joined once for each form of the fourth (two or three times), and each of the up to 81 readings joins its beginning to one of these: the work of a reading does not grow with the number of occurrences.

`'s` and `'d` (CHK-003 step 5): each occurrence is read independently, so `she's said he's ill` matches `she has said he is ill`. To bound the work, only the first four occurrences in a text are read independently (at most 81 readings); later ones keep the reading of the fourth. Why not one reading for all, as the private reader does: two different readings in one sentence are common in exercises on the present perfect.

### D4. The prepared key

`compileKey` expands every pattern of `accept`, takes the readings of every variant and stores them in a map from the text of a reading to the set of its word counts, with an index by number of words and then by length for the search of D5. It also records whether a blank is accepted: some variant has a reading with empty text. If any pattern is invalid the key is not built.

The size of a key is bounded (CHK-002, D8 clarifications 5 and 10). Before anything is read, its patterns together may have at most 20 000 characters (code points, as the 500 of a pattern): forty patterns of the longest length; a longer key is `key-too-large` alone, with no pattern read or reported. Then its variants may have at most 100 000 characters together (UTF-16 code units, before normalisation), which bounds the work of normalising variants that read as little, such as runs of marks or punctuation; and its readings may be at most 4000, of at most 20 000 characters in total. Variants and readings are counted across all patterns as they are produced, duplicates included: a variant produced twice, in one pattern or in two, counts its readings twice (and is read once). The moment either limit is passed all work stops: the key is reported as `key-too-large`, with the errors of the patterns before it, and later patterns are neither expanded nor reported. After the first invalid pattern nothing more is stored, but the size is still counted.

What this bounds: at most 20 000 characters of patterns are parsed, at most 100 000 characters of variants are normalised, and each pattern builds at most the 4000 variants of D2. The number of invalid patterns read is bounded too: after the twentieth invalid pattern of an item the rest are not read, and those twenty are what is reported. Why twenty: a list of bad keys is for a person to fix, and each invalid pattern can cost about 0.4 ms. Measured preparing times are in D7. Why these limits: with them the search of D5 compares at most 81 readings of the answer with 20 000 characters of key, and a check stays under 5 ms by a margin (D7). A key of a book has a handful of variants; the limits refuse only keys that no exercise needs, such as four `'s` before 4000 variants (324 000 readings), which took a third of a second to check before the limits.

A key is prepared when an exercise is opened, not on every check. Preparing is not part of the 5 ms of CHK-014 (D8, clarification 4); its own time is measured and reported.

### D5. The verdict (CHK-005 – CHK-009)

1. The answer is blank when it is empty or white space only. Blank: `ok` if the key accepts a blank, otherwise no verdict.
2. An answer of more than 1000 characters (UTF-16 code units, as typed) is `bad` without being normalised or compared, with `choices` too (CHK-007). Every check reads the whole answer up to 81 times, so without this bound a pasted text of 60 000 characters took more than 5 ms. The limit is exported as `MAX_ANSWER_LENGTH`, so that the study screen can also limit its field. A blank answer is tested first, so white space of any length has no verdict.
3. `ok` if the text of some reading of the answer is in the key.
4. With `choices`, anything else is `bad`.
5. `near` if some reading of the answer has at least 4 characters and the key holds a reading with the same number of words exactly one edit away (one character inserted, removed or replaced). Only key readings with the same number of words and a length that differs by at most one are compared, and the comparison stops at the second difference; the full distance is never computed. The first difference is found one character at a time over up to 32 characters and by comparing halves as whole strings over longer stretches, and the rest after it is compared as a whole string: the engine compares strings several times faster than a loop in code.
6. Otherwise `bad`.

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
- a key with `'s` and `'d` in every variant and a `near` answer one edit from the last variant;
- the three keys at the character limit again with an answer of exactly 1000 characters (the worst answer above, padded with punctuation that reads as nothing), and an answer of 200 000 characters, `bad` unread.

- the key of 4 endings with two answers of up to 1000 characters made of `'s` and `'d`: `x's ` 250 times, and four `α's` followed by `α'd` 329 times.

It also times preparing, each asserted under 100 ms: refused keys (3999 patterns of 8001 characters, refused unread; 200 patterns of four `'s` before 4000 variants; one pattern of 500 000 words; 4000 variants of 400 marks each, refused at 100 000 characters of variants; 25 invalid patterns, read up to the twentieth) and the slowest valid keys found (4000 variants with 12 marks each, which NFC must reorder; 40 patterns of 500 marks; a chain of ten loose alternatives and a group, which times the counting of D2).

It also asserts that the key that was slowest before the limits, four `'s` before 4000 variants, is refused as `key-too-large`. The medians of checking and of preparing are printed in the test output. "The reference machine" is the CI runner. The speed test is run on its own, without coverage instrumentation (`pnpm test:speed`, a step of the unit job and of `pnpm verify`), and is left out of `pnpm test:coverage`: instrumentation counts every comparison and is not part of what a learner runs.

Measured on the development machine, without instrumentation, three runs, median of 200 checks: at most 0.74 ms (four `α's` and 329 `α'd` 0.74 ms, 4 endings 0.65 – 0.72 ms, `x's` 250 times 0.68 – 0.71 ms, 8 endings 0.59 – 0.70 ms, the 1000-character answers within 0.05 ms of their keys' worst, 1 ending 0.40 – 0.41 ms, 4000 readings 0.07 ms, `near` 0.03 ms, 200 000 characters 0.002 ms), a margin of about 7 times. Before the stretches of D3, the answers of `'s` and `'d` took about 3 ms. Under coverage instrumentation the checks of the keys took up to 3.9 ms, a margin of only about 1.3 times, which is why the test is not run there.

Preparing, median of three: the keys checked at most 13 ms (4000 readings); the slowest valid key found 15 – 19 ms (4000 variants with 12 marks each), the others 2.5 ms (40 patterns of 500 marks) and 2.2 ms (the chain); the slowest refused key found 37 – 39 ms (4000 variants of 400 marks, built in full before 100 000 characters of them are counted), the others under 4 ms. A key from a book has a handful of variants and is prepared and checked in microseconds.

### D8. Clarifications of the product description

Made in `docs/product/03-answer-checking.md` by this change, with the owner's approval of this design:

1. **The example of a typo.** The Purpose says `I do not no` is a typo. By CHK-006 it is not: `no` and `know` are two edits apart. The example becomes `I do not knaw`. The rule is right and the example was wrong; a distance of 2 would also turn `he walk` for `he walked` into a typo.
2. **CHK-002, what else is invalid.** Added: a `)`, `]` or `|` outside a group, a `|` inside `( )`, a spaced `/` inside any group, and a loose alternative with no word on one of its sides. CHK-001 already says these characters have no literal meaning; this says what happens when they appear.
3. **CHK-003 step 5, bound.** Added: the first four `'s` and `'d` of a text are read independently, later ones as the fourth (D3).
4. **CHK-014, what is timed.** "Checking one item" is the check against a prepared key. Preparing the key of an item is done once per exercise and is reported, not bounded by the 5 ms. "Any valid pattern" becomes "any valid key", since clarification 5 makes the size of a key part of its validity.
5. **CHK-002, the size of a key.** Added: the key of an item is invalid when its patterns together give more than 4000 readings, or readings of more than 20 000 characters in total (`key-too-large`, D4). Without it, a valid pattern with four `'s` took hundreds of milliseconds to check, against the 5 ms of CHK-014.
6. **CHK-003 step 3, single quotation marks.** Added: after typographic marks become ASCII, an apostrophe that works as a single quotation mark is removed (D3), before contractions are expanded. Without it, `He said, 'I'm tired.'` as a key made `He said, I'm tired.` `bad`, while the text of CHK-003 meant quotation marks not to count.

7. **CHK-002, the length of a pattern.** Added: a pattern of more than 500 characters is invalid (`pattern-too-long`), the `maxLength` a pack already sets, so that preparing is bounded (D4).
8. **CHK-007 and CHK-014, the length of an answer.** Added: an answer of more than 1000 characters is `bad` without being compared (D5), and CHK-014 holds "for any valid key and any answer".
9. **CHK-003 step 3, quotation marks before punctuation.** Widened: an apostrophe after no letter or digit and before punctuation also opens a quote (D3), so direct speech that starts with an ellipsis or a dash is read as a quote.

10. **CHK-002, the raw size of a key, and twenty errors.** Added: a key whose patterns have more than 20 000 characters together, or whose variants have more than 100 000, is `key-too-large`, the first before any pattern is read; and after twenty invalid patterns the rest of a key is not read, so at most twenty are reported (D4). Without them, keys of valid patterns that read as little took up to a second to prepare.

### D9. Known limits, left as they are

- `I dont know` against `I don't know` is `bad`, not `near`: the answer has three words and the key four. A missing apostrophe is treated as a mistake of grammar. Changing this needs a list of contractions written without an apostrophe; it can be a later change if practice asks for it.
- `let's` is not expanded to `let us`; a key that wants both lists both.
- Since spaces are removed, `a lot` and `alot` are equal. This is CHK-003 as written.
- A correct answer of more than 1000 characters is `bad` (D5); no exercise needs one.
- An apostrophe after white space opens a quote, so `he 's late`, with a space before the apostrophe, no longer reads as `he is late` and is not `ok`; written without the space, it is.
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
- **A timing test can fail on a busy machine.** It is timed without instrumentation, where the margin is about 7 times (D7). Under coverage instrumentation the margin was only about 1.3 times, which is why the test is not run there. If the test still proves unsteady in CI, the search for a near match gets an index by deleted character instead of a scan, or the limits of D4 are lowered; the 5 ms is not raised.
- **The limits of a key refuse a key a book needs.** 20 000 characters of patterns, 100 000 of variants, 4000 readings and 20 000 characters of readings are far above a key of an exercise; a refused key is reported by the reader of slice 1.3, and its writer can drop the variants the exercise does not need.
