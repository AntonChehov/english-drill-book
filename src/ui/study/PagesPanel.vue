<script setup lang="ts">
// The pages of the unit beside its exercises (DOC-001, DOC-008; design D8 of `study-screen`):
// one under another, each drawn on a canvas at the panel's width and the device's pixel ratio when
// it comes near the viewport, its place held before that so the scroll bar is honest.
import { nextTick, onMounted, onUnmounted, ref, shallowRef, useTemplateRef, watch } from "vue";
import type { Pack } from "../../domain/packs/types";
import { pagesFailed, pagesMissing, pagesOffline } from "./messages";
import { bookOf, PagesError, type PagesFailure, type PdfPages } from "./pages";

const props = defineProps<{ pack: Pack; pages: readonly number[] }>();

/** The proportions of an A4 page, held for a page whose own size is not known yet. */
const A4 = 595.28 / 841.89;

const book = shallowRef<PdfPages>();
const failure = ref<PagesFailure>();
const ratios = ref(new Map<number, number>());
const drawn = ref(new Set<number>());
const list = useTemplateRef<HTMLOListElement>("list");
const canvases = new Map<number, HTMLCanvasElement>();
const near = new Set<number>();
const drawing = new Map<number, AbortController>();
let width = 0;
let observer: IntersectionObserver | undefined;
let resizer: ResizeObserver | undefined;

const messages: Record<PagesFailure, string> = {
  offline: pagesOffline,
  failed: pagesFailed,
  missing: pagesMissing,
};

async function draw(page: number) {
  const pdf = book.value;
  const canvas = canvases.get(page);
  if (pdf === undefined || canvas === undefined || width === 0) return;
  drawing.get(page)?.abort();
  const controller = new AbortController();
  drawing.set(page, controller);
  // On a dense screen a page not shown yet is drawn twice: first at one pixel per CSS pixel, a
  // quarter of the work, so it appears at once (DOC-001), then sharp over it.
  const ratio = window.devicePixelRatio || 1;
  const passes = ratio > 1 && !drawn.value.has(page) ? [1, ratio] : [ratio];
  try {
    for (const pass of passes) {
      await pdf.draw(page, canvas, width, pass, controller.signal);
      if (controller.signal.aborted) return;
      if (!drawn.value.has(page)) drawn.value = new Set(drawn.value).add(page);
    }
  } catch {
    // Cancelled because the panel changed width or closed; a page that cannot be drawn stays blank.
  } finally {
    if (drawing.get(page) === controller) drawing.delete(page);
  }
}

function observe() {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (changes) => {
      for (const change of changes) {
        const page = Number((change.target as HTMLElement).dataset["page"]);
        if (change.isIntersecting) {
          near.add(page);
          if (!drawn.value.has(page) && !drawing.has(page)) void draw(page);
        } else near.delete(page);
      }
    },
    { rootMargin: "800px 0px" },
  );
  for (const canvas of canvases.values()) observer.observe(canvas.parentElement!);
}

/** Opens the book, fetched once for the app, and draws the pages near the viewport. */
async function open() {
  failure.value = undefined;
  try {
    const pdf = await bookOf(props.pack);
    const sizes = await Promise.all(
      props.pages.map(async (page) => [page, await pdf.size(page)] as const),
    );
    ratios.value = new Map(sizes.map(([page, { width: w, height: h }]) => [page, w / h]));
    book.value = pdf;
    await nextTick();
    observe();
  } catch (error) {
    failure.value = error instanceof PagesError ? error.failure : "failed";
  }
}

function setCanvas(page: number, element: unknown) {
  if (element instanceof HTMLCanvasElement) canvases.set(page, element);
  else canvases.delete(page);
}

/** Scrolls the pages to `page` (DOC-001). */
function scrollToPage(page: number) {
  const target = list.value?.querySelector<HTMLElement>(`[data-page="${page}"]`);
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
}

defineExpose({ scrollToPage });

onMounted(() => {
  resizer = new ResizeObserver(([entry]) => {
    const next = Math.round(entry?.contentRect.width ?? 0);
    if (next === 0 || Math.abs(next - width) < 2) return;
    width = next;
    // Drawn for another width: drawn again when near the viewport.
    for (const controller of drawing.values()) controller.abort();
    drawing.clear();
    drawn.value = new Set();
    for (const page of near) void draw(page);
  });
  if (list.value) resizer.observe(list.value);
  void open();
});

watch(
  () => props.pages,
  () => void open(),
);

onUnmounted(() => {
  observer?.disconnect();
  resizer?.disconnect();
  for (const controller of drawing.values()) controller.abort();
});
</script>

<template>
  <section class="pages" aria-labelledby="pages-heading">
    <h2 id="pages-heading" class="visually-hidden">Страницы книги</h2>
    <div v-if="failure" class="message card" role="alert">
      <p>{{ messages[failure] }}</p>
      <button v-if="failure !== 'missing'" type="button" class="secondary" @click="open">
        Повторить
      </button>
    </div>
    <ol v-show="!failure" ref="list" class="list">
      <li
        v-for="page in pages"
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
      </li>
    </ol>
  </section>
</template>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.page {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: 0.25rem;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  scroll-margin-top: 1rem;
  width: 100%;
}

.page canvas {
  display: block;
  height: 100%;
  width: 100%;
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
</style>
