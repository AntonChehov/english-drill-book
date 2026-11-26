<script setup lang="ts">
// The two steps of the unit's topic: the current one is text marked «сейчас», the other a link. The
// order is a guide, both are one action away.
import { RouterLink } from "vue-router";
import type { TopicOfUnit } from "./unit";

defineProps<{ topic: TopicOfUnit }>();
</script>

<template>
  <nav class="topic-steps" aria-label="Шаги темы">
    <p class="topic">Тема: {{ topic.title }}</p>
    <ol>
      <li>
        <span v-if="topic.step === 'course'" aria-current="step"
          >1. Курс: правило и упражнения <span class="now">сейчас</span></span
        >
        <RouterLink v-else :to="topic.courseLink">1. Курс: правило и упражнения</RouterLink>
      </li>
      <li>
        <span v-if="topic.step === 'drills'" aria-current="step"
          >2. Сборник упражнений: практика <span class="now">сейчас</span></span
        >
        <RouterLink v-else :to="topic.drillsLink">2. Сборник упражнений: практика</RouterLink>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.topic-steps {
  flex: 1 1 100%;
}

.topic {
  color: var(--color-muted);
  font-size: 0.875rem;
  margin: 0 0 0.25rem;
}

ol {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

[aria-current="step"] {
  font-weight: 600;
}

.now {
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.75rem;
  font-size: 0.8125rem;
  font-weight: 400;
  padding: 0 0.5rem;
}
</style>
