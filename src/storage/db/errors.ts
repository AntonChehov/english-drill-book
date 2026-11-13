// The failures of the store (DATA-004, design D4 of the change `storage`). Every function of the
// store rejects with a `StorageError` of one of these kinds; the screens say each in Russian.

export type StorageErrorKind =
  /** No IndexedDB, or the browser refuses this site storage (settings, some private windows). */
  | "unavailable"
  /** The browser has no room left for this site. */
  | "quota"
  /** The data was written by a newer version of the app; nothing was read or written. */
  | "newer-version"
  /** Anything else: the write was refused and nothing of it was kept. */
  | "failed";

export class StorageError extends Error {
  constructor(
    readonly kind: StorageErrorKind,
    options?: { cause?: unknown },
  ) {
    super(`Storage ${kind}`, options);
    this.name = "StorageError";
  }
}

/** The name of a DOMException or of an error shaped like one. */
function nameOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("name" in error)) return undefined;
  return typeof error.name === "string" ? error.name : undefined;
}

/**
 * The `StorageError` of what IndexedDB threw or reported. `opening` says it happened while the
 * database was opened, where any refusal but a newer version or a full disk means the browser
 * does not let this site keep data.
 */
export function storageErrorOf(error: unknown, opening = false): StorageError {
  if (error instanceof StorageError) return error;
  const name = nameOf(error);
  const cause = { cause: error };
  if (name === "QuotaExceededError") return new StorageError("quota", cause);
  if (name === "VersionError") return new StorageError("newer-version", cause);
  if (opening || name === "SecurityError") return new StorageError("unavailable", cause);
  return new StorageError("failed", cause);
}
