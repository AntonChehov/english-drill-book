<script setup lang="ts">
// Today with the demo program: the goal with the current level and the share
// of each level, and today's topic with its course unit and drill exercises as links into Study.
// The done states and the focus are read by the start screen.
import { computed, useTemplateRef } from "vue";
import { RouterLink } from "vue-router";
import { countOf } from "../../domain/plural";
import { currentLevel, levelShares } from "../../domain/programs";
import { isDone, useProgram } from "../demo/program";
import type { DemoBookSummary } from "../demo/state";

const props = defineProps<{ books: readonly DemoBookSummary[] }>();

const heading = useTemplateRef<HTMLElement>("heading");
/** Moves the focus to «Сегодня», just before the main action, once the demo is added. */
defineExpose({ focus: () => heading.value?.focus() });

const {
  program,
  bookOf,
  leadUnit,
  unitOf,
  progress,
  passed,
  today: todayIndex,
} = useProgram(() => props.books);
const { levelThreshold, plusThreshold } = program.rules;

const shares = computed(() => levelShares(program.scale, program.topics, passed));
const level = computed(() => {
  const { index, plus } = currentLevel(shares.value, levelThreshold, plusThreshold);
  const lowest = program.scale[0]!;
  if (index >= 0) return `${program.scale[index]}${plus ? "+" : ""}`;
  return plus ? `почти ${lowest}` : `ниже ${lowest}`;
});

const today = computed(() => {
  const topic = program.topics[todayIndex.value];
  if (topic === undefined) return undefined;
  const unit = leadUnit(topic);
  const current = progress.value.get(topic)!;
  // A topic not passed has an exercise not done.
  const next = current.next!;
  return {
    topic,
    unit,
    book: bookOf(topic.lead.pack).title,
    progress: current,
    // More drills done than needed count as enough, not as "3 of 2".
    drillsDone: Math.min(current.drills.done, current.drills.needed),
    next: `/study/${next.pack}/${unitOf(next.pack, next.exercise).id}?ex=${next.exercise}`,
    drills: topic.supplements.map(({ pack, exercise }) => ({
      pack,
      exercise,
      unit: unitOf(pack, exercise).id,
      done: isDone(pack, exercise),
    })),
  };
});

const stateWords = { new: "не начата", started: "в процессе", passed: "пройдена" } as const;
const percent = (share: number) => `${Math.round(share * 100)}%`;
</script>

<template>
  <section class="goal card" aria-labelledby="goal-heading">
    <h2 id="goal-heading">Цель</h2>
    <p class="level">
      Ваш уровень: <strong class="badge">{{ level }}</strong>
    </p>
    <p class="target">{{ program.goal.from }} → {{ program.goal.to }}</p>
    <ul class="ladder">
      <li v-for="row in shares" :key="row.level" class="rung">
        <span class="rung-level">{{ row.level }}</span>
        <span class="bar" aria-hidden="true">
          <span class="fill" :style="{ width: percent(row.share) }" />
          <span class="mark" :style="{ left: percent(levelThreshold) }" />
        </span>
        <span class="rung-count"
          >пройдено {{ row.passed }} из {{ countOf(row.total, ["темы", "тем", "тем"]) }}</span
        >
      </li>
    </ul>
    <p class="note">
      Уровень засчитывается, когда пройдено {{ percent(levelThreshold) }} его тем и всех тем ниже.
    </p>
  </section>

  <section class="today card" aria-labelledby="today-heading">
    <div class="today-head">
      <h2 id="today-heading" ref="heading" tabindex="-1">Сегодня</h2>
      <RouterLink class="other" to="/topics">другая тема</RouterLink>
    </div>
    <p v-if="today === undefined">Программа пройдена: все темы зачтены.</p>
    <template v-else>
      <p class="where">
        <span lang="en">{{ today.book }}</span> · раздел&nbsp;{{ today.unit.id }}
      </p>
      <h3>
        {{ today.topic.title }} <span class="tag">{{ today.topic.level }}</span>
      </h3>
      <p class="state">{{ stateWords[today.progress.state] }}</p>
      <RouterLink class="action open" :to="today.next">Открыть раздел</RouterLink>

      <div class="step">
        <h4>
          1. Курс: правило и упражнения · сделано {{ today.progress.lead.done }} из
          {{ today.progress.lead.total }}
        </h4>
        <ul class="chips">
          <li v-for="exercise in today.unit.exercises" :key="exercise">
            <RouterLink
              class="chip"
              :class="{ done: isDone(today.topic.lead.pack, exercise) }"
              :to="`/study/${today.topic.lead.pack}/${today.unit.id}?ex=${exercise}`"
              :aria-label="`Упражнение ${exercise}, ${isDone(today.topic.lead.pack, exercise) ? 'сделано' : 'не сделано'}`"
            >
              <span v-if="isDone(today.topic.lead.pack, exercise)" aria-hidden="true">✓ </span
              >{{ exercise }}
            </RouterLink>
          </li>
        </ul>
      </div>

      <div class="step">
        <h4>
          2. Сборник упражнений: практика · сделано {{ today.drillsDone }} из
          {{ today.progress.drills.needed }} нужных
        </h4>
        <ul class="chips">
          <li v-for="drill in today.drills" :key="`${drill.pack}/${drill.exercise}`">
            <RouterLink
              class="chip"
              :class="{ done: drill.done }"
              :to="`/study/${drill.pack}/${drill.unit}?ex=${drill.exercise}`"
              :aria-label="`Упр. ${drill.exercise}, ${drill.done ? 'сделано' : 'не сделано'}`"
            >
              <span v-if="drill.done" aria-hidden="true">✓ </span>Упр. {{ drill.exercise }}
            </RouterLink>
          </li>
        </ul>
        <p v-if="today.progress.drills.total > today.progress.drills.needed" class="note">
          Для зачёта темы достаточно {{ today.progress.drills.needed }} из
          {{ today.progress.drills.total }}.
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.card {
  margin: 1.5rem 0 0;
  padding: 1rem;
}

h2 {
  font-size: 1.25rem;
  line-height: 1.3;
  margin: 0 0 0.75rem;
}

h3 {
  font-size: 1.125rem;
  margin: 0;
}

h4 {
  font-size: 1rem;
  margin: 1rem 0 0.5rem;
}

p {
  margin: 0;
}

.badge {
  background: var(--color-accent-soft);
  border-radius: 0.375rem;
  font-size: 1.25rem;
  padding: 0.125rem 0.5rem;
}

.target {
  color: var(--color-muted);
  margin-top: 0.5rem;
}

.ladder {
  list-style: none;
  margin: 0.75rem 0;
  padding: 0;
}

.rung {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  border-radius: 0.375rem;
  gap: 0.25rem 0.75rem;
  margin: 0 -0.375rem;
  padding: 0.25rem 0.375rem;
}

.rung-level {
  font-weight: 600;
  min-width: 2.5rem;
}

.bar {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  flex: 1 1 8rem;
  height: 0.5rem;
  overflow: hidden;
  position: relative;
}

.fill {
  background: var(--color-accent);
  display: block;
  height: 100%;
}

.mark {
  border-left: 2px solid var(--color-text);
  height: 100%;
  position: absolute;
  top: 0;
}

.rung-count,
.note,
.where,
.state {
  color: var(--color-muted);
  font-size: 0.9375rem;
}

.where {
  margin-bottom: 0.25rem;
}

.tag {
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 0 0.5rem;
  vertical-align: middle;
}

.open {
  display: inline-block;
  margin-top: 0.75rem;
  text-decoration: none;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}

.chip {
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
  display: inline-block;
  font-variant-numeric: tabular-nums;
  padding: 0.25rem 0.75rem;
  text-decoration: none;
}

.chip.done {
  background: var(--color-ok-soft);
  border-color: var(--color-ok);
  color: var(--color-ok);
}

.today-head {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.today-head h2 {
  margin: 0;
}

.step {
  border-radius: 0.5rem;
  margin: 0.5rem -0.5rem 0;
  padding: 0.25rem 0.5rem 0.5rem;
}

.step h4 {
  margin-top: 0.5rem;
}

/* The item under the pointer is highlighted; no tooltip. */
@media (hover: hover) {
  .step:hover,
  .rung:hover {
    background: var(--color-surface-muted);
  }
}

.chips + .note {
  margin-top: 0.5rem;
}
</style>
