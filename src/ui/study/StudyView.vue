<script setup lang="ts">
// Study (PLAY-001; design D3 of `study-screen`): the unit's pages beside its exercises, side by side
// from 1024 px and stacked below that, with the unit's navigation in its header.
import { computed, nextTick, useTemplateRef, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { documentTitle } from "../../domain/document-title";
import { appName } from "../router";
import ExerciseBlock from "./ExerciseBlock.vue";
import { doneOf, draftNotKept } from "./messages";
import { pageNumbers } from "./pages";
import PagesPanel from "./PagesPanel.vue";
import UnitMenu from "./UnitMenu.vue";
import { useUnit, type ExerciseEntry } from "./unit";

const route = useRoute();
const router = useRouter();
const packId = String(route.params["pack"]);
const unitId = String(route.params["unit"]);

const study = useUnit(packId, unitId);
const { phase, pack, unit, entries, units, progress, previous, next, draftFailed, announcement } =
  study;

const heading = useTemplateRef<HTMLElement>("heading");
const panel = useTemplateRef<InstanceType<typeof PagesPanel>>("panel");
const exercisesHeading = useTemplateRef<HTMLElement>("exercisesHeading");
const pagesTop = useTemplateRef<HTMLElement>("pagesTop");

const role = computed(() => pack.value?.source?.documents?.[0]?.role ?? "book");
const pages = computed(() => pageNumbers(unit.value?.pages, role.value));

function go(to: string | undefined) {
  if (to !== undefined) void router.push(`/study/${packId}/${to}`);
}

function showPage(entry: ExerciseEntry) {
  const first = pageNumbers(entry.exercise.pages, role.value).find((page) =>
    pages.value.includes(page),
  );
  if (first !== undefined) panel.value?.scrollToPage(first);
}

/** The jump links of a narrow screen, where the pages and the exercises are stacked (D3). */
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

watch(phase, async (now) => {
  if (now === "not-found") document.title = documentTitle(appName, "Раздел не найден");
  if (now !== "ready" || unit.value === undefined) return;
  document.title = documentTitle(appName, `Раздел ${unit.value.id}. ${unit.value.title}`);
  await nextTick();
  const scrolled = scrollToExercise();
  // Opened from another screen of the app, or another unit: the focus starts at the unit's title.
  if (router.options.history.state["back"] !== null) {
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

  <section v-else-if="phase === 'not-found'" class="narrow">
    <h1>Раздел не найден</h1>
    <p>
      Такого раздела нет среди книг в этом браузере. Если это раздел демо-книги, сначала добавьте
      демо-книги на главной странице.
    </p>
    <p><RouterLink to="/">На главную</RouterLink></p>
  </section>

  <section v-else-if="phase === 'failed'" class="narrow">
    <h1>Не удалось открыть раздел</h1>
    <p role="alert">
      Не удалось прочитать данные, сохранённые в этом браузере. Попробуйте ещё раз.
    </p>
    <p class="row">
      <button type="button" class="action" @click="study.load()">Повторить</button>
      <RouterLink to="/">На главную</RouterLink>
    </p>
  </section>

  <div v-else-if="pack && unit" class="study">
    <header class="unit-bar card">
      <div class="unit-main">
        <p class="book" lang="en">{{ pack.title }}</p>
        <div class="unit-line">
          <button
            type="button"
            class="step"
            aria-label="Предыдущий раздел"
            title="Предыдущий раздел"
            :disabled="previous === undefined"
            @click="go(previous)"
          >
            <span aria-hidden="true">‹</span>
          </button>
          <h1 ref="heading" class="unit-title" tabindex="-1">
            Раздел {{ unit.id }}.&nbsp;<span lang="en">{{ unit.title }}</span>
          </h1>
          <button
            type="button"
            class="step"
            aria-label="Следующий раздел"
            title="Следующий раздел"
            :disabled="next === undefined"
            @click="go(next)"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
      <div class="unit-meta">
        <p v-if="progress" class="progress">
          {{ doneOf(progress.done, progress.total) }}
          <span class="visually-hidden">упражнений этого раздела</span>
        </p>
        <p v-if="draftFailed" class="draft-failed">{{ draftNotKept }}</p>
        <UnitMenu :pack="pack.id" :current="unit.id" :units="units" />
      </div>
    </header>

    <div class="body">
      <div class="pages-column">
        <p class="jump">
          <button type="button" class="jump-link" @click="jump(exercisesHeading)">
            К упражнениям <span aria-hidden="true">↓</span>
          </button>
        </p>
        <span ref="pagesTop" tabindex="-1" class="visually-hidden">Страницы книги</span>
        <PagesPanel ref="panel" :pack="pack" :pages="pages" />
      </div>

      <section class="exercises-column" aria-labelledby="exercises-heading">
        <div class="intro card">
          <div class="intro-head">
            <h2 id="exercises-heading" ref="exercisesHeading" tabindex="-1">Упражнения</h2>
            <button type="button" class="jump-link jump" @click="jump(pagesTop)">
              <span aria-hidden="true">↑</span> К страницам
            </button>
          </div>
          <p class="hint">
            Регистр букв и знаки препинания не важны. Если в длинном слове ошибка в одной букве, вы
            увидите «Почти»&nbsp;— проверьте написание. В меню
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
      </section>
    </div>

    <p class="visually-hidden" role="status">{{ announcement }}</p>
    <p id="show-page-hint" hidden>показать страницу в книге</p>
  </div>
</template>

<style scoped>
.loading {
  color: var(--color-muted);
}

.narrow {
  margin: 0 auto;
  max-width: 46rem;
}

.row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
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

.step {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.375rem;
  color: var(--color-text);
  cursor: pointer;
  flex: none;
  font: inherit;
  font-size: 1.25rem;
  height: 2.25rem;
  line-height: 1;
  width: 2.25rem;
}

.step:hover:not(:disabled) {
  background: var(--color-surface-muted);
  border-color: var(--color-text);
}

.step:disabled {
  border-color: var(--color-border);
  color: var(--color-border-strong);
  cursor: default;
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

/* Two columns from 1024 px (PROD-006): the pages take the remaining width and scroll with the
   window; the exercises keep a comfortable width and scroll on their own beside them. Below that
   everything scrolls with the window, so the on-screen keyboard never hides the field typed in. */
@media (min-width: 1024px) {
  .body {
    align-items: flex-start;
    flex-direction: row;
  }

  .pages-column {
    flex: 1 1 auto;
  }

  .exercises-column {
    flex: 0 0 clamp(26rem, 36vw, 34rem);
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
}
</style>
