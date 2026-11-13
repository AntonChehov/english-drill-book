// The store of the learner's data (capability `progress-data`, design D1 – D6 of the change
// `storage`): packs, the attempt log with the cached state of each exercise, drafts and settings,
// behind functions that hide IndexedDB from the screens. Attempts are only ever added (D2); an
// attempt and the state derived with it are written in one transaction (D3); every function
// settles when its transaction has committed or not, and rejects with a `StorageError` (D4).

import type { Pack } from "../../domain/packs/types";
import {
  compareAttempts,
  DERIVATION,
  deriveExercise,
  emptyExerciseState,
  type Attempt,
  type ExerciseState,
} from "../../domain/progress";
import { StorageError } from "./errors";
import { openDatabase, transact, type Migration, type Transaction } from "./idb";
import { DATABASE_NAME, INDEXES, MIGRATIONS, STORES } from "./schema";

/** Answers typed into an exercise and not yet checked; they may change at any time. */
export interface Draft {
  readonly pack: string;
  readonly exercise: string;
  readonly answers: Readonly<Record<string, string>>;
}

/** The settings, as `settings` of contracts/export.schema.json. */
export interface Settings {
  readonly theme: "system" | "light" | "dark";
  readonly activeProgram: string;
  readonly focusTopic: string;
}

/**
 * The cached state of an exercise and what it was built from: how many attempts and the last of
 * them in time order. A record that does not match the log is rebuilt from it (design D3).
 */
export interface DerivedRecord {
  readonly pack: string;
  readonly exercise: string;
  /** `DERIVATION` of the code that built it; a record of another derivation is rebuilt. */
  readonly derivation: number;
  readonly count: number;
  readonly lastId: string;
  readonly lastAt: string;
  readonly state: ExerciseState;
}

export interface Store {
  /** Every stored pack, as stored: the caller validates each before it uses it (design D7). */
  getPacks(): Promise<unknown[]>;
  /** Puts the packs, replacing those with the same id, all or none. */
  putPacks(packs: readonly Pack[]): Promise<void>;
  /**
   * Adds an attempt to the log and returns the exercise's new state, written with it in the same
   * transaction. An attempt whose `id` is in the log already is refused and nothing changes.
   */
  appendAttempt(attempt: Attempt): Promise<ExerciseState>;
  /** The attempts of an exercise in time order. */
  getAttempts(pack: string, exercise: string): Promise<Attempt[]>;
  /** The state of an exercise; a cached state that is missing or stale is rebuilt and kept. */
  getExerciseState(pack: string, exercise: string): Promise<ExerciseState>;
  getDraft(pack: string, exercise: string): Promise<Draft | undefined>;
  putDraft(draft: Draft): Promise<void>;
  deleteDraft(pack: string, exercise: string): Promise<void>;
  getSetting<K extends keyof Settings>(name: K): Promise<Settings[K] | undefined>;
  putSetting<K extends keyof Settings>(name: K, value: Settings[K]): Promise<void>;
  /**
   * Calls `listener` when another tab of the app has written (design D6); returns a function that
   * stops it. Only with the option `channel` and where the browser has `BroadcastChannel`.
   */
  onOtherTabWrite(listener: () => void): () => void;
  close(): void;
}

export interface StoreOptions {
  /** Default: the page's `indexedDB`. */
  readonly factory?: IDBFactory | undefined;
  /** Default: `english-drill-book`. */
  readonly name?: string;
  /** For the tests of migrations only: the app always opens the schema it was built with. */
  readonly migrations?: readonly (Migration | undefined)[];
  /** Another tab opened the database with a newer version; this store is closed (design D5). */
  readonly onVersionChange?: () => void;
  /** The `BroadcastChannel` that tells other tabs of each write (design D6). */
  readonly channel?: string;
}

/** The page's `indexedDB`; reading it throws in some browsers that refuse the site storage. */
function pageFactory(): IDBFactory | undefined {
  try {
    return typeof indexedDB === "undefined" ? undefined : indexedDB;
  } catch {
    return undefined;
  }
}

type Key = [pack: string, exercise: string];

/**
 * Calls `done` with the state of the exercise in `key`, from its cached record when that matches
 * the log and rebuilt from the log otherwise. With `appended`, the attempt just added in this
 * transaction, the state is brought up to date with it and written back.
 */
function currentState(
  tx: Transaction,
  key: Key,
  appended: Attempt | undefined,
  done: (state: ExerciseState) => void,
): void {
  const log = tx.store(STORES.attempts);
  const derived = tx.store(STORES.derived);
  const keep = (count: number, last: Attempt, state: ExerciseState) => {
    const [pack, exercise] = key;
    const record: DerivedRecord = {
      pack,
      exercise,
      count,
      lastId: last.id,
      lastAt: last.at,
      derivation: DERIVATION,
      state,
    };
    derived.put(record);
    done(state);
  };
  const rebuild = () =>
    tx.after(log.index(INDEXES.exercise).getAll(key) as IDBRequest<Attempt[]>, (attempts) => {
      const sorted = attempts.toSorted(compareAttempts);
      const last = sorted.at(-1);
      if (last === undefined) done(emptyExerciseState);
      else keep(sorted.length, last, deriveExercise(sorted));
    });

  tx.after(derived.get(key) as IDBRequest<DerivedRecord | undefined>, (record) => {
    tx.after(log.index(INDEXES.exercise).count(key), (count) => {
      const before = appended === undefined ? count : count - 1;
      if (record === undefined || record.derivation !== DERIVATION || record.count !== before) {
        rebuild();
        return;
      }
      tx.after(log.get(record.lastId) as IDBRequest<Attempt | undefined>, (last) => {
        const matches = last?.pack === key[0] && last.exercise === key[1];
        if (!matches) rebuild();
        else if (appended === undefined) done(record.state);
        else if (compareAttempts({ at: record.lastAt, id: record.lastId }, appended) < 0) {
          keep(count, appended, deriveExercise([appended], record.state));
        } else rebuild();
      });
    });
  });
}

/** Opens the database, upgrading it if it is older, and returns the store. */
export async function openStore(options: StoreOptions = {}): Promise<Store> {
  let replaced = false;
  const database = await openDatabase({
    factory: "factory" in options ? options.factory : pageFactory(),
    name: options.name ?? DATABASE_NAME,
    version: (options.migrations ?? MIGRATIONS).length - 1,
    migrations: options.migrations ?? MIGRATIONS,
    onVersionChange: () => {
      replaced = true;
      options.onVersionChange?.();
    },
  });
  const channel =
    options.channel !== undefined && typeof BroadcastChannel !== "undefined"
      ? new BroadcastChannel(options.channel)
      : undefined;

  function run<T>(
    stores: readonly string[],
    mode: IDBTransactionMode,
    body: (tx: Transaction) => () => T,
  ): Promise<T> {
    if (replaced) return Promise.reject(new StorageError("newer-version"));
    return transact(database, stores, mode, body);
  }

  async function write<T>(
    stores: readonly string[],
    body: (tx: Transaction) => () => T,
  ): Promise<T> {
    const result = await run(stores, "readwrite", body);
    // oxlint-disable-next-line unicorn/require-post-message-target-origin -- a BroadcastChannel has no target origin: it reaches only this origin.
    channel?.postMessage("written");
    return result;
  }

  const getOne = <T>(store: string, key: IDBValidKey) =>
    run([store], "readonly", (tx) => {
      let value: T | undefined;
      tx.after(tx.store(store).get(key) as IDBRequest<T | undefined>, (found) => {
        value = found;
      });
      return () => value;
    });

  return {
    getPacks: () =>
      run([STORES.packs], "readonly", (tx) => {
        let packs: unknown[] = [];
        tx.after(tx.store(STORES.packs).getAll(), (found) => {
          packs = found;
        });
        return () => packs;
      }),

    putPacks: (packs) =>
      write([STORES.packs], (tx) => {
        for (const pack of packs) tx.store(STORES.packs).put(pack);
        return () => undefined;
      }),

    appendAttempt: (attempt) =>
      write([STORES.attempts, STORES.derived], (tx) => {
        let state: ExerciseState = emptyExerciseState;
        // `add`, never `put`: an attempt with an id already in the log is refused (design D2).
        tx.after(tx.store(STORES.attempts).add(attempt), () =>
          currentState(tx, [attempt.pack, attempt.exercise], attempt, (next) => {
            state = next;
          }),
        );
        return () => state;
      }),

    getAttempts: (pack, exercise) =>
      run([STORES.attempts], "readonly", (tx) => {
        let attempts: Attempt[] = [];
        const index = tx.store(STORES.attempts).index(INDEXES.exercise);
        tx.after(index.getAll([pack, exercise]) as IDBRequest<Attempt[]>, (found) => {
          attempts = found.toSorted(compareAttempts);
        });
        return () => attempts;
      }),

    // Read and write: a record that does not match the log is written again.
    getExerciseState: (pack, exercise) =>
      run([STORES.attempts, STORES.derived], "readwrite", (tx) => {
        let state: ExerciseState = emptyExerciseState;
        currentState(tx, [pack, exercise], undefined, (next) => {
          state = next;
        });
        return () => state;
      }),

    getDraft: (pack, exercise) => getOne<Draft>(STORES.drafts, [pack, exercise]),

    putDraft: (draft) =>
      write([STORES.drafts], (tx) => {
        tx.store(STORES.drafts).put(draft);
        return () => undefined;
      }),

    deleteDraft: (pack, exercise) =>
      write([STORES.drafts], (tx) => {
        tx.store(STORES.drafts).delete([pack, exercise]);
        return () => undefined;
      }),

    getSetting: async <K extends keyof Settings>(name: K) =>
      (await getOne<{ name: K; value: Settings[K] }>(STORES.settings, name))?.value,

    putSetting: (name, value) =>
      write([STORES.settings], (tx) => {
        tx.store(STORES.settings).put({ name, value });
        return () => undefined;
      }),

    onOtherTabWrite(listener) {
      if (channel === undefined) return () => undefined;
      const controller = new AbortController();
      channel.addEventListener("message", () => listener(), { signal: controller.signal });
      return () => controller.abort();
    },

    close() {
      channel?.close();
      database.close();
    },
  };
}
