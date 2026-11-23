<script setup lang="ts">
// Topics (PROG-008; design D3 of `topics-and-checklist`): every topic of the demo program in order,
// grouped by level, with its state and counts. Choosing a topic not passed makes it the focus and
// returns to Today; a passed topic cannot be chosen (owner's decision).
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import type { Topic } from "../../domain/programs";
import { checkDemo } from "../demo/check";
import { chooseFocus, demoBooks, useProgram, useStoredProgress } from "../demo/program";
import { demoState } from "../demo/state";
import { noteStorageFailure, onStoredDataChange } from "../storage";

const router = useRouter();

useStoredProgress();
const { program, leadUnit, progress, today } = useProgram(() => demoBooks.value ?? []);

const stateWords = { new: "не начата", started: "в процессе", passed: "✓ пройдена" } as const;

const levels = computed(() =>
  demoBooks.value === undefined
    ? []
    : program.scale.map((level) => ({
        level,
        topics: program.topics
          .filter((topic) => topic.level === level)
          .map((topic) => {
            const current = progress.value.get(topic)!;
            return {
              topic,
              unit: leadUnit(topic).id,
              progress: current,
              drillsDone: Math.min(current.drills.done, current.drills.needed),
              today: program.topics[today.value] === topic,
            };
          }),
      })),
);

/** The id of the topic whose choice could not be kept, if any. */
const failed = ref<string | undefined>();

async function choose(topic: Topic) {
  try {
    await chooseFocus(topic);
    failed.value = undefined;
    await router.push("/");
  } catch (error) {
    noteStorageFailure(error);
    failed.value = topic.id;
  }
}

// Opened first, as after a reload, Topics finds out itself whether the demo is stored.
let stop: (() => void) | undefined;
onMounted(() => {
  void checkDemo();
  stop = onStoredDataChange(() => void checkDemo());
});
onUnmounted(() => stop?.());
</script>

<template>
  <h1>Темы</h1>
  <p v-if="demoState.phase === 'idle' || demoState.phase === 'failed'" class="lead">
    Темы появятся, когда вы добавите демо-книги на экране
    <RouterLink to="/">«Сегодня»</RouterLink>.
  </p>
  <template v-else-if="demoBooks !== undefined">
    <p class="lead">Выберите тему, чтобы заниматься ею на экране «Сегодня».</p>
    <section
      v-for="group in levels"
      :key="group.level"
      class="level card"
      :aria-labelledby="`level-${group.level}`"
    >
      <h2 :id="`level-${group.level}`">{{ group.level }}</h2>
      <ul class="topics">
        <li v-for="row in group.topics" :key="row.topic.id">
          <component
            :is="row.progress.passed ? 'div' : 'button'"
            :type="row.progress.passed ? undefined : 'button'"
            class="topic"
            :class="{ passed: row.progress.passed, chosen: row.today }"
            @click="row.progress.passed ? undefined : choose(row.topic)"
          >
            <span class="where">раздел&nbsp;{{ row.unit }}</span>
            <span class="title">{{ row.topic.title }}</span>
            <span class="state">{{ stateWords[row.progress.state] }}</span>
            <span class="counts"
              >курс {{ row.progress.lead.done }} из {{ row.progress.lead.total }} · практика
              {{ row.drillsDone }} из {{ row.progress.drills.needed }}</span
            >
            <span v-if="row.today" class="tag">тема дня</span>
          </component>
          <p v-if="failed === row.topic.id" class="failure" role="alert">
            Выбор темы не удалось сохранить. Попробуйте ещё раз.
          </p>
        </li>
      </ul>
    </section>
  </template>
</template>

<style scoped>
.lead {
  color: var(--color-muted);
  margin: 0;
}

.card {
  margin: 1.5rem 0 0;
  padding: 1rem;
}

h2 {
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
}

.topics {
  display: grid;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.topic {
  align-items: baseline;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  color: var(--color-text);
  display: flex;
  flex-wrap: wrap;
  font: inherit;
  gap: 0.25rem 0.75rem;
  min-height: 2.75rem;
  padding: 0.5rem 0.75rem;
  text-align: left;
  width: 100%;
}

button.topic {
  cursor: pointer;
}

button.topic:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
}

.topic.chosen {
  border-color: var(--color-accent);
}

.title {
  font-weight: 600;
}

.where,
.state,
.counts {
  color: var(--color-muted);
  font-size: 0.9375rem;
}

.passed .state {
  color: var(--color-ok);
}

.tag {
  background: var(--color-accent-soft);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0 0.5rem;
}

.failure {
  border-left: 4px solid var(--color-error);
  margin: 0.25rem 0 0;
  padding-left: 0.5rem;
}
</style>
