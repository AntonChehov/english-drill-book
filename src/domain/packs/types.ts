// A content pack as `contracts/pack.schema.json` describes it, format 1.

export interface PageRef {
  /** A role from `source.documents`. */
  readonly document: string;
  readonly from: number;
  readonly to: number;
}

export interface PackDocument {
  readonly role: string;
  readonly title?: string;
  readonly sha256: string;
  readonly pages: number;
}

export interface PackSource {
  readonly title: string;
  readonly authors?: readonly string[];
  readonly publisher?: string;
  readonly edition: string;
  readonly year?: number;
  readonly isbn?: string;
  readonly documents?: readonly PackDocument[];
}

export interface Migration {
  readonly fromMajor: number;
  readonly exercises: Readonly<Record<string, string>>;
  readonly items?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export interface Item {
  readonly id: string;
  readonly prompt?: string;
  /** Key patterns (CHK-001). */
  readonly accept: readonly string[];
  readonly choices?: readonly string[];
}

export interface ItemsExercise {
  readonly id: string;
  readonly type: "items";
  readonly task: string;
  readonly pages?: readonly PageRef[];
  readonly items: readonly Item[];
}

export interface TextExercise {
  readonly id: string;
  readonly type: "text";
  readonly task: string;
  readonly pages?: readonly PageRef[];
  readonly prompt?: string;
  readonly model: string;
}

export interface OpenExercise {
  readonly id: string;
  readonly type: "open";
  readonly task: string;
  readonly pages?: readonly PageRef[];
  readonly prompt?: string;
  readonly sample?: string;
}

export type Exercise = ItemsExercise | TextExercise | OpenExercise;

export interface Unit {
  readonly id: string;
  readonly title: string;
  /** Markdown, safe subset (PACK-007). */
  readonly theory?: string;
  readonly pages?: readonly PageRef[];
  readonly exercises: readonly Exercise[];
}

export interface Pack {
  readonly kind: "pack";
  readonly schemaVersion: 1;
  readonly id: string;
  readonly version: string;
  readonly title: string;
  readonly language: string;
  readonly instructionLanguage?: string;
  readonly original: boolean;
  readonly license?: string;
  readonly source?: PackSource;
  readonly migrations?: readonly Migration[];
  readonly units: readonly Unit[];
}
