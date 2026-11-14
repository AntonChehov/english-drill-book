<script setup lang="ts">
// A row of an exercise (design D4 of `study-screen`): its number, its prompt, a field or its options,
// the verdict under it in a sign and words, and a small menu of what the learner may do with it.
import { computed, nextTick, ref, useTemplateRef } from "vue";
import type { RowView } from "../../domain/study";
import { byHandLabel, changeLabel, verdictLabel } from "./messages";

const props = defineProps<{
  row: RowView;
  /** Unique in the page: the ids of the row's elements start with it. */
  base: string;
  answer: string;
  busy: boolean;
}>();

const emit = defineEmits<{
  answer: [text: string];
  check: [];
  reveal: [];
  change: [how: NonNullable<RowView["change"]>];
  leave: [];
}>();

const open = ref(false);
const toggle = useTemplateRef<HTMLButtonElement>("toggle");

const fieldId = computed(() => `${props.base}-field`);
const outcomeId = computed(() => `${props.base}-outcome`);
const menuId = computed(() => `${props.base}-menu`);
const verdict = computed(() => (props.row.verdict ? verdictLabel[props.row.verdict] : null));
const describedBy = computed(() =>
  props.row.verdict || props.row.key ? outcomeId.value : undefined,
);

/** Closes the menu and returns the focus to its button, so the next Tab goes on from there. */
async function act(run: () => void) {
  run();
  open.value = false;
  await nextTick();
  toggle.value?.focus();
}

function onEnter(event: KeyboardEvent) {
  if (event.isComposing) return;
  event.preventDefault();
  emit("check");
}

function onMenuKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value) return;
  event.stopPropagation();
  open.value = false;
  toggle.value?.focus();
}
</script>

<template>
  <li class="row" :class="row.verdict && `is-${row.verdict}`" @keydown="onMenuKey">
    <span class="number" aria-hidden="true">{{ row.id }}</span>
    <div class="body">
      <fieldset v-if="row.choices" class="choices" :aria-describedby="describedBy">
        <legend class="prompt">
          <span class="visually-hidden">Пункт {{ row.id }}. </span
          ><span lang="en">{{ row.prompt ?? "" }}</span>
        </legend>
        <div class="answer-line">
          <div class="options">
            <label v-for="choice in row.choices" :key="choice" class="option">
              <input
                type="radio"
                :name="fieldId"
                :value="choice"
                :checked="answer === choice"
                lang="en"
                @change="emit('answer', choice)"
                @keydown.enter="onEnter"
                @blur="emit('leave')"
              />
              <span lang="en">{{ choice }}</span>
            </label>
          </div>
          <button
            ref="toggle"
            type="button"
            class="menu-toggle"
            :aria-expanded="open"
            :aria-controls="menuId"
            :aria-label="`Действия: пункт ${row.id}`"
            title="Действия"
            @click="open = !open"
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
      </fieldset>
      <template v-else>
        <label class="prompt" :for="fieldId">
          <span class="visually-hidden">Пункт {{ row.id }}. </span
          ><span lang="en">{{ row.prompt ?? "" }}</span>
        </label>
        <div class="answer-line">
          <input
            :id="fieldId"
            class="field"
            type="text"
            lang="en"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            enterkeyhint="done"
            :value="answer"
            :aria-describedby="describedBy"
            @input="emit('answer', ($event.target as HTMLInputElement).value)"
            @keydown.enter="onEnter"
            @blur="emit('leave')"
          />
          <button
            ref="toggle"
            type="button"
            class="menu-toggle"
            :aria-expanded="open"
            :aria-controls="menuId"
            :aria-label="`Действия: пункт ${row.id}`"
            title="Действия"
            @click="open = !open"
          >
            <span aria-hidden="true">⋯</span>
          </button>
        </div>
      </template>

      <div v-if="verdict || row.key !== null" :id="outcomeId" class="outcome">
        <p v-if="verdict" class="verdict">
          <span class="sign" aria-hidden="true">{{ verdict.sign }}&nbsp;</span>
          <span>{{ verdict.text }}</span>
          <span v-if="row.byHand" class="by-hand"> · {{ byHandLabel(row.verdict!) }}</span>
        </p>
        <p v-if="row.key !== null" class="key">
          Ответ: <span lang="en">{{ row.key }}</span>
        </p>
      </div>
      <div v-if="open" :id="menuId" class="menu" role="group" :aria-label="`Пункт ${row.id}`">
        <button
          v-if="row.key === null"
          type="button"
          class="menu-action"
          :disabled="busy"
          @click="act(() => emit('reveal'))"
        >
          Показать ответ
        </button>
        <button
          v-if="row.change"
          type="button"
          class="menu-action"
          :disabled="busy"
          @click="act(() => emit('change', row.change!))"
        >
          {{ changeLabel[row.change] }}
        </button>
        <p v-if="row.key !== null && !row.change" class="menu-empty">
          Ответ уже показан. Оценку можно изменить после проверки.
        </p>
      </div>
    </div>
  </li>
</template>

<style scoped>
.row {
  border-top: 1px solid var(--color-border);
  display: grid;
  gap: 0 0.625rem;
  grid-template-columns: 1.5rem minmax(0, 1fr);
  padding: 0.75rem 0;
}

.row:first-child {
  border-top: 0;
  padding-top: 0.25rem;
}

.number {
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1.5;
  text-align: right;
}

.choices {
  border: 0;
  margin: 0;
  min-width: 0;
  padding: 0;
}

.prompt {
  display: block;
  margin: 0 0 0.375rem;
  padding: 0;
}

.answer-line {
  align-items: center;
  display: flex;
  gap: 0.375rem;
}

.field {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.375rem;
  color: var(--color-text);
  flex: 1 1 auto;
  font: inherit;
  min-width: 0;
  padding: 0.375rem 0.625rem;
}

.is-ok .field {
  border-color: var(--color-ok);
}

.is-near .field {
  border-color: var(--color-near);
}

.is-bad .field {
  border-color: var(--color-bad);
}

.options {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.option {
  align-items: center;
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem 0.25rem 0.5rem;
}

.option:has(input:checked) {
  background: var(--color-accent-soft);
  border-color: var(--color-accent);
  font-weight: 600;
}

.option input {
  accent-color: var(--color-accent);
  margin: 0;
}

.menu-toggle {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  color: var(--color-muted);
  cursor: pointer;
  flex: none;
  font: inherit;
  font-size: 1.125rem;
  height: 2.25rem;
  line-height: 1;
  width: 2.25rem;
}

.menu-toggle:hover,
.menu-toggle[aria-expanded="true"] {
  background: var(--color-surface-muted);
  border-color: var(--color-border);
  color: var(--color-text);
}

.menu {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.menu-action {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.875rem;
  padding: 0.25rem 0.75rem;
}

.menu-action:hover {
  border-color: var(--color-text);
}

.menu-empty {
  color: var(--color-muted);
  font-size: 0.875rem;
  margin: 0;
}

.outcome {
  font-size: 0.9375rem;
  margin-top: 0.375rem;
}

.outcome p {
  margin: 0;
}

.verdict {
  border-radius: 0.375rem;
  display: inline-block;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
}

.sign {
  margin-right: 0.125rem;
}

.is-ok .verdict {
  background: var(--color-ok-soft);
  color: var(--color-ok);
}

.is-near .verdict {
  background: var(--color-near-soft);
  color: var(--color-near);
}

.is-bad .verdict {
  background: var(--color-bad-soft);
  color: var(--color-bad);
}

.by-hand {
  font-weight: 400;
}

.key {
  color: var(--color-muted);
  margin-top: 0.25rem !important;
}

.key span {
  color: var(--color-text);
  font-weight: 600;
}
</style>
