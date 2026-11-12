// Key patterns (CHK-001, CHK-002; design D2).

/** Why a pattern cannot be used (CHK-002). */
export type PatternErrorReason =
  "unclosed-group" | "nested-group" | "stray-character" | "dangling-slash" | "too-many-variants";

export type Expansion =
  | { readonly ok: true; readonly variants: readonly string[] }
  | { readonly ok: false; readonly error: PatternErrorReason };

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

/**
 * Expands a pattern into its variants, without duplicates, in the order they are produced.
 * Loose alternatives are resolved first, from left to right, then groups are expanded.
 * An invalid pattern gives its reason instead; nothing is thrown.
 */
export function expandPattern(pattern: string): Expansion {
  const parsed = parse(pattern);
  if (!parsed.ok) return parsed;

  // Each loose alternative yields at least two candidates and each candidate at least one
  // variant, so twelve of them (4096) are over the limit before anything is expanded.
  const slashes = parsed.tokens.filter((token) => token === SLASH).length;
  if (2 ** slashes > MAX_VARIANTS) return { ok: false, error: "too-many-variants" };

  let produced = 0;
  const variants = new Set<string>();

  const expandGroups = (words: readonly Word[]): boolean => {
    const parts: Segment[] = [];
    for (const [index, word] of words.entries()) {
      if (index > 0) parts.push(" ");
      parts.push(...word);
    }
    // Counted before anything is built: the product bounds the work as well as the result.
    produced += parts.reduce(
      (count, part) => count * (typeof part === "string" ? 1 : part.length),
      1,
    );
    if (produced > MAX_VARIANTS) return false;
    // The leftmost group changes slowest, so variants come in the order of the pattern.
    let built = [""];
    for (const part of parts) {
      built =
        typeof part === "string"
          ? built.map((prefix) => prefix + part)
          : built.flatMap((prefix) => part.map((alternative) => prefix + alternative));
    }
    for (const variant of built) variants.add(variant.replace(/\s+/gu, " ").trim());
    return true;
  };

  const resolve = (tokens: readonly Token[]): boolean => {
    const slash = tokens.indexOf(SLASH);
    if (slash < 0) return expandGroups(tokens as readonly Word[]);
    const following = tokens.indexOf(SLASH, slash + 1);
    const end = following < 0 ? tokens.length : following;
    const left = Math.min(MAX_SIDE, slash);
    const right = Math.min(MAX_SIDE, end - slash - 1);
    // Each distinct candidate once: the left side with the first j words after the slash
    // dropped, then the right side with the last i words before it dropped.
    for (let j = 1; j <= right; j += 1) {
      if (!resolve([...tokens.slice(0, slash), ...tokens.slice(slash + 1 + j)])) return false;
    }
    for (let i = 1; i <= left; i += 1) {
      if (!resolve([...tokens.slice(0, slash - i), ...tokens.slice(slash + 1)])) return false;
    }
    return true;
  };

  if (!resolve(parsed.tokens)) return { ok: false, error: "too-many-variants" };
  return { ok: true, variants: [...variants] };
}
