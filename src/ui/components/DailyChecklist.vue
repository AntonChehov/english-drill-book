<script setup lang="ts">
// The checklist of the day on Today: the
// program's daily blocks, ticked for the device's calendar day. A tick is shown only once it is
// kept; the day is taken again whenever the store may have changed, so a page left open
// overnight starts the new day empty when it is looked at again.
import { onMounted, onUnmounted, ref } from "vue";
import { demoProgram as program } from "../../domain/programs";
import { localDay } from "../demo/day";
import { getStore, noteStorageFailure, onStoredDataChange } from "../storage";

const day = ref(localDay(new Date()));
const ticks = ref<readonly string[]>([]);
const failed = ref(false);

async function read() {
  const today = localDay(new Date());
  try {
    const kept = await (await getStore()).getDayTicks(today);
    day.value = today;
    ticks.value = kept;
  } catch (error) {
    noteStorageFailure(error);
  }
}

/** The writes of ticks, one after another: each is built from the set the one before wrote. */
let writing = Promise.resolve();

function toggle(block: string, box: HTMLInputElement) {
  box.checked = ticks.value.includes(block);
  writing = writing.then(() => write(block));
}

async function write(block: string) {
  const today = localDay(new Date());
  const current = today === day.value ? ticks.value : [];
  const next = current.includes(block) ? current.filter((id) => id !== block) : [...current, block];
  try {
    await (await getStore()).putDayTicks(today, next);
    day.value = today;
    ticks.value = next;
    failed.value = false;
  } catch (error) {
    noteStorageFailure(error);
    failed.value = true;
  }
}

let stop: (() => void) | undefined;
onMounted(() => {
  void read();
  stop = onStoredDataChange(() => void read());
});
onUnmounted(() => stop?.());
</script>

<template>
  <section class="checklist card" aria-labelledby="checklist-heading">
    <h2 id="checklist-heading">Другие дела дня</h2>
    <ul class="blocks">
      <li v-for="block in program.dailyBlocks" :key="block.id">
        <label class="block">
          <input
            type="checkbox"
            :checked="ticks.includes(block.id)"
            @change="toggle(block.id, $event.target as HTMLInputElement)"
          />
          {{ block.title }}
        </label>
      </li>
    </ul>
    <p v-if="failed" class="failure" role="alert">
      Отметку не удалось сохранить. Попробуйте ещё раз.
    </p>
  </section>
</template>

<style scoped>
.card {
  margin: 1.5rem 0 0;
  padding: 1rem;
}

h2 {
  font-size: 1.25rem;
  line-height: 1.3;
  margin: 0 0 0.75rem;
}

.blocks {
  list-style: none;
  margin: 0;
  padding: 0;
}

.block {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 0.625rem;
  min-height: 2.75rem;
}

.block input {
  accent-color: var(--color-accent);
  height: 1.25rem;
  margin: 0;
  width: 1.25rem;
}

.failure {
  color: var(--color-error);
  margin: 0.5rem 0 0;
}
</style>
