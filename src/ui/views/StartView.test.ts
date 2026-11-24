import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createMemoryHistory, createRouter } from "vue-router";
import { afterEach, describe, expect, it } from "vitest";
import coursePack from "../../../demo/course.pack.json";
import drillsPack from "../../../demo/drills.pack.json";
import { keptDemo } from "../../domain/books/demo/kept";
import { demoState, summaryOf } from "../demo/state";
import StartView from "./StartView.vue";

async function start(): Promise<string> {
  const app = createSSRApp(StartView);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:rest(.*)*", component: StartView }],
  });
  app.use(router);
  await router.push("/");
  await router.isReady();
  return renderToString(app);
}

const line = "Свои книги можно будет добавить в библиотеке";

afterEach(() => {
  demoState.value = { phase: "loading" };
});

describe("StartView", () => {
  it("@req PROD-002 with no book added it offers the demo and says own books come in a later version, with no link", async () => {
    const html = await start();

    expect(html).toContain("Попробовать демо");
    const own = /<p class="own-books"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "";
    expect(own).toContain(line);
    expect(own).toContain("она появится в следующей версии");
    expect(own).not.toContain("<a");
  });

  it("@req PROD-002 once the demo is added the line is gone", async () => {
    const kept = keptDemo([coursePack, drillsPack]);
    if (kept.kind !== "kept") throw new Error("the demo packs are not the kept demo");
    demoState.value = { phase: "added", books: summaryOf(kept.packs) };

    expect(await start()).not.toContain(line);
  });
});
