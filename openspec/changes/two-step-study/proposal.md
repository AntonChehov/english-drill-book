# Proposal

## Why

Slice 1.6 joins the two demo books into one course. Its first two changes put the program on Today and let the learner steer it (`demo-program`, `topics-and-checklist`). Study still knows nothing of the program: it opens a unit of one book. Validation of the last change showed what the learner misses:

- in a course unit there is no way to the drill exercises of its topic except going back to Today;
- once the last exercise of the course unit is done, nothing points to the drills;
- while drilling, the rule's pages in the course cannot be shown; the learner needs both books in front of them.

This change, the last of slice 1.6, makes Study the two steps of a topic, lets the pages panel show the course from the drills, and closes PROG-007. It also settles PROG-014, whose wording ("until programs are delivered") stops being true once the slice is done.

Split: one change. It touches Study (a step bar, an offer, a second pages panel), one pure domain function and the text of one requirement; Today and Topics keep their code. That is reviewable in one sitting, and each part is visible on its own screen.

## What Changes

- **The steps of a topic in Study** (PLAY-017). Study opened for a unit that belongs to a topic of the active program shows, under the unit's title, the topic's title and its two steps, «1. Курс: правило и упражнения» and «2. Сборник упражнений: практика», the current one marked, the other a link. The topic is found from the unit, whatever led there (Today, the book cards, the unit list, ‹ ›): the course unit a topic leads with, or the drill unit holding a topic's supplement. The order is a guide: both steps are always one action away.
- **The offer of the next step** (PLAY-017). Below the last exercise of the course unit, once every exercise of the unit is done, Study says the course part of the topic is done and offers «Перейти к практике», a link to step 2; the sentence is announced when it appears.
- **The course's pages beside the drills** (PLAY-018). In step 2 the pages panel has a switch between the drill book's pages and the course unit's pages, «Сборник упражнений» and «Курс: раздел N». Pressing an exercise's number shows the drill book again at that exercise.
- **Today's topic opens at its first unfinished step** (PROG-007). «Открыть раздел» on Today already leads to the first exercise not done (design D6 of `demo-program`); Study now shows that step as the current one, and the top bar's «Сегодня» leads back. The requirement is added to the living specification with its scenarios.
- **PROG-014, the book cards** (recommended decision, see Impact). The cards stay on Today, below the program; PROG-014 loses "until programs are delivered" and says so. No code changes.

Requirements delivered:

- **PLAY-017** Study in two steps, with the offer of the next step (added to `study`).
- **PLAY-018** the pages panel's source switch (added to `pages`).
- **PROG-007** today's topic opened at its first unfinished step, and the way back (added to `today`).
- **PROG-014** Today's book cards (modified in `today`: the text no longer ends with programs; behaviour unchanged). `docs/product/05-program-and-levels.md` follows.

Left for later: the topic's supplements spread over several drill units (step 2 is the drill unit of the topic's first supplement; the demo program has every topic's supplements in one unit) and Study for a topic without supplements (a one-step topic shows no steps), both met first by the real program (milestone 3); a switch from the course to the drill book's pages (PLAY-018 asks only the other way); «Прогресс по учебникам», the per-book bars of the interface reference, in place of the book cards.

Not in slice 1.6: PROG-011, PROG-012, PROG-016, PROG-017 (milestone 3); Mistakes, export and import (milestone 2).

## Review

Review goes in rounds as `docs/process.md` step 4 states. Every finding carries `Severity: critical` or `Severity: minor`. From round 3 on only critical findings block: an open minor finding is closed as declined, as technical debt recorded in `docs/roadmap.md`, and new minor observations go under `### Notes`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `study`: PLAY-017 added.
- `pages`: PLAY-018 added.
- `today`: PROG-007 added; PROG-014 modified.

## Impact

- New: `topicStep` in `src/domain/programs/progress.ts` with unit tests; `src/ui/study/TopicSteps.vue` (the step bar); end-to-end tests of the steps, the offer, the switch and PROG-007; two states of Study for the accessibility check and the screenshots.
- Changed: `src/ui/study/PagesPanel.vue` (a unique heading id), `src/ui/study/unit.ts` (reads the active program's topic of the unit, and the course unit's pack for the switch), `src/ui/study/StudyView.vue` (the step bar, the offer, the switch and a second pages panel), `src/domain/programs/index.ts`, `e2e/study.ts`, the reference screenshots of Study.
- Not changed: the store and its schema, `contracts/`, the demo books and packs, the program file, Today, Topics, the book cards.
- Learner data: nothing new is stored. The switch's choice is not kept; each opening shows the unit's own pages.
- Documentation: PROG-014's new wording in `docs/product/05-program-and-levels.md`; the step bar and the switch in the Study section of `docs/product/08-interface-reference.md`; `docs/roadmap.md`.
- PROG-014, owner's decision: the recommendation is to keep the cards in slice 1.6, as the only list of every unit on Today, which the demo flow on three browsers and the end-to-end helpers use, and to replace them with the per-book bars of the interface reference later, in a change of their own. The alternative, removing the cards and PROG-014 here, rewrites the demo flow and the end-to-end tests of seven files that find the books or open units by their cards, and would make this change too large to review in one sitting.
- No new dependency. The step bar and the second panel are in Study's chunk; the initial bundle grows only by `topicStep`, which sits in the program module Today already loads (well under 1 kB).
- Depends on: nothing in flight.
