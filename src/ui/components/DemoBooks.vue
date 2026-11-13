<script setup lang="ts">
// The demo section of the start screen (PACK-003, design D8 of `demo-books`): one button adds the
// two demo books, progress and failure are said in place, and a failure offers to try again without
// a reload. The button stays where it is while the books are read, inactive, so the focus stays on
// it. The books are shown as added only once they are stored, and stay added after a reload and in
// other tabs (DATA-001, DATA-004, DATA-012; design D4, D6, D7 of `storage`).
import { computed, nextTick, onMounted, onUnmounted, useTemplateRef } from "vue";
import type { Pack } from "../../domain/packs/types";
import { countOf } from "../../domain/plural";
import {
  failureMessage,
  failureOf,
  keepFailureMessage,
  keepingMessage,
  progressMessage,
} from "../demo/messages";
import { demoState, summaryOf, type DemoState } from "../demo/state";
import { getStore, noteStorageFailure, onStoredDataChange } from "../storage";

const heading = useTemplateRef<HTMLElement>("heading");
const action = useTemplateRef<HTMLButtonElement>("action");

const reading = computed(() => demoState.value.phase === "reading");
const retrying = computed(
  () =>
    demoState.value.phase === "failed" ||
    (demoState.value.phase === "reading" && demoState.value.retry),
);

/** Reads the demo books from their PDFs into packs, saying which book is read. */
async function readDemo(retry: boolean): Promise<readonly Pack[]> {
  const { addDemo } = await import("../demo/add-demo");
  return addDemo((progress) => {
    demoState.value = { phase: "reading", message: progressMessage(progress), retry };
  });
}

/**
 * Reads the demo books, unless they were read before a failure to keep them, and stores them.
 * `quietly` when the app does it by itself on start: the focus is left where it is.
 */
async function add(quietly = false) {
  if (reading.value) return;
  const retry = retrying.value;
  let packs = demoState.value.phase === "failed" ? demoState.value.packs : undefined;
  demoState.value = {
    phase: "reading",
    message: packs === undefined ? "Загружаем демо-книги…" : keepingMessage,
    retry,
  };
  try {
    packs ??= await readDemo(retry);
    await (await getStore()).putPacks(packs);
    demoState.value = { phase: "added", books: summaryOf(packs) };
    await nextTick();
    if (!quietly) heading.value?.focus();
  } catch (error) {
    noteStorageFailure(error);
    demoState.value =
      packs === undefined
        ? { phase: "failed", message: failureMessage(failureOf(error)) }
        : { phase: "failed", message: keepFailureMessage(error), packs };
    await nextTick();
    if (!quietly) action.value?.focus();
  }
}

let checking = false;
const phaseNow = (): DemoState["phase"] => demoState.value.phase;

/**
 * Shows the demo as added when its packs are stored (design D7), on start and whenever another
 * tab may have added it (design D6). On start, stored packs that cannot be used are read again
 * from the PDFs. Nothing changes while the books are being added here.
 */
async function check() {
  const phase = demoState.value.phase;
  if (checking || phase === "reading" || phase === "added") return;
  const starting = phase === "loading";
  checking = true;
  try {
    const stored = await (await getStore()).getPacks();
    // The validator is loaded only when there is something to validate.
    const kept =
      stored.length === 0
        ? ({ kind: "none" } as const)
        : (await import("../../domain/books/demo/kept")).keptDemo(stored);
    // Read again: the visitor may have added the demo while the store was read.
    const now = phaseNow();
    if (now === "reading" || now === "added") return;
    if (kept.kind === "kept") demoState.value = { phase: "added", books: summaryOf(kept.packs) };
    else if (kept.kind === "stale" && starting) {
      checking = false;
      await add(true);
    } else if (now === "loading") demoState.value = { phase: "idle" };
  } catch (error) {
    // Nothing kept can be read: the demo can still be added, and says so if it cannot be kept.
    noteStorageFailure(error);
    if (demoState.value.phase === "loading") demoState.value = { phase: "idle" };
  } finally {
    checking = false;
  }
}

let stopWatching: (() => void) | undefined;
onMounted(() => {
  void check();
  stopWatching = onStoredDataChange(() => void check());
});
onUnmounted(() => stopWatching?.());

const exercises = ["упражнение", "упражнения", "упражнений"] as const;
</script>

<template>
  <section class="demo" aria-labelledby="demo-heading">
    <h2 id="demo-heading" ref="heading" tabindex="-1">
      {{ demoState.phase === "added" ? "Демо-книги добавлены" : "Демо-книги" }}
    </h2>

    <p v-if="demoState.phase !== 'added'">
      Две короткие книги, написанные для этого приложения: курс грамматики и сборник упражнений к
      нему. Файлы загружаются с этого сайта, выбирать ничего не нужно.
    </p>
    <p v-if="demoState.phase === 'failed'" class="failure" role="alert">
      {{ demoState.message }}
    </p>
    <button
      v-if="demoState.phase !== 'added'"
      ref="action"
      type="button"
      class="action"
      :aria-disabled="reading ? 'true' : undefined"
      @click="add()"
    >
      {{ retrying ? "Попробовать ещё раз" : "Попробовать демо" }}
    </button>

    <!-- The live region is always in the page, so its first message is announced. -->
    <p class="status" role="status">
      {{ demoState.phase === "reading" ? demoState.message : "" }}
    </p>

    <template v-if="demoState.phase === 'added'">
      <p>
        Обе книги прочитаны и сохранены в этом браузере: они останутся здесь и после перезагрузки
        страницы.
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

.action[aria-disabled="true"] {
  cursor: progress;
}

.status {
  margin: 0.75rem 0 0;
}

.status:empty {
  margin: 0;
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
