# Review

Reviewed commit: ed1e4fa

The code-review skill was run at effort `high` with every finding reported, on the whole diff `main..ed1e4fa` (9 commits). An earlier invocation was started from a directory outside this repository and reviewed other code; its output was discarded. F1 to F15 are the findings of the run on this diff, in its order.

## Findings

### F1 An archive directory is not tied to a change it moves
- Where: scripts/pr-evidence.mjs:78
- Outcome: fixed in 3dcf77d

### F2 Deleting a change in flight, a living spec or an archived change is never checked
- Where: scripts/pr-evidence.mjs:72
- Outcome: fixed in 3dcf77d

### F3 Any path under openspec/ is in scope, including openspec/config.yaml and older archives
- Where: scripts/pr-evidence.mjs:47
- Outcome: fixed in 3dcf77d

### F4 The last task of a change cannot be ticked before its own archive pull request has run
- Where: docs/process.md:31

### F5 Unticked tasks written as `+ [ ]`, `1. [ ]` or `-  [ ]` are not counted
- Where: scripts/pr-evidence.mjs:91
- Outcome: fixed in 3dcf77d

### F6 C-18 states conditions the script does not measure
- Where: docs/constitution.md:58
- Outcome: fixed in 628c974

### F7 The release exemption is credited to bootstrap design D10 instead of D9
- Where: scripts/pr-evidence.mjs:337
- Outcome: fixed in 3dcf77d

### F8 Condition 4 of design D1 and the code describe different rules
- Where: openspec/changes/pipeline-follow-ups/design.md:69
- Outcome: fixed in 628c974

### F9 The archive tests set the exemption flag themselves, so the wiring in gather is untested
- Where: scripts/pr-evidence.test.mjs:410
- Outcome: fixed in 3dcf77d

### F10 No test deletes a change in flight or touches an archived change
- Where: scripts/pr-evidence.test.mjs:442
- Outcome: fixed in 3dcf77d

### F11 C-14's measurement still says every pull request names its change
- Where: docs/constitution.md:49
- Outcome: fixed in 628c974

### F12 Two git diffs with different rename handling, and quoted paths break the parsing
- Where: scripts/pr-evidence.mjs:413
- Outcome: fixed in 3dcf77d

### F13 Each exemption is a separate predicate; a table of exempt kinds would unify them
- Where: scripts/pr-evidence.mjs:64
- Outcome: declined
- Reason: there are two kinds and their conditions differ in kind, not in parameters: the release pull request is a list of three files, the archive pull request needs the moved directories, the in-flight changes, the capabilities and the contents of tasks.md. A table would hold one row each plus a callback for everything that is not a prefix or a path list, which is the same code behind one more indirection. Both now go through `exemptions`, the one function `gather` calls. The release pull request lists no unmet conditions because only release-please opens it, from a branch nobody else uses; revisit if a third kind appears.

### F14 Design D3 credits `bump-minor-pre-major` with raising the minor version for features
- Where: openspec/changes/pipeline-follow-ups/design.md:84
- Outcome: fixed in 628c974

### F15 An exempt archive pull request may change a living spec beyond the folded delta specs
- Where: scripts/pr-evidence.mjs:47
- Outcome: declined
- Reason: after F3 it may change only the specs of capabilities whose delta specs it archives, and delete none. Checking the contents would mean re-running `openspec archive` inside the evidence job and comparing its output, a second implementation of OpenSpec's merge that design D1 does not ask for. The text is written by `openspec archive` from delta specs the owner approved, and the archive pull request still needs the owner's approval under branch protection, where the diff of `openspec/specs/` is in front of them.

## Requirement coverage

None: this change delivers no requirement and has no delta specs (`skip_specs`).

| ID | Implemented in | Test |
| --- | --- | --- |

## Outside the listed requirements

- `scripts/pr-evidence.mjs` and its tests: the exemption of the archive pull request (design D1), the summary that names an exemption or the unmet conditions, the changed files read once with `-z` and `--no-renames`.
- `docs/constitution.md` C-14 and C-18, `docs/process.md` step 8 (design D2).
- `release-please-config.json`: `initial-version` `0.1.0`, `bump-patch-for-minor-pre-major` removed (design D3).
- `bootstrap-app-and-ci` closed and archived; `openspec/specs/app-shell/spec.md` created by the archive (design D5); `docs/roadmap.md`.
