<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <h1>О приложении</h1>
  <p>
    English Drill Book проверяет ответы на упражнения из книг по грамматике, запоминает ошибки и
    подсказывает, чем заняться сегодня. Работает в браузере, без регистрации; ваши данные остаются
    на этом устройстве.
  </p>
  <p><RouterLink to="/">На главную</RouterLink></p>
</template>
