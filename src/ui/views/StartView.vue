<script setup lang="ts">
// The start screen, which is Today. While the demo books are added the demo program is active and
// shown above them with the checklist of the day; the done states and the focus are read on start,
// when the books change and whenever the store may have changed.
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
  <p v-if="books === undefined" class="own-books">
    Свои книги можно будет добавить в библиотеке&nbsp;— она появится в следующей версии.
  </p>
</template>

<style scoped>
.lead,
.own-books {
  color: var(--color-muted);
  margin: 0;
}
</style>
