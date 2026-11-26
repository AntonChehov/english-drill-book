<script setup lang="ts">
// The green check mark of a finished unit or book. It is drawn in when `done` changes
// from false to true, and shown already drawn when it is true from the start or when the learner
// asks for reduced motion (the animation is in a media query). A screen reader hears «выполнено».
// `still` is for a screen that reads its data after it is shown, where a change is not a finish.
import { ref, watch } from "vue";

const props = defineProps<{ done: boolean; still?: boolean }>();

const drawing = ref(false);
watch(
  () => props.done,
  (now, before) => {
    drawing.value = now && !before && props.still !== true;
  },
);
</script>

<template>
  <span v-if="done" class="mark" :class="{ drawing }">
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M3 8.5 6.5 12 13 4.5" pathLength="1" />
    </svg>
    <span class="visually-hidden">выполнено</span>
  </span>
</template>

<style scoped>
.mark {
  color: var(--color-ok);
  display: inline-block;
  flex: none;
  height: 1em;
  line-height: 1;
  vertical-align: -0.125em;
  width: 1em;
}

svg {
  display: block;
  height: 100%;
  width: 100%;
}

path {
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

@media (prefers-reduced-motion: no-preference) {
  .drawing path {
    animation: draw 0.45s ease-out;
    stroke-dasharray: 1;
  }
}

@keyframes draw {
  from {
    stroke-dashoffset: 1;
  }

  to {
    stroke-dashoffset: 0;
  }
}
</style>
