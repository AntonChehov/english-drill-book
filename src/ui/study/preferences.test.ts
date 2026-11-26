import { IDBFactory } from "fake-indexeddb";
import { effectScope, type EffectScope } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// What Study remembers is module state, kept for the visit: each test starts with a new module and
// an empty storage.
let preferences: typeof import("./preferences");
let storage: typeof import("../storage");
let StorageError: typeof import("../../storage/db/errors").StorageError;
let scope: EffectScope;

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  preferences = await import("./preferences");
  storage = await import("../storage");
  ({ StorageError } = await import("../../storage/db/errors"));
  scope = effectScope();
});

afterEach(() => {
  scope.stop();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Opens Study's preferences and waits until the settings stored have been read. */
async function open() {
  const store = await storage.getStore();
  const reading = vi.spyOn(store, "getSetting");
  const study = scope.run(() => preferences.useStudyPreferences())!;
  await vi.waitFor(() => expect(reading).toHaveBeenCalledTimes(3));
  await Promise.allSettled(reading.mock.results.map((result) => result.value));
  await new Promise<void>((resolve) => setImmediate(resolve));
  reading.mockRestore();
  return study;
}

/** Lets `ms` pass for the timers of the preferences, then goes back to the clock that runs. */
async function pass(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
  vi.useRealTimers();
}

describe("what Study remembers of its layout", () => {
  it("@req DOC-006 starts with the defaults: the split at 60 %, no panel collapsed, every zoom 100 %", async () => {
    const study = await open();

    expect(study.split.value).toBe(0.6);
    expect(study.collapsed.value).toBeUndefined();
    expect(study.zoomOf("demo-drills")).toBe(1);
  });

  it("@req DOC-006 reads what an earlier visit stored, keeping it within the limits", async () => {
    const store = await storage.getStore();
    await store.putSetting("studySplit", 0.9);
    await store.putSetting("collapsedPanel", "exercises");
    await store.putSetting("pageZoom", { "demo-drills": 9, "demo-course": 1.5 });

    const study = await open();
    await vi.waitFor(() => expect(study.collapsed.value).toBe("exercises"));

    expect(study.split.value).toBe(0.75);
    expect(study.zoomOf("demo-drills")).toBe(3);
    expect(study.zoomOf("demo-course")).toBe(1.5);
  });

  it("@req DOC-006 a collapsed panel that is not one of the two is ignored", async () => {
    const store = await storage.getStore();
    await store.putSetting("studySplit", 0.5);
    await store.putSetting("collapsedPanel", "sideways" as never);

    const study = await open();
    await vi.waitFor(() => expect(study.split.value).toBe(0.5));

    expect(study.collapsed.value).toBeUndefined();
  });

  it("@req DOC-006 the split is written once its change has paused, and only the last value", async () => {
    const study = await open();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    study.setSplit(0.5);
    study.setSplit(0.1);
    expect(study.split.value).toBe(0.3);
    await vi.advanceTimersByTimeAsync(299);
    expect(await (await storage.getStore()).getSetting("studySplit")).toBeUndefined();
    await pass(1);

    await vi.waitFor(async () =>
      expect(await (await storage.getStore()).getSetting("studySplit")).toBe(0.3),
    );
  });

  it("@req DOC-002 the zoom of each book is kept apart from the others", async () => {
    const study = await open();

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    study.setZoom("demo-drills", 1.5);
    study.setZoom("demo-course", 0.75);
    await pass(300);

    await vi.waitFor(async () =>
      expect(await (await storage.getStore()).getSetting("pageZoom")).toEqual({
        "demo-drills": 1.5,
        "demo-course": 0.75,
      }),
    );
  });

  it("@req DOC-006 the collapsed panel is written at once, and cleared when it is restored", async () => {
    const study = await open();

    study.setCollapsed("pages");
    await vi.waitFor(async () =>
      expect(await (await storage.getStore()).getSetting("collapsedPanel")).toBe("pages"),
    );
    study.setCollapsed(undefined);

    await vi.waitFor(async () =>
      expect(await (await storage.getStore()).getSetting("collapsedPanel")).toBeUndefined(),
    );
  });

  it("@req DOC-002 a change made just before Study closes is still written", async () => {
    const study = await open();

    study.setZoom("demo-drills", 2);
    scope.stop();

    await vi.waitFor(async () =>
      expect(await (await storage.getStore()).getSetting("pageZoom")).toEqual({
        "demo-drills": 2,
      }),
    );
  });

  it("@req DATA-004 a setting that cannot be written is not shown to the learner and still applies for the visit", async () => {
    const study = await open();
    const putting = vi
      .spyOn(await storage.getStore(), "putSetting")
      .mockRejectedValue(new StorageError("quota"));

    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    study.setSplit(0.4);
    await pass(300);

    expect(putting).toHaveBeenCalled();
    expect(study.split.value).toBe(0.4);
  });

  it("@req DATA-005 data of a newer version is noted when the settings are read", async () => {
    const store = await storage.getStore();
    vi.spyOn(store, "getSetting").mockRejectedValue(new StorageError("newer-version"));

    scope.run(() => preferences.useStudyPreferences());

    await vi.waitFor(() => expect(storage.newerVersion.value).toBe(true));
  });
});
