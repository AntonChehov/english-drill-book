<script setup lang="ts">
// The list of the book's units in the header of Study, each with its done count (design D3).
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef } from "vue";
import { RouterLink } from "vue-router";
import { doneOf } from "./messages";
import type { UnitLink } from "./unit";

defineProps<{ pack: string; current: string; units: readonly UnitLink[] }>();

const open = ref(false);
const toggle = useTemplateRef<HTMLButtonElement>("toggle");
const root = useTemplateRef<HTMLElement>("root");

async function close(focus: boolean) {
  open.value = false;
  if (!focus) return;
  await nextTick();
  toggle.value?.focus();
}

/** A press anywhere outside closes the list, and still does what it presses. */
function onPointerDown(event: PointerEvent) {
  if (open.value && !(event.target instanceof Node && root.value?.contains(event.target))) {
    open.value = false;
  }
}

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onUnmounted(() => document.removeEventListener("pointerdown", onPointerDown));

function onFocusOut(event: FocusEvent) {
  const to = event.relatedTarget;
  if (to instanceof Node && root.value?.contains(to)) return;
  if (to !== null) open.value = false;
}
</script>

<template>
  <div ref="root" class="unit-menu" @focusout="onFocusOut" @keydown.escape="close(true)">
    <button
      ref="toggle"
      type="button"
      class="secondary toggle"
      :aria-expanded="open"
      aria-controls="unit-menu-list"
      @click="open = !open"
    >
      Все разделы <span aria-hidden="true">▾</span>
    </button>
    <ol v-if="open" id="unit-menu-list" class="list card">
      <li v-for="unit in units" :key="unit.id">
        <RouterLink
          class="link"
          :to="`/study/${pack}/${unit.id}`"
          :aria-current="unit.id === current ? 'page' : undefined"
          @click="open = false"
        >
          <span class="title">
            Раздел {{ unit.id }}.&nbsp;<span lang="en">{{ unit.title }}</span>
          </span>
          <span class="count" :class="{ full: unit.progress.done === unit.progress.total }">
            {{ doneOf(unit.progress.done, unit.progress.total) }}
          </span>
        </RouterLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.unit-menu {
  position: relative;
}

.toggle {
  font-size: 0.9375rem;
  padding: 0.3125rem 0.75rem;
}

.list {
  list-style: none;
  margin: 0.375rem 0 0;
  max-width: calc(100vw - 2rem);
  padding: 0.375rem;
  position: absolute;
  right: 0;
  width: 22rem;
  z-index: 10;
}

.link {
  border-radius: 0.375rem;
  color: var(--color-text);
  display: flex;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  text-decoration: none;
}

.link:hover {
  background: var(--color-surface-muted);
}

.link[aria-current="page"] {
  background: var(--color-accent-soft);
  font-weight: 600;
}

.count {
  color: var(--color-muted);
  flex: none;
  font-size: 0.875rem;
  font-weight: 400;
}

.count.full {
  color: var(--color-ok);
}
</style>
