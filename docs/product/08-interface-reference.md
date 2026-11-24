# 08 — Interface reference

## Purpose

The owner's private predecessor of this app — a coach and two book readers — is used daily and its screens work. The public app follows their layout and flow instead of inventing new ones. This file describes those screens as the model. It holds no book text; names of screens and buttons are the predecessor's own.

Where a requirement of `01` – `07` says otherwise, the requirement wins and this file is corrected.

## The frame

A top bar on every screen: the app's name on the left, leading to Today; then the sections **Сегодня**, **Темы**, **Ошибки**; the current section is marked. Content sits in a centred column of cards on a quiet background. One accent colour; states are shown by colour and by a word or a sign, never by colour alone.

On a narrow screen the top bar gives way to a compact bar fixed to the top of the screen, which slides out of view on a scroll down and back in on a scroll up (PROD-012). In Study it holds the unit's navigation: **‹**, the unit, **›** and the list of units. A unit with every exercise done is shown in green with a check mark that is drawn in when the last exercise is finished; so is a book with every unit done.

## Сегодня (Today)

The first screen once a book is added. From top to bottom:

1. **Goal card.** A large badge with the current level; the goal as "A1 → B2"; one line "до B1: ещё N тем · пройдено X из Y тем"; a ladder with one row per level: its name, a bar of passed topics with a mark at the pass threshold, "X / Y тем".
2. **Today card**, the main one. The header "Сегодня" with a link "другая тема" to Темы. The book and unit number in small print, the topic's title with its level as a tag. Then the lesson as numbered steps:
   - **1. The course: the rule and its exercises · done / total**, with a primary button **Открыть юнит**, and a row of chips, one per exercise, labelled with its number and coloured by state: not started, started, done. A chip opens the unit at that exercise.
   - **2. The drill book: practice · done / needed for the topic to pass**, with a row of chips "Упр. N", one per exercise chosen for this topic. A chip opens that exercise. When more are offered than needed, a note says so. When none are matched: "Для этой темы упражнения не подобраны — достаточно курса."
   - **Topic status**: не начата, в процессе, пройдена.
3. Beside it, in a second column on a wide screen: **Другие дела дня**, a checklist for the day, and **Прогресс по учебникам**, one bar per book with "X / Y тем".

Before milestone 2 brings programs and levels, Today shows the Today card for the first unit not yet finished, and the progress of the books; the goal card and the checklist are absent.

## Темы (Topics)

A filter (all, not passed, by level) and, per book, a card listing its topics in the book's order. A row: "юнит N", the title, the level tag, and the state — "✓ пройдена" or the counts "done/total · drill done/needed". The current topic is marked. Choosing a row makes it the focus and returns to Today.

The public app groups the topics by level instead of by book, without the filter (PROG-008), and a passed topic cannot be chosen.

## Занятие (Study)

One screen for a unit, in two parts side by side:

- **Left, wide: the pages** of the unit from the book's file, one under another, scrolling. Above them a header with **Увеличить** and **Уменьшить** (50 % to 300 %, as a share of the panel's width), the zoom level, **По ширине** (back to 100 %) and **Скрыть страницы**; the zoom is kept for each book (DOC-002). Under the last page **Следующая страница** and above the first **Предыдущая страница** add one page of the book each press, up to its first and last page (DOC-003). The text of a page can be selected and copied (DOC-009).
- **Right, narrow: the panel.** A card **Упражнения** with a one-paragraph hint on how answers are compared, then each exercise of the unit as a block. Before that card, when the pack explains the unit, a foldable block **Объяснение** with the explanation, open when the unit opens (PLAY-020).

The top bar of this screen carries the navigation of the book: the book, **‹** and **›** for the previous and next unit, a list of units in which each unit shows how many of its exercises are done, and a quiet status of saving. The zoom is not here: it is in the pages panel.

**An exercise block:**

- A head with the exercise's number, which scrolls the pages to where the exercise is printed, and the score "ok / total", highlighted when full. Then the book's task and, when the pack has it, what to do in the learner's language (PLAY-020).
- One row per item: its number, an input, and a place for the outcome under it. Spell-check and auto-completion are off. **Enter** moves to the next input and, on the last one, checks the exercise.
- Typing in an input clears that item's outcome.
- Buttons under the items: **Проверить** (primary) and the secondary actions; in the public app, **Выполнить упражнение**, which marks the exercise done without its answers, until it is done (PLAY-021).
- After a check each row shows its state: "✓" for correct; "≈ почти" with advice to check the spelling; "✗" for wrong. Items left empty are not judged.

Where the predecessor differs from the requirements and the requirements win: it shows the key of a wrong item at once and has "Показать ключ" for the whole exercise (PLAY-004 and PLAY-007 allow the key of one item, on request); it has "Сбросить" that forgets the results (PLAY-010 and the attempt log keep them).

In the public app a unit that belongs to a topic of the active program shows, under its title, the topic and its two steps, «1. Курс: правило и упражнения» and «2. Сборник упражнений: практика»: the current one marked «сейчас», the other a link (PLAY-017). When every exercise of the course unit is done, a card below the exercises offers «Перейти к практике». In step 2 the pages panel has a switch, «Сборник упражнений» and «Курс: раздел N», that shows the course unit's pages in place of the drill book's (PLAY-018).

From 1024 px a separator between the two parts, dragged with the pointer or moved with the arrow keys, Home and End, sets how much of the row the pages take, from 30 % to 75 % (60 % at first); the split is kept. **Скрыть страницы** and **Скрыть упражнения** collapse a part to a narrow strip with one button that shows it again; only one part is collapsed at a time, and the choice is kept (DOC-006).

On a narrow screen the pages and the panel are stacked, and both are reachable; there is no separator and nothing is collapsed.

## Ошибки (Mistakes)

A list of the items whose latest outcome is wrong or almost, grouped by unit, each with what was typed and a link to its exercise. Milestone 2.

## Tone

Short Russian sentences, informal "ты" in the predecessor; the public app keeps the neutral "вы". No technical words.
