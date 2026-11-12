# 0005 — pdf.js reads PDFs in the browser

Date: 2026-11-12. Status: accepted.

## Context

The app reads books from PDFs on the device: the demo books now (change `demo-books`), the learner's own books in milestone 3, and from slice 1.5 it shows their pages beside the exercises. Reading needs the text layer of every page with the position and size of each piece of text; showing needs pages drawn into the app's own layout. Constitution C-12 asks a new runtime dependency to state what it replaces and its size.

## Decision

`pdfjs-dist` 6.5.438, Mozilla's pdf.js, pinned to that exact version.

- It replaces nothing: the app read no PDF before this change.
- Only `src/storage/pdf/` uses it (C-08); `extract.ts` turns what it reports into lines, and the reader in `src/domain` never sees it.
- `src/storage/pdf/text.ts` imports it dynamically, so it is a chunk of its own that the first screen does not load (C-06). `scripts/size.mjs` lists it as loaded later.
- Its worker is a file of the app, emitted by Vite into `assets/` and served from the app's own origin (C-02). The Content-Security-Policy `default-src 'self'` already allows a worker from the same origin, so the policy is unchanged.
- It reads only text: fonts are not loaded, WebAssembly is not used, and it fetches nothing itself, since the bytes of the PDF are handed to it.
- Its optional native canvas for Node, `@napi-rs/canvas`, is not installed (`pnpm-workspace.yaml`): the app draws in the browser, and the tests read text only.

## Size

Measured on the production build of this change with `pnpm size` (gzip, level 9):

| File | Raw | Gzip |
| --- | ---: | ---: |
| `assets/pdf-*.js`, the library | 444.2 kB | 132.0 kB |
| `assets/pdf.worker.min-*.mjs`, its worker | 1271.9 kB | 379.2 kB |

Both load only when the visitor adds the demo, 511.2 kB gzip together. The initial JavaScript is 36.91 kB gzip against the budget of 120 kB (34.57 kB before this change; the difference is the demo section of the start screen, not pdf.js).

## Alternatives

- **The browser's own PDF viewer** (`<iframe>` or `<embed>` of the file): it draws pages but gives a script no text, looks different in every browser and cannot be placed and sized like the app's own view. It does not read books.
- **A smaller parser written for this app**: real books use compressed streams, font encodings and character maps; reading them is most of what pdf.js does.
- **pdf-lib**: it writes PDFs and cannot extract text. It lays out the demo books, as a development dependency only.

## Consequences

- The build for browsers needs `Promise.try` (Chrome 128, Firefox 134, Safari 18.2 or later), within C-13's two latest versions. Node 22 lacks it, so the unit tests read the committed PDFs with the `legacy` build of the same version (`src/storage/pdf/text.test.ts`), and the end-to-end tests read them with the browser build.
- pdf.js may group text differently in another version. The reader's tests run on the text this version takes from the committed PDFs (`demo/<book>.text.json`), and a test fails when that text and the files part; upgrading means running `pnpm demo:build` and reviewing the change of the text.
- Chromium starts one worker per document; the second load of the worker file comes from the HTTP cache.
