# Tasks

## 1. Budget (V2)

- [x] 1.1 `budgetSeconds = 240` in `scripts/duration.mjs`; `duration.test.mjs` expects 4 minutes; C-19 says "within 4 minutes"; `pnpm test` green — 851 tests

## 2. Local review check (V3)

- [x] 2.1 One function of `review-record.mjs` gives the problems of checks 3 and 4 for a record and the current hash; `pr-evidence.mjs` uses it; `pr-evidence.test.mjs` stays green — tests green
- [x] 2.2 `scripts/review-check.mjs` and `pnpm review:check <name>`: reads `review.md`, computes the hash as `pnpm review:hash` does, prints the problems, exits 1 on any; tests: good record, bad form, stale hash, missing file — 4 tests
- [x] 2.3 `docs/process.md` step 5: the reviewer runs it before finishing a round; a line `- F<n>:` in `### Notes` is read as an outcome — done

## 3. Texts (V1, V4, V7)

- [x] 3.1 `docs/process.md` step 5 and `docs/process/validator-prompt.md`: validation covers the scenarios the change touches, one run; the full set, three runs, before a release and on the owner's request — done
- [x] 3.2 `docs/process.md` step 6: the archive commit after CI is green on the commit before it — done
- [x] 3.3 `CLAUDE.md` and `docs/process.md`: word limits are a ceiling, not a target — done
- [x] 3.4 `docs/process.md` step 4: only the mechanic watches CI, in the foreground, one report; the coordinating session polls once after 10 minutes without a report — done
- [x] 3.5 `pnpm format:check` and `pnpm spec` green — green

## 4. Agent files (local, not committed)

- [x] 4.1 `.claude/`: reviewer runs `pnpm review:check <name>` before finishing a round; mechanic before every push and the archive commit, and makes it only after green CI; validator and coordinating skill: scope of 3.1, CI watch of 3.4; texts short — done locally, not committed
