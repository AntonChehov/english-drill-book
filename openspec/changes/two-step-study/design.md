# Design

## Context

Built already: the demo program (`src/domain/programs/demo.json`): topic `n` led by unit `n` of `demo-course`, with exercises `n.1` – `n.3` of `demo-drills`, which are the whole of drill unit `n`. `topicProgress` gives each topic's counts and `next`, the first lead exercise not done, else the first supplement not done. Today (`ProgramToday.vue`) links «Открыть раздел» to `next` and each exercise chip to its exercise, as `#/study/<pack>/<unit>?ex=<exercise>`. Topics chooses the focus and returns to Today; it does not open Study.

Study (`StudyView.vue`, state in `unit.ts`) shows one unit of one pack: the header with the book, ‹ the title ›, the done count and «Все разделы»; the pages column with one `PagesPanel` for the unit's pages; the exercises column. `RouterView` is keyed by the path, so another unit is a new Study; `?ex=` only scrolls. `useUnit.load` reads every stored pack (`getPacks`) and validates the one shown; it reads the done state of every exercise of that pack, which `progress` (the unit's done count) is built from. The app's top bar, with «Сегодня», is on every screen, Study included. `bookOf` opens each demo PDF once for the app.

Owner's rules for this change: no code without a caller and a visible use; the simplest design that meets the requirements; end-to-end tests seed the store where the UI path is tested elsewhere (C-19).

## Goals / Non-Goals

**Goals:**

- A course unit of a topic leads to its drills, and back, in one action (PLAY-017).
- Finishing the course unit offers the drills (PLAY-017).
- While drilling, the course unit's pages can be shown in place of the drill book's (PLAY-018).
- Today's topic opens at its first unfinished step, Study shows that step, and Today is one action away (PROG-007).
- PROG-014's text matches what Today shows.

**Non-Goals:**

- A topic whose supplements are in several drill units, a topic without supplements, a drill unit holding supplements of several topics: none occurs in the demo program; the real program (milestone 3) meets them first. The rules below give each a defined result without code for it.
- A switch in the course unit to the drill book's pages; keeping the switch's choice; counts of the other step in Study (Today has them).
- Removing or replacing the book cards (owner's decision on PROG-014; recommended for a later change).
- Any change to the store, the program file, Today's or Topics' code.

## Decisions

### D1. The topic of a unit, in the domain

Study is "opened for a topic" when the unit it shows belongs to one; the topic is found from the unit, not passed in the address. So every way into a unit (Today's main action and chips, the book cards, «Все разделы», ‹ ›, a bookmark, a reload) shows the same steps, and no link changes.

`src/domain/programs/progress.ts` gains, pure:

```ts
export interface TopicStep {
  readonly topic: Topic;
  readonly step: "course" | "drills";
}

/** The topic a unit belongs to, and which of its two steps the unit is (PLAY-017). */
export function topicStep(
  topics: readonly Topic[],
  pack: string,
  unit: string,
  exercises: readonly string[],
): TopicStep | undefined;
```

- Topics without supplements are skipped: such a topic has one step, and its unit is Study as now.
- The first topic in program order whose `lead` is `pack`/`unit` → `course`.
- Else the first topic in program order with a supplement in `pack` whose exercise is one of `exercises` → `drills`.
- Else `undefined`: the unit belongs to no topic and Study is as now (PLAY-001).

It is exported from `src/domain/programs/index.ts`. Its only caller is `useUnit` (D2).

### D2. What Study reads for the topic

`useUnit.load`, after it has found the pack and the unit, calls `topicStep(demoProgram.topics, pack.id, unit.id, <the unit's exercise ids>)`. When it finds a topic, it takes from the packs it has just read the two it needs, validating the one not shown with `validatePack` as it does the shown one:

- **the course unit**: the topic's `lead` pack and unit (the shown one in step 1), for its link and, in step 2, its pages;
- **the drill unit**: the unit of the topic's drill pack that holds the topic's first supplement, and that exercise, for its link.

The result is exposed as `topic` (a `shallowRef`), with `title`, `step`, `courseLink` (`/study/<pack>/<unit>`), `drillsLink` (`/study/<pack>/<unit>?ex=<first supplement>`) and, in step 2, `course: { pack: Pack; unit: Unit }` for the pages. When either pack is not stored or not valid, `topic` stays `undefined`: the program is active only with both its books (design D5 of `demo-program`), and Study then is as now.

Nothing else is read: the steps carry no counts, so no done state of the other pack is needed. `topic` depends on the packs only, so a reread after another tab writes (DATA-012) leaves it as it is; `progress`, which the offer uses (D4), is reread as now.

### D3. The step bar (PLAY-017, PROG-007)

`src/ui/study/TopicSteps.vue`, in the header card of Study under the line ‹ title ›, while `topic` is set:

```html
<nav class="topic-steps" aria-label="Шаги темы">
  <p class="topic">Тема: Глагол to be: am, is, are</p>
  <ol>
    <li><span aria-current="step">1. Курс: правило и упражнения <span class="now">сейчас</span></span></li>
    <li><a href="#/study/demo-drills/1?ex=1.1">2. Сборник упражнений: практика</a></li>
  </ol>
</nav>
```

- The step names are Today's (`ProgramToday.vue`), so the learner sees the same two steps in both places.
- The current step is text with `aria-current="step"` and the word «сейчас», shown and read; the other step is a `RouterLink` (`courseLink` or `drillsLink`). Not by colour alone (C-07).
- Following a step opens the other unit as a new Study (the path changes), which takes the focus to its title as any opening from another unit does, and scrolls to the exercise named by `?ex=`.
- The order is a guide (PLAY-017): step 2 is a link before step 1 is done, and step 1 stays a link from step 2.

PROG-007 needs nothing more: «Открыть раздел» already opens `next` (the first unfinished step's first exercise not done), Study now shows that step as current, and the top bar's «Сегодня» is the way back, on every screen. Today reads the done states again when it mounts, so it shows the work just done.

### D4. The offer of the next step (PLAY-017)

In step 1, below the last exercise block, `StudyView.vue` keeps a `<div class="next-step" role="status">`, empty while the unit has an exercise not done. Once `progress.done === progress.total` it holds, as a card:

- «Курс по этой теме пройден. Дальше — практика в сборнике упражнений.»
- a `RouterLink` styled as the primary button, «Перейти к практике», to `drillsLink`.

The region is in the page from the start, so the sentence is announced when the last exercise becomes done (by a check, a verdict changed by hand, «Выполнить упражнение», or another tab). The focus does not move: after the check by Enter it stays in the exercise, and the next Tab after the last exercise reaches the link. A unit opened already finished shows the offer at once, unannounced. In step 2 there is no offer: PLAY-017 asks only for the second step.

### D5. The pages panel's source switch (PLAY-018)

In step 2, `StudyView.vue` puts at the top of the pages column a group of two buttons, `role="group"`, `aria-label="Страницы"`, each with `aria-pressed`:

- «Сборник упражнений» — the shown unit's own pages, pressed when Study opens;
- «Курс: раздел N» — the pages of the topic's course unit (`topic.course`), with `pageNumbers` of that unit in its pack's document role.

A second `PagesPanel` for the course is mounted the first time the switch is pressed and kept; the two panels are shown by `v-show`, so going back and forth draws nothing again, and each keeps its failure message (DOC-008) of its own. `PagesPanel` does not change: a hidden panel has no width and draws nothing, as its resize observer already ignores a width of 0. `bookOf` opens the course PDF once for the app, as for a course unit.

- Pressing a button shows its pages from their first page: the pages column is scrolled to its top when it is above the window.
- Pressing an exercise's number while the course is shown first shows the drill book again, then scrolls to that exercise's page (DOC-001), so the number keeps meaning "this exercise in its book".
- From 1024 px the switch sticks to the top of the pages column (`position: sticky`, the surface's background), so it is at hand beside a long drill unit; on a narrow screen it scrolls with the pages, and the jump links reach it.
- The choice is not stored: each opening of a unit shows its own pages (PLAY-001, DOC-001).

### D6. PROG-014 (owner's decision, recommended)

The book cards stay below the program on Today, unchanged. The requirement loses "Until programs are delivered", which this slice makes untrue: "Today lists the units of each added book in order, with their done counts and links to Study; while a program is active, below it." Its title becomes «PROG-014 The units of the added books» (a rename in the delta spec); its scenarios and tests stay, and one scenario is added, the cards below the program, which the existing test of PROG-013 already checks and now names `@req PROG-014` too. `docs/product/05-program-and-levels.md` takes the same wording.

If the owner prefers to remove the cards, it is a change of its own (D9, Risks): this design does not depend on them.

### D7. Tests

- Unit, `@req PLAY-017`: `topicStep` finds a course unit's topic as `course`; a drill unit's topic as `drills`; the first topic in program order when two match; skips a topic without supplements; `undefined` for a unit of no topic and for a pack the program does not use. Coverage of `src/domain` stays ≥ 95 %.
- End-to-end, Chromium only (as the tests of Topics; not the demo flow of C-13), the demo added once per worker (`e2e/study.ts`), done exercises seeded by `completeInStore` where the UI path is tested elsewhere (C-19):
  - `@req PLAY-017` the steps: course unit 1 shows «Тема: Глагол to be: am, is, are», step 1 «сейчас»; step 2 opens drill unit 1 at 1.1 with step 2 «сейчас»; step 1 leads back; › to course unit 2 shows topic «Present simple».
  - `@req PLAY-017` the offer: with 1.1 and 1.2 of the course seeded, course unit 1 shows no offer; «Выполнить упражнение» on 1.3 shows the sentence in a status region; «Перейти к практике» opens drill unit 1 at 1.1.
  - `@req PLAY-018` the switch: drill unit 1 shows page 2 with «Сборник упражнений» pressed; «Курс: раздел 1», pressed by keyboard, shows pages 3 and 4 and hides page 2; the number of exercise 1.2 shows page 2 again with «Сборник упражнений» pressed; after the course is shown again and the page reloaded, page 2 is shown; course unit 1 has no switch.
  - `@req PROG-007` with course unit 1 seeded done, «Открыть раздел» on Today opens drill unit 1 at 1.1 with step 2 «сейчас»; «Сегодня» in the top bar shows Today with «сделано 3 из 3».
  - Two new states in `studyStates`: `study-drills-course` (drill unit 1 with the course's pages drawn) and `study-course-done` (course unit 1 seeded done, the offer shown), for axe in both themes (`e2e/study-a11y.spec.ts`) and the screenshots; the comment of `studyStates` says the states end in Study, not only in course unit 1.
- Budget (C-19): four new end-to-end tests and two states; none walks Study to finish an exercise except the one «Выполнить упражнение» press of the offer, whose UI path PLAY-021 tests.

### D8. Documentation

- `docs/product/05-program-and-levels.md`: PROG-014's new wording (D6).
- `docs/product/08-interface-reference.md`, Занятие: in the public app a unit of a topic shows the topic's two steps under its title, offers the drills when the course unit is done, and in step 2 the pages panel switches to the course unit.
- `docs/roadmap.md` at archive: slice 1.6 done; "Later, unscheduled" gains the per-book bars in place of the book cards, if the owner accepts D6.

### D9. Rejected

- **The topic in the address** (`?topic=t1`). Study would show the steps only when entered from Today, not from the cards, «Все разделы» or ‹ ›, and every link into Study would have to carry it. The unit already names its topic in the demo program (D1).
- **A Study of the topic's exercises across drill units.** PLAY-017's "the topic's exercises" is, in the demo program, exactly one drill unit; a view over several units is code no demo topic would use.
- **Remounting one `PagesPanel` with another pack** (`:key`). Each switch would draw the pages again and lose the scroll target of an exercise's number until the sizes are read.

## Constitution

| Constraint | How it is met and measured |
| --- | --- |
| C-01 | the step names and the offer are the app's own words; no book text; screenshots show the demo books only |
| C-02, C-03 | the course PDF is fetched from the app's own origin, as for a course unit; nothing new is stored; the existing checks |
| C-06 | `TopicSteps.vue` and the switch are in Study's lazy chunk; `topicStep` sits in the program module of the initial bundle, well under 1 kB; `pnpm size` |
| C-07 | the current step by `aria-current` and the word «сейчас»; the switch by `aria-pressed`; the offer in a status region; axe on the two new states in both themes (D7) |
| C-08 | `topicStep` is pure, in `src/domain/programs`; the lint rules |
| C-10, C-11 | the unit tests of D7, `@req PLAY-017`; end-to-end tests name PLAY-017, PLAY-018, PROG-007; PROG-014's tests unchanged |
| C-13 | Study's new parts on Chromium; the demo flow on Firefox and WebKit unchanged |
| C-14 | `openspec validate --strict` |
| C-18 | the review record; Study's changed screenshots beside `main`'s, and the two new states |
| C-19 | four end-to-end tests and two states, seeded by `completeInStore` (D7) |

## Risks

- **The topic found from the unit.** A drill unit with supplements of two topics would show the first; the demo program has none, and the real program decides it (milestone 3). A course unit opened from the book cards shows its topic's steps too, which is the intent.
- **Two pages panels.** The course panel keeps its canvases while Study is open; for the demo's two-page units this is small. A real book with long units may want the hidden panel released.
- **Holdout scenarios that open units from the book cards** keep working: the cards stay (D6). Removing them later must be checked against those scenarios by validation.
