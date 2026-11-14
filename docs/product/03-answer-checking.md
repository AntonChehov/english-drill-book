# 03 — Answer checking

## Purpose

A learner who writes `I don't know` where the key says `I do not know` is right. A learner who writes `I do not knaw` made a typo, and one who left out the article made a grammar mistake. The checker must tell these apart, deterministically and without a network.

The checker is a pure function library with no dependency on the UI or the browser.

## Key patterns

Each gradable item has `accept`: a non-empty list of patterns. An answer is correct if it matches any variant of any pattern.

- **CHK-001 [M1]** Pattern syntax:
  - `(text)` — optional: matches with and without `text`;
  - `[a|b|c]` — exactly one of the alternatives; an alternative may be empty (`[the|]`);
  - `a / b` — a loose alternative, as printed in book keys, where the key does not say how many words each side covers: every split of 1 to 4 words on the left against 1 to 4 words on the right is tried. Why: `I have / I've got a car` and `a few / some people` look the same, and only trying the splits covers both. This accepts some answers a teacher would not; readers use `[a|b]` instead wherever the key's layout makes the boundaries certain;
  - groups do not nest; the characters `( ) [ ] |` and a spaced `/` have no literal meaning in a pattern;
  - an empty pattern `""` means that leaving the field blank is correct.
- **CHK-002 [M1]** A pattern is invalid if it has more than 500 characters, if a group is unclosed or nested, if `)`, `]` or `|` stands outside a group, `|` inside `( )` or a spaced `/` inside any group, if a loose alternative has no word on one of its sides, or if it expands to more than 4000 variants. The key of an item is invalid if its patterns have more than 20 000 characters together, checked before any is read; if its variants have more than 100 000 characters together; or if its patterns together give more than 4000 readings (CHK-003), or readings of more than 20 000 characters in total. Variants and readings are counted as they are produced, duplicates included. Why: these bound the time of a check (CHK-014) and of preparing a key. What is invalid is reported with its reason and is not used for checking; after twenty invalid patterns the rest of the key is not read.

## Normalisation

- **CHK-003 [M1]** Before comparison both the answer and each variant are normalised:
  1. Unicode NFC; lower case;
  2. `ё` → `е`;
  3. typographic apostrophes and quotes → ASCII; `…` → `...`; then an apostrophe that works as a single quotation mark is removed. Here a letter or digit is one of any script, and a combining mark counts as one. One between letters or digits is always kept. One after a letter or digit and before anything else closes an open quote, or is kept when no quote is open, as in `the boys' room`. Any other is removed: before a letter or digit it opens a quote, before white space or the end it closes one, and before punctuation it closes an open quote or else opens one, as in `'...I can't'`. Why before step 4: `'I can't'` is `I can not`;
  4. contractions expanded: `won't` → `will not`, `can't` and `cannot` → `can not`, `shan't` → `shall not`, `n't` → ` not`, `'m` → ` am`, `'re` → ` are`, `'ve` → ` have`, `'ll` → ` will`;
  5. `'s` yields three readings (`'s`, ` is`, ` has`) and `'d` yields two (` would`, ` had`); the first four occurrences in a string are read independently, so a string with both yields every combination, and later ones take the reading of the fourth. Why the bound: a string has at most 81 readings;
  6. everything except letters, digits and apostrophes is removed, including spaces.
- **CHK-004 [M1]** "Letters" means Latin and Cyrillic letters. Why: some exercises are answered in Russian or mix both.

## Verdicts

- **CHK-005 [M1]** `ok` — some reading of the answer equals some reading of some variant after normalisation.
- **CHK-006 [M1]** `near` — not `ok`, the normalised answer has at least 4 characters, and some variant has the same number of words as the answer and a Levenshtein distance of exactly 1 from it, the edit falling inside one word that has at least 4 characters in the variant and that does not differ from the variant's word only by an ending (`-s`, `-es`, `-d`, `-ed` or none in each). Why the word count: a missing article is a grammar error, not a typo, and must be `bad`. Why the word and the ending (changed by `near-grammar`, 2026-11-14): a wrong article, auxiliary or ending one letter off (*a artist*, *he as*, *she live*) is the grammar the item drills, not a slip of the pen.
- **CHK-007 [M1]** `bad` — anything else that is not blank, and an answer of more than 1000 characters, which is not normalised or compared. Why: a pasted text must not hold up the check (CHK-014).
- **CHK-008 [M1]** A blank answer is not checked and has no verdict, unless the key accepts blank (`CHK-001`), in which case it is `ok`.
- **CHK-009 [M1]** For `choices` items the verdict is `ok` or `bad` by the same comparison; `near` does not apply.

## Connected text

- **CHK-010 [M2]** A `text` exercise is compared word by word with its `model` using a longest-common-subsequence diff over normalised words. A contraction and its expansion are equal. Words inside `(…)` in the model are optional.
- **CHK-011 [M2]** The result lists the learner's words in order, marking extra ones, and inserts missing model words at their positions. The exercise is `ok` when nothing is missing and nothing is extra.

## Properties

- **CHK-012 [M1]** Every variant of every pattern is `ok` against its own pattern.
- **CHK-013 [M1]** Checking is deterministic and does not depend on locale or time.
- **CHK-014 [M1]** Checking one item against its prepared key takes under 5 ms on the reference machine for any valid key (CHK-002) and any answer (CHK-007; constraint C-06). Preparing the key of an item is done once per exercise; its time is reported, not bounded by the 5 ms.
