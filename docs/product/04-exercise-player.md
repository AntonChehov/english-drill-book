# 04 — Exercise player

## Purpose

The Study screen is where the learner spends nearly all their time. It replaces the previous arrangement of a separate reader window per book.

The app is a tool for self-study and self-checking. The key and the checker are aids, not judges: both can be wrong, and the learner has the last word on every item.

## Requirements

- **PLAY-001 [M1]** Study has two panels: the book's pages on one side and exercises on the other. Opened for a unit, it shows that unit's pages and its exercises in book order. Previous and next unit are one action away.
- **PLAY-017 [M2]** Opened for a topic of a program, Study is a sequence of two steps: first the topic's unit in the grammar course, then the topic's exercises in the supplementary books. When the last exercise of the first step is done, Study offers the second step. The learner can move between the steps at any time; the order is a guide, not a lock.
- **PLAY-018 [M2]** The pages panel has a source switch. While working on an exercise from a supplementary book the learner can show, instead of that exercise's own page, the pages of the topic's unit in the grammar course, and switch back. Why: the rule is explained in one book and drilled in another, and the learner needs both in front of them.
- **PLAY-019 [M3]** For a book with key pages, the pages panel can show the key pages for the current exercise. The control sits in the panel's secondary menu, not among the main actions.
- **PLAY-002 [M1]** An `items` exercise shows each item's prompt, if any, and an input: a text field, or the options when the item has `choices`.
- **PLAY-003 [M1]** Checking an exercise grades every non-blank item (`03-answer-checking.md`) and shows a verdict per item: correct, almost (`near`), wrong. Verdicts are conveyed by text or icon as well as colour.
- **PLAY-004 [M1]** A `near` verdict tells the learner to check spelling. It does not reveal the key, and the item does not count as correct until the learner fixes it or counts it by hand (`PLAY-008`).
- **PLAY-005 [M1]** Answers are saved as drafts while typing and restored when the unit is reopened, before and after checking.
- **PLAY-006 [M1]** Each check is recorded as an attempt (`DATA-002`). Editing an answer after a check clears that item's verdict until the next check.
- **PLAY-007 [M1]** The learner can reveal the key of any single item at any time, before or after checking. There is no action that reveals a whole exercise at once. The attempt records which items were revealed. Why: looking up one answer is part of self-study; seeing all of them at once ends the exercise.
- **PLAY-008 [M1]** Next to every checked item the learner can change its verdict by hand, in either direction: count as correct an answer the app marked wrong or almost, and count as wrong an answer the app accepted. The change can be undone. An item judged by hand is visibly distinct from one judged by the app. Why: no key covers every valid answer, a loose key accepts some wrong ones (`CHK-001`), and a key read from a PDF can itself be damaged.
- **PLAY-009 [M1]** An exercise is **done** when some check has every item `ok`, taking into account the learner's changes to that check's verdicts: counting the last wrong item as correct completes the exercise, and counting as wrong an item of a check that completed it takes the completion back. The date of the first completing check is kept. An `open` exercise is done when the learner marks it done.
- **PLAY-010 [M1]** A done exercise stays done if the learner later answers it wrongly. The latest results still feed the Mistakes screen (`DATA-006`).
- **PLAY-011 [M1]** The unit header shows how many of its exercises are done. Each exercise shows its own state: untouched, in progress, done.
- **PLAY-012 [M2]** A `text` exercise shows one multi-line field. After a check it shows the diff (`CHK-011`) with extra and missing words distinguished by text decoration and label as well as colour.
- **PLAY-013 [M2]** An `open` exercise shows a field, a "show sample" action when the pack provides a sample, and a "mark as done" action. An exercise whose key could not be read (`BOOK-006`) is presented the same way.
- **PLAY-016 [M3]** Where a recording was matched to the unit (`BOOK-008`), Study shows an audio player with play, pause, seek and speed. Without a recording there is no player.
- **PLAY-014 [M2]** The learner can clear their answers for one exercise to try again. Earlier attempts remain in the history.
- **PLAY-015 [M1]** Input fields disable browser autocorrect, autocapitalise and spellcheck. Why: the browser would silently fix the mistakes the app exists to catch.
