<script setup lang="ts">
// The start screen, which is Today until programs exist (PROG-014; design D2 of `study-screen`).
import DemoBooks from "../components/DemoBooks.vue";
</script>

<template>
  <h1>English Drill Book</h1>
  <p class="lead">
    Тренажёр английской грамматики по вашим рабочим тетрадям: страницы книги рядом с упражнениями,
    проверка ответов и память о том, что уже сделано.
  </p>
  <DemoBooks />
</template>

<style scoped>
.lead {
  color: var(--color-muted);
  margin: 0;
}
</style>
