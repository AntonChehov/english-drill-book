<script setup lang="ts">
// The demo books as cards (PROG-014; design D2 of `study-screen`): each with how many of its
// exercises are done and its units as links to Study with their counts, the first unit not finished
// marked as the one to continue. The counts are read when the start screen opens and whenever the
// store may have changed (DATA-012).
import { computed, onMounted, onUnmounted, watch } from "vue";
import { RouterLink } from "vue-router";
import { continueAt, progressOf } from "../../domain/study/progress";
import { doneExercises, doneKey, readDone } from "../demo/progress";
import type { DemoBookSummary } from "../demo/state";
import { prefetchStudy } from "../router";
import { onStoredDataChange } from "../storage";

const props = defineProps<{ books: readonly DemoBookSummary[] }>();

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
    return { ...book, units, done, total, next: continueAt(units.map((unit) => unit.progress)) };
  }),
);

/** "из 12 упражнений", "из 21 упражнения": the genitive after "из". */
function exercisesAfter(total: number): string {
  return total % 10 === 1 && total % 100 !== 11 ? "упражнения" : "упражнений";
}

let stop: (() => void) | undefined;
onMounted(() => {
  void readDone(props.books);
  stop = onStoredDataChange(() => void readDone(props.books));
  prefetchStudy();
});
onUnmounted(() => stop?.());
watch(
  () => props.books,
  (books) => void readDone(books),
);
</script>

<template>
  <ul class="books">
    <li v-for="book in cards" :key="book.id" class="book card">
      <h3 lang="en">{{ book.title }}</h3>
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
            Раздел {{ unit.id }}.&nbsp;<span lang="en">{{ unit.title }}</span>
          </RouterLink>
          <span v-if="index === book.next" class="continue">продолжить</span>
          <span class="count" :class="{ full: unit.progress.done === unit.progress.total }">
            <span v-if="unit.progress.done === unit.progress.total" aria-hidden="true">✓ </span
            >сделано {{ unit.progress.done }} из {{ unit.progress.total }}
          </span>
        </li>
      </ol>
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

h3 {
  font-size: 1.125rem;
  margin: 0;
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
  color: var(--color-muted);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.count.full {
  color: var(--color-ok);
}
</style>
