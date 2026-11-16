# Review

## Round 1

Reviewed: 57b0a9a0737e
Verdict: changes requested

### F1 A letter removed or added before a word that starts with the same letter is placed in the wrong word

- Where: src/domain/checking/check.ts:72
- Problem: `isSlip` places the edit at the first index where the reading and the candidate differ. For a substitution that index is the only place the edit can be. For a deletion or an insertion it is the last place. When the letter removed or added is followed by the same letter, as at the end of a word followed by a word that starts with that letter, the index falls inside the next word. Only that word is then checked. The "where two words meet" rule (`longer === 1 && at === end`) catches the boundary only when the index lands exactly on it, and here it lands one character past it. Verdicts checked with `checkAnswer` in a scratch vitest file:
  - key `she likes swimming`, answer `she like swimming` → `near`; the word checked is `sswimming`. The delta spec ("A wrong ending is not a typo") needs `bad`.
  - key `she like swimming`, answer `she likes swimming` → `near`; the inserted `s` is the case with the opposite direction.
  - key `I lived downtown`, answer `I live downtown` → `near`. Should be `bad` (ending `-d`).
  - key `she was sad`, answer `she wa sad` → `near`; the word checked is `ssad`, 4 characters. Should be `bad`: `was` has 3.
  - key `he is sorry`, answer `he i sorry` → `near`, and key `it is sunny`, answer `it i sunny` → `near`. Should be `bad`: the auxiliary is the edited word.
  The unit tests do not catch this because none of their cases has a word that starts with the letter removed from the end of the word before it.
- What should happen: find the whole range where the edit can fall. That runs from the length of the shorter text minus the common suffix up to `at`. Every answer word that the range touches goes into `changed`, and the edit is a slip only if it is one for each of them, as the boundary rule already does. Words after the earliest position need the key word taken at `start` and `end + longer` from the same placement. Add `@req CHK-006` cases for the inputs above.

### F2 The check of `near` can take 13 ms, over the 5 ms of CHK-014

- Where: src/domain/checking/check.ts:116, src/domain/checking/check.ts:68, src/domain/checking/check.ts:56
- Problem: `isSlip` runs for every candidate one edit away. Each call normalises the whole answer again (`wordsOf`) and aligns its words with `[...reading, ...rest]` at each step, which is quadratic in the number of words. Before this change the first candidate one edit away ended the search. Now every candidate that is one edit away but is grammar continues the search, and a key can have hundreds of such candidates. Measured in a scratch vitest file (median of 30 checks after a warm-up, verdict `bad`) with an answer of N one-letter words `a a … a` and a key whose patterns replace one word with `[b|c|…|z]`, as many as the limits of CHK-002 allow:
  - N 20: 500 readings, 2.9 ms.
  - N 40: 475 readings, 4.8 ms.
  - N 80: 225 readings, 5.7 ms.
  - N 100: 200 readings, 7.2 ms.
  - N 200: 100 readings, 12.9 ms.
  `pnpm test:speed` passes (13 tests) only because its single near case returns at the first candidate. Design D4 ("at most a few per answer") does not hold for a key of many short-word alternatives.
- What should happen: work out the words of the answer once per check, and their alignment once per reading of the answer, not once per candidate. Build the aligned words without copying at each step. Then a call per candidate costs one pass over the common prefix and suffix. Add a speed test with many candidates one edit away that are all grammar, such as the one above, and correct D4.

### F3 Design D3 says *houss* for *house* becomes `bad`, but the code and the spec make it `near`

- Where: openspec/changes/near-grammar/design.md:19
- Problem: D3 names *houss* for *house* as the cost of the ending rule. `house` and `houss` are not one stem with two endings from `""`, `s`, `es`, `d`, `ed`, because `house` has no ending from that list. So `differInEnding` is false. Key `the house`, answer `the houss` gives `near`, and the delta spec agrees. The design describes behaviour the change does not have.
- What should happen: replace the example with one that does become `bad`, such as *nees* for *need* or *addres* for *address*, or drop it.

### Notes

- Range read: `git diff origin/main...HEAD` in full (18 files); `check.ts` and `normalise.ts` read whole. I did not use a review skill; the review was done by hand. Run here: `pnpm check` (passes, traceability 41 IDs), `pnpm test` (46 files, 762 tests pass), `pnpm test:speed` (13 pass, near case median 0.055 ms). End-to-end tests were not run. All probes were scratch vitest files under `src/domain/checking`, deleted afterwards.
- Checked and fine:
  - An edit at the first character (`he is an artist` for `she …`: `bad`, the key word `she` has 3 characters).
  - An edit at the last character.
  - Doubled letters inside one word (`a tal tree`: `near`; `thiss is it`: `bad`).
  - A Cyrillic key (`Иван читат`: `near`).
  - Digits (`in 1990` for `1990s`: `bad`).
  - Hyphens (`well-knowm`: `near`; hyphens are dropped by `wordsOf` and by the readings alike).
  - `'s` read as two words in the answer (`she's a artist`: `bad`).
  - A key of two variants, one with `'s` (`she's a docter`: `near`).
  - `the boys room` for `the boys' room`: `near`, as before.
- `alignWords` cannot backtrack exponentially. The readings of `'s` (`x's`, `xis`, `xhas`) and of `'d` (`xwould`, `xhad`) differ at the character after the base, so at most one matches at each position. Its depth is the number of words, at most about 500.
- Not raised: the branch "Not reached" (check.ts:70) is reachable. When `'s` or `'d` is followed by punctuation and then a letter with no space between, as in `it's.great`, `wordsOf` keeps `it'sgreat` as one word, which `alignWords` cannot split into `it` `is` `great`. `isSlip` then returns true without any check. The readings merge those words, so no natural key has as many words, and I found no input where this changes a verdict. Returning `false` there would be the safer default.
- Not raised, within the letter of the spec: a missing apostrophe in a 4-character contraction stays `near` (`its raining` for `it's raining`, `hes tired` for `he's tired`), because the apostrophe counts as a character of the key word. *its/it's* is grammar some exercises drill, so the owner may want to decide it.
- Task 2.3 is done in commit 5a14eb7 but not ticked in `tasks.md`.

## Round 2

Reviewed: e89eae49860a
Verdict: approved

- F1: fixed
  My five round-1 inputs now give `bad`, and `the bus is lote` still gives `near`. I compared `checkAnswer` with a reference that tries every placement of the edit and checks every word each one touches. Over 19 755 random keys and answers of up to three words, from the letters `a e s d`, it gave no mismatch (7 484 of them `near`). Setting `lo` to `hi` (no window) fails the new `@req CHK-006` test.
- F2: fixed
  My round-1 probe (N one-letter words against keys of `[b|…|z]`) now takes 0.14–0.21 ms for N 20 to 200. Before, it took 2.9–12.9 ms. The new speed test with 80 words passes, and `pnpm test:speed` passes 14 tests.
- F3: fixed

### Notes

- Range read: `git diff 93f0005..HEAD` (8 files) in full, with `check.ts` re-read whole. Round 1 still stands for the rest of the diff. Run here: `pnpm check` (passes, traceability 41 IDs), `pnpm test` (46 files, 764 tests pass), `pnpm test:speed` (14 pass, near case median 0.038 ms). End-to-end tests were not run. The probes were scratch vitest files and one mutation of `check.ts`, all removed or restored.
- Checked and fine:
  - The window: for a substitution it is the single differing index. For a removed letter, insertion points run from `text.length - suffix` to `prefix`, and words whose end equals a place count. For an added letter, the window runs from `text.length - suffix - 1` to `prefix`.
  - The key word `candidate.slice(start, end + longer)` is right wherever the edit falls inside that word.
  - `wordEnds` shares one array and backtracks without copying; at most one reading of `'s` or `'d` fits at a place.
  - `'s` read as two words: `she's a artist` gives `bad`, `she's sen it` gives `near` (`seen`), `she's sa` gives `bad`.
- A reading whose words cannot be matched now stays `near` on purpose, and design D1 and the code comment say so. No natural key reaches it.
- `its raining` for `it's raining` stays `near` as the spec allows; the author is raising it with the owner.
- The WebKit expect timeout of 15 s is set on that project only, and Chromium and Firefox keep the default. Task 2.3 stays unticked until the pipeline shows WebKit; that is the author's call, not a finding.

## Round 3

Reviewed: 9c70dc76a21e
Verdict: approved

### Notes

- Range read: `git diff 2309274..HEAD` (`.github/workflows/checks.yml`, `tasks.md`). Rounds 1 and 2 still stand for the rest of the diff.
- The WebKit matrix entries are now three: shards `1/3`, `2/3` and `3/3`, labelled `webkit-1-of-3` to `webkit-3-of-3`. The label still names the job, the JUnit file, the summary and both artifacts, and `scripts/metrics.mjs` collects every `e2e-*` artifact. Nothing else in `scripts/`, `.github/` or `docs/` names the old `of-2` labels.
- `playwright test --project=webkit --shard=1/3 --list`, `2/3` and `3/3` list 21 tests each, the 63 of the project. Whether the pipeline now stays within C-19 is shown by the `evidence` check, not here.

## Round 4

Reviewed: c18ed35c1ae6
Verdict: approved

### Notes

- The first reviewing agent could not be resumed, so this round is by a new agent that read rounds 1 to 3 first.
- Range read: commit 9c65a41 (`git show`), which changes `e2e/study-frame.spec.ts` by four lines and adds task 2.5 to `tasks.md` (outside the hash). Nothing else changed since round 3, and the rest of `git diff origin/main...HEAD` is what rounds 1 to 3 covered.
- The waits are sound. `canvas[data-drawn]` is the attribute `PagesPanel.vue` sets on a page's canvas once that page is drawn, so waiting for it to be visible means the PDF worker has loaded and finished before `page.reload()`. The second wait after the reload keeps the next navigation from cutting the new worker off. The test's other assertions and its address, title and heading checks are unchanged.
- Run here: `pnpm check` passes (traceability 41 requirements) and `pnpm exec playwright test e2e/study-frame.spec.ts --project=chromium` passes 8 tests after `pnpm build`. WebKit cannot start on this machine; whether its parts now pass is task 2.5's evidence from the pipeline, not checked here.

## Requirement coverage

| Requirement | Implemented | Tests |
| --- | --- | --- |
| CHK-006 | src/domain/checking/check.ts `differInEnding`, `wordEnds`, `isSlip`, `checkAnswer`; src/domain/checking/normalise.ts `wordsOf`; src/ui/study/StudyView.vue hint; docs/product/03-answer-checking.md | check.test.ts `@req CHK-006` (every delta scenario, the proposal's examples, `'s` and `'d` as two words, an edit where two words meet, a letter added or removed next to the same letter); e2e/study.spec.ts and src/domain/study/view.test.ts (*lote* for *late* as the almost-right answer) |

## Outside the listed requirements

- CHK-014: speed.test.ts gains a test of many candidates one edit away that are all grammar, and the near case with `'s` and `'d` now ends in a long word.
- `playwright.config.ts`: the WebKit project waits 15 s in `expect`. In e2e/study-frame.spec.ts the walk through Study's links is `test.slow` on WebKit. Both are recorded as technical debt in docs/roadmap.md.
- `.github/workflows/checks.yml`: WebKit's end-to-end tests run in three shards instead of two, to keep the pipeline within C-19 with the longer WebKit waits.
- docs/roadmap.md: technical debt found by the validation of `study-screen` is listed under Later.
