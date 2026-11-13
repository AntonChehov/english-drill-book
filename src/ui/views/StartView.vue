<script setup lang="ts">
import { RouterLink } from "vue-router";
import DemoBooks from "../components/DemoBooks.vue";
</script>

<template>
  <h1>English Drill Book</h1>
  <p>Тренажёр английской грамматики по вашим рабочим тетрадям. Скоро здесь появятся упражнения.</p>
  <DemoBooks />
  <p><RouterLink to="/about">О приложении</RouterLink></p>
</template>
