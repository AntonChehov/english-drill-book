# Proposal

## Why

The demo books are in English from cover to cover, and so is everything the app shows from them: unit titles, the explanation of each unit's grammar on its pages, the task of each exercise. The app is for Russian speakers (PROD-004), and the owner, trying the first release, asked on 2026-11-16 for a learner who does not read English yet to understand, in the demo, what each unit teaches and what each exercise asks.

Rebuilding the demo PDFs in Russian was proposed first and rejected on cost: a Cyrillic font, a new layout, a reader that follows it. The owner chose instead to leave the PDF as it is. It stands for the learner's own English textbook, which the app will one day read exactly as it reads the demo now; what helps the learner across the language comes from the pack, which is the app's own data, and is shown in Study beside the exercises.

## What Changes

- **The pack says what the book says, in the learner's language.** A unit MAY carry a `theory`: the explanation of its grammar as plain paragraphs, with spans in the language being learned marked `*…*`. An exercise MAY carry a `help`: what to do in it, in one or two sentences. Both are addressed to the learner in the language of the interface, Russian, and are the app's own text (C-01). `theory` is already in the schema; this change states its form. `help` is new, optional on every kind of exercise. The book's own `task`, read from the page, stays as it is.
- **The demo packs carry them.** `demo/course.json` and `demo/drills.json` gain, beside the English text of the pages, the Russian title of each unit, the `theory` of each unit and the `help` of each exercise. `pnpm demo:build` passes them through to `demo/<book>.pack.json` and to a file the app bundles, and ignores them when laying out the PDF: the PDFs and their hashes do not change. The reader is untouched; the texts are joined to the pack it returns.
- **Russian unit titles.** The demo units are «Глагол to be: am, is, are», «Present simple», «Артикли a и an», «There is и there are» in both books. The titles of the books, which name the English books, stay «Everyday Grammar: A Demo Course» and «Everyday Grammar: Demo Drills». The interface stops marking unit titles as English.
- **Study shows them.** At the top of the exercises column, before the card «Упражнения», a block «Объяснение» holds the unit's `theory`, open when the unit opens and foldable; the `*…*` spans are in italics and marked `lang="en"`. In each exercise, under the book's task and above the items, its `help`. Nothing else in the design changes.
- **Stored packs are refreshed.** The demo packs' version becomes `1.1.0`, so a visitor who added the demo at `1.0.0` has it read again from the same PDFs on their next visit, as for any new edition; exercise and pack IDs do not change and their attempts stay.
- **Tests and screenshots** that name the English unit titles follow the Russian ones.

Requirements delivered: **PACK-004** (`02-content-packs.md`): a pack carries, in the language of the interface, the title and explanation of a unit and the help of an exercise, and the demo packs carry them for every unit and exercise; **PLAY-020** (`04-exercise-player.md`): Study shows them. PROD-004 is kept: pack content is shown as authored.

Left for later: a Markdown subset for `theory` beyond paragraphs and `*…*` (a table of forms, a list), a pack field naming the language of these texts for packs made for other learners, and any change to the pages or the reader. Not changed: the PDFs, `demo/LAYOUT.md`, the reader, the checker, the structure of the books, the English material of the exercises.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-packs`: PACK-004 added; what a pack says to the learner in the language of the interface, and the demo packs.
- `study`: PLAY-020 added; Study shows the unit's explanation and each exercise's help.

## Impact

- Changed: `demo/course.json`, `demo/drills.json` (the Russian texts and the version), `scripts/build-demo-books.mjs` and its tests, `demo/*.pack.json`, `contracts/pack.schema.json`, `contracts/examples/*`, `src/domain/packs/{types,validate}.ts` and tests, `src/domain/books/demo/profiles.ts` (the version, the texts), `src/domain/study` (the paragraphs of a `theory`), `src/ui/study/{StudyView,ExerciseBlock,UnitMenu}.vue`, `src/ui/components/BookCards.vue`, `src/ui/demo/add-demo.ts`, end-to-end tests and the reference screenshots, `docs/product/02-content-packs.md`, `04-exercise-player.md`, `08-interface-reference.md`, `docs/roadmap.md`.
- New: `src/domain/books/demo/learner.json`, written by `pnpm demo:build`, with the Russian texts of the demo packs; `src/domain/books/demo/learner.ts`, which joins them to a read pack.
- Not changed: `public/demo/*.pdf`, `demo/*.text.json`, `documents.json`, `demo/LAYOUT.md`, `src/domain/books/demo/reader.ts`.
- The initial bundle grows by the Russian texts, about 8–10 kB gzip, well within C-06; no new dependency.
- Depends on: nothing in flight.
