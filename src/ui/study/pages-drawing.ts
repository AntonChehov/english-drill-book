// Drawing the pages of a panel: each on its canvas at the panel's width times the zoom and at the
// device's pixel ratio, when it comes near the viewport, and again when the width or zoom changes.

import { nextTick, onMounted, onUnmounted, ref, shallowRef, type ShallowRef } from "vue";
import type { Pack } from "../../domain/packs/types";
import { bookOf, PagesError, type PagesFailure, type PdfPages } from "./pages";

/** How long after the last change of the panel's width the pages are drawn again. */
const REDRAW_DELAY = 100;

interface Drawn {
  readonly pack: Pack;
  /** The unit's own pages: their sizes are read when the book opens. */
  readonly pages: readonly number[];
  /** The zoom, as a multiple of the panel's width. */
  readonly zoom: number;
}

/** Draws the pages of `source` on the canvases put in place by `setCanvas`, `view` being their panel. */
export function usePageDrawing(source: Drawn, view: Readonly<ShallowRef<HTMLElement | null>>) {
  const book = shallowRef<PdfPages>();
  const failure = ref<PagesFailure>();
  /** Page → its width divided by its height, once read. */
  const ratios = ref(new Map<number, number>());
  const drawn = ref(new Set<number>());
  const canvases = new Map<number, HTMLCanvasElement>();
  const layers = new Map<number, HTMLElement>();
  const near = new Set<number>();
  const drawing = new Map<number, AbortController>();
  /** The panel's width in CSS pixels; a page is drawn `zoom` times as wide. */
  let width = 0;
  let observer: IntersectionObserver | undefined;
  let resizer: ResizeObserver | undefined;
  let redrawTimer: ReturnType<typeof setTimeout> | undefined;

  async function draw(page: number) {
    const pdf = book.value;
    const canvas = canvases.get(page);
    if (pdf === undefined || canvas === undefined || width === 0) return;
    drawing.get(page)?.abort();
    const controller = new AbortController();
    drawing.set(page, controller);
    // On a dense screen a page not shown yet is drawn twice: first at one pixel per CSS pixel, a
    // quarter of the work, so it appears at once, then sharp over it.
    const ratio = window.devicePixelRatio || 1;
    const passes = ratio > 1 && !drawn.value.has(page) ? [1, ratio] : [ratio];
    try {
      for (const pass of passes) {
        // The text is laid once, with the sharp pass: it is the last.
        const text = pass === passes.at(-1) ? layers.get(page) : undefined;
        await pdf.draw(
          page,
          canvas,
          Math.round(width * source.zoom),
          pass,
          controller.signal,
          text,
        );
        if (controller.signal.aborted) return;
        if (!drawn.value.has(page)) {
          drawn.value = new Set(drawn.value).add(page);
          // What the first page of a unit is timed by.
          if (page === source.pages[0]) performance.mark("first-page");
        }
      }
    } catch {
      // Cancelled because the panel changed width or closed; a page that cannot be drawn stays blank.
    } finally {
      if (drawing.get(page) === controller) drawing.delete(page);
    }
  }

  /** Draws the pages near the viewport again: the panel's width or the zoom changed. */
  function redraw() {
    for (const controller of drawing.values()) controller.abort();
    drawing.clear();
    drawn.value = new Set();
    for (const page of near) void draw(page);
  }

  /** Watches every canvas put in place, so that each is drawn when it comes near the viewport. */
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

  /** Learns the proportions of `numbers`, so a page holds its place before it is drawn. */
  async function measure(pdf: PdfPages, numbers: readonly number[]) {
    const sizes = await Promise.all(
      numbers.map(async (page) => [page, await pdf.size(page)] as const),
    );
    const next = new Map(ratios.value);
    for (const [page, { width: w, height: h }] of sizes) next.set(page, w / h);
    ratios.value = next;
  }

  /** Opens the book, fetched once for the app, and draws the pages near the viewport. */
  async function open() {
    failure.value = undefined;
    try {
      const pdf = await bookOf(source.pack);
      await measure(pdf, source.pages);
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

  function setLayer(page: number, element: unknown) {
    if (element instanceof HTMLElement) layers.set(page, element);
    else layers.delete(page);
  }

  onMounted(() => {
    resizer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry?.contentRect.width ?? 0);
      if (next === 0 || Math.abs(next - width) < 2) return;
      const first = width === 0;
      width = next;
      // Drawn for another width: drawn again when near the viewport, once a drag of the border has
      // settled.
      clearTimeout(redrawTimer);
      if (first) redraw();
      else redrawTimer = setTimeout(redraw, REDRAW_DELAY);
    });
    if (view.value) resizer.observe(view.value);
    void open();
  });

  onUnmounted(() => {
    observer?.disconnect();
    resizer?.disconnect();
    clearTimeout(redrawTimer);
    for (const controller of drawing.values()) controller.abort();
  });

  return { book, failure, ratios, drawn, open, measure, observe, redraw, setCanvas, setLayer };
}
