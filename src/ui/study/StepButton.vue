<script setup lang="ts">
// ‹ and › of Study: to the previous or the next unit, in the unit's header and, on a narrow
// screen, in the bar.
defineProps<{ direction: "previous" | "next"; to: string | undefined }>();
defineEmits<{ go: [to: string | undefined] }>();

const label = { previous: "Предыдущий раздел", next: "Следующий раздел" };
const sign = { previous: "‹", next: "›" };
</script>

<template>
  <button
    type="button"
    class="step"
    :aria-label="label[direction]"
    :title="label[direction]"
    :disabled="to === undefined"
    @click="$emit('go', to)"
  >
    <span aria-hidden="true">{{ sign[direction] }}</span>
  </button>
</template>

<style scoped>
.step {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.375rem;
  color: var(--color-text);
  cursor: pointer;
  flex: none;
  font: inherit;
  font-size: 1.25rem;
  height: 2.25rem;
  line-height: 1;
  width: 2.25rem;
}

.step:hover:not(:disabled) {
  background: var(--color-surface-muted);
  border-color: var(--color-text);
}

.step:disabled {
  border-color: var(--color-border);
  color: var(--color-border-strong);
  cursor: default;
}
</style>
