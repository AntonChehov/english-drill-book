<script setup lang="ts">
// The list of the book's units in the header of Study (in the bar below 1024 px), each with its
// done count, and a check mark when it is finished (design D3; PROD-012).
import { nextTick, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue";
import { RouterLink } from "vue-router";
import { isFinished } from "../../domain/study";
import { unitListOpen } from "../bar";
import CheckMark from "../components/CheckMark.vue";
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

// The bar stays in view while the list is open.
watch(open, (now) => (unitListOpen.value = now));

onMounted(() => document.addEventListener("pointerdown", onPointerDown));
onUnmounted(() => {
  document.removeEventListener("pointerdown", onPointerDown);
  unitListOpen.value = false;
});

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
          <span class="title">Раздел {{ unit.id }}.&nbsp;{{ unit.title }}</span>
          <span class="count" :class="{ full: isFinished(unit.progress) }">
            <CheckMark :done="isFinished(unit.progress)" />
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
  align-items: center;
  color: var(--color-muted);
  display: inline-flex;
  flex: none;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 400;
}

.count.full {
  color: var(--color-ok);
}
</style>
