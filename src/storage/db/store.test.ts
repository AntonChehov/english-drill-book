import { forceCloseDatabase, IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DERIVATION, deriveExercise, emptyExerciseState, newAttempt } from "../../domain/progress";
import { attemptOf, freshFactory, packOf, rawOpen, snapshot } from "./db.fixture";
import { StorageError } from "./errors";
import { openStore, type DerivedRecord } from "./store";

afterEach(() => {
  vi.restoreAllMocks();
});

async function setUp() {
  const factory = freshFactory();
  const store = await openStore({ factory });
  return { factory, store };
}

/** Runs `change` on the derived store of a second connection, as a crash or an old app might. */
async function changeCache(factory: IDBFactory, change: (store: IDBObjectStore) => void) {
  const database = await rawOpen(factory);
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(["derived"], "readwrite");
    change(transaction.objectStore("derived"));
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
  });
  database.close();
}

describe("the attempt log", () => {
  it("@req DATA-002 an appended attempt is read after the earlier ones, unchanged", async () => {
    const { store } = await setUp();
    const first = attemptOf(1, { "1": "bad", "2": "ok" });
    const second = attemptOf(2, { "1": "ok", "2": "ok" });
    const other = attemptOf(3, { "1": "ok" }, "test-pack", "1.2");

    await store.appendAttempt(first);
    await store.appendAttempt(other);
    await store.appendAttempt(second);

    expect(await store.getAttempts("test-pack", "1.1")).toEqual([first, second]);
    expect(await store.getAttempts("test-pack", "1.2")).toEqual([other]);
  });

  it("@req DATA-002 the attempts are read in time order whatever order they were added in", async () => {
    const { store } = await setUp();
    const later = attemptOf(9, { "1": "ok" });
    const earlier = attemptOf(4, { "1": "bad" });

    await store.appendAttempt(later);
    await store.appendAttempt(earlier);

    expect(await store.getAttempts("test-pack", "1.1")).toEqual([earlier, later]);
    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(
      deriveExercise([earlier, later]),
    );
  });

  it("@req DATA-002 an attempt with the id of one in the log is refused and the log is as it was", async () => {
    const { factory, store } = await setUp();
    const first = attemptOf(1, { "1": "bad" });
    await store.appendAttempt(first);
    const before = await snapshot(factory);

    const replacement = { ...first, results: { "1": "ok" as const }, complete: true };
    await expect(store.appendAttempt(replacement)).rejects.toThrow(new StorageError("failed"));

    expect(await store.getAttempts("test-pack", "1.1")).toEqual([first]);
    expect(await snapshot(factory)).toEqual(before);
  });

  it("@req DATA-002 the store has no way to change or remove an attempt", async () => {
    const { store } = await setUp();
    const names = Object.keys(store).filter((name) => /attempt/iu.test(name));
    expect(names.toSorted()).toEqual(["appendAttempt", "getAttempts"]);
  });

  it("@req DATA-002 appending returns the new state of the exercise", async () => {
    const { store } = await setUp();
    const first = attemptOf(1, { "1": "ok", "2": "ok" });
    const second = attemptOf(2, { "1": "bad", "2": "ok" });

    await store.appendAttempt(first);
    const state = await store.appendAttempt(second);

    expect(state).toEqual(deriveExercise([first, second]));
    expect(state.done).toBe(true);
    expect(state.verdicts).toEqual({ "1": "bad", "2": "ok" });
  });
});

const cached = async (factory: IDBFactory) =>
  (await snapshot(factory))["derived"] as DerivedRecord[];

describe("the cached state of an exercise", () => {
  const attempts = [
    attemptOf(1, { "1": "bad", "2": "near" }),
    attemptOf(2, { "1": "ok", "2": "ok" }),
    attemptOf(3, { "1": "ok", "2": "bad" }),
  ];

  async function withAttempts() {
    const context = await setUp();
    for (const attempt of attempts) await context.store.appendAttempt(attempt);
    return context;
  }

  it("@req DATA-003 is written with each attempt and matches the whole log", async () => {
    const { factory, store } = await withAttempts();

    expect(await cached(factory)).toEqual([
      {
        pack: "test-pack",
        exercise: "1.1",
        derivation: DERIVATION,
        count: 3,
        lastId: attempts[2]!.id,
        lastAt: attempts[2]!.at,
        state: deriveExercise(attempts),
      },
    ]);
    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(deriveExercise(attempts));
  });

  it("@req DATA-003 a missing cache is rebuilt from the log and written again", async () => {
    const { factory, store } = await withAttempts();
    const before = await cached(factory);
    await changeCache(factory, (derived) => derived.clear());

    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(deriveExercise(attempts));
    expect(await cached(factory)).toEqual(before);
  });

  it("@req DATA-003 a stale cache, built from fewer attempts than the log holds, is rebuilt", async () => {
    const { factory, store } = await withAttempts();
    const stale: DerivedRecord = {
      pack: "test-pack",
      exercise: "1.1",
      derivation: DERIVATION,
      count: 1,
      lastId: attempts[0]!.id,
      lastAt: attempts[0]!.at,
      state: deriveExercise(attempts.slice(0, 1)),
    };
    await changeCache(factory, (derived) => derived.put(stale));

    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(deriveExercise(attempts));
    expect((await cached(factory))[0]?.count).toBe(3);
  });

  it("@req DATA-003 a stale cache is rebuilt when the next attempt is appended", async () => {
    const { factory, store } = await withAttempts();
    await changeCache(factory, (derived) =>
      derived.put({
        pack: "test-pack",
        exercise: "1.1",
        derivation: DERIVATION,
        count: 2,
        lastId: attempts[1]!.id,
        lastAt: attempts[1]!.at,
        state: emptyExerciseState,
      }),
    );
    const next = attemptOf(4, { "2": "ok" });

    expect(await store.appendAttempt(next)).toEqual(deriveExercise([...attempts, next]));
  });

  it("@req DATA-003 a corrupt cache, whose last attempt is not in the log, is rebuilt", async () => {
    const { factory, store } = await withAttempts();
    await changeCache(factory, (derived) =>
      derived.put({
        pack: "test-pack",
        exercise: "1.1",
        derivation: DERIVATION,
        count: 3,
        lastId: "00000000-0000-4000-8000-0000000000ff",
        lastAt: attempts[2]!.at,
        state: emptyExerciseState,
      }),
    );

    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(deriveExercise(attempts));
  });

  it("@req DATA-003 a cache of another derivation, though it matches the log, is rebuilt", async () => {
    const { factory, store } = await withAttempts();
    const [record] = await cached(factory);
    await changeCache(factory, (derived) =>
      derived.put({ ...record!, derivation: DERIVATION - 1, state: emptyExerciseState }),
    );

    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(deriveExercise(attempts));
    expect(await cached(factory)).toEqual([record]);
  });

  it("@req DATA-003 an override appended through the store takes the completion back, and its undo gives it back", async () => {
    const { store } = await setUp();
    const complete = attemptOf(1, { "1": "ok", "2": "ok" });
    const overrideOf = (n: number, overridden: Record<string, "ok" | "bad">, done: boolean) =>
      newAttempt({
        id: `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`,
        at: `2026-11-13T10:00:0${n}.000Z`,
        pack: { id: "test-pack", version: "1.0.0" },
        exercise: "1.1",
        action: "override",
        answers: {},
        results: {},
        corrects: complete.id,
        overridden,
        complete: done,
      });
    await store.appendAttempt(complete);

    expect((await store.appendAttempt(overrideOf(2, { "1": "bad" }, false))).done).toBe(false);
    expect((await store.appendAttempt(overrideOf(3, {}, true))).done).toBe(true);
    expect((await store.getExerciseState("test-pack", "1.1")).doneAt).toBe(complete.at);
  });

  it("@req DATA-003 an attempt earlier than the cached last one rebuilds the state in time order", async () => {
    const { store } = await setUp();
    const late = attemptOf(50, { "1": "ok" });
    const early = attemptOf(10, { "1": "bad" });
    await store.appendAttempt(late);

    expect(await store.appendAttempt(early)).toEqual(deriveExercise([early, late]));
    expect((await store.getExerciseState("test-pack", "1.1")).verdicts).toEqual({ "1": "ok" });
  });

  it("@req DATA-003 the states of several exercises are read together, in their order, a missing cache rebuilt", async () => {
    const { factory, store } = await withAttempts();
    const before = await cached(factory);
    await changeCache(factory, (derived) => derived.clear());

    expect(await store.getExerciseStates("test-pack", ["9.9", "1.1"])).toEqual([
      emptyExerciseState,
      deriveExercise(attempts),
    ]);
    expect(await cached(factory)).toEqual(before);
    expect(await store.getExerciseStates("test-pack", [])).toEqual([]);
  });

  it("@req DATA-003 an exercise with no attempt has the empty state, and nothing is cached", async () => {
    const { factory, store } = await setUp();

    expect(await store.getExerciseState("test-pack", "9.9")).toEqual(emptyExerciseState);
    expect(await cached(factory)).toEqual([]);
  });
});

describe("failed writes", () => {
  it("@req DATA-004 all or nothing: when the cached state cannot be written, the attempt is not in the log", async () => {
    const { factory, store } = await setUp();
    const first = attemptOf(1, { "1": "bad" });
    await store.appendAttempt(first);
    const before = await snapshot(factory);
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
      this: IDBObjectStore,
      ...args
    ) {
      if (this.name === "derived")
        throw new DOMException("The disk is full.", "QuotaExceededError");
      return put.apply(this, args);
    });

    await expect(store.appendAttempt(attemptOf(2, { "1": "ok" }))).rejects.toThrow(
      new StorageError("quota"),
    );

    expect(await snapshot(factory)).toEqual(before);
    vi.restoreAllMocks();
    expect(await store.getAttempts("test-pack", "1.1")).toEqual([first]);
    expect(await store.getExerciseState("test-pack", "1.1")).toEqual(deriveExercise([first]));
  });

  it("@req DATA-004 packs are put all or none", async () => {
    const { store } = await setUp();
    const broken = { ...packOf("second"), title: () => "cannot be stored" };

    await expect(store.putPacks([packOf("first"), broken as never])).rejects.toThrow(
      new StorageError("failed"),
    );
    expect(await store.getPacks()).toEqual([]);
  });

  it("@req DATA-004 after another tab has replaced the database, every function refuses with newer-version", async () => {
    const factory = freshFactory();
    const replaced = vi.fn<() => void>();
    const store = await openStore({ factory, onVersionChange: replaced });

    (await rawOpen(factory, 2)).close();

    expect(replaced).toHaveBeenCalledOnce();
    await expect(store.getPacks()).rejects.toThrow(new StorageError("newer-version"));
    await expect(store.putPacks([packOf("first")])).rejects.toThrow(
      new StorageError("newer-version"),
    );
  });
});

/** A fresh database whose connections are recorded as they are opened. */
function recordedFactory() {
  const factory = freshFactory();
  const open = factory.open.bind(factory);
  const connections: IDBOpenDBRequest[] = [];
  vi.spyOn(factory, "open").mockImplementation((name, version) => {
    const request = open(name, version);
    connections.push(request);
    return request;
  });
  return { factory, connection: (index: number) => connections[index]!.result };
}

describe("a connection the browser closes", () => {
  it("@req DATA-004 is noticed by its close event: the store refuses, and a store opened again keeps the write", async () => {
    const { factory, connection } = recordedFactory();
    const closed = vi.fn<() => void>();
    const store = await openStore({ factory, onClose: closed });

    // fake-indexeddb types the connection it takes wrongly.
    forceCloseDatabase(connection(0) as never);

    expect(closed).toHaveBeenCalledOnce();
    await expect(store.putPacks([packOf("first")])).rejects.toMatchObject({
      kind: "failed",
      connectionClosed: true,
    });
    const again = await openStore({ factory });
    await again.putPacks([packOf("first")]);
    expect(await again.getPacks()).toEqual([packOf("first")]);
  });

  it("@req DATA-004 is noticed by a write refused on it, before any close event", async () => {
    const { factory, connection } = recordedFactory();
    const closed = vi.fn<() => void>();
    const store = await openStore({ factory, onClose: closed });

    connection(0).close();

    await expect(store.putPacks([packOf("first")])).rejects.toMatchObject({
      kind: "failed",
      connectionClosed: true,
      cause: expect.objectContaining({ name: "InvalidStateError" }),
    });
    expect(closed).toHaveBeenCalledOnce();
    await expect(store.getPacks()).rejects.toMatchObject({ connectionClosed: true });
    expect(closed).toHaveBeenCalledOnce();
  });
});

describe("packs, drafts and settings", () => {
  it("@req DATA-001 packs are kept and a pack put again replaces the one with its id", async () => {
    const { store } = await setUp();

    await store.putPacks([packOf("first"), packOf("second")]);
    await store.putPacks([packOf("first", "1.1.0")]);

    expect(await store.getPacks()).toEqual([packOf("first", "1.1.0"), packOf("second")]);
  });

  it("@req DATA-001 a draft is kept until it is removed, apart from the log", async () => {
    const { store } = await setUp();
    const draft = { pack: "test-pack", exercise: "1.1", answers: { "1": "boxes" } };

    await store.putDraft(draft);
    expect(await store.getDraft("test-pack", "1.1")).toEqual(draft);
    await store.putDraft({ ...draft, answers: { "1": "boxes", "2": "cites" } });
    expect((await store.getDraft("test-pack", "1.1"))?.answers).toEqual({
      "1": "boxes",
      "2": "cites",
    });
    await store.deleteDraft("test-pack", "1.1");
    expect(await store.getDraft("test-pack", "1.1")).toBeUndefined();
    expect(await store.getAttempts("test-pack", "1.1")).toEqual([]);
  });

  it("@req DATA-001 settings are kept by name", async () => {
    const { store } = await setUp();

    expect(await store.getSetting("theme")).toBeUndefined();
    await store.putSetting("theme", "dark");
    await store.putSetting("focusTopic", "2");

    expect(await store.getSetting("theme")).toBe("dark");
    expect(await store.getSetting("focusTopic")).toBe("2");
  });

  it("@req DATA-001 what is kept is there when the database is opened again", async () => {
    const { factory, store } = await setUp();
    const attempt = attemptOf(1, { "1": "ok", "2": "ok" });
    await store.putPacks([packOf("first")]);
    await store.appendAttempt(attempt);
    await store.putSetting("theme", "light");
    store.close();

    const again = await openStore({ factory });

    expect(await again.getPacks()).toEqual([packOf("first")]);
    expect(await again.getAttempts("test-pack", "1.1")).toEqual([attempt]);
    expect(await again.getSetting("theme")).toBe("light");
  });
});
