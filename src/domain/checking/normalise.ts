// Normalisation of answers and variants (CHK-003, CHK-004; design D3).

/** One way of reading a text: its kept characters without spaces, and its number of words. */
export interface Reading {
  readonly text: string;
  readonly words: number;
}

/** The occurrences of `'s` and `'d` read independently; later ones follow the fourth. */
export const INDEPENDENT_READINGS = 4;

// Kept characters: letters of the Latin and Cyrillic scripts, the digits 0-9, the apostrophe.
const KEPT = String.raw`(?:(?=\p{L})[\p{Script=Latin}\p{Script=Cyrillic}]|[0-9'])`;
const KEPT_CHARACTER = new RegExp(KEPT, "gu");

// Typographic apostrophes and quotes, written as escapes because several look alike.
const APOSTROPHES = /[\u2018\u2019\u201A\u201B\u02BC\u2032\u0060\u00B4]/gu;
const QUOTES = /[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033]/gu;

const CONTRACTIONS: ReadonlyMap<string, string> = new Map([
  ["won't", "will not"],
  ["can't", "can not"],
  ["cannot", "can not"],
  ["shan't", "shall not"],
  ["n't", " not"],
  ["'m", " am"],
  ["'re", " are"],
  ["'ve", " have"],
  ["'ll", " will"],
]);
// Contractions are matched at the end of a word only; the whole-word ones also at its start.
const CONTRACTION = new RegExp(
  String.raw`(?<!${KEPT})(?:won't|can't|cannot|shan't)(?!${KEPT})|(?:n't|'m|'re|'ve|'ll)(?!${KEPT})`,
  "gu",
);
const S_OR_D = new RegExp(String.raw`'([sd])(?!${KEPT})`, "gu");

// The readings of `'s` and `'d`, in an order that pairs them: is/would, has/had.
const S_READINGS = [" is", " has", "'s"] as const;
const D_READINGS = [" would", " had"] as const;

/** Steps 1 – 4 of CHK-003, on the text with its spaces. */
function prepare(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(APOSTROPHES, "'")
    .replace(QUOTES, '"')
    .replaceAll("…", "...")
    .replace(CONTRACTION, (match) => CONTRACTIONS.get(match) ?? match);
}

/** Step 6 of CHK-003: the kept characters of each word, and the number of words left. */
function read(text: string): Reading {
  const pieces = text
    .split(/\s+/u)
    .map((piece) => piece.match(KEPT_CHARACTER)?.join("") ?? "")
    .filter((piece) => piece !== "");
  return { text: pieces.join(""), words: pieces.length };
}

/**
 * Every reading of a text after normalisation (CHK-003). `'s` is read three ways and `'d` two,
 * independently for the first four occurrences; each later one takes the reading of the fourth.
 * At most 81 readings, without duplicates.
 */
export function readings(text: string): readonly Reading[] {
  const prepared = prepare(text);
  const fixed: string[] = [];
  const kinds: (typeof S_READINGS | typeof D_READINGS)[] = [];
  let last = 0;
  for (const match of prepared.matchAll(S_OR_D)) {
    fixed.push(prepared.slice(last, match.index));
    kinds.push(match[1] === "s" ? S_READINGS : D_READINGS);
    last = match.index + match[0].length;
  }
  fixed.push(prepared.slice(last));

  const independent = kinds.slice(0, INDEPENDENT_READINGS);
  let choices: number[][] = [[]];
  for (const kind of independent) {
    choices = choices.flatMap((chosen) => kind.map((_, index) => [...chosen, index]));
  }

  const found = new Map<string, Reading>();
  for (const chosen of choices) {
    const fourth = chosen.at(-1) ?? 0;
    let combined = fixed[0] ?? "";
    for (const [index, kind] of kinds.entries()) {
      const choice = chosen[index] ?? Math.min(fourth, kind.length - 1);
      combined += (kind[choice] ?? "") + (fixed[index + 1] ?? "");
    }
    const reading = read(combined);
    found.set(`${reading.words}:${reading.text}`, reading);
  }
  return [...found.values()];
}
