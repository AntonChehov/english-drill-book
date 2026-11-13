import { forceCloseDatabase, IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Pack } from "../domain/packs/types";

// The app's connection, on an IndexedDB in memory given to the page as `indexedDB`.
let connections: IDBOpenDBRequest[];
let factory: IDBFactory;

beforeEach(() => {
  vi.resetModules();
  factory = new IDBFactory();
  const open = factory.open.bind(factory);
  connections = [];
  vi.spyOn(factory, "open").mockImplementation((name, version) => {
    const request = open(name, version);
    connections.push(request);
    return request;
  });
  vi.stubGlobal("indexedDB", factory);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const pack = { kind: "pack", id: "test-pack" } as unknown as Pack;

describe("the app's store", () => {
  it("@req DATA-004 after the browser closes the connection, the next call opens the database again and the write is kept", async () => {
    const { getStore } = await import("./storage");
    const first = await getStore();

    // fake-indexeddb types the connection it takes wrongly.
    forceCloseDatabase(connections[0]!.result as never);
    const second = await getStore();

    expect(second).not.toBe(first);
    await second.putPacks([pack]);
    expect(await second.getPacks()).toEqual([pack]);
  });

  it("@req DATA-004 a write refused on a closed connection is kept when the visitor tries again", async () => {
    const { getStore } = await import("./storage");
    await getStore();
    connections[0]!.result.close();

    await expect((await getStore()).putPacks([pack])).rejects.toMatchObject({
      kind: "failed",
      connectionClosed: true,
    });
    await (await getStore()).putPacks([pack]);

    expect(await (await getStore()).getPacks()).toEqual([pack]);
  });

  it("@req DATA-005 data of a newer version is noted for the whole app", async () => {
    const { getStore, newerVersion } = await import("./storage");
    await new Promise<void>((resolve) => {
      const newer = factory.open("english-drill-book", 9);
      newer.addEventListener("success", () => {
        newer.result.close();
        resolve();
      });
    });

    await expect(getStore()).rejects.toMatchObject({ kind: "newer-version" });
    expect(newerVersion.value).toBe(true);
  });
});
