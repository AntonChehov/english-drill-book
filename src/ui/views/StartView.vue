<script setup lang="ts">
// The start screen, which is Today (PROG-014; design D2 of `study-screen`). While the demo books
// are added the demo program is active and shown above them (PROG-013; design D4 – D6 of
// `demo-program`); the done states both read are read here, on start, when the books change and
// whenever the store may have changed (DATA-012).
import { computed, onMounted, onUnmounted, watch } from "vue";
import DemoBooks from "../components/DemoBooks.vue";
import ProgramToday from "../components/ProgramToday.vue";
import { readDone } from "../demo/progress";
import { demoState } from "../demo/state";
import { onStoredDataChange } from "../storage";

const books = computed(() =>
  demoState.value.phase === "added" ? demoState.value.books : undefined,
);

function read() {
  if (books.value !== undefined) void readDone(books.value);
}

watch(books, read, { immediate: true });
let stop: (() => void) | undefined;
onMounted(() => (stop = onStoredDataChange(read)));
onUnmounted(() => stop?.());
</script>

<template>
  <h1>English Drill Book</h1>
  <p class="lead">
    Тренажёр английской грамматики по вашим рабочим тетрадям: страницы книги рядом с упражнениями,
    проверка ответов и память о том, что уже сделано.
  </p>
  <ProgramToday v-if="books !== undefined" :books="books" />
  <DemoBooks />
</template>

<style scoped>
.lead {
  color: var(--color-muted);
  margin: 0;
}
</style>
