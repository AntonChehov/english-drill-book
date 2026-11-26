// The explanation of a unit: the `theory` of a pack is plain paragraphs separated by a blank line,
// with spans in the language being learned between two `*`. Split here, pure, so that Study only
// shows it.

/** A run of a paragraph: `learned` when it is in the language being learned. */
export interface TheoryRun {
  readonly text: string;
  readonly learned: boolean;
}

/** A paragraph: its runs in order. */
export type TheoryParagraph = readonly TheoryRun[];

/** The runs of one paragraph: a `*` opens a learned span and the next closes it. */
function runsOf(paragraph: string): TheoryParagraph {
  const runs: TheoryRun[] = [];
  const parts = paragraph.split("*");
  // An odd number of parts means every `*` is paired; otherwise the last `*` is unclosed and is
  // shown as it is, as part of the plain text that follows it.
  const paired = parts.length % 2 === 1 ? parts.length : parts.length - 1;
  for (let index = 0; index < paired; index++) {
    const text = parts[index]!;
    if (text.length > 0) runs.push({ text, learned: index % 2 === 1 });
  }
  if (paired < parts.length) {
    const rest = `*${parts[paired]!}`;
    const last = runs.at(-1);
    if (last !== undefined && !last.learned)
      runs[runs.length - 1] = { ...last, learned: false, text: last.text + rest };
    else runs.push({ text: rest, learned: false });
  }
  return runs;
}

/**
 * The paragraphs of a `theory`, each as its runs: plain text and the spans in the language
 * being learned. Paragraphs are separated by a blank line; an empty paragraph is left out; an
 * unclosed `*` is shown literally; an empty text has no paragraphs.
 */
export function theoryParagraphs(text: string): readonly TheoryParagraph[] {
  return text
    .split(/\n[ \t]*\n/u)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map(runsOf);
}
