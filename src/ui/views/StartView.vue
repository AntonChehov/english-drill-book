<script setup lang="ts">
// The start screen, which is Today (PROG-014; design D2 of `study-screen`). While the demo books
// are added the demo program is active and shown above them with the checklist of the day
// (PROG-013; design D4 – D6 of `demo-program`, D2, D4 of `topics-and-checklist`); the done states
// and the focus are read on start, when the books change and whenever the store may have changed
// (DATA-012).
import { useTemplateRef } from "vue";
import DailyChecklist from "../components/DailyChecklist.vue";
import DemoBooks from "../components/DemoBooks.vue";
import ProgramToday from "../components/ProgramToday.vue";
import { demoBooks as books, useStoredProgress } from "../demo/program";

const program = useTemplateRef<InstanceType<typeof ProgramToday>>("program");

useStoredProgress();
</script>

<template>
  <h1>English Drill Book</h1>
  <p class="lead">
    Тренажёр английской грамматики по вашим рабочим тетрадям: страницы книги рядом с упражнениями,
    проверка ответов и память о том, что уже сделано.
  </p>
  <template v-if="books !== undefined">
    <ProgramToday ref="program" :books="books" />
    <DailyChecklist />
  </template>
  <DemoBooks @added="program?.focus()" />
</template>

<style scoped>
.lead {
  color: var(--color-muted);
  margin: 0;
}
</style>
