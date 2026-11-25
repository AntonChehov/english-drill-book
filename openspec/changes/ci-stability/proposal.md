# Proposal

## Why

In 14 days 10 end-to-end runs went red, all but one on WebKit, where a PDF page draws in 1.5–2 s against 0.1 s: PROG-014 hit the 30 s timeout, and `retries` is 0. Three tests also race. 46 evidence checks went red, mostly before the review caught up, at least 10 from a stale hash after a commit or a rebase.

## What Changes

Size: small (pipeline and tests, no behaviour of the app).

- **WebKit in CI**: test timeout 60 s and `retries: 1`; a pass on retry shows as flaky. Other browsers unchanged.
- **Races**: PROG-014 waits for the unit's result before «Сегодня»; DOC-003 uses `expect.poll`; PROD-006 checks the focus outline after Tab with a retrying assertion; PACK-003's 2 000 ms budget is not asserted on WebKit, as DOC-004 and DOC-001.
- **Review hash** from the change's diff: `git patch-id --stable` of the change's diff, `review.md` and `tasks.md` left out as now. A rebase onto a `main` that does not touch the change's lines keeps the hash; any edit of them changes it. C-18 and `docs/process.md` step 5 say "diff" for "content".
- **Draft until approved**: the mechanic opens the pull request as a draft; `evidence` skips drafts; after the approving round the mechanic marks it ready and the trigger `ready_for_review` (already in `pull-request.yml`) runs it. C-18 (owner-approved wording), `docs/process.md` step 4 and the mechanic's instructions follow.
- **`docs/tech-debt.md`**: WebKit's slow PDF draw as root cause; CHK-014 timing under local load.

## Requirements

None added. Tests changed: PROG-014, DOC-003, PROD-006, PACK-003; C-18 and C-19 (pipeline).

Left for later: making WebKit's draw fast.

## Capabilities

None.
