# 02 — Books and packs

## Purpose

The app works with books the learner owns. It knows the supported books — their structure, how to read them, how their topics relate to each other — and contains none of their text. Text, keys, pages and audio come from the learner's own files and stay on the learner's device.

## Terms

- **Book profile** — built into the app, one per edition of a book: title, author, edition and year (so the learner can recognise their copy); the expected structure (how many units, how exercises are numbered); a **reader** — code that finds units, exercises and keys in the text layer of the PDF; naming rules for audio files. A profile holds no book text.
- **Pack** — the result of reading the learner's file with a profile: units, exercises, keys, page ranges (`contracts/pack.schema.json`). It is created and stored on the device.
- **Demo book** — a short workbook written for this project and published as a PDF with the app. It has a profile like any other book and goes through the same reading; the only difference is that the app fetches the file from its own origin instead of asking the learner for it. It exists to show the app, not to teach.
- **Catalogue** — the list of profiles, plus the demo book.

Why a pack and not reading the PDF on the fly: checking and progress need data with stable IDs; reading a book takes time and is done once; the rest of the app does not depend on PDFs; the demo and the tests use the same format.

Unit, exercise and item IDs come from the book's own numbering (unit 5, exercise 5.2, item 3). Reading the file again, or another scan of the same edition, yields the same IDs, so progress stays attached.

## Requirements

- **PACK-001 [M1]** Every pack, bundled or built from a file, is validated against `pack.schema.json` and the semantic rules below before it is stored. An error names the JSON path and the rule that failed.
- **PACK-002 [M1]** Semantic rules beyond the schema:
  1. unit IDs are unique in the pack; exercise IDs are unique in the pack; item IDs are unique in their exercise;
  2. the `accept` of every item builds a valid key (`CHK-002`): every pattern is valid and the key as a whole is within its limits;
  3. for an item with `choices`, at least one choice is accepted by the key.
- **PACK-003 [M1]** The demo book is added with one action and needs no file from the learner. It needs a network connection when it is added and when its pages are shown; it is not kept for offline use.

- **BOOK-001 [M3]** Library shows the catalogue: for each book its title, author, edition, and state — not added, added, needs attention.
- **BOOK-002 [M3]** To add a book the learner picks it in the catalogue and selects their PDF (some books need two files: the exercises and the keys). The file is read in the browser and is never sent over the network.
- **BOOK-003 [M3]** The app reads the file with the profile and compares the result with the expected structure:
  - **recognised** — every unit and at least 90 % of exercises were found: the book is added;
  - **partly recognised** — at least 90 % of units were found: the book is added after the learner confirms, with a report of what is missing;
  - **not recognised** — another book, another edition, or a scan without a text layer: the book is not added and the reason is given.
- **BOOK-004 [M3]** Units, exercises and keys are located by the content of the file, not by page numbers fixed in advance. A file of the same edition with shifted pages is recognised.
- **BOOK-005 [M3]** Reading runs in the background, does not block the interface, shows its progress and can be cancelled. A 400-page book is read within 60 seconds on the reference machine.
- **BOOK-006 [M3]** An exercise whose key could not be read stays available: the learner sees its pages and marks it done themselves. Why: an incomplete key must not stop the learner.
- **BOOK-007 [M3]** The app keeps a reference to the file where it lies and never copies a book or its audio into browser storage. Why: a book with audio can take hundreds of megabytes. The app asks for access to the file again when the browser requires it. If the file has moved or access is refused, the book needs attention, and exercises and progress keep working without pages.
- **BOOK-014 [M3]** Adding the learner's own books requires a browser that can keep file references (Chrome and Edge on desktop). In other browsers the catalogue offers only the demo book and says why.
- **BOOK-008 [M3]** Audio is optional. For a book whose profile defines audio, the learner may select the folder with the recordings, when adding the book or later. The app matches files to units by the profile's naming rules and reports how many were matched. Study shows a player where a recording was matched and nothing where there is none.
- **BOOK-009 [M3]** If the file is not found where it was, the app says so and asks the learner to point to it again. Pointing to the same file changes nothing: the pack and the progress stay as they were. Pointing to a different file of the same book reads it again; progress is kept.
- **BOOK-015 [M3]** When a book is added for the first time, the app tells the learner, in one or two sentences, that it works with the file where it lies and that the file must not be deleted or moved.
- **BOOK-016 [M3]** What the app keeps in the browser for a book is the pack — the structure and answer keys read from it, well under 5 MB — and the reference to the file. Pages and audio are always read from the learner's file. Why the pack is kept: reading a book takes up to a minute and must not happen on every launch.
- **BOOK-010 [M3]** Removing a book removes its pack and file references and keeps its progress. Adding the book back restores the progress view. Why: removing a book is routine; losing months of work must take a separate, explicit action.
- **BOOK-011 [M3]** A pack records the version of the profile that built it. When a new version of the app brings an improved reader, the app offers to read the book again.
- **BOOK-012 [M3]** The first profiles: R. Murphy, *Grammar in Use*, Elementary and Intermediate, 2015 eBook editions; Yu. Golitsynsky, *Grammar: a collection of exercises* with its separate *Keys*, 9th edition, 2022.
- **BOOK-013 [M3]** The repository contains no book text: profiles hold numbers, structure rules and code. Readers are tested on synthetic PDFs laid out like the real book, with original text. Real books are never committed, in whole or in part. A reader may additionally be run against the developer's own copy on their machine, outside CI.
