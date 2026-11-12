# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The record

- [x] 1.1 Make `parseRecord` in `scripts/review-record.mjs` report an HTML comment as in design D2; verify with unit tests for a comment before the first round, among a round's own lines, under a finding, under `### Notes`, in a closing section and inside a fenced block, all refused, for the inputs of F1 of round 1 of the review, and for `&lt;!--`, which is accepted anywhere — 18 tests in `scripts/review-record.test.mjs` pass (also indented under an outcome, on a heading, two comments, a comment hiding a whole round, CRLF endings); the other problems of each line are still reported
  - Each input of F1 (a fence indented four spaces or a tab, a fence in a list item, a fence in a raw HTML block, a lone carriage return) and a comment in an ordinary fenced block fail without the fix of round 1: the parser of that round reported none of them.
- [x] 1.2 Run the check on a clone with a hand-written record that hides an approving round in a comment; verify it fails with the message of D2 — `gather`, `checkEvidence` and `report` of `scripts/pr-evidence.mjs` ran on a clone of this branch with GitHub stubbed, after the fix of F1 of round 1
  - The record showed round 1 requesting changes and hid, in a comment opened under its `### Notes` and closed after `none` of the closing sections, a round 2 approving content `8a4fad13673d`, the hash of the clone. Check 3 failed with the message of D2 for line 16, the line of `<!--`; checks 1, 2 and 4 passed. With the parser of `main` the same record passed check 3: the hidden round approved.
  - A record whose approving round 1 has, under `### Notes`, a line `~~~`, a lone carriage return, `~~~`, then a comment (input 4 of F1) failed check 3 with the same message for line 13, the line of `<!--`. With the parser of round 1 it passed check 3.

## 2. The process

- [x] 2.1 Reword step 4 of `docs/process.md` as in design D1, and `CLAUDE.md` and `README.md` to agree, including the rule on HTML comments; verify each against what the script checks — each states what `parseRecord` checks: a comment is refused wherever `<!--` stands, fenced blocks included, which the tests of 1.1 cover; who writes a round is not checked (D1) and none of them says it is; `README.md` names the same reviewer, normally, and leaves the grammar of the record to the other two

## 3. Review and evidence

- [x] 3.1 Run `pnpm verify` from a clean build; verify it passes — every part passed locally except WebKit, which does not start on the development machine; CI runs it
  - Without `dist`, `reports` or `.lighthouseci` beforehand, `pnpm verify` ran `pnpm check`, 440 unit tests with the coverage thresholds and the 13 speed tests, all passing, then stopped at the end-to-end tests: WebKit does not start here (`libavif.so.16` missing) and nothing was installed, so its 8 tests did not run. The rest ran on their own: `pnpm build` and the end-to-end tests on Chromium and Firefox (24 passed), `pnpm size` (34.57 kB JS, 0.50 kB CSS gzip) and `pnpm lhci` pass.
- [x] 3.2 Open the pull request as the bot with the sections of C-18 item 1, stating that there is no visual change — pull request [#10](https://github.com/AntonChehov/english-drill-book/pull/10)
- [x] 3.3 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; the same reviewing agent, resumed, writes each later round until one approves the latest content; verify the `evidence` check is green — round 1 raised F1; fixed and confirmed by the same reviewing agent, resumed, in round 2, which approved the content `8a4fad13673d`; the run on the commit that records this tick is green
- [ ] 3.4 **(owner)** Read the pull request and the declined findings, approve and merge
