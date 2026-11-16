# Design

## Context

`scripts/build-demo-books.mjs` lays out `demo/<book>.json` as a PDF with pdf-lib and the standard fonts, writes the pack the reader must find, the text pdf.js extracts, and `documents.json` with the hash and page count. The reader (`src/domain/books/demo/reader.ts`) relies only on `demo/LAYOUT.md`: font sizes and a few printed words. Study and the start screen mark pack texts `lang="en"` throughout.

## Decisions

### D1. The font

DejaVu Sans (regular, bold, oblique) is embedded with `@pdf-lib/fontkit`, subset to the glyphs used, from TTF files committed under `demo/fonts/` with `LICENSE` (Bitstream Vera, free to embed and redistribute). Why DejaVu: complete Cyrillic and Latin, metrics close to Helvetica so the layout keeps its proportions, present on the development machine and in the Playwright image for comparison, and no download at build time: the builder stays reproducible from the repository alone. Font sizes stay 18 / 11 / 10.5, which the reader relies on; line heights are retuned where DejaVu's taller x-height makes a box overflow, and the test "under 100 kB" becomes "under 200 kB".

### D2. The words the reader relies on

`demo/LAYOUT.md` states the Russian forms: a unit starts at `Раздел <n> <title>` in the heading size; the key at `Ответы`; an open exercise's key is `Ответы могут быть разными.` optionally followed by `Пример: <sample>`. Exercise numbers `<unit>.<n>`, item numbers, choices in `[a / b]` and the key syntax (`/`, `(…)`, `;`) are unchanged. The reader's three regular expressions change accordingly; everything else in it stays. The notes "Упражнение 2.3 продолжается на следующей странице." and "Упражнения к разделу <n>" stay unread, as their English forms were.

### D3. What is Russian and what is English

| Russian | English |
| --- | --- |
| book title and subtitle, "О книге", contents, "Как пользоваться книгой" | the names of the books in the profiles stay as the packs' `title` — in Russian too, since the title is printed on the cover |
| unit titles (with the English term where it is the point) | — |
| explanations: paragraphs, the title of a rule and its first column (*я*, *он, она, оно*), notes | the forms of the verb and the example sentences in a rule; example lines; the English words quoted inside a paragraph, in italics |
| the task of every exercise, the "Ideas:" of the open exercise (*Идеи: …*) | the ideas themselves (*a bed, a window…*), prompts, choices, the connected text and its model, the sample answer |
| the headings of the key, "Ответы могут быть разными. Пример:" | the answers |
| footers, the continuation note, "Упражнения к разделу <n>", "Практика к разделу <n> курса" | — |

Mixed lines are set with the Russian words in the regular font and the English words in italics, as the English examples are now; the paragraph source marks English spans with `*…*`, and the builder splits them into runs of two fonts (the `words` helper already carries a font per word).

### D4. The language in the pack and the interface

`contracts/pack.schema.json` gains two optional fields: `language` of a pack (the language of its titles and tasks; default `en`) and `textLanguage` of an exercise (the language of its prompts, choices, text, model and sample; default: the pack's `language`). The demo packs set `language: "ru"` and leave `textLanguage` to its default of `en` — so the default of `textLanguage` is `en`, not the pack's language, since drill books in this app are English material with instructions in some language. The validator accepts BCP 47 primary tags (`en`, `ru`). The reader sets `language: "ru"` for the demo packs.

Study and the start screen take `lang` from these fields: the book's title, unit titles, tasks and ideas get `:lang="pack.language"`, prompts, choices, text, sample and keys `:lang="exercise.textLanguage ?? 'en'"`. PROD-004's "marked with its language" is then exact instead of assumed.

### D5. Tests and evidence

The builder's and reader's tests follow the sources (they compare against `demo/<book>.pack.json`, which the build rewrites). End-to-end tests that name titles and tasks (`e2e/demo.spec.ts`, `study*.spec.ts`, `views.ts`) take the Russian ones; the answers they type do not change. The reference screenshots change for every state that shows a demo title; the pull request shows them beside `main`'s.

### D6. Stored English packs

The profiles' `documents.json` carries the new hashes, so `keptDemo` finds the stored packs stale (another edition) and the start screen reads the demo again from the new PDFs, as it already does for a stale pack. Exercise IDs are the same, so the attempt log and derived states apply unchanged.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | the books are this project's own text; the translation is written for it |
| C-06 | the PDFs are fetched only with the demo; the initial bundle is unchanged (`pnpm size`) |
| C-07 | `lang` on every pack text, checked by axe (`html-lang-valid`, `valid-lang`) and an end-to-end test |
| C-10, C-11 | builder, reader and validator tests; `@req PACK-004` names the end-to-end test that reads the Russian headings and tasks |
| C-13 | the demo flow on the three browsers, unchanged |
| C-17 | `demo/fonts/LICENSE` and the font's notice in `THIRD_PARTY_NOTICES` (the test `third-party-notices.test.mjs` covers dependencies; the font is added to the notices file by hand) |

## Risks

- **Layout drift.** DejaVu is wider than Helvetica: some rule boxes and item lines wrap differently and exercise 3.3 may no longer break across a page. The builder's test "runs one exercise of the course from the foot of a page onto the next" is kept by adjusting the source if needed, so the reader's page-break path stays exercised.
- **Translation quality.** The owner reads the Russian text of both books before approval (task 1.3, owner).
