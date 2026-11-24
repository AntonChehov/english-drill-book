import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import CheckMark from "./CheckMark.vue";

const html = (done: boolean) => renderToString(createSSRApp(CheckMark, { done }));

describe("CheckMark", () => {
  it("@req PROD-012 a finished unit has the mark, already drawn, and a screen reader hears «выполнено»", async () => {
    const mark = await html(true);

    expect(mark).toContain("<svg");
    expect(mark).toContain("выполнено");
    expect(mark).not.toContain("drawing");
  });

  it("@req PROD-012 an unfinished one has nothing", async () => {
    expect(await html(false)).not.toContain("выполнено");
    expect(await html(false)).not.toContain("<svg");
  });
});
