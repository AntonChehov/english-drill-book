<script setup lang="ts">
// The demo section of the start screen (PACK-003, design D8): one button adds the two demo books,
// progress and failure are said in place, and a failure offers to try again without a reload.
import { nextTick, useTemplateRef } from "vue";
import { countOf } from "../../domain/plural";
import { failureMessage, failureOf, progressMessage } from "../demo/messages";
import { demoState } from "../demo/state";

const heading = useTemplateRef<HTMLElement>("heading");
const retry = useTemplateRef<HTMLButtonElement>("retry");

async function add() {
  demoState.value = { phase: "reading", message: "Загружаем демо-книги…" };
  try {
    const { addDemo } = await import("../demo/add-demo");
    const packs = await addDemo((progress) => {
      demoState.value = { phase: "reading", message: progressMessage(progress) };
    });
    demoState.value = {
      phase: "added",
      books: packs.map((pack) => ({
        id: pack.id,
        title: pack.title,
        units: pack.units.map((unit) => ({
          id: unit.id,
          title: unit.title,
          exercises: unit.exercises.length,
        })),
      })),
    };
    await nextTick();
    heading.value?.focus();
  } catch (error) {
    demoState.value = { phase: "failed", message: failureMessage(failureOf(error)) };
    await nextTick();
    retry.value?.focus();
  }
}

const exercises = ["упражнение", "упражнения", "упражнений"] as const;
</script>

<template>
  <section class="demo" aria-labelledby="demo-heading">
    <h2 id="demo-heading" ref="heading" tabindex="-1">
      {{ demoState.phase === "added" ? "Демо-книги добавлены" : "Демо-книги" }}
    </h2>

    <p v-if="demoState.phase === 'idle'">
      Две короткие книги, написанные для этого приложения: курс грамматики и сборник упражнений к
      нему. Файлы загружаются с этого сайта, выбирать ничего не нужно.
    </p>
    <button v-if="demoState.phase === 'idle'" type="button" class="action" @click="add">
      Попробовать демо
    </button>

    <p class="status" role="status">
      {{ demoState.phase === "reading" ? demoState.message : "" }}
    </p>

    <template v-if="demoState.phase === 'failed'">
      <p class="failure" role="alert">{{ demoState.message }}</p>
      <button ref="retry" type="button" class="action" @click="add">Попробовать ещё раз</button>
    </template>

    <template v-if="demoState.phase === 'added'">
      <p>
        Обе книги прочитаны. Пока они не сохраняются: после перезагрузки страницы демо нужно
        добавить снова.
      </p>
      <ul class="books">
        <li v-for="book in demoState.books" :key="book.id">
          <h3 lang="en">{{ book.title }}</h3>
          <ul class="units">
            <li v-for="unit in book.units" :key="unit.id">
              Раздел {{ unit.id }}.&nbsp;<span lang="en">{{ unit.title }}</span
              ><span class="count"> — {{ countOf(unit.exercises, exercises) }}</span>
            </li>
          </ul>
        </li>
      </ul>
    </template>
  </section>
</template>

<style scoped>
.demo {
  border-top: 1px solid var(--color-border);
  margin: 1.5rem 0;
  padding-top: 1rem;
}

h2 {
  font-size: 1.25rem;
  line-height: 1.3;
  margin: 0 0 0.75rem;
}

h3 {
  font-size: 1.05rem;
  margin: 1rem 0 0.25rem;
}

.action {
  background: var(--color-button);
  border: 0;
  border-radius: 0.375rem;
  color: var(--color-button-text);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 0.5rem 1rem;
}

.action:hover {
  background: var(--color-button-hover);
}

.status:empty {
  display: none;
}

.failure {
  border-left: 4px solid var(--color-error);
  margin: 0 0 0.75rem;
  padding: 0.25rem 0 0.25rem 0.75rem;
}

.books,
.units {
  list-style: none;
  margin: 0;
  padding: 0;
}

.units li {
  padding: 0.125rem 0;
}

.count {
  color: var(--color-muted);
}
</style>
