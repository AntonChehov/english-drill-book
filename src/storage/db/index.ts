// The store of the learner's data: the only way into IndexedDB (C-08, design D1 of `storage`).

export { StorageError, type StorageErrorKind } from "./errors";
export { SCHEMA_VERSION } from "./schema";
export { openStore, type Draft, type Settings, type Store, type StoreOptions } from "./store";
