# Review of comment-cleanup

## Round 1

Reviewed: a9479a0a778a
Verdict: changes requested

### F1 Released fixtures edited against their own rule

Severity: minor

Where: `src/storage/db/fixtures/version-1.json` and `version-2.json`, field `comment`.
What: the change rewrites the `comment` of both fixtures, while each says that once its version is released the file is never changed. Release 0.1.0 has shipped with these schema versions. Only the comment changed, not the data, so the migration tests are unaffected.
Why: the rule exists so that a fixture keeps exactly what an older app wrote; an edit that breaks it, even to a comment, makes the rule look optional for the next author. Revert the two fixture edits (a design reference inside a JSON field is not a code comment under the new rule), or say in the proposal why the comment field is exempt. The phrase "Version 1 is not released yet" in version-1.json is stale anyway, which is one more reason to leave the file as it was rather than half-update it.

### F2 Rewritten comments not rewrapped to the print width

Severity: minor

Where: about 14 comment lines over the print width of 100, up to 168 characters, for example `src/domain/progress/derive.ts` (168 and 129), `src/storage/db/idb.ts` (156), `src/domain/books/demo/learner.ts` (151), `src/domain/programs/types.ts` (147), `src/ui/demo/progress.ts` (136), `src/ui/study/SplitSeparator.vue` (134), `scripts/review-record.mjs` (123, 115), `scripts/evidence-branch.mjs` (116, inside the README string), `src/storage/db/store.ts` (120, 103), `src/ui/views/StartView.vue` (108), `src/domain/checking/normalise.ts` (104). Several others now have a short first line followed by full ones (for example `scripts/build-demo-books.mjs`, `scripts/pr-evidence.mjs` head comment).
What: where a reference was cut, two comment lines were joined or left ragged instead of being rewrapped. Prettier does not wrap comments, so the gate passes.
Why: the files no longer read as the rest of the code base does; rewrap the touched comment blocks to 100 columns.

### Notes

Checked, no finding:

- `git grep` finds no design, decision or section reference left in `src/`, `e2e/`, `scripts/`, and no requirement ID in a comment outside tests (the one hit in `scripts/pr-evidence.mjs` is the example of the ID format the script parses, not a citation).
- Reasons were kept where the reference carried one: the screenshot threshold in `scripts/screenshots.mjs` now says why 0.1 % was too coarse; the store, IDB, worker and Study comments still state what each former decision did. No comment I read is now wrong against its code.
- Constitution references (C-04, C-06, C-07, C-08, C-18, C-19) were kept. The constitution is a standing, owner-controlled document a reader of the code can follow, neither a design of an archived change nor a requirement ID, so keeping them fits the rule of `CLAUDE.md`.
- Two output strings changed: the release-please exemption message of `scripts/pr-evidence.mjs` and the README text of the evidence branch. No test asserts either text, and both still say what they said, minus the reference; the README is written only when the evidence branch is first created.
- Speed test: `vitest.config.ts` splits the run into a `unit` project, which excludes `speed.test.ts`, and a `speed` project with `groupOrder: 1`, so it runs after every other file. `vitest list` confirms that `pnpm test:coverage` (with its own `--exclude`) lists no speed file and that `pnpm test:speed` lists only it; CI still runs `pnpm test:speed`. The limit stays `LIMIT_MS = 5`; the warm-up of 2000 checks in `beforeAll` happens before any measured run and does not touch the measurement. `pnpm check` and `pnpm test` pass locally (63 files, 860 tests); I did not repeat the five-runs-under-load task.
- Roles: `README.md` and `docs/how-it-works.md`, text and diagram, agree: the owner owns specification, architecture, the core of each slice, process and acceptance; agents do the rest of the code, the review and the validation.
- Size: 376 lines added and 334 removed, nearly all one comment line for another; the insertions are at the 400 of a small change, the total is above it. Acceptable for a comment-only sweep approved as small, but the owner may want to know.

## Round 2

Reviewed: f2fb3b848ce4
Verdict: approved

- F1: fixed
- F2: fixed

### Notes

Same reviewing agent as round 1, resumed. Round 2 covers the whole diff against `main` again, plus the fix commit.

- Fix of F1: both fixtures under `src/storage/db/fixtures/` are byte for byte as on `main`; the diff no longer touches them.
- Fix of F2: the touched comment blocks are rewrapped to 100 columns, counted in characters. I spot-checked derive, idb, demo check, store and Study, and the wording did not change in the rewrap. One source line is still over: the README template string in `scripts/evidence-branch.mjs`, at 105 characters because of its escaped backticks. The text it writes is under 100 and is a Markdown soft break, so it renders the same. No finding.
- The fix commit changes only comments, that README string and the fixture revert. The speed test split, the 5 ms limit, the `test:coverage` exclusion and the roles texts are as in round 1.
- `pnpm check` and `pnpm test` pass (63 files, 860 tests).
- Size: after the rewrap the diff outside `openspec/` is 480 lines added and 485 removed, more than twice the about 400 of a small change. All of it is comment text, one README string and the test-runner split, with no behaviour, requirement or schema change. I agree that it can stay small in substance, but by the line count it is over, and the owner should approve that knowingly at merge.
