<script setup lang="ts">
// The frame of every screen (design D1 of `study-screen`): a top bar with the app's name, leading
// to the start screen, and the sections, the current one marked; the screen below it. Below 1024 px
// the bar is compact and slides out of view on a scroll down and back on a scroll up (PROD-012);
// Study puts the unit's navigation into `#bar-unit`.
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import { nextBar, unitListOpen, type BarState } from "./bar";
import FailureBoundary from "./components/FailureBoundary";
import NewerVersion from "./components/NewerVersion.vue";
import { appName } from "./router";
import { newerVersion } from "./storage";

const route = useRoute();
const wide = computed(() => route.meta.wide === true);

const shown = ref(true);
const focusInside = ref(false);
let bar: BarState = { shown: true, anchor: 0 };

function follow() {
  bar = nextBar(bar, window.scrollY, focusInside.value || unitListOpen.value);
  shown.value = bar.shown;
}

function onFocusOut(event: FocusEvent) {
  const to = event.relatedTarget;
  focusInside.value = to instanceof Node && (event.currentTarget as Node).contains(to);
}

watch([focusInside, unitListOpen], follow);
onMounted(() => window.addEventListener("scroll", follow, { passive: true }));
onUnmounted(() => window.removeEventListener("scroll", follow));
</script>

<template>
  <NewerVersion v-if="newerVersion" />
  <template v-else>
    <header
      class="topbar"
      :class="{ away: !shown }"
      @focusin="focusInside = true"
      @focusout="onFocusOut"
    >
      <nav class="topbar-inner" aria-label="Разделы приложения">
        <RouterLink class="app-name" to="/">{{ appName }}</RouterLink>
        <ul class="sections">
          <li><RouterLink class="section" to="/">Сегодня</RouterLink></li>
          <li><RouterLink class="section" to="/topics">Темы</RouterLink></li>
          <li><RouterLink class="section" to="/about">О приложении</RouterLink></li>
        </ul>
      </nav>
      <div id="bar-unit" class="bar-unit" />
    </header>
    <main class="app-main" :class="{ wide }">
      <RouterView v-slot="{ Component, route: shown }">
        <FailureBoundary :key="shown.path"><component :is="Component" /></FailureBoundary>
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

.bar-unit {
  display: none;
}

/* The compact bar below 1024 px (PROD-012): it stays at the top of the screen as the page scrolls
   and slides out of view above it; the page keeps its place under it, as it is in the flow. */
@media (max-width: 1023.98px) {
  .topbar {
    position: sticky;
    top: 0;
    transition: transform 0.2s ease;
    z-index: 20;
  }

  .topbar.away {
    transform: translateY(-100%);
  }

  .topbar-inner {
    column-gap: 0.25rem;
    min-height: 2.5rem;
    padding: 0.125rem 0.5rem;
    row-gap: 0;
  }

  .app-name {
    font-size: 0.875rem;
  }

  .sections {
    gap: 0;
  }

  .section {
    font-size: 0.875rem;
    padding: 0.25rem;
  }

  .bar-unit {
    align-items: center;
    display: flex;
    gap: 0.5rem;
    margin: 0 auto;
    max-width: 48rem;
    padding: 0.125rem 0.5rem 0.375rem;
  }

  .bar-unit:empty {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .topbar {
    transition: none;
  }
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
