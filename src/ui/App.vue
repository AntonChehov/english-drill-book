<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import NewerVersion from "./components/NewerVersion.vue";
import { appName } from "./router";
import { newerVersion } from "./storage";
</script>

<template>
  <NewerVersion v-if="newerVersion" />
  <template v-else>
    <header class="app-header">
      <RouterLink class="app-name" to="/">{{ appName }}</RouterLink>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </template>
</template>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--color-border);
  padding: 0.75rem 1rem;
}

.app-name {
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
}

.app-main {
  margin: 0 auto;
  max-width: 48rem;
  padding: 1.5rem 1rem;
}
</style>
