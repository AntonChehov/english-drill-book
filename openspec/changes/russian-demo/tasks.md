# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. The text

- [ ] 1.1 Write the Russian text of `demo/course.json`: title, subtitle, "about", the explanations of the four units with English examples marked as spans, the tasks; keep prompts, choices, answers, the connected text, its model and the sample in English
- [ ] 1.2 Write the Russian text of `demo/drills.json`: title, subtitle, "about", the intro of each unit, the tasks
- [ ] 1.3 **(owner)** Read the Russian text of both sources and correct it before the books are built

## 2. The books

- [ ] 2.1 Add DejaVu Sans (regular, bold, oblique) under `demo/fonts/` with its licence and a line in the third-party notices; add `@pdf-lib/fontkit`; embed the fonts subset in `scripts/build-demo-books.mjs` as in design D1; verify `pnpm demo:build` gives the same bytes twice and each PDF is under 200 kB
- [ ] 2.2 Print the Russian service text as in design D2 and D3 (unit headings, key headings, the open key, footers, notes, "Упражнения к разделу", mixed lines in two fonts); update `demo/LAYOUT.md`; verify the builder's tests pass, including the exercise that runs over a page break
- [ ] 2.3 Make the reader read the Russian headings and the open key as in design D2; verify its tests, named `@req PACK-003`, pass against the rebuilt PDFs and `demo/*.text.json`, and the damaged-text tests still report what they did

## 3. The language in the pack and on screen

- [ ] 3.1 Add `language` and `textLanguage` to `contracts/pack.schema.json` and the validator as in design D4; verify with unit tests named `@req PACK-001` that valid tags pass, an invalid one is refused and the defaults apply
- [ ] 3.2 Set `language: "ru"` on the demo packs in the reader and the profiles; mark the texts of Study and the start screen with `lang` from the pack as in design D4; verify with an end-to-end test named `@req PACK-004` that a unit title and a task are marked `ru` and a prompt and an answer `en`, and that axe reports no violation

## 4. Tests and evidence

- [ ] 4.1 Update the end-to-end tests and `e2e/views.ts` to the Russian titles and tasks; verify the whole suite passes on Chromium and Firefox
- [ ] 4.2 Run `pnpm verify`; verify it passes, WebKit by the pipeline; the pull request shows the changed screenshots beside those of `main`
- [ ] 4.3 Open the pull request as the bot with the sections of C-18 item 1
- [ ] 4.4 A reviewing agent with a fresh context writes round 1 in `review.md`; the same agent, resumed, writes each later round until one approves; verify the `evidence` check is green
- [ ] 4.5 A validating agent runs the holdout scenarios of milestone 1 that touch the demo's text against a production build; attach its report to the pull request
- [ ] 4.6 **(owner)** Try the demo, read the pull request and the report; approve and merge
