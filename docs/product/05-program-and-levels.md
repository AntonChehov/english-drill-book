# 05 — Program and levels

## Purpose

A book is material. A **program** is a plan over several books: which topics, in what order, at which level, which unit of the grammar course teaches a topic and which exercises of the supplementary books drill it. The program is what joins unrelated books into one course, and it answers "what do I do today" and "where am I".

## Model

Programs are built into the app, like book profiles (`contracts/program.schema.json`). A program has:

- `goal` — a start and target level on `scale` (for example A2 → B2). No deadline.
- `scale` — ordered level names, lowest first.
- `books` — the profiles it uses: **lead** books (grammar courses, required) and **supplementary** books (drill books, optional).
- `topics[]` in study order. A topic has a title in the program's own words, a `level`, a lead unit, and supplements: individual exercises of supplementary books.
- `rules` — `levelThreshold` (default 0.9), `plusThreshold` (default 0.5), `supplementMin` (default 2).
- `dailyBlocks[]` — a checklist of activities outside the app (listening, reading, and so on).

The link between books — which exercises of a drill book belong to which topic — is the program author's own work. It consists of unit and exercise numbers only.

## Requirements

- **PROG-001 [M2]** A topic is **passed** when every exercise of its lead unit is done and at least `min(supplementMin, number of its supplements in books the learner has added)` of those supplements are done.
- **PROG-002 [M2]** The share of a level is passed topics of that level divided by all topics of that level. A level with no topics has share 1.
- **PROG-003 [M2]** The **current level** is the highest level L such that the share of L and of every level below it is at least `levelThreshold`. If no level qualifies, the current level is "below" the lowest level of the scale.
- **PROG-004 [M2]** The current level carries a "+" when the share of the next level is at least `plusThreshold`.
- **PROG-005 [M2]** **Today's topic** is the focus topic if one is set and not passed; otherwise the first topic in order that is not passed. When every topic is passed, Today says the program is complete.
- **PROG-006 [M2]** Today shows: the goal, the current level on the scale with the share of each level, today's topic with its lead unit and supplements and their states, and the daily checklist.
- **PROG-007 [M2]** Opening today's topic leads to Study in the same window, at the topic's first unfinished step (`PLAY-017`), and Study offers a way back to Today.
- **PROG-008 [M2]** Topics lists every topic in order, grouped by level, with its state (not started, in progress, passed) and done counts. The learner can set any topic as the focus.
- **PROG-009 [M2]** The daily checklist is per calendar day in the device's time zone. Ticks are stored for the day and start empty the next day.
- **PROG-010 [M2]** Built-in programs are validated in CI against the schema and these rules: topic IDs are unique; every `level` is on `scale`; `goal.from` and `goal.to` are on `scale` in that order; every unit and exercise a topic refers to exists in the expected structure of its book's profile.
- **PROG-011 [M3]** Choosing a program shows the books it uses, which are lead and which supplementary, and which the learner has already added, with the action to add each.
- **PROG-012 [M3]** Without a lead book its topics are shown as unavailable, with the action to add the book; they count as not passed. Without a supplementary book its exercises are shown as available after adding the book and do not count towards the topic's requirement. Why: a learner with only the grammar course must still be able to progress.
- **PROG-016 [M3]** A topic passed on the lead unit alone, because a supplementary book is not added, is marked as passed without drills. The topic, Today and Topics carry a note recommending the drills in that book for consolidation. When the book is added later the topic stays passed, and its drills are offered as recommended work.
- **PROG-013 [M2]** Exactly one program is active at a time. With no active program, Today offers the units of the added books directly.
- **PROG-014 [M1]** Until programs are delivered, Today lists the units of the demo book in order with their done counts and links to Study.
- **PROG-015 [M2]** The demo program runs over two demo books, a short course and a short drill book, so that the public demo shows the joining of books.
- **PROG-017 [M3]** The first real program: English grammar on the Murphy courses with Golitsynsky as the supplementary book.

## Later

Planned, not yet specified; no requirement above depends on them.

- **Placement test.** A short test that estimates the learner's level and marks which topics they can skip and where to start. It needs its own original questions per topic and a rule for marking a topic as known without doing its exercises.
- **Own exercise bank.** Short original exercises per topic, shipped with the app as a built-in supplementary source that needs no file. For a topic with no supplement in any book the learner has added, bank exercises count towards `supplementMin`, so the topic cannot be passed on the lead unit alone. Where such a supplement exists, bank exercises are optional extra practice and do not count.
