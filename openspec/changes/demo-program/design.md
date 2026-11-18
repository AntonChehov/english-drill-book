# Design

## Context

Built already: the two demo books as packs in the store (`demo-course`, `demo-drills`, four units of three exercises each, the units of both on the same grammar), the derived state of every exercise with `done` (PLAY-009), the start screen, which is Today until programs exist: the demo offer and, once the demo is added, a card per book with its units and done counts (PROG-014). `contracts/program.schema.json` and its valid example exist; nothing reads a program yet.

The layout of Today follows `docs/product/08-interface-reference.md`, section Сегодня, cut to what this change's requirements need (D6).

## Goals / Non-Goals

**Goals:**

- The demo shows the two books joined: Today says the learner's level and today's topic, with the course unit and the drill exercises of that topic, and both lead into Study.
- The rules of progress are pure functions, tested without a browser; every one of them is called by Today.

**Non-Goals:**

- The focus topic and Topics (PROG-005 in full, PROG-008), the two-step Study and the way back (PLAY-017, PROG-007), the source switch of the pages panel (PLAY-018), the daily checklist (PROG-009, PROG-006 in full). They are the second change of slice 1.6.
- Choosing a program, programs over books not added, the real program (milestone 3).

## Decisions

### D1. The demo program

`src/domain/programs/demo.json`, in the format of `contracts/program.schema.json`, which does not change:

- `id` `demo`, `version` `1.0.0`, `title` «Демо-программа: грамматика A1–A2».
- `scale` `["A1", "A2"]`, `goal` `{ "from": "A1", "to": "A2" }`, `rules` `{ levelThreshold: 0.9, plusThreshold: 0.5, supplementMin: 2 }`, written out so the file says what applies.
- `requires`: `demo-course` and `demo-drills`, major 1.
- `topics`, in course order: topic `n` (`t1` – `t4`) has `lead` unit `n` of `demo-course`, `supplements` exercises `n.1`, `n.2`, `n.3` of `demo-drills`, and as `title` the Russian title of the unit. Topics 1 and 2 are `A1`, topics 3 and 4 `A2`.
- No `dailyBlocks`: they come with the checklist in the second change.

Why two levels for books that are both printed as A1: with one level the ladder, the share and the "+" (PROG-002 – PROG-004) would have nothing to show in the demo. The split is the program author's choice, which a program is free to make (`05-program-and-levels.md`, Model); the titles and level names are the program's own, no book text (C-01).

Typing: `src/domain/programs/types.ts` declares `Program` with the fields the app reads (`scale`, `goal`, `rules`, `topics`; of a topic its `title`, `level`, `lead` and `supplements`). The program's `title` and a topic's `id` are not typed: nothing on Today reads them, and the CI check of D2 reads the file through its own type. The JSON is imported and assigned to it, so `tsc` checks its shape against the type, and the CI check of D2 checks it against the schema.

### D2. The check of built-in programs in CI (PROG-010)

`src/domain/programs/programs.test.ts` takes every `*.json` beside it (`import.meta.glob`, eager) and, for each:

- validates it with `ajv` (already a development dependency, as in `src/domain/packs/contract.test.ts`) against `contracts/program.schema.json`;
- checks the rules of PROG-010 against the profiles of the demo books (`src/domain/books/demo/profiles.ts`): topic IDs unique; every `level` on `scale`; `goal.from` and `goal.to` on `scale`, `from` not above `to`; every `lead.pack` and supplement `pack` is a pack the program `requires`, with the profile of that pack at that major version; every `lead.unit` is a unit of the profile; every supplement `exercise` is `<unit>.<n>` with the unit in the profile and `1 ≤ n ≤` its number of exercises.

The checks are a function in the test file, not in `src`: nothing in the running app validates a built-in program, so such code there would have no caller. The same test proves the function catches each broken rule on a broken copy of the demo program (duplicate ID, level off the scale, goal reversed, a pack not required, an unknown unit, an exercise past the unit's count). It runs in `pnpm test` like every unit test, so CI runs it.

### D3. Progress over a program, in the domain

`src/domain/programs/progress.ts`, pure:

- `topicProgress(topic, leadExercises, isDone, supplementMin)` → `{ lead: Progress, drills: { done, needed, total }, passed, state }` (PROG-001). `leadExercises` are the exercise IDs of the lead unit, from the stored pack (the program names only the unit); `isDone(pack, exercise)`; `needed = min(supplementMin, total)`; `passed` when every lead exercise and at least `needed` supplements are done; `state` is `passed`, `started` when anything is done, else `new`. Every supplement is counted as available: the program is active only when both its books are stored (D5), and PROG-012 is milestone 3.
- `levelShares(scale, topics, passed)` → per level of the scale, in order, `{ level, passed, total, share }`; `share` 1 for a level with no topics (PROG-002).
- `currentLevel(shares, levelThreshold, plusThreshold)` → `{ index, plus }`: `index` of the highest level whose share and every lower share is at least the threshold, `-1` for "below" (PROG-003); `plus` when the next level exists and its share is at least `plusThreshold` (PROG-004), the next of "below" being the lowest level.
- `todayTopic(topics, passed)` → the index of the first topic in order not passed, `-1` when every topic is passed (PROG-005 without the focus).

`Progress` is the existing type of `src/domain/study/progress.ts`. The rules come from the program's `rules`; the demo program writes all three (D1), so no defaults are filled in code.

### D4. Done states, read once

Today's program card and the book cards read the same done states. Reading them (`readDone` of `src/ui/demo/progress.ts`, on mount, when the books change and on every change from another tab) moves from `BookCards.vue` to `StartView.vue`, which runs it while the demo is added; both components compute from `doneExercises`. Nothing new is stored and the store is not touched.

### D5. The active program (PROG-013)

The demo program is the only built-in program. It is active exactly when the demo books are shown as added (`demoState.phase === "added"`), which already means both packs are stored at the profiles' version (design D7 of `storage`, D4 of `russian-demo`); D2 checks in CI that the program requires those packs at that major. No setting is stored and no program is chosen. Before the demo is added Today is as now: the demo offer, no program.

### D6. Today with the program

`src/ui/components/ProgramToday.vue`, shown by `StartView.vue` while the demo is added, between the introduction and the demo section. Single column; the interface reference's second column waits for the checklist.

**Goal card** (`<section>`, heading «Цель»):

- The current level as a badge: the level name, with «+» when `plus`; for "below" «ниже A1», or «почти A1» when `plus`.
- The goal: «A1 → A2».
- A ladder, one row per level of the scale: the name, a bar of the share with a mark at `levelThreshold` (decorative, `aria-hidden`), and the text «пройдено X из Y тем», so the share is never told by the bar alone (C-07).
- One line under it: «Уровень засчитывается, когда пройдено 90 % его тем и всех тем ниже.», the percentage from the rules.

**Today card** (`<section>`, heading «Сегодня»):

- In small print the course's title (`lang="en"`) and «раздел N»; the topic's title with its level as a tag; its state: «не начата», «в процессе», «пройдена».
- **Step 1** «1. Курс: правило и упражнения · сделано X из Y»: a link styled as the primary button, «Открыть раздел», to `#/study/demo-course/<unit>`, and one link per exercise of the unit, «2.1», to `#/study/demo-course/<unit>?ex=2.1`, marked done by a sign «✓» and colour, its accessible name saying «сделано» or «не сделано».
- **Step 2** «2. Сборник упражнений: практика · сделано X из N нужных»: one link per supplement, «Упр. 2.1», to `#/study/demo-drills/<unit of the exercise>?ex=2.1`, marked as in step 1; when more are offered than needed, the note «Для зачёта темы достаточно N из M.».
- When every topic is passed, in place of the topic: «Программа пройдена: все темы зачтены.»

The unit of a supplement exercise is found in the stored pack's summary. The note «Для этой темы упражнения не подобраны» of the interface reference is not built: every topic of the demo program has supplements, so it would have no case to show.

The links open the existing Study in the same window (PROD-001); its frame already leads back to Today. Opening the topic at its first unfinished step is PROG-007, in the second change.

### D7. Tests

- Unit tests of D3 named by the requirement each covers: `@req PROG-001` (lead not done; lead done and one drill of two needed; `needed` capped by the number of supplements; a topic with no supplements), `@req PROG-002` (a level without topics has share 1), `@req PROG-003` (below; a gap in a lower level stops the climb; the top level), `@req PROG-004` (plus on a level and on "below"; no plus at the top), `@req PROG-005` (first not passed; all passed).
- `@req PROG-010`, `@req PROG-015`: D2.
- End-to-end, `@req PROG-006` and `@req PROG-013`: before the demo is added there is no goal card; after it, the badge «ниже A1», today's topic «Глагол to be: am, is, are» with «сделано 0 из 3» and «сделано 0 из 2 нужных»; after the three exercises of unit 1 of the course and two of the drill exercises are done (through Study, with the helpers of `e2e/study.ts`), today's topic is the second, the row A1 reads «пройдено 1 из 2 тем» and the badge «почти A1»; a step-2 link opens Study at that exercise of the drill book; axe finds nothing in both themes; the links are reached by Tab.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | the program holds IDs, levels and the program's own Russian titles; no book text |
| C-02, C-03 | no request and no new stored data; the existing end-to-end checks |
| C-06 | the program and the component add a few kB to the initial bundle; `pnpm size` on the pull request |
| C-07 | text beside every bar and state; axe on Today in both themes; links reachable by keyboard (D7) |
| C-08 | `src/domain/programs` is pure and imports nothing from `ui` or `storage`; the lint rules |
| C-10, C-11 | the unit tests of D7, `@req` on each; coverage of `src/domain` stays ≥ 95 % |
| C-13 | the Today end-to-end test is part of the demo flow, on the three browsers |
| C-14 | `openspec validate --strict` |
| C-18 | the review record, Today's changed screenshots beside `main`'s, the numbers |

## Risks

- **Demo levels.** Calling topics 3 and 4 `A2` is a choice for the demo's sake (D1), not a claim about the books; the owner may prefer one level or other names.
- **PROG-005 and PROG-006 in two steps.** Both are added here without one clause and modified in the second change. A reader of `openspec/specs/today` between the two changes sees them without the focus and the checklist, as built.
- **The book cards stay.** Today shows both the program and the book cards until the second change decides what the unit lists become once Topics exists.
