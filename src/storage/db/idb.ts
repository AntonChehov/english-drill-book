// IndexedDB as promises (design D1 of the change `storage`): opening with migrations, and
// transactions that settle only when IndexedDB says the whole transaction committed or not
// (design D4). The one module, with the store, that touches IndexedDB (C-08).

import { StorageError, storageErrorOf } from "./errors";

/**
 * Upgrades the schema from version `n − 1` to `n` inside the upgrade transaction (design D5).
 * It issues its requests on `transaction` and must not wait for anything else.
 */
export type Migration = (database: IDBDatabase, transaction: IDBTransaction) => void;

export interface OpenOptions {
  /** `indexedDB` of the page, or of fake-indexeddb in tests; missing where the browser has none. */
  readonly factory: IDBFactory | undefined;
  readonly name: string;
  readonly version: number;
  /** `migrations[n]` upgrades from `n − 1` to `n`; index 0 is unused. */
  readonly migrations: readonly (Migration | undefined)[];
  /**
   * Another connection asks to upgrade the database: this one is closed first, so the upgrade is
   * not blocked, and then this is called.
   */
  readonly onVersionChange?: () => void;
}

/** Opens the database, upgrading it in one transaction from whatever older version it has. */
export function openDatabase(options: OpenOptions): Promise<IDBDatabase> {
  const { factory, name, version, migrations } = options;
  return new Promise((resolve, reject) => {
    if (factory === undefined) {
      reject(new StorageError("unavailable"));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = factory.open(name, version);
    } catch (error) {
      reject(storageErrorOf(error, true));
      return;
    }
    let migrationError: unknown;
    request.addEventListener("upgradeneeded", (event) => {
      const database = request.result;
      const transaction = request.transaction!;
      try {
        for (let target = event.oldVersion + 1; target <= version; target++) {
          const migrate = migrations[target];
          if (migrate === undefined) throw new Error(`No migration to version ${target}`);
          migrate(database, transaction);
        }
      } catch (error) {
        migrationError = error;
        transaction.abort();
      }
    });
    request.addEventListener("success", () => {
      const database = request.result;
      database.addEventListener("versionchange", () => {
        database.close();
        options.onVersionChange?.();
      });
      resolve(database);
    });
    request.addEventListener("error", (event) => {
      event.preventDefault();
      reject(
        migrationError === undefined
          ? storageErrorOf(request.error, true)
          : new StorageError("failed", { cause: migrationError }),
      );
    });
  });
}

const noResult = () => undefined;

/** What the body of a transaction works with. */
export interface Transaction {
  readonly transaction: IDBTransaction;
  store(name: string): IDBObjectStore;
  /**
   * Calls `next` with the result of `request` when it succeeds. Whatever `next` throws aborts the
   * transaction, and the transaction's promise rejects with it.
   */
  after<T>(request: IDBRequest<T>, next: (result: T) => void): void;
}

/**
 * Runs `body` in one transaction over `stores`. `body` issues its requests and returns a function
 * that gives the result; the promise resolves with that result on the transaction's `complete`,
 * never on a request's success, and rejects with a `StorageError` when the transaction aborts,
 * so that nothing is reported as kept that was not committed.
 */
export function transact<T>(
  database: IDBDatabase,
  stores: readonly string[],
  mode: IDBTransactionMode,
  body: (tx: Transaction) => () => T,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    try {
      transaction = database.transaction(stores, mode);
    } catch (error) {
      reject(storageErrorOf(error));
      return;
    }
    let failure: unknown;
    const abort = (error: unknown) => {
      failure ??= error;
      try {
        transaction.abort();
      } catch {
        // The transaction has already finished or aborted on its own.
      }
    };
    const tx: Transaction = {
      transaction,
      store: (name) => transaction.objectStore(name),
      after(request, next) {
        request.addEventListener("success", () => {
          try {
            next(request.result);
          } catch (error) {
            abort(error);
          }
        });
      },
    };
    let result = noResult as () => T;
    try {
      result = body(tx);
    } catch (error) {
      abort(error);
    }
    transaction.addEventListener("error", (event) => {
      failure ??= (event.target as IDBRequest | null)?.error ?? transaction.error;
    });
    transaction.addEventListener("abort", () => {
      reject(storageErrorOf(failure ?? transaction.error));
    });
    transaction.addEventListener("complete", () => {
      try {
        resolve(result());
      } catch (error) {
        reject(storageErrorOf(error));
      }
    });
  });
}
