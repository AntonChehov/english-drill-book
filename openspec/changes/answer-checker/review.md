# Review

## Round 1

Reviewed: e5f1ad8de062
Verdict: changes requested

### F1 A valid pattern with four `'s` takes hundreds of milliseconds to check

- Where: src/domain/checking/check.ts:30, src/domain/checking/key.ts:39
- Problem: CHK-014 bounds a check at 5 ms "for any valid pattern", but the near search compares every reading of the answer (up to 81) with every key reading of the same word count and length ±1, and a key holds up to 4000 × 81 readings. The pattern `he's she's it's that's [a|b|c|d|e|f|g|h|i|j] [a|b|c|d|e|f|g|h|i|j] [a|b|c|d|e|f|g|h|i|j] [a|b|c|d]` is valid (4000 variants, 324 000 readings); against it the answer `he's she's it's that's k k k k` (verdict `bad`) has a median check time of 313 ms, 175 ms with the groups first, and about 1.1 – 1.4 s with a common prefix of six ten-letter words in front (median of 15 – 21 runs in a throwaway vitest file). With only two `'s` and the groups at the end the median is already 5.0 ms. Preparing the 324 000-reading key takes 2.5 s. The check should stay under 5 ms for every valid pattern, as the requirement and design D7 ("the worst valid keys") say: for example the index by deleted character that the design's Risks section names, or a bound on readings per key that is part of CHK-002. If the owner prefers to narrow CHK-014 instead, the spec and the product text have to say which keys are bounded.

### F2 The speed test does not measure the worst case it claims

- Where: src/domain/checking/speed.test.ts:6
- Problem: design D7 says the test "builds the worst valid keys it can", but its key has one `'s` and one `'d` (6 readings per variant and 6 of the answer, where the rules allow 81 each), and its answer is `near`, so `checkAnswer` returns at the first bucket that holds the match and never scans the rest. On the same key a `bad` answer (`he's xx xx xx xx xx xx xx xx and she'd go`) takes 1.5 ms instead of the reported 0.28 ms, and the keys of F1 take 175 ms and more. The test passes while CHK-014 fails, so it cannot catch a regression of the case it is named for. It should check a `bad` answer (every candidate scanned) against a key with the most readings the rules allow, with the differences late in the text so `isOneEditApart` scans far, and the measured numbers in design D7 and tasks 3.5 should be taken again.

### F3 Single quotation marks are kept as apostrophes, so direct speech in a key is `bad` without them

- Where: src/domain/checking/normalise.ts:17, src/domain/checking/normalise.ts:13
- Problem: `‘` and `’` (and ASCII `'`) are mapped to the apostrophe, which step 6 keeps wherever it stands, also at the start or end of a word where it is a quotation mark. British workbooks put direct speech in single quotes. With the key `He said, 'I'm tired.'` (reading `hesaid'iamtired'`), the answers `He said, I'm tired.` and `He said, "I'm tired."` are both `bad` (two edits), while only `He said, ‘I’m tired.’` is `ok`; a key with double quotes `He said, “I'm tired.”` makes the answer `He said, 'I'm tired.'` `bad` the same way; `'Yes,' she said` against `Yes, she said` is `bad`. CHK-003 step 3 says quotes go to ASCII and step 6 drops everything but letters, digits and apostrophes, so the intent is that quotes do not count; the code turns a single quote into an apostrophe that counts. What should happen: the answers above are `ok`. An apostrophe that is not between two letters of a word should be dropped like other punctuation; the trailing apostrophe of a plural possessive (`the boys' room`) is the case to decide, and the spec should state the rule with a scenario.

### F4 Loose alternatives are counted up to four times over, so patterns of about 1000 variants are reported as too many

- Where: src/domain/checking/pattern.ts:134
- Problem: for a slash with `L` words before and `R` after, the double loop resolves the candidate keeping the left side once for every `i` and the one keeping the right side once for every `j`: 2·L·R candidates where L + R are distinct. Each one adds its group product to `produced`, so the duplicates count against the 4000 of CHK-002. `(a) (b) (c) (d) (e) (f) (g) one two three four / five six seven eight` has 128 × 8 = 1024 distinct variants and is reported `too-many-variants` (128 × 32 = 4096 counted); `[a|b] [c|d|e] [f|g|h] [i|j|k|l|m|n|o] w x y z / p q r s` (1008 distinct) likewise. Design D2's "counted before duplicates are removed" is about duplicates a pattern writes (`[x|x]`), and its stated reason is bounding the work, but these duplicates are made by the loop and multiply the work too. CHK-002 says "expands to more than 4000 variants": a valid key of a book is refused, and the reader of slice 1.3 will list it as invalid. What should happen: both patterns are valid; resolve each slash into its L + R distinct candidates (one loop over `j` for the left side, one over `i` for the right), and add the case to the CHK-002 tests. If the owner wants the count as it is, design D2 should say that each split counts.

### F5 A spaced slash inside a group is read as text

- Where: src/domain/checking/pattern.ts:58
- Problem: CHK-001 says a spaced `/` has no literal meaning, but inside a group every character is kept: `[a / b|c] d` expands to `a / b d` and `c d`, so the answer `a b d` is `ok` and `a d` and `b d` are `bad`, neither of which the pattern's writer can have meant. It is not reported as invalid either, so the reader of slice 1.3 cannot point at it. What should happen: a spaced `/` inside a group is reported (for example as `stray-character`, as `|` inside `( )` is), with a scenario in the CHK-002 tests.

### F6 Four tasks are ticked as `[x ]`, which is not a checkbox

- Where: openspec/changes/answer-checker/tasks.md:21
- Problem: tasks 3.4, 3.5, 4.1 and 5.1 read `- [x ]` with a space after the `x`. GitHub renders that as the literal text `[x ]`, not a ticked box, so the pull request shows four verified tasks as plain text. `scripts/pr-evidence.mjs:53` looks only for `[ ]`, so the check counts them as ticked while the rendered file does not: the tool and what the owner reads disagree. What should happen: `- [x]` on all four lines.

### Notes

- Range read: `git diff origin/main...HEAD` in full (25 files), with every file of `src/domain/checking` read whole. `pnpm test` passes (392 tests; CHK-014 printed a median of 0.277 ms per check and 117 ms per preparation), `pnpm lint` and `pnpm trace` pass. Throwaway probe files under `src/domain/checking` were run with `pnpm exec vitest run` and removed.
- The lint rule applies: a probe file in `src/domain/checking` using `toLocaleLowerCase`, `localeCompare`, `Intl`, `Date.now` and an import of `vue` gave one error each, the last from the `src/domain` rule the override keeps.
- Checked and fine: the order of normalisation steps against CHK-003; `isOneEditApart` (also against a plain Levenshtein distance in its property test); the bound of four readings (81 at most); blank, punctuation-only and choices verdicts; determinism (no state is kept between checks, maps keep insertion order, `toLowerCase` gives `itis` for `İT İS`); patterns of 5000 groups, 11 slashes of four-word sides, a 100 000-word pattern and binary strings neither throw nor hang. The property generators do produce groups, empty alternatives, loose alternatives and contractions; the CHK-013 Turkish test cannot fail by locale in a JavaScript engine, the lint rule is what holds CHK-013.
- Not raised, the owner's design D3/D9: because words are counted after contractions are expanded, missing-apostrophe typos are `bad`, not `near`, also where the letters are one edit apart: `Im ill` for `I'm ill`, `youre late` for `you're late`, and `I canot swim` for `I cannot swim` (a dropped letter, no apostrophe involved: `cannot` counts as two words, `canot` as one). CHK-006 read literally ("some variant has the same number of words") would give `near` for all three. A learner will see these as grammar mistakes; worth a look when the study screen arrives.
- Not raised: the reading of `'s` and `'d` after the fourth pairs is/would, has/had and `'s`/had across kinds, so a fifth `'s` after a fourth `'d` can never be possessive; an answer of 200 000 characters takes 0.9 s (the study screen can cap the field); `compileKey([])` builds a key that accepts nothing, though CHK-001 says `accept` is non-empty (left to the pack validation of slice 1.3); `ﬁ` and the fullwidth apostrophe are not folded (NFC, not NFKC).
- The code-review skill, run at effort high on the same diff, raised F3, F4 and F6 on its own, with its own reproductions. It also found that a contraction just before a closing single quote is not expanded (`‘I can’t’` keeps `can't`, because the lookahead sees the closing apostrophe), which the fix of F3 should cover. Its other points, not raised: the speed test prepares the key 11 times (about 1.9 s under coverage, against the default 5 s timeout), so a slow CI runner could make it flaky, and fewer preparations would report the same number; the `src/domain/checking` lint override copies the `src/domain` lists of globals and properties in full, so a global added later to `src/domain` only would not apply to the checker; `compileKey` keeps building readings after the first invalid pattern; `readings` strips the fixed parts of a text again for each of up to 81 combinations, which is most of the preparation time.
- C-01: every example in the tests and the spec reads as written for this repository; I did not compare them with any book.

## Requirement coverage

| ID      | Implemented in                                                                                                    | Test                                                                                                 |
| ------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| CHK-001 | `src/domain/checking/pattern.ts` (`parse`, `expandPattern`), `key.ts` (`compileKey`)                              | `pattern.test.ts`, `check.test.ts` and `key.test.ts`, tests named `@req CHK-001`                     |
| CHK-002 | `pattern.ts` (`parse` errors, the count in `expandGroups`), `key.ts` (errors with index)                          | `pattern.test.ts`, `key.test.ts`, `properties.test.ts` (never throws), named `@req CHK-002`          |
| CHK-003 | `normalise.ts` (`prepare`, `readings`, `read`)                                                                    | `normalise.test.ts`, `check.test.ts`, `properties.test.ts` (verdict-keeping changes), `@req CHK-003` |
| CHK-004 | `normalise.ts` (`KEPT`, `ё` to `е`)                                                                               | `normalise.test.ts` and `check.test.ts`, `@req CHK-004`                                              |
| CHK-005 | `check.ts` (`checkAnswer`, reading in `key.readings`)                                                             | `check.test.ts`, `@req CHK-005`                                                                      |
| CHK-006 | `check.ts` (near search by words and length), `distance.ts` (`isOneEditApart`), `key.ts` (`byWordsAndLength`)     | `check.test.ts` and `distance.test.ts`, `@req CHK-006`                                               |
| CHK-007 | `check.ts` (final `bad`)                                                                                          | `check.test.ts`, `@req CHK-007`                                                                      |
| CHK-008 | `check.ts` (`BLANK`), `key.ts` (`acceptsBlank`)                                                                   | `check.test.ts` and `key.test.ts`, `@req CHK-008`                                                    |
| CHK-009 | `check.ts` (`options.choices`)                                                                                    | `check.test.ts`, `@req CHK-009`                                                                      |
| CHK-012 | `pattern.ts`, `normalise.ts`, `key.ts`, `check.ts` together                                                       | `properties.test.ts`, `@req CHK-012`                                                                 |
| CHK-013 | pure functions with `toLowerCase`; `.oxlintrc.json` override for `src/domain/checking`; seed in `vitest.setup.ts` | `properties.test.ts` (two properties) and `check.test.ts`, `@req CHK-013`                            |
| CHK-014 | `key.ts` (`byWordsAndLength`), `check.ts` (near search); not met for every valid pattern, see F1                  | `speed.test.ts`, `@req CHK-014`; not the worst case, see F2                                          |

## Outside the listed requirements

- `docs/product/03-answer-checking.md`: the four clarifications of design D8 (the example of a typo, the invalid characters of CHK-002, the bound of four readings in CHK-003, what CHK-014 times). They agree with the delta spec.
- Tooling: `fast-check` 4.10.2 as a development dependency (`package.json`, `pnpm-lock.yaml`), `vitest.setup.ts` with the fixed seed, `vitest.config.ts` (`setupFiles`), `tsconfig.node.json` (includes the setup file), and the lint override in `.oxlintrc.json` for `src/domain/checking`.
- The change's own proposal, design, tasks, delta spec, `.openspec.yaml` and this record.
