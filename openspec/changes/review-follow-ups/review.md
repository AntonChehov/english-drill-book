# Review

## Round 1

Reviewed: afee733481fa
Verdict: changes requested

### F1 A comment after a "fence" that GitHub does not render as one is hidden and not reported

- Where: scripts/review-record.mjs:113, scripts/review-record.mjs:179, scripts/review-record.mjs:195; openspec/changes/review-follow-ups/design.md:21; docs/process.md:23
- Problem: the new check skips every line the parser holds to be inside a fenced block, but the parser's idea of a fence is wider than CommonMark's, so a comment can stand outside any fence as GitHub renders the file while the parser skips it as fenced. Design D2 says every comment opener (less-than, exclamation mark, two hyphens; called the opener below) outside a fenced block is reported, and `docs/process.md` step 4 says this is "so that what the owner reads on the pull request is all of it"; for the inputs below neither holds. Four ways, each confirmed by running `parseRecord` (zero problems) and rendering the same file with a CommonMark renderer (markdown-it, `commonmark` preset), which emits the comment as raw HTML that the browser hides:
  1. An opening fence indented four spaces or a tab. `fenceLine` is `^\s*`, any indentation; CommonMark allows at most three spaces, so after a blank line the line is an indented code block that shows the backticks, and the next line opens an HTML comment.
  2. An opening fence inside a list item. A line of two spaces and three backticks under `- item` opens a fenced block in the item; the next unindented line ends the item and the fence with it (code is not lazily continued), so it opens an HTML comment there.
  3. A fence inside a raw HTML block. After `<div>` (no blank line before the fence) the fence lines are raw HTML, not a fence, so the comment inside is passed to the page and hidden. The same holds for the HTML blocks that do not end at a blank line (`<pre>`, `<script>`, `<style>`, `<textarea>`), so a blank line before the fence does not help.
  4. A lone carriage return. The record is split on `\r?\n` only; CommonMark treats a lone `\r` as a line ending. The line `~~~` CR `~~~` is one line to the parser, which opens a fence on it, and to GitHub an opened and closed empty block, after which the comment is outside. Prettier does not check `openspec/` (it is in `.prettierignore`), so nothing else catches the stray `\r`.

  The hidden text is inside the parser's fence, so it is not read as a round and cannot change the verdict; this is the gap between file and page that D2 exists to close, not a forged approval.

- Failing inputs, each under `### Notes` of an approving round 1 of an otherwise valid record (`parseRecord` reports nothing; the page shows no "hidden text"):

~~~text
Checked by hand.

    ```
&lt;!-- hidden text, invisible
```
-->
~~~

~~~text
- checked by hand
  ```
&lt;!-- hidden text, invisible
```
-->
~~~

~~~text
Checked by hand.

<div>
```
&lt;!--
hidden text, invisible
```
-->
</div>
~~~

- Input 4, written with escapes as a JavaScript string, under `### Notes`:

~~~text
"~~~\r~~~\n&lt;!--\nhidden text, invisible\n~~~\n-->"
~~~

- What should happen: each input fails the check with the message of D2 for the line of the opener, and a unit test covers each. The simplest rule that cannot drift from GitHub's renderer is to report the opener on every line, inside fenced blocks too, and drop the fence exemption from D2, the message and the docs (a reviewer can write about a comment in words, or quote it with the entity `&lt;` for its first character, which GitHub shows as the characters). Narrowing the exemption (opening fence at most three spaces deep, not inside a list item or HTML block, lines split on `\r` too) is possible but has to follow CommonMark's container and HTML-block rules to be sound. If the author keeps the parser as it is, then D2 has to list these cases under "Not covered" and `docs/process.md` step 4 must not say that the page shows all of the record.

### Notes

- Scope: the whole diff `origin/main...HEAD` (six commits): `scripts/review-record.mjs`, `scripts/review-record.test.mjs`, `scripts/pr-evidence.test.mjs`, `docs/process.md`, `CLAUDE.md`, `README.md` and the change's own proposal, design and tasks. Run: `pnpm test` (453 passed), `pnpm lint`, `pnpm check` (typecheck, lint, Prettier, `openspec validate`, traceability, audit), all passing.
- Covered as D2 says: the opener before the first round, in a round's own lines, indented under an outcome, under a finding or `### Notes`, in a closing section, on a heading and on the title line; upper case, the empty comment (the opener followed at once by `>`), a BOM before it, CRLF line endings; on a fence's opening line (reported, as the check runs before the fence is read); after a fence that is never closed (`unclosedFence` fails the record anyway); a fence in a block quote (a line of `>` and three backticks is not a fence to the parser, so the comment is reported). Each was run.
- Reported although GitHub shows it: the opener in an inline code span and in an indented code block, both visible on the page. D2 says so (any line outside a fenced block) and the message says to use a fenced block, so this is not raised. It does mean that `openspec/changes/archive/2026-11-12-review-rounds/review.md`, accepted by the parser of `main`, now fails on lines 84 and 100, both code spans; the proposal says archived records are not read by the check. Of the other archived records, `2026-11-12-answer-checker/review.md` is still accepted, and the two of 2026-11-11 predate rounds and failed before as well.
- Not raised, as D2 lists them as not covered: `<details>`, link definitions and other raw HTML that hides text without the opener.
- `README.md:26` says "the same one in every round", without the exception of D1 (a new agent when the first cannot be resumed). It is a summary that points to `docs/process.md`, so not raised; "normally the same one" would match.
- The sentence of the archived design of `review-rounds` (design D2 clarifications) "An HTML comment is not recognised" is superseded by this change; `CLAUDE.md` points to both designs, so a reader finds the rule.
- The tests of the new check fail without it: each expects `messages.htmlComment`, and the acceptance test for fenced blocks would fail if the fence exemption were dropped. None of them covers an input of F1.

## Round 2

Reviewed: 8a4fad13673d
Verdict: approved
- F1: fixed
  `parseRecord` now finds the opener in the raw text, split on `\n` only, before any reading of fences (`commentLines`, scripts/review-record.mjs:152), and reports it on the parser's own line number; the fence exemption is gone from the code, the message, design D2, the proposal, `docs/process.md`, `CLAUDE.md` and `README.md`. All four inputs of round 1, run again as files, are reported on the line of the opener, as are the probes listed under round 1's Notes; the new unit tests cover each input of F1, an ordinary fenced block, CRLF endings and the entity, and fail with the parser of round 1.

### Notes

- Scope: `git diff 86365e6..HEAD` (three commits: the fix in `scripts/review-record.mjs` and its tests; the wording in design D2, the proposal, `tasks.md`, `docs/process.md`, `CLAUDE.md`, `README.md`). Round 1 read the whole diff and nothing else changed since, so with this round the review again covers the whole diff `origin/main...HEAD`.
- Round 1 is edited: I am its author, and its fenced examples of F1 held the opener literally, which the rule as fixed refuses anywhere. In those four examples each opener is now written as the entity `&lt;!--`, which in a fenced block GitHub shows as typed; read it as the opener. Nothing else in round 1 changed.
- Further variations run against the fix, each reported: an opener in an inline code span, after a lone `\r` or a Unicode line separator, followed by `\r\n`, after a byte-order mark, the empty comment (the opener followed at once by `-->`), and in an ordinary fenced block. The entity form is accepted in running text, a code span, a fenced block and a closing section. An opener cannot be split across lines (`\n` is not part of it), and a split one renders as text, so nothing is lost by finding it per line.
- Line numbers: `commentLines` counts lines by `\n` and the main loop by `\r?\n`; both give the same count, so the message points at the right line; after a lone `\r` it names the line that holds it, as design D2 says.
- The archived `2026-11-12-review-rounds/review.md` still fails on lines 84 and 100 (code spans), as noted in round 1; `2026-11-12-answer-checker/review.md` is still accepted. Archived records are not checked.
- `README.md` now says "normally the same one in every round", which settles the note of round 1. `tasks.md` 1.2 records the clone's hash `8a4fad13673d`, the content this round read.
- Not covered, as D2 says: other raw HTML that hides text without the opener (`<details>`, link definitions).
- Run: `pnpm test` (459 passed), `pnpm lint`, `pnpm check`, all passing.

## Requirement coverage

| ID  | Implemented in | Test |
| --- | -------------- | ---- |

The pull request lists no requirement (Requirements: none).

## Outside the listed requirements

- The review check: `scripts/review-record.mjs` (the refusal of an HTML comment and its message), its tests in `scripts/review-record.test.mjs`, and the sample of the message in `scripts/pr-evidence.test.mjs`.
- Process documents: `docs/process.md` step 4, `CLAUDE.md`, `README.md`.
- The change's own proposal, design, tasks and this record.
