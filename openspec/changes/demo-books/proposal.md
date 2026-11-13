# Proposal

## Why

The app has a shell and a checker and nothing to study. Before any screen for exercises can be built there must be a book: units, exercises and keys with stable IDs, read from a PDF the way the learner's own books will be read later. The demo books are that first book. They also let a visitor try the app without owning anything, and they are the fixtures every later slice is tested on.

## What Changes

- **Two demo books, written for this project.** A short grammar course (four units: a page of explanation and a page of exercises each, keys at the back) and a short drill book (extra exercises for the same four topics, keys at the back). Their source text and the script that lays them out as PDFs are in the repository; the two PDFs are committed and served by the app.
- **Reading a book.** A PDF's text layer is read in the browser, and a reader built for the layout of the demo books finds units, exercises, items, keys and page ranges in it and produces a pack. Things are found by what the pages say, not by page numbers fixed in advance.
- **Validation of packs.** Every pack is checked against `contracts/pack.schema.json` and the semantic rules of PACK-002 before it is used; an error names the JSON path and the rule.
- **"Try the demo" on the start screen.** One action fetches the two PDFs from the app's own origin, reads them and shows what was found: each book with its units and the number of exercises in each. A failure is explained in place, with a way to try again. Nothing is kept yet: after a reload the demo is added again (storage is slice 1.4).
- **Contract.** `pack.schema.json` lets an original pack name the documents it was read from; today only a pack of a third-party book can (design D7).

Requirements delivered, from `docs/product/02-content-packs.md`: **PACK-001**, **PACK-002**, **PACK-003**.

Left for later changes:

- Keeping the pack between visits (slice 1.4); "before it is stored" of PACK-001 becomes "before it is used" until then.
- The study screen and showing pages (slice 1.5). This change reads text from the PDFs and draws nothing.
- The learner's own books, recognition reports, reading in the background (milestone 3). The reader interface is made for them, but only the demo layout is implemented.

## Capabilities

### New Capabilities

- `content-packs`: what a pack must satisfy, and how the demo books become packs.

### Modified Capabilities

None.

## Impact

- New: `demo/` (source text of the books), `public/demo/*.pdf`, `scripts/build-demo-books.mjs`, `src/domain/packs/`, `src/domain/books/`, `src/storage/pdf/`, a section of the start screen, end-to-end tests.
- Changed: `contracts/pack.schema.json` and its examples; `docs/product/02-content-packs.md` (PACK-002 item 2 refers to the validity of a key as CHK-002 now defines it).
- Runtime dependency: `pdfjs-dist`, loaded after the first screen and left out of the initial bundle (C-06), with a decision record (C-12). Development dependencies: `pdf-lib` to lay out the demo books, `ajv` to test the validator against the schema.
- The start screen changes: screenshots differ from `main`.
- Validation: of the holdout scenarios only the one about the demo failing to load can be driven in a browser yet; it is run for this change. The others wait for slice 1.5.
