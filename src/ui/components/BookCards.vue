<script setup lang="ts">
// The demo books as cards (PROG-014; design D2 of `study-screen`): each with how many of its
// exercises are done and its units as links to Study with their counts, the first unit not finished
// marked as the one to continue. The start screen reads the counts (design D4 of `demo-program`).
import { computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import type { UnreadableBook } from "../../domain/books/demo/kept";
import { continueAt, isFinished, progressOf } from "../../domain/study/progress";
import { doneExercises, doneKey } from "../demo/progress";
import type { DemoBookSummary } from "../demo/state";
import { prefetchStudy } from "../router";
import CheckMark from "./CheckMark.vue";

const props = defineProps<{
  books: readonly DemoBookSummary[];
  /** Books whose stored pack fails validation: a card that says so (PROD-011). */
  unreadable?: readonly UnreadableBook[];
}>();

const cards = computed(() =>
  props.books.map((book) => {
    const units = book.units.map((unit) => ({
      ...unit,
      progress: progressOf(
        unit.exercises,
        (id) => doneExercises.get(doneKey(book.id, id)) === true,
      ),
    }));
    const done = units.reduce((sum, unit) => sum + unit.progress.done, 0);
    const total = units.reduce((sum, unit) => sum + unit.progress.total, 0);
    const finished = isFinished({ done, total });
    return {
      ...book,
      units,
      done,
      total,
      finished,
      next: continueAt(units.map((unit) => unit.progress)),
    };
  }),
);

/** "из 12 упражнений", "из 21 упражнения": the genitive after "из". */
function exercisesAfter(total: number): string {
  return total % 10 === 1 && total % 100 !== 11 ? "упражнения" : "упражнений";
}

onMounted(prefetchStudy);
</script>

<template>
  <ul class="books">
    <li v-for="book in cards" :key="book.id" class="book card" :class="{ finished: book.finished }">
      <h3>
        <span lang="en">{{ book.title }}</span> <CheckMark :done="book.finished" still />
      </h3>
      <p class="total">
        {{ book.done }} из {{ book.total }} {{ exercisesAfter(book.total) }} сделано
      </p>
      <div class="bar" aria-hidden="true">
        <span :style="{ width: `${book.total ? (100 * book.done) / book.total : 0}%` }" />
      </div>
      <ol class="units">
        <li
          v-for="(unit, index) in book.units"
          :key="unit.id"
          class="unit"
          :class="{ next: index === book.next }"
        >
          <RouterLink class="unit-link" :to="`/study/${book.id}/${unit.id}`">
            Раздел {{ unit.id }}.&nbsp;{{ unit.title }}
          </RouterLink>
          <span v-if="index === book.next" class="continue">продолжить</span>
          <span class="count" :class="{ full: isFinished(unit.progress) }">
            <CheckMark :done="isFinished(unit.progress)" still />
            сделано {{ unit.progress.done }} из {{ unit.progress.total }}
          </span>
        </li>
      </ol>
    </li>
    <li v-for="book in unreadable" :key="book.id" class="book card">
      <h3 lang="en">{{ book.title }}</h3>
      <p class="unreadable">Книгу не удалось прочитать</p>
    </li>
  </ul>
</template>

<style scoped>
.books {
  display: grid;
  gap: 1rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}

.book {
  padding: 1rem 1rem 0.5rem;
}

.book.finished {
  border-color: var(--color-ok);
}

h3 {
  font-size: 1.125rem;
  margin: 0;
}

.book.finished h3 {
  color: var(--color-ok);
}

.unreadable {
  border-left: 4px solid var(--color-error);
  margin: 0.5rem 0 0.75rem;
  padding: 0.25rem 0 0.25rem 0.75rem;
}

.total {
  color: var(--color-muted);
  font-size: 0.9375rem;
  margin: 0.25rem 0 0.5rem;
}

.bar {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  height: 0.5rem;
  overflow: hidden;
}

.bar span {
  background: var(--color-accent);
  display: block;
  height: 100%;
}

.units {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}

.unit {
  align-items: center;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  padding: 0.625rem 0;
}

.unit-link {
  flex: 1 1 14rem;
  font-weight: 600;
  text-decoration: none;
}

.unit-link:hover {
  text-decoration: underline;
}

.continue {
  background: var(--color-accent-soft);
  border-radius: 999px;
  color: var(--color-text);
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0.0625rem 0.625rem;
}

.count {
  align-items: center;
  color: var(--color-muted);
  display: inline-flex;
  font-size: 0.875rem;
  gap: 0.25rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.count.full {
  color: var(--color-ok);
}
</style>
