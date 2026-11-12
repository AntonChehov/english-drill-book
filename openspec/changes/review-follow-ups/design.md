# Design

## Context

The review record and its check were introduced by the change `review-rounds` (archived); the grammar of the record is in its design D2. This change adds one rule to that grammar and rewords who writes a round.

## Decisions

### D1. Who writes a round

Wording for step 4 of `docs/process.md`, with `CLAUDE.md` and `README.md` made to agree:

> When the tasks are done, a reviewing agent started for this with a fresh context runs the review skill on the whole diff and writes round 1 into `review.md` […]. The implementing agent fixes or declines each finding and hands the change back to **the same reviewing agent**, resumed with what it already knows, for the next round, which states for every open finding whether it is fixed and reviews what changed since, so that the round again covers the whole diff (C-18). A new reviewing agent is started for a later round only when the first cannot be resumed; its round says so under `### Notes`.

Why the same agent: it knows the diff and its own findings, so a later round costs the reading of the fixes, not of the whole change. Why this is still an independent review: independence is from the author, and the reviewer never writes code. The hash still binds each round to the content it read, whoever wrote it.

Nothing checks this in CI: which agent wrote a round is not recorded in the repository. It is a rule of the process, like the roles table.

### D2. HTML comments

`parseRecord` reports a problem for every line that contains `<!--` anywhere in the record: before the first round, in a round's own lines, under a finding or `### Notes`, in the closing sections, and inside a fenced block too. The openings are found in the raw text, independently of fences and of how the parser reads the lines; the line number is the parser's own, which counts lines by `\n` (with or without `\r` before it), so an opening after a lone `\r` is reported on the line that holds the `\r`. A reviewer who has to mention the characters writes `&lt;!--` in running text, where GitHub shows it as `<!--` (in a code span it shows as written).

Message, in the style of the others (the fact, then what to do):

> `review.md` has an HTML comment on line N. A comment is not shown on the pull request, so the record would hold text its reader cannot see: delete it, or write the text openly under `### Notes`; to mention the characters themselves, write `&lt;!--`.

Why refuse and not strip: the check reads; it does not rewrite the evidence. Why only the opening `<!--`: a closing `-->` without an opening hides nothing. Why inside fenced blocks too: whether a line is in a fenced block depends on CommonMark's rules for indentation, list items, raw HTML blocks and line endings; a parser that disagrees with GitHub about one of them would skip a comment that the page hides (round 1 of the review, F1). Refusing the opening everywhere does not depend on agreeing with GitHub, and costs only the entity when the characters are meant.

Not covered, and stated here honestly: other ways to hide text from a reader of rendered Markdown (a collapsed `<details>`, a link definition) remain possible. They do not change what the check decides, and the owner can read the raw file.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-18 | the review check gains one refusal; its tests cover the comment in each place of D2, inside fenced blocks and after the fences of F1 of round 1 |
| C-10 | unit tests of `scripts/review-record.mjs` |
