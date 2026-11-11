<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <h1>Страница не найдена</h1>
  <p>По этому адресу ничего нет. Возможно, ссылка устарела или в ней опечатка.</p>
  <p><RouterLink to="/">На главную</RouterLink></p>
</template>
