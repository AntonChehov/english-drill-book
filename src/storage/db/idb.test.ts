import { IDBObjectStore } from "fake-indexeddb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { contentsOf, freshFactory, packOf, rawOpen } from "./db.fixture";
import { StorageError, storageErrorOf } from "./errors";
import { openDatabase, transact } from "./idb";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";
import { openStore } from "./store";

afterEach(() => {
  vi.restoreAllMocks();
});

const open = (factory = freshFactory()) =>
  openDatabase({ factory, name: "test", version: SCHEMA_VERSION, migrations: MIGRATIONS });

describe("transactions as promises", () => {
  it("@req DATA-004 a write resolves on the transaction's complete, not on its request's success", async () => {
    const database = await open();
    const events: string[] = [];

    const written = transact(database, ["packs"], "readwrite", (tx) => {
      tx.transaction.addEventListener("complete", () => events.push("complete"));
      const request = tx.store("packs").put(packOf("first"));
      request.addEventListener("success", () => events.push("success"));
      return () => "result";
    });
    await expect(written.then((result) => events.push(`resolved ${result}`))).resolves.toBe(3);
    expect(events).toEqual(["success", "complete", "resolved result"]);
  });

  it("@req DATA-004 a transaction aborted after every request succeeded rejects and keeps nothing", async () => {
    const database = await open();

    const written = transact(database, ["packs"], "readwrite", (tx) => {
      tx.after(tx.store("packs").put(packOf("first")), () => {
        tx.after(tx.store("packs").put(packOf("second")), () => tx.transaction.abort());
      });
      return () => "kept";
    });

    await expect(written).rejects.toThrow(new StorageError("failed"));
    expect((await contentsOf(database))["packs"]).toEqual([]);
  });

  it("@req DATA-004 what the body throws aborts the transaction and is the cause of the rejection", async () => {
    const database = await open();
    const thrown = new Error("the body fails");

    const synchronous = transact(database, ["packs"], "readwrite", (tx) => {
      tx.store("packs").put(packOf("first"));
      throw thrown;
    });
    const later = transact(database, ["packs"], "readwrite", (tx) => {
      tx.after(tx.store("packs").put(packOf("second")), () => {
        throw thrown;
      });
      return () => undefined;
    });

    await expect(synchronous).rejects.toMatchObject({ kind: "failed", cause: thrown });
    await expect(later).rejects.toMatchObject({ kind: "failed", cause: thrown });
    expect((await contentsOf(database))["packs"]).toEqual([]);
  });

  it("@req DATA-004 a request that fails rejects with its error as the cause", async () => {
    const database = await open();

    const written = transact(database, ["packs"], "readwrite", (tx) => {
      tx.store("packs").add(packOf("first"));
      tx.store("packs").add(packOf("first"));
      return () => undefined;
    });

    await expect(written).rejects.toMatchObject({
      kind: "failed",
      cause: expect.objectContaining({ name: "ConstraintError" }),
    });
    expect((await contentsOf(database))["packs"]).toEqual([]);
  });

  it("@req DATA-004 a full disk is the kind quota", async () => {
    const database = await open();
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
    });

    const written = transact(database, ["packs"], "readwrite", (tx) => {
      tx.store("packs").put(packOf("first"));
      return () => undefined;
    });

    await expect(written).rejects.toThrow(new StorageError("quota"));
  });

  it("@req DATA-004 a transaction on a closed connection is refused", async () => {
    const database = await open();
    database.close();

    await expect(transact(database, ["packs"], "readonly", () => () => 1)).rejects.toThrow(
      new StorageError("failed"),
    );
  });

  it("@req DATA-004 a result that cannot be given after the commit rejects", async () => {
    const database = await open();
    const failure = new Error("no result");

    const read = transact(database, ["packs"], "readonly", () => () => {
      throw failure;
    });

    await expect(read).rejects.toMatchObject({ kind: "failed", cause: failure });
  });

  it("@req DATA-004 a body that aborts the transaction itself and then throws rejects once, with what it threw", async () => {
    const database = await open();
    const thrown = new Error("after the abort");

    const written = transact(database, ["packs"], "readwrite", (tx) => {
      tx.after(tx.store("packs").put(packOf("first")), () => {
        tx.transaction.abort();
        throw thrown;
      });
      return () => undefined;
    });

    await expect(written).rejects.toMatchObject({ kind: "failed", cause: thrown });
  });
});

describe("the kinds of storage failure", () => {
  it("@req DATA-004 no IndexedDB at all is the kind unavailable", async () => {
    await expect(openStore({ factory: undefined })).rejects.toThrow(
      new StorageError("unavailable"),
    );
  });

  it("@req DATA-004 a browser that refuses to open storage is the kind unavailable", async () => {
    const factory = freshFactory();
    vi.spyOn(factory, "open").mockImplementation(() => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    });

    await expect(openStore({ factory })).rejects.toThrow(new StorageError("unavailable"));
  });

  it("@req DATA-004 an open request that fails is the kind unavailable", async () => {
    const factory = freshFactory();
    const request = {
      error: new DOMException("Something went wrong.", "UnknownError"),
      listeners: {} as Record<string, (event: Event) => void>,
      addEventListener(type: string, listener: (event: Event) => void) {
        this.listeners[type] = listener;
      },
    };
    vi.spyOn(factory, "open").mockImplementation(() => {
      setTimeout(() => request.listeners["error"]?.(new Event("error")));
      return request as unknown as IDBOpenDBRequest;
    });

    await expect(openStore({ factory })).rejects.toThrow(new StorageError("unavailable"));
  });

  it("@req DATA-004 data of a newer version is the kind newer-version", async () => {
    const factory = freshFactory();
    (await rawOpen(factory, SCHEMA_VERSION + 1)).close();

    await expect(openStore({ factory })).rejects.toThrow(new StorageError("newer-version"));
  });

  it("@req DATA-004 a write that fails for another reason is the kind failed", async () => {
    const store = await openStore({ factory: freshFactory() });
    const pack = packOf("first") as unknown as { units: unknown[] };
    pack.units.push(() => "a function cannot be stored");

    await expect(store.putPacks([pack as never])).rejects.toThrow(new StorageError("failed"));
    await expect(store.getPacks()).resolves.toEqual([]);
  });

  it("@req DATA-004 keeps a StorageError as it is and names what is not a DOMException", () => {
    const error = new StorageError("quota");
    expect(storageErrorOf(error)).toBe(error);
    expect(storageErrorOf(new DOMException("No.", "SecurityError")).kind).toBe("unavailable");
    expect(storageErrorOf("text").kind).toBe("failed");
    expect(storageErrorOf({ name: 42 }).kind).toBe("failed");
    expect(storageErrorOf(null, true).kind).toBe("unavailable");
  });
});
