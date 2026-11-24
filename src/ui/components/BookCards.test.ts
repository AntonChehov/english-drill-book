import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it } from "vitest";
import { doneExercises, doneKey } from "../demo/progress";
import type { DemoBookSummary } from "../demo/state";
import BookCards from "./BookCards.vue";

const books: DemoBookSummary[] = [
  { id: "whole", title: "Whole", units: [{ id: "1", title: "Один", exercises: ["1.1", "1.2"] }] },
  {
    id: "partial",
    title: "Partial",
    units: [{ id: "1", title: "Один", exercises: ["1.1", "1.2"] }],
  },
];

async function cards(): Promise<[whole: string, partial: string]> {
  const app = createSSRApp(BookCards, { books });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: BookCards }],
  });
  app.use(router);
  await router.push("/");
  await router.isReady();
  const html = await renderToString(app);
  const [, whole = "", partial = ""] = html.split(/(?=<li class="(?:finished )?book card)/);
  return [whole, partial];
}

const headingOf = (card: string) => card.slice(card.indexOf("<h3"), card.indexOf("</h3>"));

afterEach(() => doneExercises.clear());

describe("BookCards", () => {
  it("@req PROD-012 a book whose units are all done has the green frame and the mark in its heading", async () => {
    doneExercises.set(doneKey("whole", "1.1"), true);
    doneExercises.set(doneKey("whole", "1.2"), true);
    doneExercises.set(doneKey("partial", "1.1"), true);

    const [whole, partial] = await cards();

    expect(whole).toMatch(/^<li class="finished book card"/);
    expect(headingOf(whole)).toContain("выполнено");
    expect(partial).not.toContain("finished");
    expect(headingOf(partial)).not.toContain("выполнено");
  });

  it("@req PROD-012 nothing is marked while nothing is done", async () => {
    const [whole, partial] = await cards();

    expect(whole + partial).not.toContain("выполнено");
    expect(whole + partial).not.toContain("finished");
  });
});
