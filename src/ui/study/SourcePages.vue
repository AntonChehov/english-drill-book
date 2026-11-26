<script setup lang="ts">
// The pages beside the exercises. In the drills step of a topic a switch shows the course unit's
// pages in place of the drill book's; the course's panel is made the first time it is shown.
import { computed, nextTick, ref, useTemplateRef } from "vue";
import type { Pack } from "../../domain/packs/types";
import { pagesOf } from "./pages";
import PagesPanel from "./PagesPanel.vue";
import type { TopicOfUnit } from "./unit";

const props = defineProps<{
  pack: Pack;
  /** The pages of the unit. */
  pages: readonly number[];
  topic: TopicOfUnit | undefined;
  zoomOf: (pack: string) => number;
  /** The pages can be hidden: from 1024 px. */
  collapsible: boolean;
}>();
const emit = defineEmits<{ zoom: [pack: string, zoom: number]; hide: []; switched: [] }>();

const panel = useTemplateRef<InstanceType<typeof PagesPanel>>("panel");
const coursePanel = useTemplateRef<InstanceType<typeof PagesPanel>>("coursePanel");
const coursePages = computed(() =>
  pagesOf(props.topic?.course.unit.pages, props.topic?.course.pack),
);
const showCourse = ref(false);
const courseOpened = ref(false);

async function showSource(course: boolean) {
  showCourse.value = course;
  courseOpened.value ||= course;
  await nextTick();
  emit("switched");
}

/** Scrolls the unit's own pages to `page`, shown in place of the course's if those are. */
async function scrollToPage(page: number) {
  if (showCourse.value) {
    showCourse.value = false;
    await nextTick();
  }
  panel.value?.scrollToPage(page);
}

defineExpose({
  scrollToPage,
  focusHide: () => (showCourse.value ? coursePanel : panel).value?.focusHide(),
});
</script>

<template>
  <div v-if="topic?.step === 'drills'" class="source" role="group" aria-label="Страницы">
    <button
      type="button"
      class="source-button"
      :aria-pressed="!showCourse"
      @click="showSource(false)"
    >
      Сборник упражнений
    </button>
    <button
      type="button"
      class="source-button"
      :aria-pressed="showCourse"
      @click="showSource(true)"
    >
      Курс: раздел {{ topic.course.unit.id }}
    </button>
  </div>
  <PagesPanel
    v-show="!showCourse"
    ref="panel"
    :pack="pack"
    :pages="pages"
    :zoom="zoomOf(pack.id)"
    :collapsible="collapsible"
    @zoom="(zoom) => emit('zoom', pack.id, zoom)"
    @hide="emit('hide')"
  />
  <PagesPanel
    v-if="topic && courseOpened"
    v-show="showCourse"
    ref="coursePanel"
    :pack="topic.course.pack"
    :pages="coursePages"
    :zoom="zoomOf(topic.course.pack.id)"
    :collapsible="collapsible"
    @zoom="(zoom) => emit('zoom', topic!.course.pack.id, zoom)"
    @hide="emit('hide')"
  />
</template>

<style scoped>
.source {
  display: flex;
  gap: 0.5rem;
  margin: 0 0 0.75rem;
}

.source-button {
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 0.375rem;
  color: var(--color-text);
  cursor: pointer;
  font: inherit;
  padding: 0.375rem 0.75rem;
}

.source-button[aria-pressed="true"] {
  background: var(--color-surface-muted);
  border-color: var(--color-text);
  font-weight: 600;
}

/* Beside the exercises the switch stays at the top while the pages scroll, as high as the
   distance `StudyView` gives the pages' header below it. */
@media (min-width: 1024px) {
  .source {
    align-items: center;
    background: var(--color-bg);
    height: 2.75rem;
    margin: 0;
    position: sticky;
    top: 0;
    z-index: 1;
  }
}
</style>
