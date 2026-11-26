<script setup lang="ts">
// Study: the unit's pages beside its exercises, side by side from 1024 px and stacked below that,
// with the unit's navigation in its header, or in the bar of the frame below 1024 px. Before the
// exercises, the unit's explanation from the pack, foldable and open on every opening. From 1024 px
// the border between the two is draggable and either can be collapsed to a strip.
import { computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import type { Pack } from "../../domain/packs/types";
import { documentTitle } from "../../domain/document-title";
import { isFinished, theoryParagraphs } from "../../domain/study";
import { useNarrow } from "../bar";
import CheckMark from "../components/CheckMark.vue";
import FailureBoundary from "../components/FailureBoundary";
import { appName } from "../router";
import ExerciseBlock from "./ExerciseBlock.vue";
import { fieldBeingEdited } from "./focus";
import { doneOf, draftNotKept } from "./messages";
import { pageNumbers } from "./pages";
import PagesPanel from "./PagesPanel.vue";
import { useStudyPreferences, type Panel } from "./preferences";
import SplitSeparator from "./SplitSeparator.vue";
import StepButton from "./StepButton.vue";
import TopicSteps from "./TopicSteps.vue";
import UnitMenu from "./UnitMenu.vue";
import UnitUnavailable from "./UnitUnavailable.vue";
import { useUnit, type ExerciseEntry } from "./unit";

const route = useRoute();
const router = useRouter();
const packId = String(route.params["pack"]);
const unitId = String(route.params["unit"]);

const study = useUnit(packId, unitId, {
  editing: () => fieldBeingEdited(study.entries.value.map(({ exercise }) => exercise.id)),
});
const {
  phase,
  pack,
  unit,
  topic,
  entries,
  units,
  progress,
  previous,
  next,
  draftFailed,
  announcement,
  adding,
  demoTitle,
} = study;

// A draft that waits for typing to pause is written at once when the page is hidden or left.
const flushIfHidden = () => {
  if (document.visibilityState === "hidden") study.flush();
};
const flushAll = () => study.flush();
onMounted(() => {
  document.addEventListener("visibilitychange", flushIfHidden);
  window.addEventListener("pagehide", flushAll);
});
onUnmounted(() => {
  document.removeEventListener("visibilitychange", flushIfHidden);
  window.removeEventListener("pagehide", flushAll);
});

const narrow = useNarrow();
const preferences = useStudyPreferences();
/** The collapsed panel; none below 1024 px, where the panels are stacked. */
const collapsed = computed(() => (narrow.value ? undefined : preferences.collapsed.value));
const finished = computed(() => progress.value !== undefined && isFinished(progress.value));

const heading = useTemplateRef<HTMLElement>("heading");
const panel = useTemplateRef<InstanceType<typeof PagesPanel>>("panel");
const exercisesHeading = useTemplateRef<HTMLElement>("exercisesHeading");
const exercisesColumn = useTemplateRef<HTMLElement>("exercisesColumn");
const pagesTop = useTemplateRef<HTMLElement>("pagesTop");
const pagesColumn = useTemplateRef<HTMLElement>("pagesColumn");
const coursePanel = useTemplateRef<InstanceType<typeof PagesPanel>>("coursePanel");
const showPagesButton = useTemplateRef<HTMLButtonElement>("showPagesButton");
const showExercisesButton = useTemplateRef<HTMLButtonElement>("showExercisesButton");
const hideExercisesButton = useTemplateRef<HTMLButtonElement>("hideExercisesButton");

const roleOf = (of: Pack | undefined) => of?.source?.documents?.[0]?.role ?? "book";
const pages = computed(() => pageNumbers(unit.value?.pages, roleOf(pack.value)));
const coursePages = computed(() =>
  pageNumbers(topic.value?.course.unit.pages, roleOf(topic.value?.course.pack)),
);

/** Step 2 shows the course's pages in place of the drill book's; the course panel is made once. */
const showCourse = ref(false);
const courseOpened = ref(false);

async function showSource(course: boolean) {
  showCourse.value = course;
  courseOpened.value ||= course;
  await nextTick();
  if (pagesColumn.value && pagesColumn.value.getBoundingClientRect().top < 0) {
    pagesColumn.value.scrollIntoView({ block: "start" });
  }
}
const theory = computed(() => theoryParagraphs(unit.value?.theory ?? ""));

/** Collapses `side` to a strip; the focus goes to the button that restores it. */
async function collapse(side: Panel) {
  preferences.setCollapsed(side);
  await nextTick();
  (side === "pages" ? showPagesButton : showExercisesButton).value?.focus();
}

/** Restores the collapsed `side`; the focus goes to the button that collapses it. */
async function restore(side: Panel) {
  preferences.setCollapsed(undefined);
  await nextTick();
  if (side === "exercises") hideExercisesButton.value?.focus();
  else (showCourse.value ? coursePanel : panel).value?.focusHide();
}

function go(to: string | undefined) {
  if (to !== undefined) void router.push(`/study/${packId}/${to}`);
}

async function showPage(entry: ExerciseEntry) {
  const first = pageNumbers(entry.exercise.pages, roleOf(pack.value)).find((page) =>
    pages.value.includes(page),
  );
  if (first === undefined) return;
  // The page asked for is on the panel that is collapsed: it is restored first.
  if (collapsed.value === "pages") {
    preferences.setCollapsed(undefined);
    await nextTick();
  }
  if (showCourse.value) {
    showCourse.value = false;
    await nextTick();
  }
  panel.value?.scrollToPage(first);
}

/** The jump links of a narrow screen, where the pages and the exercises are stacked. */
function jump(target: HTMLElement | null) {
  target?.scrollIntoView({ block: "start" });
  target?.focus({ preventScroll: true });
}

/** Scrolls to the exercise the address names (`?ex=1.2`); whether it did. */
function scrollToExercise(): boolean {
  const exercise = route.query["ex"];
  const target =
    typeof exercise === "string"
      ? document.getElementById(`ex-${exercise.replaceAll(".", "-")}`)
      : null;
  target?.scrollIntoView({ block: "start" });
  return target !== null;
}

/** The demo was added from this screen: the unit that opens takes the focus. */
let addedHere = false;

watch(phase, async (now) => {
  if (now === "demo-missing") addedHere = true;
  if (now === "not-found") document.title = documentTitle(appName, "Раздел не найден");
  if (now === "demo-missing") document.title = documentTitle(appName, "Демо-книги не добавлены");
  if (now !== "ready" || unit.value === undefined) return;
  document.title = documentTitle(appName, `Раздел ${unit.value.id}. ${unit.value.title}`);
  await nextTick();
  const scrolled = scrollToExercise();
  // Opened from another screen of the app, another unit, or by adding the demo here: the focus
  // starts at the unit's title.
  if (router.options.history.state["back"] !== null || addedHere) {
    addedHere = false;
    heading.value?.focus({ preventScroll: scrolled });
  }
});

watch(
  () => route.query["ex"],
  () => {
    if (phase.value === "ready") scrollToExercise();
  },
);
</script>

<template>
  <p v-if="phase === 'loading'" class="loading" role="status">Открываем раздел…</p>

  <UnitUnavailable
    v-else-if="phase !== 'ready'"
    :phase="phase"
    :demo-title="demoTitle"
    :adding="adding"
    @add-demo="study.addDemoAndOpen()"
    @retry="study.load()"
  />

  <div v-else-if="pack && unit" class="study">
    <Teleport v-if="narrow" to="#bar-unit">
      <StepButton direction="previous" :to="previous" @go="go" />
      <p class="bar-title">
        Раздел {{ unit.id }}
        <CheckMark :done="finished" />
      </p>
      <StepButton direction="next" :to="next" @go="go" />
      <UnitMenu :pack="pack.id" :current="unit.id" :units="units" />
    </Teleport>
    <header class="unit-bar card">
      <div class="unit-main">
        <p class="book" lang="en">{{ pack.title }}</p>
        <div class="unit-line">
          <StepButton v-if="!narrow" direction="previous" :to="previous" @go="go" />
          <h1 ref="heading" class="unit-title" tabindex="-1">
            Раздел {{ unit.id }}.&nbsp;{{ unit.title }}
          </h1>
          <StepButton v-if="!narrow" direction="next" :to="next" @go="go" />
        </div>
      </div>
      <div class="unit-meta">
        <p v-if="progress" class="progress">
          {{ doneOf(progress.done, progress.total) }}
          <span class="visually-hidden">упражнений этого раздела</span>
        </p>
        <p v-if="draftFailed" class="draft-failed">{{ draftNotKept }}</p>
        <UnitMenu v-if="!narrow" :pack="pack.id" :current="unit.id" :units="units" />
      </div>
      <TopicSteps v-if="topic" :topic="topic" />
    </header>

    <div
      class="body"
      :class="collapsed && `${collapsed}-collapsed`"
      :style="{ '--pages': `${preferences.split.value * 100}%` }"
    >
      <div
        v-show="collapsed !== 'pages'"
        ref="pagesColumn"
        class="pages-column"
        :class="{ 'with-source': topic?.step === 'drills' }"
      >
        <FailureBoundary>
          <p class="jump">
            <button
              type="button"
              class="jump-link"
              @click="jump(exercisesHeading ?? exercisesColumn)"
            >
              К упражнениям <span aria-hidden="true">↓</span>
            </button>
          </p>
          <span ref="pagesTop" tabindex="-1" class="visually-hidden">Страницы книги</span>
          <div v-if="topic?.step === 'drills'" class="source" role="group" aria-label="Страницы">
            <button
              type="button"
              class="source-button"
              :aria-pressed="!showCourse"
              @click="showSource(false)"
            >
              Сборник упражнений
            </button>
            <button
              type="button"
              class="source-button"
              :aria-pressed="showCourse"
              @click="showSource(true)"
            >
              Курс: раздел {{ topic.course.unit.id }}
            </button>
          </div>
          <PagesPanel
            v-show="!showCourse"
            ref="panel"
            :pack="pack"
            :pages="pages"
            :zoom="preferences.zoomOf(pack.id)"
            :collapsible="!narrow"
            @zoom="(zoom) => preferences.setZoom(pack!.id, zoom)"
            @hide="collapse('pages')"
          />
          <PagesPanel
            v-if="topic && courseOpened"
            v-show="showCourse"
            ref="coursePanel"
            :pack="topic.course.pack"
            :pages="coursePages"
            :zoom="preferences.zoomOf(topic.course.pack.id)"
            :collapsible="!narrow"
            @zoom="(zoom) => preferences.setZoom(topic!.course.pack.id, zoom)"
            @hide="collapse('pages')"
          />
        </FailureBoundary>
      </div>
      <button
        v-if="collapsed === 'pages'"
        ref="showPagesButton"
        type="button"
        class="secondary strip"
        @click="restore('pages')"
      >
        Показать страницы
      </button>
      <SplitSeparator
        v-else-if="!narrow && collapsed === undefined"
        :split="preferences.split.value"
        @move="preferences.setSplit"
      />

      <!-- Named by its own text, not by the heading: the heading is gone while the column failed. -->
      <section
        v-show="collapsed !== 'exercises'"
        ref="exercisesColumn"
        class="exercises-column"
        aria-label="Упражнения"
        tabindex="-1"
      >
        <FailureBoundary>
          <details v-if="theory.length > 0" class="theory card" open>
            <summary class="theory-summary">Объяснение</summary>
            <div class="theory-body">
              <p v-for="(paragraph, index) in theory" :key="index">
                <template v-for="(run, at) in paragraph" :key="at"
                  ><em v-if="run.learned" lang="en">{{ run.text }}</em
                  ><template v-else>{{ run.text }}</template></template
                >
              </p>
            </div>
          </details>
          <div class="intro card">
            <div class="intro-head">
              <h2 id="exercises-heading" ref="exercisesHeading" tabindex="-1">Упражнения</h2>
              <button
                v-if="!narrow"
                ref="hideExercisesButton"
                type="button"
                class="secondary"
                @click="collapse('exercises')"
              >
                Скрыть упражнения
              </button>
              <button type="button" class="jump-link jump" @click="jump(pagesTop)">
                <span aria-hidden="true">↑</span> К страницам
              </button>
            </div>
            <p class="hint">
              Регистр букв и знаки препинания не важны. Если в длинном слове ошибка в одной букве,
              вы увидите «Почти»&nbsp;— проверьте написание. Ошибка в коротком слове (a/an, is/are)
              или в окончании (-s, -es, -d, -ed)&nbsp;— это «Неверно». В меню
              <span aria-hidden="true">⋯</span><span class="visually-hidden">«Действия»</span>
              рядом с полем можно посмотреть ответ и изменить оценку.
            </p>
          </div>
          <ExerciseBlock
            v-for="entry in entries"
            :key="entry.exercise.id"
            :entry="entry"
            :view="study.viewOf(entry)"
            @answer="(item, text) => study.setAnswer(entry, item, text)"
            @check="study.check(entry)"
            @reveal="(item) => study.reveal(entry, item)"
            @change="(item, how) => study.change(entry, item, how)"
            @mark-done="study.markDone(entry)"
            @show-page="showPage(entry)"
            @leave="study.flush(entry)"
          />
          <div v-if="topic?.step === 'course'" class="next-step" role="status">
            <div v-if="progress && progress.done === progress.total" class="card offer">
              <p>Курс по этой теме пройден. Дальше — практика в сборнике упражнений.</p>
              <RouterLink class="action" :to="topic.drillsLink">Перейти к практике</RouterLink>
            </div>
          </div>
        </FailureBoundary>
      </section>
      <button
        v-if="collapsed === 'exercises'"
        ref="showExercisesButton"
        type="button"
        class="secondary strip"
        @click="restore('exercises')"
      >
        Показать упражнения
      </button>
    </div>

    <p class="visually-hidden" role="status">{{ announcement }}</p>
    <p id="show-page-hint" hidden>показать страницу в книге</p>
  </div>
</template>

<style scoped>
.loading {
  color: var(--color-muted);
}

.unit-bar {
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
}

.unit-main {
  min-width: 0;
}

.book {
  color: var(--color-muted);
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
}

.unit-line {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}

.unit-title {
  font-size: 1.375rem;
  margin: 0;
  min-width: 0;
}

.bar-title {
  flex: 1 1 auto;
  font-weight: 600;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit-meta {
  align-items: center;
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  justify-content: flex-end;
}

.unit-meta p {
  margin: 0;
}

.progress {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.draft-failed {
  color: var(--color-error);
  font-size: 0.875rem;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pages-column,
.exercises-column {
  min-width: 0;
}

.exercises-column {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.intro {
  padding: 1rem;
}

.theory {
  padding: 0.75rem 1rem;
}

.theory-summary {
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 700;
  padding: 0.25rem 0;
}

.theory-body {
  padding-top: 0.5rem;
}

.theory-body p {
  margin: 0 0 0.75rem;
}

.theory-body p:last-child {
  margin-bottom: 0;
}

.intro-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  justify-content: space-between;
}

.intro h2 {
  font-size: 1.25rem;
  margin: 0;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9375rem;
  margin: 0.5rem 0 0;
}

.jump {
  margin: 0 0 0.75rem;
}

.source {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
}

.source-button {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.375rem;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  padding: 0.375rem 0.75rem;
}

.source-button[aria-pressed="true"] {
  background: var(--color-surface-muted);
  border-color: var(--color-text);
  font-weight: 600;
}

.offer {
  padding: 1rem;
}

.offer p {
  margin: 0 0 0.75rem;
}

.offer .action {
  display: inline-block;
  text-decoration: none;
}

.intro-head .jump {
  margin: 0;
}

.jump-link {
  background: none;
  border: 0;
  color: var(--color-link);
  cursor: pointer;
  font: inherit;
  padding: 0.25rem 0;
  text-decoration: underline;
}

/* Two columns from 1024 px: the pages take the remaining width and scroll with the
   window; the exercises keep a comfortable width and scroll on their own beside them. Below that
   everything scrolls with the window, so the on-screen keyboard never hides the field typed in. */
@media (min-width: 1024px) {
  /* The pages take the share of the row that `--pages` says, the exercises the rest and at least
     22rem, and the border between them is 0.75rem wide. A collapsed panel is a strip. */
  .body {
    align-items: start;
    display: grid;
    gap: 0;
    grid-template-columns:
      minmax(0, min(var(--pages), calc(100% - 22rem - 0.75rem)))
      0.75rem minmax(0, 1fr);
  }

  .body.pages-collapsed {
    grid-template-columns: 2.75rem minmax(0, 1fr);
  }

  .body.exercises-collapsed {
    grid-template-columns: minmax(0, 1fr) 2.75rem;
  }

  .strip {
    align-self: start;
    min-height: 10rem;
    padding: 0.75rem 0;
    position: sticky;
    top: 0;
    width: 2.75rem;
    writing-mode: vertical-rl;
  }

  .exercises-column {
    max-height: 100vh;
    max-height: 100dvh;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0 0.25rem 1rem;
    position: sticky;
    top: 0;
  }

  .jump {
    display: none;
  }

  /* The header of the pages hangs under the switch, which is as high as `--pages-head-top`. */
  .with-source {
    --pages-head-top: 2.75rem;
  }

  .source {
    align-items: center;
    background: var(--color-bg);
    height: 2.75rem;
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }
}
</style>
