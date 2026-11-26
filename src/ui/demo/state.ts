// The demo books of the start screen. The state lives in memory and survives going to another view
// and back; what survives a reload is the packs in the store, which the start screen reads when it
// opens.

import { shallowRef } from "vue";
import type { UnreadableBook } from "../../domain/books/demo/kept";
import type { Pack } from "../../domain/packs/types";

export interface DemoUnitSummary {
  readonly id: string;
  readonly title: string;
  /** The ids of the unit's exercises, in book order. */
  readonly exercises: readonly string[];
}

export interface DemoBookSummary {
  readonly id: string;
  readonly title: string;
  readonly units: readonly DemoUnitSummary[];
}

export type DemoState =
  /** The store is being read; shown as `idle`, and the button already works. */
  | { readonly phase: "loading" }
  | { readonly phase: "idle" }
  /** `retry` when an earlier attempt failed, so the button keeps saying so. */
  | { readonly phase: "reading"; readonly message: string; readonly retry: boolean }
  /** The books are stored: only then are they shown as added. */
  | { readonly phase: "added"; readonly books: readonly DemoBookSummary[] }
  /**
   * Adding failed. `packs` when the books were read and could not be kept: trying again only
   * stores them.
   */
  | { readonly phase: "failed"; readonly message: string; readonly packs?: readonly Pack[] };

export const demoState = shallowRef<DemoState>({ phase: "loading" });

/**
 * The demo books stored while they are not all usable: those that read, as cards, and those whose
 * stored pack fails validation, whose cards say so. Empty when the demo is whole or not stored.
 */
export const partialDemo = shallowRef<{
  readonly books: readonly DemoBookSummary[];
  readonly unreadable: readonly UnreadableBook[];
}>({ books: [], unreadable: [] });

/** What the start screen lists of the demo packs. */
export function summaryOf(packs: readonly Pack[]): DemoBookSummary[] {
  return packs.map((pack) => ({
    id: pack.id,
    title: pack.title,
    units: pack.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      exercises: unit.exercises.map((exercise) => exercise.id),
    })),
  }));
}
