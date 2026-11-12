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

const WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u;
const WHITE_SPACE = /\s/u;

/**
 * Step 3 of CHK-003, second half: removes the apostrophes that work as single quotation marks.
 * One between two letters or digits is always kept. One after a letter or digit and before
 * anything else closes an open quote, or is kept as the apostrophe of a plural possessive
 * (`the boys' room`) when no quote is open. One after anything else opens a quote when a letter
 * or digit follows, closes one when white space or the end follows, and between punctuation
 * (`'...yes'`) closes an open quote or else opens one. Every quotation mark is removed.
 */
function removeSingleQuotes(text: string): string {
  if (!text.includes("'")) return text;
  const characters = [...text];
  let open = 0;
  let result = "";
  for (const [index, character] of characters.entries()) {
    if (character !== "'") {
      result += character;
      continue;
    }
    const next = characters[index + 1] ?? "";
    const afterWord = WORD_CHARACTER.test(characters[index - 1] ?? "");
    const beforeWord = WORD_CHARACTER.test(next);
    if (afterWord) {
      if (beforeWord || open === 0) result += character;
      else open -= 1;
    } else if (beforeWord) {
      open += 1;
    } else if (next === "" || WHITE_SPACE.test(next)) {
      open = Math.max(0, open - 1);
    } else {
      open += open > 0 ? -1 : 1;
    }
  }
  return result;
}

/** Steps 1 – 4 of CHK-003, on the text with its spaces. */
function prepare(text: string): string {
  const marks = text
    .normalize("NFC")
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(APOSTROPHES, "'")
    .replace(QUOTES, '"')
    .replaceAll("…", "...");
  return removeSingleQuotes(marks).replace(
    CONTRACTION,
    (match) => CONTRACTIONS.get(match) ?? match,
  );
}

/**
 * A stretch of a text, read once however many readings it takes part in: its kept characters
 * (step 6 of CHK-003) and its runs between white space, of which only the first and the last
 * can join a neighbouring stretch. `single` is a stretch of one run, which is then both.
 */
interface Part {
  readonly kept: string;
  readonly single: boolean;
  /** Whether the first run keeps a character. */
  readonly first: boolean;
  /** The runs between the first and the last that keep a character: whole words. */
  readonly inner: number;
  /** Whether the last run keeps a character. */
  readonly last: boolean;
}

const KEPT_ANY = new RegExp(KEPT, "u");

function part(text: string): Part {
  const keeps = text.split(/\s+/u).map((run) => KEPT_ANY.test(run));
  return {
    kept: text.match(KEPT_CHARACTER)?.join("") ?? "",
    single: keeps.length === 1,
    first: keeps[0] === true,
    inner: keeps.slice(1, -1).filter(Boolean).length,
    last: keeps.at(-1) === true,
  };
}

const EMPTY = part("");

/** Two stretches written one after the other: where they meet, their runs are one word. */
function join(a: Part, b: Part): Part {
  const kept = a.kept + b.kept;
  if (a.single && b.single) {
    const keeps = a.first || b.first;
    return { kept, single: true, first: keeps, inner: 0, last: keeps };
  }
  if (a.single)
    return { kept, single: false, first: a.first || b.first, inner: b.inner, last: b.last };
  if (b.single)
    return { kept, single: false, first: a.first, inner: a.inner, last: a.last || b.first };
  const middle = a.last || b.first ? 1 : 0;
  return { kept, single: false, first: a.first, inner: a.inner + middle + b.inner, last: b.last };
}

function read(stretch: Part): Reading {
  const ends = stretch.single
    ? Number(stretch.first)
    : Number(stretch.first) + Number(stretch.last);
  return { text: stretch.kept, words: stretch.inner + ends };
}

const S_PARTS = S_READINGS.map(part);
const D_PARTS = D_READINGS.map(part);

/**
 * Every reading of a text after normalisation (CHK-003). `'s` is read three ways and `'d` two,
 * independently for the first four occurrences; each later one takes the reading of the fourth.
 * At most 81 readings, without duplicates. The text after the fourth occurrence is joined once
 * for each reading of the fourth, so the work of a reading does not grow with the occurrences.
 */
export function readings(text: string): readonly Reading[] {
  const prepared = prepare(text);
  const fixed: Part[] = [];
  const kinds: (typeof S_PARTS)[] = [];
  let at = 0;
  for (const match of prepared.matchAll(S_OR_D)) {
    fixed.push(part(prepared.slice(at, match.index)));
    kinds.push(match[1] === "s" ? S_PARTS : D_PARTS);
    at = match.index + match[0].length;
  }
  fixed.push(part(prepared.slice(at)));

  // The beginnings up to the fourth occurrence, each with the form chosen last.
  let beginnings: { readonly stretch: Part; readonly chosen: number }[] = [
    { stretch: fixed[0] ?? EMPTY, chosen: 0 },
  ];
  const independent = Math.min(INDEPENDENT_READINGS, kinds.length);
  for (let index = 0; index < independent; index += 1) {
    const forms = kinds[index] ?? [];
    const after = fixed[index + 1] ?? EMPTY;
    beginnings = beginnings.flatMap(({ stretch }) =>
      forms.map((form, chosen) => ({ stretch: join(join(stretch, form), after), chosen })),
    );
  }

  // The rest, once for each form of the fourth: later occurrences take the same form.
  const rests = [0, 1, 2].map((chosen) => {
    let rest = EMPTY;
    for (let index = independent; index < kinds.length; index += 1) {
      const forms = kinds[index] ?? [];
      const form = forms[Math.min(chosen, forms.length - 1)] ?? EMPTY;
      rest = join(join(rest, form), fixed[index + 1] ?? EMPTY);
    }
    return rest;
  });

  const found = new Map<string, Reading>();
  for (const { stretch, chosen } of beginnings) {
    const reading = read(join(stretch, rests[chosen] ?? EMPTY));
    found.set(`${reading.words}:${reading.text}`, reading);
  }
  return [...found.values()];
}
