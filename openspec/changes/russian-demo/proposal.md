# Proposal

## Why

The demo books are in English from cover to cover: the explanations of grammar, the tasks of the exercises, the pages "How to use this book" and the answer key. The app is for Russian speakers (PROD-004), and the owner, trying the first release, asked on 2026-11-16 for the demo to speak Russian wherever it speaks to the learner, leaving in English only what the learner works on: the sentences, words and texts of the exercises and their answers. A visitor who does not read English explanations yet is exactly who the demo is for.

The books cannot simply be rewritten: they are laid out as PDFs with the standard fonts Helvetica, Helvetica-Bold and Helvetica-Oblique, which have no Cyrillic (`demo/LAYOUT.md`), and the reader finds units, exercises and the key by English words printed in them (`Unit 2`, `Answer key`, `Answers will vary. Example:`).

## What Changes

- **The demo books speak Russian.** In `demo/course.json` and `demo/drills.json`: the titles and subtitles of the books, the pages "How to use this book" and the contents, the explanations of grammar (paragraphs, rules, examples' labels, notes), the headings of the key, the tasks of every exercise, the ideas of the open exercise, the "continues on the next page" note and the footers are in Russian. In English stay: the prompts, choices and answers of items, the connected text and its model, the sample answer of the open exercise, and the English examples inside explanations (the words being explained, set in italics as now). The titles of units are in Russian with the English term kept where it is the point (*Глагол to be: am, is, are*; *Present simple*; *Артикли a и an*; *There is и there are*).
- **A font with Cyrillic.** The builder embeds a free font (DejaVu Sans, regular, bold and oblique, from a copy committed under `demo/fonts/` with its licence) through `@pdf-lib/fontkit`, subset to the characters used. The same source still gives the same bytes.
- **The reader follows the Russian layout.** `demo/LAYOUT.md` and `src/domain/books/demo/reader.ts` read `Раздел <n> <title>` as a unit heading, `Ответы` as the heading of the key, and `Ответы могут быть разными. Пример: …` as the key of an open exercise. Exercise and item numbers, and the way answers are printed in the key (CHK-001), do not change.
- **The app shows the pack's language.** Unit titles, tasks and the ideas of an open exercise come from the pack in Russian now, so the interface marks them `lang="ru"`; prompts, choices, texts, samples and keys stay `lang="en"`. A pack says the language of its texts (`language` of the pack, `textLanguage` of the exercises, both optional and defaulting to English), so the interface marks each by what the pack says, not by guessing.
- **Tests and screenshots** that name English titles and tasks of the demo (`Раздел 1. To be: am, is, are`, "Complete the sentences…") follow the new text.

Requirements delivered: **PACK-004** (new, `02-content-packs.md`): the demo books' explanations, tasks and service pages are in Russian; the material of the exercises is in English. PROD-004 is kept: pack content is shown as authored and marked with its language.

Not changed: the structure of the books (four units of three exercises each, the same exercises and answers), the checker, the program.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `content-packs`: PACK-004 added; the demo books' language.

## Impact

- Changed: `demo/course.json`, `demo/drills.json`, `demo/LAYOUT.md`, `scripts/build-demo-books.mjs` and its tests, `public/demo/*.pdf`, `demo/*.pack.json`, `demo/*.text.json`, `src/domain/books/demo/{reader,profiles,documents.json}` and tests, `contracts/pack.schema.json` (optional `language` fields), `src/ui/study/*` and `src/ui/components/BookCards.vue` (`lang`), end-to-end tests and the reference screenshots, `docs/product/02-content-packs.md`, `docs/roadmap.md`.
- New: `demo/fonts/` (DejaVu Sans, Bitstream Vera licence), dev dependency `@pdf-lib/fontkit`.
- The PDFs grow by the embedded subsets (about 60–90 kB each; the test "under 100 kB" moves to 200 kB). They are fetched only when the demo is added or Study opens (C-06 unaffected).
- A visitor who added the demo before this change has the English packs stored: the profiles' hash of the PDF changes, so the stored packs are read again from the new PDFs on the next visit, as for any new edition (`kept.ts`); their attempts keep the same exercise IDs and stay valid.
- Depends on: nothing in flight.
