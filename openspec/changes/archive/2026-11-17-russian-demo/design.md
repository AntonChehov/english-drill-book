# Design

## Context

`scripts/build-demo-books.mjs` lays out `demo/<book>.json` as a PDF, writes `demo/<book>.pack.json`, the pack the reader must find in it, and `src/domain/books/demo/documents.json` with the hash and page count of each PDF. In the browser `addDemo` (`src/ui/demo/add-demo.ts`) fetches a PDF, checks its hash, reads it with `readDemoBook` into a pack, validates and stores it. A profile (`profiles.ts`) names the pack and states the structure the book must have: unit IDs and exercise counts, no text. `keptDemo` (`kept.ts`) reads a stored demo pack again from the PDF when its `version` is not the profile's or its document hash is not the published one.

The pack schema (`contracts/pack.schema.json`) already has a unit field `theory` (a string up to 20 000 characters, "Markdown, safe subset"), unused so far, and a required exercise `task`, which the reader takes from the page. Study marks every text from the pack `lang="en"`, unit titles included.

## Decisions

### D1. The fields: `theory` of a unit, `help` of an exercise, the unit's `title`

The pack carries what it says to the learner in the language of the interface (PROD-004), Russian, in three places:

- `units[].title`: the unit's title; for the demo, Russian with the English term kept where it is the point («Глагол to be: am, is, are»).
- `units[].theory`: the explanation of the unit's grammar. Plain text: paragraphs separated by a blank line (`\n\n`); a span between two `*` is in the language being learned and is shown in italics marked with that language; no other markup. The schema's description of `theory` says this instead of "Markdown, safe subset"; the limit of 20 000 characters stays. Why reuse `theory`: it is the field the schema reserved for the unit's rule text, and paragraphs with `*…*` are the first, safe subset of the Markdown it promised; a second unit field for the same thing would leave `theory` dangling.
- `exercises[].help`: what to do in the exercise, one or two sentences, 1 to 1000 characters like `task`; optional on the `items`, `text` and `open` kinds alike. The English prompt material stays in the items, the prompt, the model and the sample. Why a new field beside `task` and not a Russian `task`: `task` is what the book prints and what the reader finds; the pack of a learner's own book will have a `task` and no `help`, and the demo has both.

No language field is added: these texts are in the language of the interface by definition, as every string the interface shows beside them; `language` and `instructionLanguage` of the pack keep their meanings (the material and the book's own instructions, both `en` for the demo). The validator (`validate.ts`) and the types follow the schema; `contracts/examples/pack.valid.json` gets a `help`, and an invalid example a `help` of 1001 characters.

### D2. Where the Russian lives and how it reaches the pack

The texts are written in the demo sources, beside the English they correspond to: each unit of `demo/<book>.json` gains `learner: { title, theory }` and each exercise `learner: { help }`. `pnpm demo:build`:

- lays out the PDF from the English fields only, so the bytes and the hashes in `documents.json` do not change; `sourceProblems` additionally refuses a demo source in which a unit or an exercise has no `learner` text, a `theory` with an unclosed `*` or a text outside the schema's limits;
- writes `demo/<book>.pack.json` with the unit `title` taken from `learner.title`, the `theory` and each `help`, which is what the app must produce;
- writes `src/domain/books/demo/learner.json`: per book, per unit ID its `title` and `theory`, per exercise ID its `help`. The sources themselves are not bundled: they hold the English pages and the keys.

In the app `DemoBook` gains `learner`, the book's part of that file, and a pure function `withLearnerTexts(pack, learner)` in `src/domain/books/demo/learner.ts` returns the pack with the titles replaced and `theory` and `help` added. `addDemo` calls it right after `readDemoBook` and before validation. The reader is untouched: it still finds the English title on the page, and the join happens outside it, so `demo/LAYOUT.md` and the reader's tests stay as they are; the reader's tests compare their result, joined, with `demo/<book>.pack.json`. Why not in the profile: `BookProfile` is the type of every future book and holds no text (`02-content-packs.md`, Terms); the Russian is the demo's own and sits beside the demo's other bundled data, `documents.json`.

### D3. Study

Two additions to the exercises column of `StudyView.vue`, no other change to the layout:

- Before the card «Упражнения», when the unit has a `theory`: a `<details open>` card whose `<summary>` is «Объяснение» and whose body is the paragraphs of the `theory`, each a `<p>`, with every `*…*` span an `<em lang="en">`. The split into paragraphs and spans is a pure function `theoryParagraphs(text)` in `src/domain/study`, returning paragraphs as lists of `{ text, learned }` runs; an unclosed `*` is shown literally. Open on every opening of the unit; whether the learner folded it is not remembered. Why `<details>`: folding comes with the keyboard and the accessible name for free, and the state is not worth keeping.
- In `ExerciseBlock.vue`, when the exercise has a `help`: a paragraph with it directly under the book's `task` and above the items (or the field of an open exercise), in the regular weight so that the bold `task` stays the heading of the block. Why under the task and not above: the order of the page is kept, the book's words first, the help with them.

Unit titles lose their `lang="en"` in `StudyView.vue`, `UnitMenu.vue` and `BookCards.vue`: they are in the language of the interface now. The English words inside a title («to be», «a и an») are not marked; a title is one phrase and the screen reader's switch mid-phrase would cost more than it gives. Book titles, prompts, choices, texts, samples and keys keep `lang="en"`.

### D4. Stored packs of earlier visitors

`keptDemo` holds a stored demo pack only when its `version` is the profile's and its document hash is the published one. The PDFs do not change, so the hash stays; the version is the lever: the demo sources and `profiles.ts` set `version: "1.1.0"`. A pack stored at `1.0.0` is `stale`, the start screen reads the demo again from the published PDFs, and `withLearnerTexts` gives it the Russian. Pack IDs, exercise IDs and item IDs are the same, so the attempt log and the derived states apply unchanged; an attempt records `packVersion` for the record only.

### D5. Tests and evidence

- Unit tests: the validator (`@req PACK-001`, `PACK-004`): `help` accepted on each kind, refused over 1000 characters, `theory` accepted; `theoryParagraphs` (`@req PLAY-020`): paragraphs, spans, an unclosed `*`, an empty text; `withLearnerTexts` against `demo/<book>.pack.json` (`@req PACK-004`); `keptDemo` with a stored pack of version `1.0.0` reported `stale` (`@req PACK-004`); the builder's test that the PDF bytes are the ones in `documents.json` after the sources gained the texts.
- End-to-end (`@req PACK-004`, `@req PLAY-020`): unit 1 of the course opened: the heading «Раздел 1. Глагол to be: am, is, are», the block «Объяснение» open with its first Russian paragraph and an `<em lang="en">` inside it, folding it, the `help` of exercise 1.1 between its task and item 1, item 1's prompt still English and marked `en`; axe reports no violation.
- The tests that name English unit titles (`e2e/views.ts`, `demo.spec.ts`, `study.spec.ts`, `study-frame.spec.ts`, `study-layout.spec.ts`, `reader.test.ts`) take the Russian ones; book titles and the answers typed do not change.
- The reference screenshots change for the start screen (unit titles) and every Study state; the pull request shows them beside `main`'s.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | every Russian text is written for this project, in the demo sources beside the English written for it |
| C-06 | the bundle grows by `learner.json`, about 8–10 kB gzip; `pnpm size` on the pull request |
| C-07 | the `<details>` block works by keyboard; `lang` on the `*…*` spans; axe on Study in the end-to-end test |
| C-08 | `theoryParagraphs` and `withLearnerTexts` are pure functions in `src/domain` |
| C-10, C-11 | the unit tests of D5; `@req PACK-004` and `@req PLAY-020` in the tests named there |
| C-13 | the demo flow on the three browsers, unchanged |
| C-18 | the review record, the screenshots beside `main`'s, the numbers |

## Risks

- **The texts.** The Russian explanations are the demo's teaching voice; the owner reads them in the sources before anything is built (task 1.2).
- **The size limit of `theory`.** Four explanations of a few paragraphs are far under 20 000 characters; `sourceProblems` reports a text over the limit at build time, not in the browser.
- **Mixed-language titles.** Unmarked English words in a Russian title are read by a screen reader with Russian rules; accepted for titles, which are short (D3).
