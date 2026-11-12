// Key patterns (CHK-001, CHK-002; design D2).

/** Why a pattern cannot be used (CHK-002). */
export type PatternErrorReason =
  | "pattern-too-long"
  | "unclosed-group"
  | "nested-group"
  | "stray-character"
  | "dangling-slash"
  | "too-many-variants";

export type Expansion =
  | {
      readonly ok: true;
      /** The variants without duplicates, in the order they are first produced. */
      readonly variants: readonly string[];
      /** How many times each variant was produced, duplicates included (CHK-002, D4). */
      readonly produced: readonly number[];
    }
  | { readonly ok: false; readonly error: PatternErrorReason };

/** The longest pattern, in characters (code points): the `maxLength` of a pattern in a pack. */
export const MAX_PATTERN_LENGTH = 500;

/** Whether a text has more than `MAX_PATTERN_LENGTH` code points, without reading a long one. */
function isTooLong(pattern: string): boolean {
  if (pattern.length <= MAX_PATTERN_LENGTH) return false;
  // A code point is one or two UTF-16 units, so twice the limit is too long whatever it holds.
  return pattern.length > 2 * MAX_PATTERN_LENGTH || [...pattern].length > MAX_PATTERN_LENGTH;
}

/** The most variants a valid pattern may expand to, counted before duplicates are removed. */
export const MAX_VARIANTS = 4000;

/** The most words a side of a loose alternative may cover. */
const MAX_SIDE = 4;

/** Text, or the alternatives of a group: `(x)` is `["x", ""]`, `[a|b]` is `["a", "b"]`. */
type Segment = string | readonly string[];
type Word = readonly Segment[];
const SLASH = "slash";
type Token = Word | typeof SLASH;

type Parsed =
  | { readonly ok: true; readonly tokens: readonly Token[] }
  | { readonly ok: false; readonly error: PatternErrorReason };

const WHITE_SPACE = /\s/u;
// White space other than one space between words: two together, at an end, or not a space.
const UNTIDY = /\s\s|^\s|\s$|[^\S ]/u;

function isSpacedSlashIn(text: string): boolean {
  return text.split(/\s+/u).includes("/");
}

function parse(pattern: string): Parsed {
  const tokens: Token[] = [];
  let segments: Segment[] = [];
  let text = "";
  let group: { readonly round: boolean; readonly alternatives: string[]; current: string } | null =
    null;

  const endWord = (): void => {
    if (text !== "") segments.push(text);
    text = "";
    if (segments.length === 0) return;
    tokens.push(segments.length === 1 && segments[0] === "/" ? SLASH : segments);
    segments = [];
  };

  for (const character of pattern) {
    if (group !== null) {
      if (character === "(" || character === "[") return { ok: false, error: "nested-group" };
      const closes = character === (group.round ? ")" : "]");
      if ((closes || (character === "|" && !group.round)) && isSpacedSlashIn(group.current)) {
        // A loose alternative cannot stand inside a group, and a spaced slash is no text.
        return { ok: false, error: "stray-character" };
      }
      if (closes) {
        group.alternatives.push(group.current);
        if (group.round) group.alternatives.push("");
        segments.push(group.alternatives);
        group = null;
      } else if (character === ")" || character === "]" || (character === "|" && group.round)) {
        return { ok: false, error: "stray-character" };
      } else if (character === "|") {
        group.alternatives.push(group.current);
        group.current = "";
      } else {
        group.current += character;
      }
    } else if (character === "(" || character === "[") {
      if (text !== "") segments.push(text);
      text = "";
      group = { round: character === "(", alternatives: [], current: "" };
    } else if (character === ")" || character === "]" || character === "|") {
      return { ok: false, error: "stray-character" };
    } else if (WHITE_SPACE.test(character)) {
      endWord();
    } else {
      text += character;
    }
  }
  if (group !== null) return { ok: false, error: "unclosed-group" };
  endWord();

  for (const [index, token] of tokens.entries()) {
    if (token !== SLASH) continue;
    const before = tokens[index - 1];
    const after = tokens[index + 1];
    if (before === undefined || before === SLASH || after === undefined || after === SLASH) {
      return { ok: false, error: "dangling-slash" };
    }
  }
  return { ok: true, tokens };
}

/** The variants of a candidate: the product of the sizes of its groups. */
function countOf(words: readonly Word[]): number {
  let count = 1;
  for (const word of words) {
    for (const segment of word) if (typeof segment !== "string") count *= segment.length;
  }
  return count;
}

/**
 * Resolves the loose alternatives of `tokens` from left to right (design D2) and passes each
 * candidate, a list of words without slashes, to `leaf`; stops as soon as `leaf` returns false.
 */
function resolve(tokens: readonly Token[], leaf: (words: readonly Word[]) => boolean): boolean {
  const slash = tokens.indexOf(SLASH);
  if (slash < 0) return leaf(tokens as readonly Word[]);
  const following = tokens.indexOf(SLASH, slash + 1);
  const end = following < 0 ? tokens.length : following;
  const left = Math.min(MAX_SIDE, slash);
  const right = Math.min(MAX_SIDE, end - slash - 1);
  // Each distinct candidate once: the left side with the first j words after the slash
  // dropped, then the right side with the last i words before it dropped.
  for (let j = 1; j <= right; j += 1) {
    if (!resolve([...tokens.slice(0, slash), ...tokens.slice(slash + 1 + j)], leaf)) return false;
  }
  for (let i = 1; i <= left; i += 1) {
    if (!resolve([...tokens.slice(0, slash - i), ...tokens.slice(slash + 1)], leaf)) return false;
  }
  return true;
}

/**
 * Expands a pattern into its variants, without duplicates, in the order they are produced.
 * Loose alternatives are resolved first, from left to right, then groups are expanded.
 * An invalid pattern gives its reason instead; nothing is thrown.
 */
export function expandPattern(pattern: string): Expansion {
  if (isTooLong(pattern)) return { ok: false, error: "pattern-too-long" };
  const parsed = parse(pattern);
  if (!parsed.ok) return parsed;

  // Every candidate keeps at least one word before each later slash, so the slash before a
  // segment of R words gives at least 1 + min(4, R) candidates, each with at least one variant:
  // their product is a lower bound of the count, checked before anything is resolved.
  let lowest = 1;
  for (const [index, token] of parsed.tokens.entries()) {
    if (token !== SLASH) continue;
    const following = parsed.tokens.indexOf(SLASH, index + 1);
    const end = following < 0 ? parsed.tokens.length : following;
    lowest *= 1 + Math.min(MAX_SIDE, end - index - 1);
  }
  if (lowest > MAX_VARIANTS) return { ok: false, error: "too-many-variants" };

  // First the candidates are only counted, so a pattern over the limit builds nothing.
  let produced = 0;
  const counted = resolve(parsed.tokens, (words) => {
    produced += countOf(words);
    return produced <= MAX_VARIANTS;
  });
  if (!counted) return { ok: false, error: "too-many-variants" };

  const variants = new Map<string, number>();
  resolve(parsed.tokens, (words) => {
    // Text next to text is joined first, so each variant is built from few pieces.
    const parts: Segment[] = [];
    const add = (segment: Segment): void => {
      const previous = parts.at(-1);
      if (typeof segment === "string" && typeof previous === "string") {
        parts[parts.length - 1] = previous + segment;
      } else {
        parts.push(segment);
      }
    };
    for (const [index, word] of words.entries()) {
      if (index > 0) add(" ");
      for (const segment of word) add(segment);
    }
    // The leftmost group changes slowest, so variants come in the order of the pattern.
    let built = [""];
    for (const part of parts) {
      built =
        typeof part === "string"
          ? built.map((prefix) => prefix + part)
          : built.flatMap((prefix) => part.map((alternative) => prefix + alternative));
    }
    for (const variant of built) {
      const tidy = UNTIDY.test(variant) ? variant.replace(/\s+/gu, " ").trim() : variant;
      variants.set(tidy, (variants.get(tidy) ?? 0) + 1);
    }
    return true;
  });
  return { ok: true, variants: [...variants.keys()], produced: [...variants.values()] };
}
