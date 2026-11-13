<script setup lang="ts">
// An exercise of the unit (design D4 of `study-screen`): its number, which shows its page, its
// task, its state and score, its rows and **Проверить**; or, for an open exercise and for now a
// connected text, one field, the sample on request and "mark as done" (PLAY-013).
import { computed } from "vue";
import { TEXT, type ExerciseView, type RowView } from "../../domain/study";
import ItemRow from "./ItemRow.vue";
import { statusLabel } from "./messages";
import type { ExerciseEntry } from "./unit";

const props = defineProps<{ entry: ExerciseEntry; view: ExerciseView }>();

const emit = defineEmits<{
  answer: [item: string, text: string];
  check: [];
  reveal: [item: string];
  change: [item: string, how: NonNullable<RowView["change"]>];
  markDone: [];
  showPage: [];
  leave: [];
}>();

const exercise = computed(() => props.entry.exercise);
const base = computed(() => `ex-${exercise.value.id.replaceAll(".", "-")}`);
const prompt = computed(() =>
  exercise.value.type === "items" ? undefined : exercise.value.prompt,
);
const full = computed(
  () => props.view.kind === "items" && props.view.score?.ok === props.view.score?.total,
);
const answerOf = (item: string) => props.entry.answers[item] ?? "";
</script>

<template>
  <article :id="base" class="exercise card" :aria-labelledby="`${base}-heading`">
    <header class="head">
      <h3 :id="`${base}-heading`" class="heading">
        <button
          type="button"
          class="number"
          title="Показать страницу упражнения"
          aria-describedby="show-page-hint"
          @click="emit('showPage')"
        >
          <span class="visually-hidden">Упражнение </span>{{ exercise.id }}
        </button>
      </h3>
      <p class="state">
        <span class="status" :class="`is-${view.status}`">
          <span v-if="view.status === 'done'" aria-hidden="true">✓ </span
          >{{ statusLabel[view.status] }}
        </span>
        <span v-if="view.kind === 'items' && view.score" class="score" :class="{ full }">
          верно {{ view.score.ok }} из {{ view.score.total }}
        </span>
      </p>
    </header>
    <p class="task" lang="en">{{ exercise.task }}</p>

    <template v-if="view.kind === 'items'">
      <ol class="rows">
        <ItemRow
          v-for="row in view.rows"
          :key="row.id"
          :row="row"
          :base="`${base}-${row.id}`"
          :answer="answerOf(row.id)"
          :busy="entry.busy"
          @answer="(text) => emit('answer', row.id, text)"
          @check="emit('check')"
          @reveal="emit('reveal', row.id)"
          @change="(how) => emit('change', row.id, how)"
          @leave="emit('leave')"
        />
      </ol>
      <div class="actions">
        <button
          type="button"
          class="action"
          :aria-disabled="entry.busy || undefined"
          @click="emit('check')"
        >
          Проверить
        </button>
        <p v-if="entry.notice" class="notice">{{ entry.notice }}</p>
      </div>
    </template>

    <template v-else>
      <p v-if="prompt" class="free-prompt" lang="en">{{ prompt }}</p>
      <label class="free-label" :for="`${base}-text`">Ваш текст</label>
      <textarea
        :id="`${base}-text`"
        class="free-field"
        rows="6"
        lang="en"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
        :value="answerOf(TEXT)"
        @input="emit('answer', TEXT, ($event.target as HTMLTextAreaElement).value)"
        @blur="emit('leave')"
      />
      <div v-if="view.sample !== null && view.sampleShown" class="sample">
        <p class="sample-label">Образец</p>
        <p class="sample-text" lang="en">{{ view.sample }}</p>
      </div>
      <div class="actions">
        <button
          v-if="!view.done"
          type="button"
          class="action"
          :aria-disabled="entry.busy || undefined"
          @click="emit('markDone')"
        >
          Отметить как сделанное
        </button>
        <button
          v-if="view.sample !== null && !view.sampleShown"
          type="button"
          class="secondary"
          :aria-disabled="entry.busy || undefined"
          @click="emit('reveal', TEXT)"
        >
          Показать образец
        </button>
        <p class="free-note">
          Это упражнение приложение не проверяет: сравните свой текст с образцом.
        </p>
      </div>
    </template>

    <div v-if="entry.failure" class="failure" role="alert">
      <p>{{ entry.failure.message }}</p>
      <button type="button" class="secondary" @click="entry.failure.retry()">Повторить</button>
    </div>
  </article>
</template>

<style scoped>
.exercise {
  padding: 1rem 1rem 1.125rem;
  scroll-margin-top: 1rem;
}

.head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  justify-content: space-between;
}

.heading {
  font-size: 1.125rem;
  margin: 0;
}

.number {
  background: var(--color-accent-soft);
  border: 1px solid transparent;
  border-radius: 0.375rem;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  padding: 0.125rem 0.625rem;
}

.number:hover {
  border-color: var(--color-accent);
}

.state {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.875rem;
  gap: 0.5rem;
  margin: 0;
}

.status {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  color: var(--color-muted);
  padding: 0.0625rem 0.625rem;
}

.status.is-in-progress {
  border-color: var(--color-near);
  color: var(--color-near);
}

.status.is-done {
  background: var(--color-ok-soft);
  border-color: var(--color-ok);
  color: var(--color-ok);
  font-weight: 600;
}

.score {
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.score.full {
  color: var(--color-ok);
  font-weight: 600;
}

.task {
  font-weight: 600;
  margin: 0.625rem 0 0.5rem;
}

.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}

.actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  margin-top: 0.75rem;
}

.action[aria-disabled="true"],
.secondary[aria-disabled="true"] {
  cursor: progress;
}

.notice,
.free-note {
  color: var(--color-muted);
  font-size: 0.875rem;
  margin: 0;
}

.free-prompt {
  background: var(--color-surface-muted);
  border-radius: 0.375rem;
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
}

.free-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.free-field {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.375rem;
  color: var(--color-text);
  display: block;
  font: inherit;
  padding: 0.5rem 0.625rem;
  resize: vertical;
  width: 100%;
}

.sample {
  border-left: 4px solid var(--color-accent);
  margin: 0.75rem 0 0;
  padding: 0.25rem 0 0.25rem 0.75rem;
}

.sample p {
  margin: 0;
}

.sample-label {
  color: var(--color-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

.sample-text {
  white-space: pre-wrap;
}

.failure {
  align-items: center;
  border-left: 4px solid var(--color-error);
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  margin-top: 0.75rem;
  padding: 0.25rem 0 0.25rem 0.75rem;
}

.failure p {
  margin: 0;
}
</style>
