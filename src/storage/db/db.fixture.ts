// Helpers of the storage tests: databases in memory (fake-indexeddb), fixtures of earlier schema
// versions, the shape of a schema, and a version 2 that exists only in tests (design D5).

import { IDBFactory } from "fake-indexeddb";
import { newAttempt, type Attempt } from "../../domain/progress";
import type { Pack } from "../../domain/packs/types";
import { DATABASE_NAME, MIGRATIONS } from "./schema";
import type { Migration } from "./idb";
import version1 from "./fixtures/version-1.json";

/** A database as an earlier version of the app wrote it. */
export interface DatabaseFixture {
  readonly version: number;
  readonly stores: Readonly<
    Record<
      string,
      {
        readonly keyPath: string | string[];
        readonly indexes: Readonly<Record<string, string | string[]>>;
        readonly records: readonly unknown[];
      }
    >
  >;
}

/** The fixture of every earlier schema version, by version (C-05). */
export const fixtures: readonly DatabaseFixture[] = [version1 as DatabaseFixture];

/** A fresh, empty IndexedDB for one test. */
export const freshFactory = () => new IDBFactory();

/**
 * Writes `fixture` into `factory` as its version of the app would have: the stores and indexes
 * the fixture describes, then its records. It uses none of the app's migrations, so a later
 * change of them cannot make the fixture agree with itself.
 */
export function loadFixture(
  factory: IDBFactory,
  fixture: DatabaseFixture,
  name = DATABASE_NAME,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, fixture.version);
    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      for (const [store, { keyPath, indexes, records }] of Object.entries(fixture.stores)) {
        const created = database.createObjectStore(store, { keyPath });
        for (const [index, path] of Object.entries(indexes)) created.createIndex(index, path);
        for (const record of records) created.add(record);
      }
    });
    request.addEventListener("success", () => {
      request.result.close();
      resolve();
    });
    request.addEventListener("error", () => reject(request.error));
  });
}

/** The stores of an open database with their key paths and indexes, in the fixtures' shape. */
export function schemaOf(database: IDBDatabase) {
  const names = [...database.objectStoreNames];
  const transaction = database.transaction(names, "readonly");
  return Object.fromEntries(
    names.map((name) => {
      const store = transaction.objectStore(name);
      const indexes = Object.fromEntries(
        [...store.indexNames].map((index) => [index, store.index(index).keyPath]),
      );
      return [name, { keyPath: store.keyPath, indexes }];
    }),
  );
}

/** Everything in every store of an open database, by store. */
export async function contentsOf(database: IDBDatabase): Promise<Record<string, unknown[]>> {
  const names = [...database.objectStoreNames];
  const transaction = database.transaction(names, "readonly");
  const entries = await Promise.all(
    names.map(
      (name) =>
        new Promise<[string, unknown[]]>((resolve, reject) => {
          const request = transaction.objectStore(name).getAll();
          request.addEventListener("success", () => resolve([name, request.result]));
          request.addEventListener("error", () => reject(request.error));
        }),
    ),
  );
  return Object.fromEntries(entries);
}

/** Everything in every store of the database, read through a connection closed afterwards. */
export async function snapshot(factory: IDBFactory): Promise<Record<string, unknown[]>> {
  const database = await rawOpen(factory);
  try {
    return await contentsOf(database);
  } finally {
    database.close();
  }
}

/** Opens a database without the store, to look at it; the caller closes it. */
export function rawOpen(factory: IDBFactory, version?: number, name = DATABASE_NAME) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(name, version);
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

/**
 * A version 2 for tests only: it proves the harness with a migration that adds a store and an
 * index and rewrites data. The app never ships it.
 */
export const testVersion2: Migration = (database, transaction) => {
  database.createObjectStore("days", { keyPath: "day" });
  const attempts = transaction.objectStore("attempts");
  attempts.createIndex("action", "action");
  const settings = transaction.objectStore("settings");
  const cursor = settings.openCursor();
  cursor.addEventListener("success", () => {
    const current = cursor.result;
    if (current === null) return;
    current.update({ ...(current.value as object), migrated: 2 });
    current.continue();
  });
};

export const migrationsWithVersion2 = [...MIGRATIONS, testVersion2];

/** A version 2 that fails halfway, after it has changed the schema and the data. */
export const failingVersion2: Migration = (database, transaction) => {
  testVersion2(database, transaction);
  throw new Error("The test migration fails here");
};

/** An invented pack with one exercise of two items. */
export const packOf = (id: string, version = "1.0.0"): Pack => ({
  kind: "pack",
  schemaVersion: 1,
  id,
  version,
  title: `Pack ${id}`,
  language: "en",
  original: true,
  units: [
    {
      id: "1",
      title: "Plurals",
      exercises: [
        {
          id: "1.1",
          type: "items",
          task: "Write the plural.",
          items: [
            { id: "1", prompt: "one box, two ___", accept: ["boxes"] },
            { id: "2", prompt: "one city, two ___", accept: ["cities"] },
          ],
        },
      ],
    },
  ],
});

/** The `n`-th attempt at exercise 1.1 of `pack`, `n` seconds after a fixed moment. */
export function attemptOf(
  n: number,
  results: Record<string, "ok" | "near" | "bad">,
  pack = "test-pack",
  exercise = "1.1",
): Attempt {
  const seconds = String(n % 60).padStart(2, "0");
  const minutes = String(Math.floor(n / 60)).padStart(2, "0");
  return newAttempt({
    id: `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`,
    at: `2026-11-13T10:${minutes}:${seconds}.000Z`,
    pack: { id: pack, version: "1.0.0" },
    exercise,
    action: "check",
    answers: Object.fromEntries(Object.keys(results).map((item) => [item, `answer ${n}`])),
    results,
    complete: Object.values(results).every((verdict) => verdict === "ok"),
  });
}
