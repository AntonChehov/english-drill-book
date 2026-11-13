<script setup lang="ts">
// The one message the app shows when the data in this browser was written by a newer version of
// the app (DATA-005, design D5 of `storage`): nothing else is shown, so nothing that writes is
// offered. Reloading loads the newer version where it is published.
import { onMounted, useTemplateRef } from "vue";
import { appName } from "../router";

const heading = useTemplateRef<HTMLElement>("heading");

onMounted(() => {
  document.title = `Нужна новая версия — ${appName}`;
  heading.value?.focus();
});

function reload() {
  window.location.reload();
}
</script>

<template>
  <main class="app-main">
    <h1 ref="heading" tabindex="-1">Нужна новая версия приложения</h1>
    <p>
      Ваши данные в этом браузере сохранены более новой версией приложения. Эта версия не может их
      открыть, поэтому ничего не показывает и ничего в них не меняет.
    </p>
    <p>Обновите страницу, чтобы загрузить новую версию.</p>
    <button type="button" class="action" @click="reload">Обновить страницу</button>
  </main>
</template>

<style scoped>
.app-main {
  margin: 0 auto;
  max-width: 48rem;
  padding: 1.5rem 1rem;
}
</style>
