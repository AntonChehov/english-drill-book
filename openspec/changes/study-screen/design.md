# Design

## Context

Built already: `checkAnswer` and `compileKey` (`src/domain/checking`), packs of the two demo books (`src/domain/books`, `src/domain/packs`), the store with packs, attempts, derived state and drafts (`src/storage/db`, `src/domain/progress`), pdf.js loaded on demand (`src/storage/pdf`). The start screen lists the demo books' units as plain text.

The layout follows `docs/product/08-interface-reference.md`. Where it and a requirement differ, the requirement wins; the differences are listed in D9.

## Goals / Non-Goals

**Goals:**

- A unit of a demo book can be studied from start to finish, with the keyboard alone if wished, and nothing typed or checked is lost.
- The logic of an exercise on screen is pure and tested without a browser; components only show it.

**Non-Goals:**

- The tools of the pages panel (DOC-002 – DOC-006, DOC-009), topics joining two books, themes, first run, Mistakes, the word-by-word comparison of a connected text.

## Decisions

### D1. Addresses and the frame

- `#/` — the start screen, which is Today until programs exist (PROG-014).
- `#/study/<pack>/<unit>` — Study for a unit; `?ex=<exercise>` scrolls to an exercise. An unknown pack or unit shows "not found" with a way back, in the frame.

The frame is a top bar on every screen: the app's name leading to the start screen, then **Сегодня** and **О приложении**, the current one marked. Mistakes and Topics join it when they exist.

### D2. The start screen

After the demo is added, each book is a card: its title, "N из M упражнений сделано" with a bar, and its units as a list of links to Study, each with its number, title and "сделано X из Y". Done counts come from the store's derived state. The first unit not finished is marked "продолжить".

### D3. The Study screen

Header: the book's title; **‹** and **›** to the previous and next unit (disabled at the ends); a list of the book's units, each with its done count; "сделано X из Y" for the unit (PLAY-011).

Body from 1024 px: two columns, pages on the left taking the remaining width, the exercise panel on the right at a fixed comfortable width. Below 1024 px: one column, pages first, then exercises, with a link at the top that jumps to the exercises and one that jumps back (PROD-006). The page never scrolls sideways from 360 px.

### D4. An exercise on screen

An exercise block: its number and task; its state — не начато, в работе, сделано (PLAY-011); the score "верно X из Y" once checked; a row per item; **Проверить**.

An item row: its number, its prompt if it has one, and a text field, or its options as a group of radio buttons when it has `choices` (PLAY-002). Fields have `autocomplete="off"`, `autocorrect="off"`, `autocapitalize="off"`, `spellcheck="false"` (PLAY-015), and `lang="en"`.

After a check each graded row shows its verdict as a sign and words (PLAY-003): **✓ Верно**; **≈ Почти — проверьте написание** (PLAY-004, the key is not shown); **✗ Неверно**. A row left blank shows nothing. Editing a field removes that row's verdict at once (PLAY-006): a verdict is shown only while the field holds exactly the answer that was judged.

Each row has a small menu of what the learner may do with it:

- **Показать ответ** — at any time (PLAY-007). Shows the key of that one item under the field, as its accepted patterns joined by "или". Nothing shows a whole exercise.
- After a check, **Засчитать** on a row that is wrong or almost, **Не засчитывать** on a row that is correct, and **Отменить** on a row changed by hand (PLAY-008). A row judged by hand carries the words "засчитано вручную" or "не засчитано вручную".

An open exercise (PLAY-013), and for now the connected-text exercise: one multi-line field, **Показать образец** when the pack has a sample or model, **Отметить как сделанное**. No verdict.

### D5. The logic, in the domain

`src/domain/study/` holds pure functions over a pack's exercise, its derived state, the drafts and the prepared keys:

- `gradeExercise(exercise, keys, answers)` → the verdict of every non-blank item and whether every item of the exercise is `ok`.
- `viewOfExercise(exercise, state, draft)` → what each row shows: verdict or none (the rule of D4), by hand or not, revealed or not; the block's state and score.
- `checkAttempt`, `revealAttempt`, `overrideAttempt`, `markDoneAttempt` → the attempt to append, given an `id` and a time from the caller. An override names the latest check, carries the full set of hand-set verdicts of that check with the change applied (an undo removes the item from the set), and its `complete` says whether the check with these changes has every item `ok` (PLAY-009). Its time is never earlier than its check's, one millisecond later if the clock says otherwise, so that the derivation keeps it.

Keys are prepared once per exercise when the unit opens. A key that cannot be prepared cannot occur for a validated pack; if it does, the exercise is shown as an open one.

### D6. Keeping the work

- **Drafts** (PLAY-005): the fields of an exercise are written to `drafts` 400 ms after the last keystroke, and at once when the field loses focus or the page is hidden. Opening a unit restores them. A failed draft write is retried on the next change and reported quietly in the header ("не удалось сохранить черновик"); it never blocks typing.
- **Attempts** (PLAY-006, DATA-002, DATA-004): **Проверить**, a reveal, a change by hand and "mark as done" each append an attempt. The result is shown after the write succeeded. If it fails, the block says in Russian that the result could not be kept and offers **Повторить**; the verdicts of that check are not shown as kept.
- **Another tab** (DATA-012): when the window regains focus, Study reads the state of the unit's exercises and its drafts again, unless a field is being edited.

### D7. The keyboard (PROD-007)

Tab moves through the fields of an exercise in order, then to **Проверить**, then to the next exercise. Enter in a text field or on an option checks the exercise the field belongs to; in a multi-line field Enter is a new line. After a check the focus stays where it was, and the outcome is announced through a polite live region ("Упражнение 1.2: верно 4 из 6"). Every menu action is a button reachable by Tab.

### D8. Pages (DOC-001, DOC-008)

The pages panel shows the pages the pack gives for the unit, in order, one under another, each drawn by pdf.js on a canvas at the panel's width and the device's pixel ratio. A page is drawn when it comes near the viewport and its place is held before that, so the scroll bar is honest. The number of an exercise in the panel on the right scrolls the pages to the page where the exercise starts.

The demo PDF is fetched whole from the app's origin when Study opens (38 kB and 32 kB) and reused between units. If it cannot be fetched, the panel says "Страницы демо-книги показываются только при подключении к интернету", with **Повторить**; the exercises beside it work as usual. Drawing does not start pdf.js for a visitor who has not opened Study.

Zoom, more pages before and after, the draggable border, text selection and reading only the shown pages of a large file are the next slice of the pages panel.

### D9. Where the predecessor is not followed

| Predecessor | Here | Why |
| --- | --- | --- |
| Enter moves to the next field and checks on the last | Enter checks | PROD-007 |
| The key of a wrong item is shown at once | only on request, per item | PLAY-004, PLAY-007 |
| "Показать ключ" for a whole exercise | absent | PLAY-007 |
| "Сбросить" forgets the results | absent in this slice; later it clears the fields and keeps the history | PLAY-010, PLAY-014 |
| informal "ты" | "вы" | the public app's tone |

### D10. State in the interface

Composables, no state library: `useUnit(pack, unit)` loads the pack, prepares keys, reads states and drafts, and exposes the views of D5 and the actions of D6. Components are presentational. Why: one screen with one source of state does not need a store.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-02, C-03 | pages and the PDF library come from the app's origin; the existing end-to-end guard runs through Study |
| C-06 | initial bundle within budget, Study and pdf.js loaded on demand (`pnpm size`); the first page of a unit visible within 2 s in the end-to-end run |
| C-07 | axe on Study in its states (untouched, checked with each verdict, a failure to keep), both themes; the keyboard run of D7 as an end-to-end test |
| C-08 | D5 is under `src/domain`; components import no storage directly but through the composable |
| C-10, C-11 | coverage of `src/domain` ≥ 95 %; every requirement of the delta specs named by tests |
| C-13 | end-to-end tests on Chromium, Firefox and WebKit |
| C-19 | the pipeline stays within 3 minutes; end-to-end tests of Study share one added demo per file |

## Risks

- **The largest slice so far.** If the review shows it is too much for one pull request, the pages panel (D8) is split off; the exercises do not depend on it.
- **Canvas pages and screenshots.** Font rendering differs between machines; screenshots of Study are taken with the pages panel masked.
