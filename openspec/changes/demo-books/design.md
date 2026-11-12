# Design

## Context

`docs/product/02-content-packs.md` defines profiles, packs and the demo book. The checker (`src/domain/checking`) exists; nothing reads books. The demo books must go through the same reading as the learner's own books will in milestone 3, so the pieces built here are the ones milestone 3 extends.

## Goals / Non-Goals

**Goals:**

- A visitor can press one button and see that two books were read.
- Reading is split so that the part that understands a book is pure and tested without a browser.
- The demo PDFs can be rebuilt from their source by one command, byte for byte.

**Non-Goals:**

- Storage, the study screen, drawing pages.
- Any profile but the demo's. Partial recognition and its report (BOOK-003).
- Teaching well. The demo books exist to show the app; they are short and plain.

## Decisions

### D1. The demo books

| | Course | Drill book |
| --- | --- | --- |
| Pack id | `demo-course` | `demo-drills` |
| Units | 4, each a page of explanation and a page of 3 exercises (unit 3 has a third page, where its last exercise continues) | 4 sections of 3 exercises, one per topic of the course |
| Topics | *to be*; present simple; *a / an*; *there is / there are* | the same |
| Keys | at the back | at the back |
| Pages | 12 | 6 |

Between them the exercises use every kind the app will support: typed answers, choices, one connected text and one open exercise (the last two are read into the pack now and played from milestone 2). Keys are printed the way books print them, with `/` between alternatives and optional words in brackets, so the demo exercises the checker's patterns. One exercise starts at the foot of a page and continues on the next, as real books do.

All text is written for this repository (C-01), licensed CC BY 4.0, level A1. The source is `demo/course.json` and `demo/drills.json`: units, explanations, exercises, keys. The owner reads the PDFs in the pull request.

### D2. Laying out the PDFs

`scripts/build-demo-books.mjs` (`pnpm demo:build`) reads `demo/*.json` and writes `public/demo/course.pdf` and `public/demo/drills.pdf` with `pdf-lib`, using the standard PDF fonts (no font files, small output) and fixed metadata dates, so the same source gives the same bytes. The PDFs are committed. A unit test rebuilds them in memory and compares them with the committed files, so a change of source without a rebuild fails CI.

Why `pdf-lib` and not printing HTML with a browser: the output of a browser differs between versions and machines, and CI would need a browser for a unit test. Why committed and not built at deploy: the build must not depend on the generator, and the files are the fixtures of the reader's tests. Expected size: under 100 kB each.

### D3. Layers

```
src/storage/pdf/text.ts      loadPdfText(source) -> PageText[]   pdf.js, loaded on demand
src/domain/books/types.ts    PageText, Line, BookProfile, ReadResult
src/domain/books/demo/       profile and reader of the demo layout
src/domain/packs/validate.ts validatePack(value) -> { ok, pack } | { ok: false, errors }
src/ui/…                     the start screen's demo section
```

`PageText` is a page number and its lines: text, position, font size. `loadPdfText` is the only code that touches pdf.js; the reader is a pure function from `PageText[]` to a pack (C-08) and is tested in Node on text taken from the committed PDFs and on altered copies of it.

### D4. pdf.js

`pdfjs-dist` is a runtime dependency (decision record `docs/decisions/0005-pdf-library.md`: it replaces nothing; the alternative is the browser's viewer, which gives no text; its size). It is imported dynamically, so it is a separate chunk loaded when the demo is added, with its worker served from the app's own origin (C-02) and allowed by the Content-Security-Policy. `scripts/size.mjs` already leaves dynamic chunks out of the initial budget; a test asserts that the first screen requests no pdf.js file.

The PDF is fetched whole here, since reading needs every page. Showing pages without loading the whole file (DOC-004) is slice 1.5.

### D5. The reader of the demo layout

The layout is specified in `demo/LAYOUT.md` and the reader relies only on what that file states:

- a unit starts at a heading `Unit <n>` followed by its title, in the heading font size;
- an exercise starts at `<unit>.<n>` in bold at the start of a line, followed by its task;
- items are lines starting with their number; an item with choices prints them after the prompt in a fixed form;
- the keys start at the heading `Answer key`; each line is `<unit>.<n>` and numbered answers.

IDs come from the printed numbers: unit `1`, exercise `1.2`, item `3`. Page ranges of a unit and of an exercise are where their first and last lines were found. A printed key becomes `accept` patterns: `/` stays a loose alternative, `(…)` stays optional, `;` between whole answers gives several patterns (not the word `or`, which an answer may contain).

Because things are found by content, a copy of the text with two blank pages put in front gives the same pack with shifted page ranges; this is a test.

The reader returns the pack or a list of what it could not find. For the demo any gap is a failure: the books are ours.

### D6. Validation (PACK-001, PACK-002)

`validatePack` is written by hand: the schema is small, and a general validator in the bundle would cost about 40 kB gzip. Errors are `{ path, rule }`, with `path` a JSON pointer and `rule` either a schema keyword (`required`, `pattern`, `maxLength`, …) or a semantic rule (`unique-unit-id`, `unique-exercise-id`, `unique-item-id`, `invalid-key`, `no-accepted-choice`). All errors are collected, up to 100.

That the hand-written validator and `pack.schema.json` agree is tested with `ajv` (development only): on the contract examples, on new `*.invalid.json` examples with their `*.reason.txt` (as `contracts/examples/README.md` promises), and on generated packs with one random defect, both must give the same verdict.

Semantic rule 2 uses `compileKey`: every item's `accept` must build a valid key, which covers the limits added to CHK-002 since PACK-002 was written. Rule 3 uses `checkAnswer` on each choice.

### D7. Contract change

`pack.schema.json` today forbids `source` in an original pack, and page references name a document of `source.documents`. The demo is original and has documents. The rule becomes: an original pack requires `license` and may have `source`; a pack that is not original requires `source`. The schema is a draft not yet used by any stored data (`contracts/examples/README.md`), so `schemaVersion` stays 1. The demo packs record the SHA-256 and page count of their PDFs.

### D8. The start screen

Under the introduction: a button **Попробовать демо**. While reading: progress in words (which book is being read). After: the two books by title, each with its units and "N упражнений". On failure: what went wrong in Russian, in the same place, with **Попробовать ещё раз**; no browser dialog; the rest of the screen stays usable. Network use goes through the one module that loads the app's own files (C-03).

The state lives in memory. A reload shows the button again; slice 1.4 makes it stay.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | all demo text is original; the review checks it reads as written for this project |
| C-02, C-03 | PDFs and the pdf.js worker come from the app's origin; the existing end-to-end check of third-party requests runs with the demo added |
| C-06 | initial bundle within budget with pdf.js outside it (`pnpm size`); both books read in under 2 s in the end-to-end test |
| C-07 | axe on the start screen in its three states (before, after, failed), both themes; the button and the retry work by keyboard |
| C-08 | the reader and the validator are under `src/domain`; pdf.js only under `src/storage/pdf` |
| C-10 | coverage of `src/domain` ≥ 95 % |
| C-11 | PACK-001 – PACK-003 named by tests |
| C-12 | decision record 0005 for `pdfjs-dist` |
| C-13 | the end-to-end tests of the demo run on Chromium, Firefox and WebKit |

## Risks

- **pdf.js reports text differently across versions** (line grouping, spacing). The version is pinned; the reader's tests run on text taken by that version from the committed PDFs.
- **The demo layout is easier than a real book.** True, and accepted: the real readers are milestone 3, with synthetic PDFs laid out like the real books. The interface (D3) is what is carried over.
- **Standard PDF fonts cannot print Cyrillic.** The demo books are in English only.
