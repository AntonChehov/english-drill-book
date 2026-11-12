// The demo books added in this visit (design D8). The state lives in memory: it survives going
// to another view and back, and a reload starts again from the button. Slice 1.4 keeps packs.

import { shallowRef } from "vue";

export interface DemoUnitSummary {
  readonly id: string;
  readonly title: string;
  readonly exercises: number;
}

export interface DemoBookSummary {
  readonly id: string;
  readonly title: string;
  readonly units: readonly DemoUnitSummary[];
}

export type DemoState =
  | { readonly phase: "idle" }
  /** `retry` when an earlier attempt failed, so the button keeps saying so. */
  | { readonly phase: "reading"; readonly message: string; readonly retry: boolean }
  | { readonly phase: "added"; readonly books: readonly DemoBookSummary[] }
  | { readonly phase: "failed"; readonly message: string };

export const demoState = shallowRef<DemoState>({ phase: "idle" });
