// A built-in study program as the app reads it (contracts/program.schema.json). Only the fields the
// app uses are typed; CI checks the whole file.

export interface Topic {
  /** Unique in the program; the focus names a topic by it. */
  readonly id: string;
  readonly title: string;
  readonly level: string;
  /** The unit of a lead book that teaches the topic. */
  readonly lead: { readonly pack: string; readonly unit: string };
  /** Exercises of supplementary books that drill it. */
  readonly supplements: readonly { readonly pack: string; readonly exercise: string }[];
}

export interface Program {
  /** Level names, lowest first. */
  readonly scale: readonly string[];
  readonly goal: { readonly from: string; readonly to: string };
  readonly rules: {
    readonly levelThreshold: number;
    readonly plusThreshold: number;
    readonly supplementMin: number;
  };
  readonly topics: readonly Topic[];
  /** The checklist of the day: activities outside the app. */
  readonly dailyBlocks: readonly { readonly id: string; readonly title: string }[];
}
