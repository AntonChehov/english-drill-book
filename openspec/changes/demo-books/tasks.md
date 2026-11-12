# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Contract and validation

- [x] 1.1 Change `contracts/pack.schema.json` as in design D7 and add an example of an original pack with documents; add `*.invalid.json` examples with `*.reason.txt` for each rule; verify with `ajv` in a test that valid examples pass and invalid ones fail — `then` no longer forbids `source`; `pack.documents.valid.json` added; 19 invalid examples, one per schema keyword and semantic rule (two for `required`), each reason naming its rule and path; `src/domain/packs/contract.test.ts` with `ajv` 8.20.0: every `*.valid.json` (pack, program, export) passes, every example of a schema keyword is refused for that keyword, every example of a semantic rule passes the schema
- [x] 1.2 Write `validatePack` in `src/domain/packs/validate.ts` as in design D6; verify with unit tests named `@req PACK-001` and `@req PACK-002` covering every scenario of the delta spec — `validate.test.ts`: each scenario of both requirements, every invalid example refused with exactly the rule and path of its reason, the cap of 100 errors in the schema and in the semantic rules
- [x] 1.3 Add the agreement test of design D6 (examples and generated packs with one defect, the validator against `ajv`); verify it passes with the fixed seed — `agreement.test.ts`: all pack examples, every value of the valid examples moved to each boundary (over 1000 packs), 1500 packs with one random defect; passes with the fixed seed; a planted off-by-one in the limit of a title, a local ID, a pattern, a page count or a year each made it fail
- [x] 1.4 Reword PACK-002 item 2 in `docs/product/02-content-packs.md` to refer to a valid key (CHK-002); verify the delta spec states the same rule — item 2 now reads "the `accept` of every item builds a valid key (`CHK-002`)", as rule (2) of the delta spec

## 2. The demo books

- [ ] 2.1 Write `demo/LAYOUT.md` and the source of the two books, `demo/course.json` and `demo/drills.json`, as in design D1: original text, level A1; verify both validate as the packs they must become (a test builds the expected pack from the source)
- [ ] 2.2 Write `scripts/build-demo-books.mjs` (`pnpm demo:build`) as in design D2 and commit `public/demo/course.pdf` and `public/demo/drills.pdf`; verify with a unit test that a rebuild in memory equals the committed files, and that each is under 100 kB
- [ ] 2.3 **(owner)** Read the two PDFs: the text, the layout, the level

## 3. Reading

- [ ] 3.1 Add `pdfjs-dist` with `docs/decisions/0005-pdf-library.md`; write `loadPdfText` in `src/storage/pdf/text.ts` as in design D3 and D4, imported on demand, the worker from the app's origin; verify `pnpm size` keeps the initial bundle within budget and names the pdf.js chunk as loaded later
- [ ] 3.2 Write the types of `src/domain/books/types.ts` and the profiles and reader of the demo layout in `src/domain/books/demo/` as in design D5; verify with unit tests named `@req PACK-003` that the text of each committed PDF reads into exactly the pack expected from its source, and that two blank pages in front shift only the page ranges
- [ ] 3.3 Verify the reader on damaged text (a unit heading removed, a key line removed, an exercise number repeated): it returns what it could not find and no pack

## 4. The start screen

- [ ] 4.1 Add the demo section to the start screen as in design D8, with its three states; verify with end-to-end tests named `@req PACK-003` on Chromium, Firefox and WebKit covering the scenarios "One action", "Only the app's own origin", "The demo cannot be loaded", "Trying again" and "The first screen stays light"
- [ ] 4.2 Add the three states to the accessibility check and to the screenshots, both themes; verify no serious or critical violation and that keyboard alone can add the demo and retry

## 5. Review and evidence

- [ ] 5.1 Run `pnpm verify` from a clean build; verify it passes, coverage of `src/domain` is at least 95 %, and both books are read in under 2 s in the end-to-end run
- [ ] 5.2 Open the pull request as the bot with the sections of C-18 item 1; the changed screenshots are shown beside those of `main`
- [ ] 5.3 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; the same reviewing agent, resumed, writes each later round until one approves the latest content; verify the `evidence` check is green
- [ ] 5.4 A validating agent runs the holdout scenario about the demo failing to load against the deployed preview or a local build; attach its report to the pull request
- [ ] 5.5 **(owner)** Read the pull request, the declined findings and the validation report, approve and merge
