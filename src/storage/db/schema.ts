// The schema of the database and its migrations (design D1, D5 of the change `storage`). The
// schema version is IndexedDB's own version of the database. A migration, once released, is never
// changed: data of every earlier version is upgraded by running the migrations after it in turn,
// and a fixture of every earlier version proves it (C-05).

import type { Migration } from "./idb";

export const DATABASE_NAME = "english-drill-book";

/** The stores of version 1. */
export const STORES = {
  /** The attempt log: added to, never changed (DATA-002). Key `id`. */
  attempts: "attempts",
  /** The cached state of an exercise, rebuilt from the log when it does not match (DATA-003). */
  derived: "derived",
  /** Answers typed and not yet checked. Key `[pack, exercise]`. */
  drafts: "drafts",
  /** Packs, validated before they are put and again when read. Key `id`. */
  packs: "packs",
  /** Theme and later settings. Key `name`. */
  settings: "settings",
} as const;

/** The indexes of the attempt log. */
export const INDEXES = {
  /** The attempts of one exercise: `[pack, exercise]`. */
  exercise: "exercise",
  /** The whole log in time order. */
  at: "at",
} as const;

/** Version 1: the five stores. */
const version1: Migration = (database) => {
  const attempts = database.createObjectStore(STORES.attempts, { keyPath: "id" });
  attempts.createIndex(INDEXES.exercise, ["pack", "exercise"]);
  attempts.createIndex(INDEXES.at, "at");
  database.createObjectStore(STORES.derived, { keyPath: ["pack", "exercise"] });
  database.createObjectStore(STORES.drafts, { keyPath: ["pack", "exercise"] });
  database.createObjectStore(STORES.packs, { keyPath: "id" });
  database.createObjectStore(STORES.settings, { keyPath: "name" });
};

/** `MIGRATIONS[n]` upgrades from version `n − 1` to `n`. */
export const MIGRATIONS: readonly (Migration | undefined)[] = [undefined, version1];

/** The version of the schema this build of the app writes. */
export const SCHEMA_VERSION = MIGRATIONS.length - 1;
