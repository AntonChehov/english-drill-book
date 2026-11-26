<script setup lang="ts">
// A unit that cannot open: no such unit, a demo unit in a browser without the demo, which can be
// added from here, or storage that could not be read, which can be tried again.
import { RouterLink } from "vue-router";
import type { DemoAdding, UnitPhase } from "./unit";

defineProps<{
  phase: Exclude<UnitPhase, "loading" | "ready">;
  /** The title of the demo book the address names. */
  demoTitle: string | undefined;
  adding: DemoAdding;
}>();
const emit = defineEmits<{ addDemo: []; retry: [] }>();
</script>

<template>
  <section v-if="phase === 'not-found'" class="narrow">
    <h1>Раздел не найден</h1>
    <p>Такого раздела нет среди книг в этом браузере.</p>
    <p><RouterLink to="/">На главную</RouterLink></p>
  </section>

  <section v-else-if="phase === 'demo-missing'" class="narrow">
    <h1>Демо-книги ещё не добавлены</h1>
    <p>
      Это ссылка на раздел демо-книги «<span lang="en">{{ demoTitle }}</span
      >». В этом браузере демо-книги ещё не добавлены. Добавьте их — раздел откроется сразу. Файлы
      загружаются с этого сайта, выбирать ничего не нужно.
    </p>
    <p v-if="adding.phase === 'adding'" role="status">{{ adding.message }}</p>
    <p v-if="adding.phase === 'failed'" class="failure" role="alert">{{ adding.message }}</p>
    <p class="row">
      <button
        type="button"
        class="action"
        :aria-disabled="adding.phase === 'adding' ? 'true' : undefined"
        @click="emit('addDemo')"
      >
        {{
          adding.phase === "failed" ? "Попробовать ещё раз" : "Добавить демо-книги и открыть раздел"
        }}
      </button>
      <RouterLink to="/">На главную</RouterLink>
    </p>
  </section>

  <section v-else class="narrow">
    <h1>Не удалось открыть раздел</h1>
    <p role="alert">
      Не удалось прочитать данные, сохранённые в этом браузере. Попробуйте ещё раз.
    </p>
    <p class="row">
      <button type="button" class="action" @click="emit('retry')">Повторить</button>
      <RouterLink to="/">На главную</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.failure {
  border-left: 4px solid var(--color-error);
  padding: 0.25rem 0 0.25rem 0.75rem;
}

.narrow {
  margin: 0 auto;
  max-width: 46rem;
}

.row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
