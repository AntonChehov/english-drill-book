# Review

## Round 1

Reviewed: 4deab9156879
Verdict: changes requested

### F1 A last round that requests changes passes when no finding is open

- Where: scripts/review-record.mjs:164
- Problem: rule 4 of D3, "the last round is approved", is enforced only through `messages.changesRequested`, which is pushed only when `open` is not empty. A round that raises a finding and declines it in the same round (the parser allows this, see the clarification of D2) must say `Verdict: changes requested`, because it raises a finding, yet leaves nothing open; as the last round with a matching hash it passes checks 3 and 4, and the coverage sections are not required either. A one-round record of `### F1 …`, `- F1: declined — <reason>`, `Verdict: changes requested` passes `checkEvidence` (run against the module). The pull request merges without any approving round, against C-18 item 2 ("passes when the last round is approved") and the proposal ("a review with findings takes at least two"). The last round's verdict must be checked on its own.

### F2 Lines the parser does not recognise are skipped instead of reported

- Where: scripts/review-record.mjs:112
- Problem: a level-two heading that is not exactly `Round <n>` is ignored (`if (!match) continue`), so `## Round 2 (re-review)` with `Verdict: changes requested` and a finding `### F1` vanishes and the record passes on an approved round 1 with the same hash (run). The same happens to a second `Verdict:` line in a round (line 75 takes the first match: `Verdict: approved` followed by `Verdict: changes requested` passes) and to a finding written as `#### F1` under an approved verdict. A reviewer's round or finding is dropped without a word, so the gate passes on a record the reviewer did not mean as an approval. A heading that starts with `Round`, a repeated `Reviewed:` or `Verdict:` line and a heading below level three that starts with `F<n>` should be reported.

### F3 With a stale origin/main the reviewer records a hash CI never computes

- Where: scripts/review-hash.mjs:48
- Problem: `defaultBase` takes `origin/main` whenever it exists, without fetching or comparing it with a newer local `main`. When the branch has been brought up to date with a `main` the reviewer's `origin/main` has not caught up with, the merge base is older and the diff includes `main`'s own changes: in a test clone the reviewer got `129ef275d6d7` and, after `git fetch`, CI's value `f8c75c0b7b47`. The round is then reported as out of date, and the message `stale` says to run the review again with `pnpm review:hash`, which prints the same wrong value again. The need to fetch `main` first is written only in the design's clarifications, not in `CLAUDE.md`, `docs/process.md` or the message. The script should warn when `origin/main` is behind `main` (or the docs and the message should say to fetch).

### F4 `pnpm review:hash` accepts a change that does not exist

- Where: scripts/review-hash.mjs:113
- Problem: the positional `<change>` is never checked against `openspec/changes/`. With a typo, `pnpm review:hash review-round` exits 0 and prints `3ef1f2506f5f` instead of `4deab9156879`, because the real change's `review.md` and `tasks.md` are then hashed (run with `--files`). The recorded hash never matches CI and changes each time the record itself is committed, and the check only says that the review is out of date. It should fail with a message naming the changes that exist.

### F5 Any text after `fixed` still closes the finding

- Where: scripts/review-record.mjs:89
- Problem: the outcome pattern reads `fixed` and drops whatever follows, so `- F1: fixed only in one of the two places; the other remains` closes F1 and an approving round with it passes (run). D2 allows exactly `fixed`, `not fixed — <what remains>` and `declined — <reason>`. A reviewer's qualified outcome is read as a full fix, so a finding is closed that the reviewer did not confirm. Text after `fixed` should be reported as an outcome that is none of the three.

### F6 The hash leaves out the file mode

- Where: scripts/review-hash.mjs:76
- Problem: each entry is the path and the blob ID only. After `chmod +x` on a file the pull request already changes, the hash stays the same (`3f8874302829` before and after, in a test repository). The reviewed content does change, for example a hook or script that stops or starts running, and the approval stays valid. That contradicts `CLAUDE.md` ("Any later change to a reviewed file changes the hash") and C-18 item 2 ("any change to the reviewed files makes the approval stale"). The mode from `ls-tree` belongs in each entry; design D1 needs a matching word.

### F7 Check 4 and the review line misreport when nothing was compared

- Where: scripts/pr-evidence.mjs:274
- Problem: when the description names no change, or a change that does not exist, `review` is undefined and the table shows check 4 "Reviewed content" as `passed` (run with `report`). The clarification of D3 says that the table "never shows the content as checked when nothing was compared". When the last round lacks `Reviewed:` but an earlier round has it, check 4 says "No round of the review records a hash", which is false, and the summary line (scripts/review-record.mjs:195) says "different, so the review is out of date" though nothing is out of date (run). The reader is sent to re-run the review instead of adding the missing line. Check 4 should fail whenever no hash was compared, and these two texts should name the last round's missing line.
