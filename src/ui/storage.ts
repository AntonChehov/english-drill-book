// The app's one connection to the store (design D4 – D6 of the change `storage`), opened when the
// app starts, and the state the whole app shows when the data belongs to a newer version.

import { shallowRef } from "vue";
import { openStore, StorageError, type Store } from "../storage/db";

/**
 * The data in this browser was written by a newer version of the app, found on opening or because
 * a newer tab upgraded it: the app shows only the message that says so, and writes nothing (D5).
 */
export const newerVersion = shallowRef(false);

/** Tells other tabs of the app of each write (design D6). */
const channel = "english-drill-book";

let opening: Promise<Store> | undefined;

/** Notes a failure that means the data belongs to a newer version of the app. */
export function noteStorageFailure(error: unknown): void {
  if (error instanceof StorageError && error.kind === "newer-version") newerVersion.value = true;
}

/**
 * The store, opened on first use. Neither a failure to open nor a connection the browser closed
 * (the site's data cleared, a disk failure) is remembered: the next call opens the database
 * again, so a visitor can retry without reloading (DATA-004).
 */
export function getStore(): Promise<Store> {
  opening ??= openStore({
    channel,
    onVersionChange: () => {
      opening = undefined;
      newerVersion.value = true;
    },
    onClose: () => {
      opening = undefined;
    },
  }).catch((error: unknown) => {
    opening = undefined;
    noteStorageFailure(error);
    throw error;
  });
  return opening;
}

/**
 * Calls `listener` when what is stored may have been changed by another tab: when this page
 * becomes visible or its window gains focus, and at once when another tab says it wrote (D6).
 * Returns a function that stops it.
 */
export function onStoredDataChange(listener: () => void): () => void {
  const controller = new AbortController();
  const { signal } = controller;
  let stopChannel: (() => void) | undefined;
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible") listener();
    },
    { signal },
  );
  window.addEventListener("focus", listener, { signal });
  getStore().then(
    (store) => {
      if (!signal.aborted) stopChannel = store.onOtherTabWrite(listener);
    },
    () => undefined,
  );
  return () => {
    controller.abort();
    stopChannel?.();
  };
}
