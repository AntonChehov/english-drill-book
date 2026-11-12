# Layout of the demo books

The two demo books, _Everyday Grammar: A Demo Course_ (`course`) and _Everyday Grammar: Demo Drills_ (`drills`), are written for this project and licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Their source is `demo/<book>.json`; `pnpm demo:build` lays them out as `public/demo/<book>.pdf` with `scripts/build-demo-books.mjs`, writes the pack each must be read into as `demo/<book>.pack.json`, and updates `demo/<book>.text.json`, the text pdf.js takes from the PDF, which the reader's tests read. The same source always gives the same bytes.

This file states the layout. The reader in `src/domain/books/demo/reader.ts` relies on what is stated here and on nothing else; whatever this file does not state may change without breaking it.

## What the reader relies on

The reader sees the text of each page as lines: the text, where the line starts, and the font size. It finds everything by what the lines say and how large they are printed, never by page numbers.

Sizes, in points:

| Size | What is printed in it                                                                        |
| ---- | -------------------------------------------------------------------------------------------- |
| 18   | unit headings and the heading of the answer key                                              |
| 11   | the number and task of an exercise                                                           |
| 10.5 | items, the text of an exercise, the answer key, and the explanations, which the reader skips |

Lines in any other size (the title page, contents, page footers, section headings, notes in small print) are not read. A size within 0.25 pt of one of these counts as it.

1. **A unit** starts at a line in the heading size, `Unit <n> <title>`, for example `Unit 2 Present simple: I work, she works`. The unit's ID is `<n>`. Units are numbered 1, 2, 3, … and each book has four, of three exercises each.
2. **An exercise** starts at a line in the task size that begins with `<unit>.<n>` and its task: `2.3 Read about Omar. …`. The exercise's ID is `<unit>.<n>`, and `<unit>` is the unit it is printed in. A task too long for one line goes on in more lines in the task size.
3. **The body** of an exercise is the lines in the body size after its task, up to the next exercise, unit heading or the answer key. Its first line decides its kind:
   - **Items.** The first line begins with `1 `. Each item starts at a line that begins with its number, `<n> `, in the same column as item 1; a line that does not is the item's prompt going on. Items are numbered 1, 2, 3, … The item's ID is `<n>`.
   - **Choices.** An item with choices ends its prompt with them in square brackets, separated by `/`: `The keys ___ on the table. [is / are]`. A prompt has no other square brackets.
   - **Connected text or open exercise.** Otherwise the body is one paragraph: the text to work on, or for an open exercise the ideas to write about. An open exercise may have no body.
4. **The answer key** starts at the line `Answer key` in the heading size and runs to the end of the book. Its entries are lines in the body size; each starts with the ID of its exercise, `<unit>.<n>`, and goes on in the lines after it until the next entry:
   - for items, the numbered answers in order: `1 is 2 am 3 are`. Answers contain no digits, so a number in an entry always starts the next answer;
   - for a connected text, the whole text as it should be written;
   - for an open exercise, `Answers will vary.`, optionally followed by `Example:` and a sample answer.
5. **Answers** are printed the way the app reads keys (CHK-001): `/` between words that may replace each other (`there is / there's`), `(…)` around words that may be left out (`There are (some) apples in the bowl`). Whole answers that are both right are separated by `;` (`No, he isn't; No, he's not`), and `;` is used for nothing else. The word `or` never separates answers, because an answer may contain it.

Page ranges come from where things were found: a unit runs from the page of its heading to the last page with a line of its exercises; an exercise from the page of its number to the page of its last line.

## What else is printed

None of this is read, and all of it may change: the title page with a coloured band and the level; a page "How to use this book" and the contents in the course; the contents on the title page of the drill book; on the page of a unit's explanation, paragraphs, a rule in a tinted table, examples with bullets and a note in a box; the heading "Exercises for Unit <n>"; ruled lines to write on; the note "Exercise <id> continues on the next page." at the foot of a page where an exercise breaks; unit subheadings in the key; footers with the book's title and the page number.

The course gives each unit a page of explanation and the exercises on the pages after it; exercise 3.3 runs over a page break. The drill book gives each unit one page of exercises, with a line saying which unit of the course it practises. Both books use the standard PDF fonts Helvetica, Helvetica-Bold and Helvetica-Oblique, which cannot print Cyrillic, so the books are in English only.
