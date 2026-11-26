// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStaticFile, StaticFileError } from "./static-files";

afterEach(() => {
  vi.unstubAllGlobals();
});

/** What loading `demo/course.pdf` rejects with. */
async function failure(): Promise<unknown> {
  return (await loadStaticFile("demo/course.pdf").catch((caught: unknown) => caught)) as unknown;
}

describe("loadStaticFile", () => {
  it("@req PACK-003 gives the bytes of a file of the app, asked for with the site's own credentials only", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(new Uint8Array([1, 2, 3])),
    );
    vi.stubGlobal("fetch", fetch);

    expect([...(await loadStaticFile("demo/course.pdf"))]).toEqual([1, 2, 3]);

    expect(String(fetch.mock.calls[0]![0])).toMatch(/\/demo\/course\.pdf$/);
    expect(fetch.mock.calls[0]![1]).toEqual({ credentials: "same-origin" });
  });

  it("@req DOC-008 a request that does not reach the site is a failure of the network", async () => {
    vi.stubGlobal("fetch", async () => Promise.reject(new TypeError("offline")));

    expect(await failure()).toMatchObject({ failure: { kind: "network" } });
  });

  it("@req DOC-008 an answer with an error status says the status", async () => {
    vi.stubGlobal("fetch", async () => new Response("no", { status: 404 }));

    const error = await failure();

    expect(error).toBeInstanceOf(StaticFileError);
    expect(error).toMatchObject({
      path: "demo/course.pdf",
      failure: { kind: "status", status: 404 },
    });
  });

  it("@req DOC-008 a body cut short is a failure of the network", async () => {
    vi.stubGlobal("fetch", async () => ({
      ok: true,
      arrayBuffer: async () => Promise.reject(new TypeError("cut")),
    }));

    expect(await failure()).toMatchObject({ failure: { kind: "network" } });
  });
});
