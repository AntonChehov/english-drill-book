<script setup lang="ts">
// The header of an open unit: its book, its title between ‹ and ›, how many of its exercises are
// done, the list of units and the steps of its topic. Below 1024 px ‹, › and the list are in the
// bar of the frame instead.
import { computed, useTemplateRef } from "vue";
import { useRouter } from "vue-router";
import type { Pack, Unit } from "../../domain/packs/types";
import { isFinished, type Progress } from "../../domain/study";
import CheckMark from "../components/CheckMark.vue";
import { doneOf, draftNotKept } from "./messages";
import StepButton from "./StepButton.vue";
import TopicSteps from "./TopicSteps.vue";
import UnitMenu from "./UnitMenu.vue";
import type { TopicOfUnit, UnitLink } from "./unit";

const props = defineProps<{
  pack: Pack;
  unit: Unit;
  topic: TopicOfUnit | undefined;
  units: readonly UnitLink[];
  progress: Progress | undefined;
  /** The ids of the units before and after this one, if there are. */
  previous: string | undefined;
  next: string | undefined;
  draftFailed: boolean;
  /** The screen is narrower than 1024 px: the navigation is in the bar. */
  narrow: boolean;
}>();

const router = useRouter();
const title = useTemplateRef<HTMLElement>("title");
const finished = computed(() => props.progress !== undefined && isFinished(props.progress));

function go(to: string | undefined) {
  if (to !== undefined) void router.push(`/study/${props.pack.id}/${to}`);
}

defineExpose({ focusTitle: (options?: FocusOptions) => title.value?.focus(options) });
</script>

<template>
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
        <h1 ref="title" class="unit-title" tabindex="-1">
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
</template>

<style scoped>
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
</style>
