<script setup lang="ts">
// The pages of the unit beside its exercises, one under another, each holding its place before
// `usePageDrawing` draws it, so the scroll bar is honest. Its header zooms them and hides the
// panel; a page before the first and one after the last can be added; a text layer over each page
// lets its text be copied.
import { computed, nextTick, ref, useId, useTemplateRef, watch } from "vue";
import type { Pack } from "../../domain/packs/types";
import { MAX_ZOOM, MIN_ZOOM, stepZoom, zoomLabel } from "./layout";
import { pagesFailed, pagesMissing, pagesOffline } from "./messages";
import type { PagesFailure } from "./pages";
import { usePageDrawing } from "./pages-drawing";

const headingId = useId();
const props = defineProps<{
  pack: Pack;
  pages: readonly number[];
  /** The zoom, as a multiple of the panel's width. */
  zoom: number;
  /** The panel can be hidden: from 1024 px. */
  collapsible: boolean;
}>();
const emit = defineEmits<{ zoom: [zoom: number]; hide: [] }>();

/** The proportions of an A4 page, held for a page whose own size is not known yet. */
const A4 = 595.28 / 841.89;

/** How many pages were added before the unit's first and after its last. */
const addedBefore = ref(0);
const addedAfter = ref(0);
const view = useTemplateRef<HTMLDivElement>("view");
const list = useTemplateRef<HTMLOListElement>("list");
const heading = useTemplateRef<HTMLElement>("heading");
const hideButton = useTemplateRef<HTMLButtonElement>("hideButton");
const { book, failure, ratios, drawn, open, measure, observe, redraw, setCanvas, setLayer } =
  usePageDrawing(props, view);
let adding = false;

const messages: Record<PagesFailure, string> = {
  offline: pagesOffline,
  failed: pagesFailed,
  missing: pagesMissing,
};

/** The page numbers from `first` to `last`; none when `last` is below. */
const range = (first: number, last: number) =>
  Array.from({ length: Math.max(0, last - first + 1) }, (_, at) => first + at);

/** The pages shown: the unit's own and the ones added around them, within the book. */
const shown = computed(() => {
  const own = props.pages;
  const count = book.value?.count;
  if (own.length === 0 || count === undefined) return [...own];
  const from = Math.max(1, own[0]! - addedBefore.value);
  const to = Math.min(count, own.at(-1)! + addedAfter.value);
  return [...range(from, own[0]! - 1), ...own, ...range(own.at(-1)! + 1, to)];
});
const hasPrevious = computed(
  () => book.value !== undefined && shown.value.length > 0 && shown.value[0]! > 1,
);
const hasNext = computed(
  () =>
    book.value !== undefined && shown.value.length > 0 && shown.value.at(-1)! < book.value.count,
);

const atFewest = computed(() => props.zoom <= MIN_ZOOM);
const atMost = computed(() => props.zoom >= MAX_ZOOM);

function zoomBy(direction: 1 | -1) {
  const next = stepZoom(props.zoom, direction);
  if (next !== props.zoom) emit("zoom", next);
}

/**
 * Runs `change`, which resizes or adds pages, and keeps the page at the top of the window where it
 * was: at the same distance from the top, and as far into it when the page grows or shrinks.
 */
async function holdPlace(change: () => void) {
  const anchor = [...(list.value?.children ?? [])].find(
    (page) => page.getBoundingClientRect().bottom > 0,
  );
  const before = anchor?.getBoundingClientRect();
  change();
  await nextTick();
  if (anchor === undefined || before === undefined) return;
  const after = anchor.getBoundingClientRect();
  const wanted = before.top < 0 ? (before.top / before.height) * after.height : before.top;
  window.scrollBy({ top: after.top - wanted, behavior: "instant" });
}

/** Adds the page before the first shown, or after the last. */
async function extend(side: "before" | "after") {
  const pdf = book.value;
  if (pdf === undefined || adding) return;
  adding = true;
  try {
    const page = side === "before" ? shown.value[0]! - 1 : shown.value.at(-1)! + 1;
    // Its proportions first, so the page does not change size after it is added.
    await measure(pdf, [page]);
    await holdPlace(() => {
      if (side === "before") addedBefore.value++;
      else addedAfter.value++;
    });
    observe();
    // The button pressed is gone at the book's end; the focus goes to the panel, not to the page.
    if (!(side === "before" ? hasPrevious : hasNext).value) heading.value?.focus();
  } catch {
    // The page's size could not be read: nothing was added.
  } finally {
    adding = false;
  }
}

/** Scrolls the pages to `page`. */
function scrollToPage(page: number) {
  const target = list.value?.querySelector<HTMLElement>(`[data-page="${page}"]`);
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
}

defineExpose({ scrollToPage, focusHide: () => hideButton.value?.focus() });

watch(
  () => props.zoom,
  () => void holdPlace(redraw),
);

// Another unit or another source: its own pages only.
watch(
  () => props.pages.join(),
  () => {
    addedBefore.value = 0;
    addedAfter.value = 0;
    void open();
  },
);
</script>

<template>
  <section class="pages" :aria-labelledby="headingId">
    <div class="head">
      <h2 :id="headingId" ref="heading" class="visually-hidden" tabindex="-1">Страницы книги</h2>
      <div v-if="!failure" class="zoom" role="toolbar" aria-label="Масштаб">
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
      <button
        v-if="collapsible"
        ref="hideButton"
        type="button"
        class="secondary tool hide"
        @click="emit('hide')"
      >
        Скрыть страницы
      </button>
    </div>
    <div v-if="failure" class="message card" role="alert">
      <p>{{ messages[failure] }}</p>
      <button v-if="failure !== 'missing'" type="button" class="secondary" @click="open">
        Повторить
      </button>
    </div>
    <button
      v-if="!failure && hasPrevious"
      type="button"
      class="secondary neighbour"
      @click="extend('before')"
    >
      Предыдущая страница
    </button>
    <div v-show="!failure" ref="view" class="view" :tabindex="zoom > 1 ? 0 : undefined">
      <ol ref="list" class="list" :style="{ width: `${zoom * 100}%` }">
        <li
          v-for="page in shown"
          :key="page"
          class="page"
          :data-page="page"
          :style="{ aspectRatio: String(ratios.get(page) ?? A4) }"
        >
          <canvas
            :ref="(element) => setCanvas(page, element)"
            role="img"
            :aria-label="`Страница ${page}`"
            :data-drawn="drawn.has(page) || undefined"
          />
          <div
            :ref="(element) => setLayer(page, element)"
            class="text-layer"
            lang="en"
            aria-hidden="true"
          />
        </li>
      </ol>
    </div>
    <button
      v-if="!failure && hasNext"
      type="button"
      class="secondary neighbour"
      @click="extend('after')"
    >
      Следующая страница
    </button>
  </section>
</template>

<style scoped>
.head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  justify-content: space-between;
  margin: 0 0 0.75rem;
}

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

.hide {
  margin-left: auto;
}

.neighbour {
  display: block;
  margin: 0.75rem auto;
}

/* The pages are as wide as the zoom says and the panel scrolls sideways when they are wider; the
   window never does. */
.view {
  overflow-x: auto;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  list-style: none;
  margin: 0;
  /* The place held across a change of zoom or an added page is kept by `holdPlace`. */
  overflow-anchor: none;
  padding: 0;
}

.page {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  position: relative;
  scroll-margin-top: 1rem;
  width: 100%;
}

.page canvas {
  display: block;
  height: 100%;
  width: 100%;
}

/* The text of a page, transparent over its canvas: the rules of pdf.js's text layer that
   place the spans and size them by `--total-scale-factor`, which `render.ts` sets. */
.text-layer {
  inset: 0;
  line-height: 1;
  overflow: clip;
  position: absolute;
  text-size-adjust: none;
  transform-origin: 0 0;
  --text-scale-factor: calc(var(--total-scale-factor) * var(--min-font-size));
  --min-font-size-inv: calc(1 / var(--min-font-size));
}

.text-layer :deep(:is(span, br)) {
  color: transparent;
  cursor: text;
  position: absolute;
  transform-origin: 0 0;
  user-select: text;
  white-space: pre;
}

.text-layer :deep(span:not(.markedContent)) {
  --font-height: 0;
  --rotate: 0deg;
  --scale-x: 1;
  font-size: calc(var(--text-scale-factor) * var(--font-height));
  transform: rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv));
}

.text-layer :deep(.markedContent) {
  display: contents;
}

.text-layer :deep(::selection) {
  background: rgb(0 0 255 / 25%);
  color: transparent;
}

.message {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 1rem;
}

.message p {
  margin: 0;
}

/* Beside the exercises the header stays in sight while the pages scroll; `StudyView` sets the
   distance when a source switch is above it. */
@media (min-width: 1024px) {
  .head {
    background: var(--color-bg);
    padding: 0.25rem 0;
    position: sticky;
    top: var(--pages-head-top, 0);
    z-index: 1;
  }
}
</style>
