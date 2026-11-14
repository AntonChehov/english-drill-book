<script setup lang="ts">
// The frame of every screen (design D1 of `study-screen`): a top bar with the app's name, leading
// to the start screen, and the sections, the current one marked; the screen below it.
import { computed } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import NewerVersion from "./components/NewerVersion.vue";
import { appName } from "./router";
import { newerVersion } from "./storage";

const route = useRoute();
const wide = computed(() => route.meta.wide === true);
</script>

<template>
  <NewerVersion v-if="newerVersion" />
  <template v-else>
    <header class="topbar">
      <nav class="topbar-inner" aria-label="Разделы приложения">
        <RouterLink class="app-name" to="/">{{ appName }}</RouterLink>
        <ul class="sections">
          <li><RouterLink class="section" to="/">Сегодня</RouterLink></li>
          <li><RouterLink class="section" to="/about">О приложении</RouterLink></li>
        </ul>
      </nav>
    </header>
    <main class="app-main" :class="{ wide }">
      <RouterView v-slot="{ Component, route: shown }">
        <component :is="Component" :key="shown.path" />
      </RouterView>
    </main>
  </template>
</template>

<style scoped>
.topbar {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.topbar-inner {
  align-items: center;
  column-gap: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  margin: 0 auto;
  max-width: 80rem;
  min-height: 3.25rem;
  padding: 0.25rem 1rem;
  row-gap: 0.25rem;
}

.app-name {
  color: var(--color-text);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-decoration: none;
}

.sections {
  display: flex;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.section {
  border-radius: 0.375rem;
  color: var(--color-muted);
  display: block;
  padding: 0.375rem 0.625rem;
  text-decoration: none;
}

.section:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.section[aria-current="page"] {
  background: var(--color-accent-soft);
  color: var(--color-text);
  font-weight: 600;
}

.app-main {
  margin: 0 auto;
  max-width: 48rem;
  padding: 1.5rem 1rem 3rem;
}

.app-main.wide {
  max-width: 100rem;
  padding: 1rem 1rem 3rem;
}
</style>
