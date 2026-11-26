<script setup lang="ts">
// The zoom of the pages: smaller, larger, and back to the panel's width.
import { computed } from "vue";
import { MAX_ZOOM, MIN_ZOOM, stepZoom, zoomLabel } from "./layout";

/** The zoom, as a multiple of the panel's width. */
const props = defineProps<{ zoom: number }>();
const emit = defineEmits<{ zoom: [zoom: number] }>();

const atFewest = computed(() => props.zoom <= MIN_ZOOM);
const atMost = computed(() => props.zoom >= MAX_ZOOM);

function zoomBy(direction: 1 | -1) {
  const next = stepZoom(props.zoom, direction);
  if (next !== props.zoom) emit("zoom", next);
}
</script>

<template>
  <div class="zoom" role="toolbar" aria-label="Масштаб">
    <button
      type="button"
      class="secondary tool"
      aria-label="Уменьшить"
      :aria-disabled="atFewest ? 'true' : undefined"
      @click="zoomBy(-1)"
    >
      <span aria-hidden="true">−</span>
    </button>
    <span class="level" role="status">{{ zoomLabel(zoom) }}</span>
    <button
      type="button"
      class="secondary tool"
      aria-label="Увеличить"
      :aria-disabled="atMost ? 'true' : undefined"
      @click="zoomBy(1)"
    >
      <span aria-hidden="true">+</span>
    </button>
    <button
      type="button"
      class="secondary tool"
      :aria-pressed="zoom === 1"
      @click="emit('zoom', 1)"
    >
      По ширине
    </button>
  </div>
</template>

<style scoped>
.zoom {
  align-items: center;
  display: flex;
  gap: 0.375rem;
}

.tool {
  min-height: 2.25rem;
  min-width: 2.25rem;
  padding: 0.25rem 0.625rem;
}

.tool[aria-disabled="true"] {
  border-color: var(--color-border);
  color: var(--color-muted);
  cursor: default;
}

.tool[aria-pressed="true"] {
  background: var(--color-surface-muted);
  border-color: var(--color-text);
  font-weight: 600;
}

.level {
  font-variant-numeric: tabular-nums;
  min-width: 3.5rem;
  text-align: center;
}
</style>
