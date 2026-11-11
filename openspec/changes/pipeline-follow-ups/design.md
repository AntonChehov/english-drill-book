# Design

## Context

`main` is protected since 2026-11-11: pull request required, the `evidence` check required, the owner's approval, conversations resolved, administrators included. Every file that reaches `main` passes `scripts/pr-evidence.mjs`. The script knows one exemption, the release pull request (bootstrap design D9).

Constraints touched: C-14 and C-18 (which pull requests carry evidence), C-16 (versions). None of the measured budgets changes.

## Decisions

### D1. The archive pull request is exempt, narrowly

`openspec archive` moves `openspec/changes/<name>/` to `openspec/changes/archive/<date>-<name>/` and folds the delta specs into `openspec/specs/`. Such a pull request implements no change, so it cannot name one.

It is exempt from the six checks when all of these hold:

1. the bot opened it;
2. its head branch starts with `archive/`;
3. every changed file is under `openspec/` or is `docs/roadmap.md`;
4. it adds no directory under `openspec/changes/` other than under `archive/` — an archive pull request cannot start or edit a change in flight;
5. for every change it moves into the archive, the archived `tasks.md` has no unticked task and a `review.md` is present.

The jobs before `evidence` (types, lint, tests, OpenSpec validation, traceability) still run and must pass: the archive is what puts requirements into `openspec/specs`, and traceability is measured there.

As implemented (`archiveProblems` in `scripts/pr-evidence.mjs`), conditions 3 – 5 are stated more precisely after the review (findings F1 – F3, F8): the files are `docs/roadmap.md` and those under `openspec/changes/` and `openspec/specs/` (not `openspec/config.yaml`); each moved change goes from `openspec/changes/<name>/` to a new `openspec/changes/archive/<date>-<name>/` and leaves no file behind; no other change in flight is added, edited or deleted, and nothing already in the archive is edited or deleted; living specs are added or changed only for capabilities whose delta specs the moved changes carry, and none is deleted. The contents of a living spec are not re-derived from the delta specs: `openspec archive` writes them and the owner approves the pull request.

Alternative considered: archiving as the last commit of the feature pull request. Rejected: `docs/process.md` archives after the merge on purpose, so that `openspec/specs` only ever describes what is on `main`, and check 4 of the evidence would have to allow writes outside the change's directory after the review.

Alternative considered: carrying the archive of one change in the pull request of the next. Used once here for the bootstrap, because the exemption does not exist yet; rejected as the rule because it ties two unrelated changes together.

### D2. Wording of the constitution

C-14 says a pull request implements exactly one change; C-18 says no pull request merges without evidence. Both gain one sentence naming the two pull requests that implement no change — the release pull request and the archive pull request — and pointing to the conditions under which the check recognises them. `docs/process.md` step 8 says who opens the archive pull request and from which branch.

### D3. First version

`release-please-config.json` gains `"initial-version": "0.1.0"`. With `bump-minor-pre-major` already set, features raise the minor version and fixes the patch version while the major is 0. `1.0.0` is released when the owner asks for it, with `release-as`.

Why it proposed `1.0.0`: the manifest holds `0.0.0`, which release-please reads as "never released", and its default first version is `1.0.0`.

As implemented: the configuration also held `bump-patch-for-minor-pre-major`, under which a feature raises only the patch version below `1.0.0`, against the rule above. It is removed. Below `1.0.0` a feature then raises the minor version by release-please's default, not because of `bump-minor-pre-major`, which only keeps a breaking change from releasing `1.0.0` (finding F14): `feat` gives `0.2.0` after `0.1.0`, `fix` gives `0.1.1`, a breaking change `0.2.0`.

### D4. Showing the refusals of bootstrap task 7.4

The pull request of this change is opened as soon as the code and its tests are pushed, before the review. The `evidence` check is then expected to fail for the missing record. The review record is first committed with one finding that has no outcome yet, and the check is expected to fail for it; then the record is completed and the check is expected to pass. If the review produces no finding, a finding titled "Demonstration of the gate" is recorded without an outcome and removed in the completing commit; `review.md` says so.

The three run links are written into this change's `tasks.md`, which lies inside the change's directory and may change after the review.

### D5. Closing the bootstrap

Its tasks 7.2, 7.5, 8.1, 8.2 and 9.3 are ticked with the run or address that showed each. Task 7.4 is ticked with a note that the refusals on a real pull request are tasks 4.2 – 4.4 of this change. Its design D11 records the protection as set: administrators included, stale approvals dismissed. Then the change is archived. All of this is committed before the review, because it writes outside this change's directory.

## Risks / Trade-offs

- [The exemption becomes a way around the evidence] → it is limited to the bot, a branch prefix and two paths, and it cannot touch `src/`, `scripts/` or the workflows; unit tests cover each condition failing alone.
- [Two red runs on purpose look like a broken pull request] → the description says so in Self-review, and the final run is green.
- [release-please keeps `1.0.0` in its open pull request] → it regenerates that pull request on the next push to `main`; verified after the merge, and if it does not, the stale pull request is left for the owner to close, since agents may not close pull requests.
