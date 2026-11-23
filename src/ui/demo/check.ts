// Whether the demo books are stored (design D7 of `storage`), shared by the start screen and
// Topics, which can be the first screen opened (design D3 of `topics-and-checklist`).

import { getStore, noteStorageFailure } from "../storage";
import { demoState, summaryOf, type DemoState } from "./state";

let checking = false;
const phaseNow = (): DemoState["phase"] => demoState.value.phase;

/**
 * Shows the demo as added exactly when its packs are stored, on start and whenever another tab may
 * have changed the store (design D6 of `storage`): a demo shown as added whose packs are gone, as
 * when the site's data was cleared, is shown as not added. On start, stored packs that cannot be
 * used are passed to `readAgain`, which the start screen gives to read them again from the PDFs;
 * without it the state stays `loading`, so that the start screen still does so when it opens.
 * Nothing changes while the books are being added.
 */
export async function checkDemo(readAgain?: () => Promise<void>): Promise<void> {
  const phase = demoState.value.phase;
  if (checking || phase === "reading") return;
  const starting = phase === "loading";
  checking = true;
  try {
    const stored = await (await getStore()).getPacks();
    // The validator is loaded only when there is something to validate.
    const kept =
      stored.length === 0
        ? ({ kind: "none" } as const)
        : (await import("../../domain/books/demo/kept")).keptDemo(stored);
    // Read again: the visitor may have added the demo while the store was read.
    const now = phaseNow();
    if (now === "reading") return;
    if (kept.kind === "kept") {
      if (now !== "added") demoState.value = { phase: "added", books: summaryOf(kept.packs) };
    } else if (kept.kind === "stale" && starting) {
      checking = false;
      await readAgain?.();
    } else if (now === "loading" || now === "added") demoState.value = { phase: "idle" };
  } catch (error) {
    // Nothing kept can be read: the demo can still be added, and says so if it cannot be kept.
    noteStorageFailure(error);
    if (demoState.value.phase === "loading") demoState.value = { phase: "idle" };
  } finally {
    checking = false;
  }
}
