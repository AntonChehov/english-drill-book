# Review of ci-stability

## Round 1

Reviewed: 03d3995ab5cd
Verdict: changes requested

### F1 The patch ID keeps the hash on edits that change behaviour

Severity: critical

Where: `scripts/review-hash.mjs`, `reviewHash` (`git diff --unified=0` piped to `git patch-id --stable`). What: `git patch-id` strips all whitespace from every line and ignores hunk headers, and with `--unified=0` there is no context left to place a line. Tried on a scratch repository with this script (git 2.43): an added line `if (x) throw 1;` moved from function `a` into function `b`, the same line rewritten as `if(x)throw 1;`, and a string literal `"a b"` changed to `"ab"` all left the hash as it was. YAML indentation (the workflows), Markdown nesting and string contents are the same case. Why: the proposal says "any edit of them changes it", and C-18 now says "any change to the lines of the diff makes the approval stale"; as built, code or a workflow can change after the approving round and still pass the evidence check, so unreviewed code can merge. A way out: hash the diff text itself (for example SHA-256 of `git diff --no-renames --binary` with a little context, `--unified=1` or more, and only the line numbers of the `@@` headers removed), so whitespace and position count while a rebase that leaves the change's lines and their neighbours alone keeps the hash; add tests for a moved line and a whitespace-only edit.

### F2 An empty diff hashes as an empty string, not `none`

Severity: minor

Where: `scripts/review-hash.mjs`, `const [hash = "none"] = ....split(" ")`. What: `git patch-id` prints nothing for an empty diff, and `"".split(" ")` is `[""]`, so the default never applies and `hash` and `short` are empty, while the JSDoc says `none`. Why: the doc and the code disagree; a record can never hold an empty hash, so the failure would read oddly. Take the first token only when the output is not empty.

### F3 The test oracle of the patch ID is not the diff the script hashes

Severity: minor

Where: `scripts/review-hash.test.mjs`, "is the patch ID of the changed files only". What: the expected value is the patch ID of `git diff --binary` with the default three lines of context and renames on, while the script hashes `--no-renames --unified=0`; it agrees only because the fixture's files have a line or two. Why: the test would not catch a change of the flags, and it reads as if context were part of the hash. Build the expected diff with the same flags, or drop the equality and keep the behavioural tests (rebase, edit).

### F4 Texts still say "files" for what the hash covers

Severity: minor

Where: `docs/process.md` step 5, "The record": "Any later change to the reviewed files changes the hash and needs another round (C-18)". What: with this change an edit by `main` of other lines of a reviewed file keeps the hash; C-18 and the rest of step 5 now say "diff". Why: C-18 and `docs/process.md` are meant to agree (task 3.2). Say "the reviewed diff" there too.

### F5 PREVIEW_PORT is outside the proposal and undocumented

Severity: minor

Where: `playwright.config.ts`, `Number(process.env["PREVIEW_PORT"] ?? 4173)`. What: the variable is in neither the proposal nor the tasks, nothing in CI or `package.json` sets it, and the README does not name it; an empty value gives port 0 and a non-number gives `NaN`, both silently. Why: scope and discoverability; either name it in the tasks and the README (it helps when 4173 is busy locally), or drop it.

### Notes

`playwright.config.ts`: `retries: ci ? 1 : 0` and `timeout: 60_000` are on the `webkit` project only, the global `retries` stays 0, so Chromium and Firefox are unchanged; the 60 s timeout applies locally too, which the task asks for and costs nothing. The comment line there runs past the usual width.

End-to-end fixes use real waits: PROG-014 waits for `canvas[data-drawn]` after the result, DOC-003 and PROD-006 use `expect.poll`, PACK-003 skips only the budget on WebKit as DOC-001 and DOC-004 do. No sleeps added; every `@req` title is kept.

`pull-request.yml`: `evidence` has `!github.event.pull_request.draft` and `ready_for_review` is in `types`; a draft cannot be merged, so the skipped required check is harmless there. A push after the ready mark runs it again on `synchronize`.

Exclusion at the archive commit: `reviewHash` hashes the parent, where the change is still in flight, so excluding the active `review.md` and `tasks.md` covers the archived case. Binary edits, renames (as delete plus add) and mode changes each changed the hash in the scratch test.

The mechanic's instructions named in the proposal live outside the repository and are not in this diff. Ordering: marking the pull request ready right after the approving round, before the archive commit, makes the evidence check go red on item 5 until the archive is pushed; worth a word in step 4 or 6.

Tasks 1.1, 1.2 and 1.4 are unticked and are to be verified by CI (WebKit does not run here). Tests of `scripts/` pass locally (318).

## Round 2

Reviewed: f26c78426528
Verdict: changes requested

- F1: fixed
- F2: fixed
- F3: fixed
- F4: fixed
- F5: fixed

### F6 The hash depends on the local git configuration

Severity: minor

Where: `scripts/review-hash.mjs`, `reviewHash`, the `git diff` call. What: the hashed text is the porcelain output of `git diff`, which reads the user's configuration. On the scratch repository `diff.context=1` and `diff.noprefix=true` each gave a different hash for the same commit. `diff.algorithm`, `diff.indentHeuristic`, `diff.external`, `diff.mnemonicPrefix` and `core.quotePath` can change it too. Why: a reviewer whose global config differs from CI's records a hash that CI does not reproduce, and the approval reads as stale. This fails safe, but it costs a round for nothing. Pin the output: `--unified=3 --no-ext-diff --no-color --src-prefix=a/ --dst-prefix=b/ --diff-algorithm=myers`, or run git with `GIT_CONFIG_GLOBAL=/dev/null` and `GIT_CONFIG_NOSYSTEM=1`. Add a test that sets one such key and expects the same hash.

### Notes

Fix of F1: SHA-256 of the `git diff --no-renames --binary` text with three lines of context. The hunk-header numbers and the `index` lines are removed. I reran the scratch repository: the moved line, the whitespace-only edit, `"a b"` to `"ab"`, the binary edit, the rename and the mode change now each give a new hash. The new test covers a moved line, whitespace and a string. Removing `index` lines is safe for text. A mode change still shows as `old mode`/`new mode` or `new file mode`, and the binary content is still hashed through the base85 `GIT binary patch` lines. One residue: a binary delta is relative to a base blob whose ID is no longer hashed. In theory the same delta on a new base from `main` keeps the hash. That is contrived, and the text case gets context lines for it, so I raise no finding.

Fix of F2: an empty diff now gives `none`, and a test covers it. Fix of F3: the oracle is gone, and the behavioural tests (far edit kept, edit inside the context changes the hash) replace it. Fix of F4: "The record" now says "reviewed diff". Fix of F5: README line, task 1.5, and a range check that throws on a bad value.

New since round 1. The DOC-006 canvas width is now divided by `devicePixelRatio`, which is correct for WebKit's two-to-one ratio and unchanged at ratio 1. The PACK-003 budget is now its own `@req PACK-003` test, using the median of three fresh pages, with WebKit skipped by `test.skip`; the first test no longer asserts the time. The ready mark now comes after the archive commit. C-18 item 2 and `docs/process.md` steps 4 and 6 agree, and step 5 no longer says it. The proposal still says "after the approving round the mechanic marks it ready"; a word "and the archive commit" there would match.

Reviewed at head cfdbb8c. Round 1 stays in the working tree and is not committed, as asked. Script tests pass locally (24 in `review-hash.test.mjs`). I am the same reviewing agent as in round 1.

## Round 3

Reviewed: e7e92c436172
Verdict: approved

- F6: fixed

### Notes

Fix of F6: the diff now runs with `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null`, and pins `-U3`, `--src-prefix=a/`, `--dst-prefix=b/`, `--no-ext-diff` and `--no-color`. The new test sets repository-local `diff.context` and `diff.noprefix` and gets the same hash. On the scratch repository, `diff.context`, `diff.noprefix`, `diff.algorithm` and `diff.mnemonicPrefix` set through the environment did not change the hash either.

Two smaller points, notes only, as round 3 allows. First, the repository's own `.git/config` is still read, so a local `diff.algorithm` or `diff.indentHeuristic` could still shift the text; passing `--diff-algorithm=myers` and `--indent-heuristic` would close that. Second, ignoring the global config also ignores a global `safe.directory`. That matters only if the hash ever runs in a container whose checkout belongs to another user; the `evidence` job runs on the bare runner today.

The proposal now says the pull request is marked ready after the approving round and the archive commit, which matches C-18 and `docs/process.md` steps 4 and 6.

Reviewed at head 7146b53, without waiting for its CI run. Script tests pass locally (321). Tasks 1.1, 1.2 and 1.4 are still to be verified by CI on WebKit before the archive commit ticks them. I am the same reviewing agent as in rounds 1 and 2.
