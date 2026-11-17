# Review

## Round 1

Reviewed: 2e20eaa70d05
Verdict: changes requested

### F1 The product description and the roadmap gain PROD-012, which is not part of this change

Severity: minor

`docs/product/01-product.md` adds PROD-012 (the compact bar on a phone), and `docs/roadmap.md` adds it to slice 1.8 and as a bullet under "Asked for by the owner". Neither is named in the proposal's requirements nor in its Impact, which lists `02-content-packs.md`, `04-exercise-player.md`, `08-interface-reference.md` and the roadmap for this change's own entry; the new paragraph of `08-interface-reference.md` on the narrow-screen bar is PROD-012 too. `docs/product/` is owner-controlled and changed only through an approved change or at the owner's request (CLAUDE.md), and a pull request delivers one slice (C-15). Either move the PROD-012 text to its own change or pull request, or name it in the proposal (Impact, and "what changed outside the listed requirements") as the owner's request recorded here, so that the owner approves it knowingly.

### F2 The build's check of `*` in a theory does not match how Study splits it

Severity: minor

`sourceProblems` in `scripts/build-demo-books.mjs` counts `*` over the whole `theory` and refuses an odd total, and refuses any `**`. `theoryParagraphs` pairs `*` within each paragraph. So a theory with one unclosed `*` in each of two paragraphs passes the build (even total) and Study then shows two literal `*`, which design D2 says the build refuses; and two touching spans (`*am**is*`), which `theoryParagraphs` accepts and its test names as allowed, are refused by the build as "an empty * span". The demo sources hit neither case today. Count `*` per paragraph (after the split the check already does) and refuse only an empty span `**` that is not two touching spans, or state that touching spans are not allowed in sources and drop them from the renderer's test; add a source test for the per-paragraph case.

### Notes

Reviewed the whole diff of `origin/main...HEAD` (46 files) against PACK-004, PLAY-020, design D1 – D6 and the constitution. Task 1.2 was ticked after this round started (commit 2b7e045); `tasks.md` is outside the hash, which is unchanged.

Checked and found right:

- C-01: the demo sources differ from `main` only by the `learner` texts and the version (compared with every `learner` removed and the version masked: equal); every Russian text is in `learner` beside English written for this project, and `contracts/examples/pack.valid.json` has its Markdown theory replaced by own text in the new form. The Russian wording was not judged.
- The PDFs: `git diff --stat origin/main...HEAD -- public/demo` is empty; `sha256sum` of both PDFs equals `documents.json`, and the builder's test pins the published hashes. The layout reads no `learner` field.
- Schema, validator and examples agree: `help` (1 to 1000) on all three kinds, `theory` restated; the over-long example has its reason file; validator tests cover acceptance, `maxLength` at the path on each kind, and `minLength`.
- The join: `withLearnerTexts` is pure, in `src/domain`, called in `addDemo` after `readDemoBook` and before validation; the reader is untouched and its tests compare the joined result with `demo/<book>.pack.json`.
- Stored packs: profiles and sources at `1.1.0`; `keptDemo` reports `1.0.0` stale (unit test), and the end-to-end test rewrites the stored packs to `1.0.0` without texts, reloads, and finds them at `1.1.0` with the texts and exercise 1.1 still done.
- Study: `<details open>` with `<summary>` «Объяснение» before «Упражнения», paragraphs as `<p>`, spans as `<em lang="en">`, nothing else marked; reopened on every unit because the view is keyed by path; `help` without `lang` under the `lang="en"` task; unit titles lost `lang="en"` in the three components, book titles keep it. Keyboard folding (Enter, Space) is tested; the focus ring is the global `:focus-visible`.
- C-11: every scenario of both delta specs is named by a test with `@req PACK-004` or `@req PLAY-020`; `pnpm trace` passes (43 requirements).
- C-19: the new end-to-end file has four tests, 4.7 s on Chromium with four workers; unit tests run in 3.3 s.
- Gates run: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm spec`, `pnpm trace`, `pnpm test` (787 passed), `pnpm build` and `pnpm size` (initial JavaScript 42.12 kB gzip; `learner.json` lands in the lazily loaded profiles chunk, so the first screen does not grow as the proposal expected), and on Chromium `e2e/study-texts.spec.ts`, `e2e/study-a11y.spec.ts` and `e2e/themes.spec.ts` (axe in both themes): all pass.

Observations, not findings: the roadmap still calls `russian-demo` "proposed"; the summary «Объяснение» is styled like a heading but is not one, so it is not reached by heading navigation, which the spec does not ask for.

## Round 2

Reviewed: b9222ffb0dd8
Verdict: approved
- F1: fixed
  The proposal now names PROD-012 under "Recorded, not implemented" and in Impact as documentation only, implemented in slice 1.8; the owner asked for it to be recorded here (2f2e0ff).
- F2: fixed
  `sourceProblems` splits `*` per paragraph as `theoryParagraphs` does: an odd count in a paragraph is unclosed, an empty learned piece is an empty span, touching spans pass; two new tests cover both (82586d9).

### Notes

Since round 1 only `scripts/build-demo-books.mjs`, its test and `proposal.md` changed; `src`, `e2e` and `public/demo` did not, so the rest of the whole diff stands as reviewed in round 1. Checked the new split against the renderer: a paragraph `**x` is refused as an empty span, `*am**is*` passes, and whitespace around a paragraph is still refused by the plain-text check, so an accepted source splits the same in the build and in Study. Gates run: the builder's tests (24 passed), `pnpm lint`, `pnpm format:check`, `pnpm spec`, `pnpm trace`. The proposal's Impact still expects the initial bundle to grow by 8–10 kB, while `learner.json` loads lazily with the profiles (round 1 notes); harmless.

## Requirement coverage

| Requirement | Implemented in | Covered by |
| --- | --- | --- |
| PACK-004 | `contracts/pack.schema.json`, `src/domain/packs/{types,validate}.ts`, `demo/{course,drills}.json`, `scripts/build-demo-books.mjs`, `src/domain/books/demo/{learner.ts,learner.json,profiles.ts}`, `src/ui/demo/add-demo.ts` | `src/domain/packs/validate.test.ts`, `src/domain/books/demo/learner.test.ts`, `src/domain/books/demo/kept.test.ts`, `src/domain/books/demo/reader.test.ts`, `scripts/build-demo-books.test.mjs`, `e2e/study-texts.spec.ts` |
| PLAY-020 | `src/domain/study/theory.ts`, `src/ui/study/StudyView.vue`, `src/ui/study/ExerciseBlock.vue` | `src/domain/study/theory.test.ts`, `e2e/study-texts.spec.ts` |

## Outside the listed requirements

Unit titles lose `lang="en"` in `StudyView.vue`, `UnitMenu.vue` and `BookCards.vue` (design D3); the end-to-end tests and `e2e/views.ts` follow the Russian unit titles; `.prettierignore` gains the generated `learner.json`; `docs/product/08-interface-reference.md` describes the block and the help. PROD-012 is recorded, not implemented, at the owner's request: its requirement in `docs/product/01-product.md`, the narrow-screen bar in `08-interface-reference.md`, and slice 1.8 in `docs/roadmap.md` (F1).
