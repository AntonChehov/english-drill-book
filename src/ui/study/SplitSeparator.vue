<script setup lang="ts">
// The border between the pages and the exercises from 1024 px (DOC-006; design D5 of
// `pages-panel-tools`): dragged with the pointer, moved with the arrow keys, Home and End. It
// stands in the row it divides and says where it is as the pages' share of that row.
import { useTemplateRef } from "vue";
import { MAX_SPLIT, MIN_SPLIT, splitAfterKey } from "./layout";

const props = defineProps<{ split: number }>();
const emit = defineEmits<{ move: [split: number] }>();
const bar = useTemplateRef<HTMLElement>("bar");

function press(event: KeyboardEvent) {
  const next = splitAfterKey(props.split, event.key);
  if (next === undefined) return;
  event.preventDefault();
  emit("move", next);
}

function drag(event: PointerEvent) {
  const border = bar.value;
  if (!border?.hasPointerCapture(event.pointerId)) return;
  const row = border.parentElement!.getBoundingClientRect();
  // The pointer holds the middle of the border, whose left edge is where the pages end.
  emit("move", (event.clientX - row.left - border.offsetWidth / 2) / row.width);
}
</script>

<template>
  <div
    ref="bar"
    class="separator"
    role="separator"
    aria-orientation="vertical"
    aria-label="Граница между страницами и упражнениями"
    :aria-valuemin="Math.round(MIN_SPLIT * 100)"
    :aria-valuemax="Math.round(MAX_SPLIT * 100)"
    :aria-valuenow="Math.round(split * 100)"
    tabindex="0"
    @keydown="press"
    @pointerdown="bar?.setPointerCapture($event.pointerId)"
    @pointermove="drag"
  ></div>
</template>

<style scoped>
/* As high as the window and held at its top, so that it is always in reach on a long unit. */
.separator {
  align-self: start;
  cursor: col-resize;
  height: 100vh;
  height: 100dvh;
  position: sticky;
  top: 0;
  touch-action: none;
  user-select: none;
  width: 0.75rem;
}

.separator::before {
  background: var(--color-border-strong);
  border-radius: 1px;
  content: "";
  display: block;
  height: 100%;
  margin: 0 auto;
  width: 2px;
}

.separator:hover::before {
  background: var(--color-text);
  width: 4px;
}
</style>
