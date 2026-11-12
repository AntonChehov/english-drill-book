// Lines of a page from the runs of text a PDF library reports (design D3).

import type { Line } from "./types";

/** A piece of text drawn in one go: where it starts, how wide it is and its font size. */
export interface TextRun {
  readonly text: string;
  readonly x: number;
  /** Baseline, from the top of the page. */
  readonly y: number;
  readonly width: number;
  readonly size: number;
}

/** Runs whose baselines differ by at most this many points are on one line. */
export const LINE_TOLERANCE = 1;

/** A gap wider than this share of the font size between two runs is a space. */
export const SPACE_GAP = 0.15;

const WHITESPACE = /\s+/gu;

const blank = (run: TextRun) => run.text.trim().length === 0;

/**
 * Groups runs into lines, top to bottom, and joins the runs of a line from left to right, with a
 * space where the gap between two runs is wide enough or a run of white space lies between them.
 * A line's size is the largest of its runs, its `x` and `y` those of its first run that is not
 * white space; a line of white space only is left out.
 */
export function linesFromRuns(runs: readonly TextRun[]): Line[] {
  const sorted = runs
    .filter((run) => run.text.length > 0)
    .toSorted((a, b) => a.y - b.y || a.x - b.x);

  const groups: TextRun[][] = [];
  for (const run of sorted) {
    const group = groups.at(-1);
    if (group !== undefined && Math.abs(run.y - group[0]!.y) <= LINE_TOLERANCE) group.push(run);
    else groups.push([run]);
  }

  const lines: Line[] = [];
  for (const group of groups) {
    const ordered = group.toSorted((a, b) => a.x - b.x);
    const printed = ordered.filter((run) => !blank(run));
    const first = printed[0];
    if (first === undefined) continue;
    let text = "";
    let end = Number.NEGATIVE_INFINITY;
    for (const run of ordered) {
      if (text.length > 0 && run.x - end > SPACE_GAP * run.size) text += " ";
      text += run.text;
      end = Math.max(end, run.x + run.width);
    }
    lines.push({
      text: text.replace(WHITESPACE, " ").trim(),
      x: first.x,
      y: first.y,
      size: Math.max(...printed.map((run) => run.size)),
    });
  }
  return lines;
}
