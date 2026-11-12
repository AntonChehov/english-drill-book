#!/usr/bin/env node
// Lays out the demo books as PDFs (design D2 of the change `demo-books`). Reads demo/<book>.json,
// writes public/demo/<book>.pdf and demo/<book>.pack.json, the pack the reader must find in it.
// The layout is the one demo/LAYOUT.md states; the reader in src/domain/books/demo relies on it.
// The same source gives the same bytes: standard fonts, fixed metadata, no clock.
// Usage: node scripts/build-demo-books.mjs (`pnpm demo:build`, which also updates the text
// extracted from the PDFs that the reader's tests read).
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { isMain } from "./common.mjs";

export const books = ["course", "drills"];

/** The role of the one document of a demo pack (`source.documents`). */
export const documentRole = "book";

/** Font sizes the reader relies on (demo/LAYOUT.md). */
export const sizes = { heading: 18, task: 11, body: 10.5 };

// A4 in points.
const page = { width: 595.28, height: 841.89 };
const margin = { left: 64, right: 64, top: 64, bottom: 80 };
const contentWidth = page.width - margin.left - margin.right;
const lowest = page.height - margin.bottom;

const colour = {
  text: rgb(0.11, 0.12, 0.15),
  muted: rgb(0.4, 0.43, 0.48),
  accent: rgb(0.1, 0.32, 0.56),
  tint: rgb(0.92, 0.95, 0.99),
  tintBorder: rgb(0.71, 0.79, 0.9),
  note: rgb(1, 0.96, 0.87),
  noteBorder: rgb(0.89, 0.73, 0.42),
  white: rgb(1, 1, 1),
  rule: rgb(0.78, 0.8, 0.84),
};

/** Columns of an exercise: number, then text. Answers in the key start at `answer`. */
const column = { item: margin.left + 6, prompt: margin.left + 24, answer: margin.left + 40 };

const fixedDate = (year) => new Date(Date.UTC(year, 0, 1, 0, 0, 0));

/**
 * A page being laid out: text runs and shapes in top-down coordinates, drawn at the end.
 * Each text run may carry the unit and exercise it belongs to, from which page ranges come.
 */
class Layout {
  constructor(fonts) {
    this.fonts = fonts;
    this.pages = [];
    this.y = 0;
  }

  get current() {
    return this.pages.at(-1);
  }

  get pageNumber() {
    return this.pages.length;
  }

  newPage() {
    this.pages.push({ texts: [], shapes: [], footnote: undefined });
    this.y = margin.top;
  }

  /** Starts a new page unless `height` more points fit on this one. */
  ensure(height) {
    if (this.y + height > lowest) {
      this.newPage();
      return true;
    }
    return false;
  }

  width(text, font, size) {
    return this.fonts[font].widthOfTextAtSize(text, size);
  }

  /** A run of text with its baseline at `baseline` (top-down). */
  text(text, { x, baseline, size, font = "regular", color = colour.text, owner }) {
    this.current.texts.push({ text, x, baseline, size, font, color, owner });
  }

  shape(shape) {
    this.current.shapes.push(shape);
  }

  /**
   * Splits words into lines no wider than `width`. Words are `{ text, font }`; a word marked
   * `glue` stays on the line of the word before it.
   */
  wrap(words, size, width) {
    const lines = [];
    let line = [];
    let used = 0;
    const space = (font) => this.width(" ", font, size);
    for (const word of words) {
      const wordWidth = this.width(word.text, word.font, size);
      const gap = line.length === 0 ? 0 : (word.gap ?? space(word.font));
      if (line.length > 0 && used + gap + wordWidth > width && !word.glue) {
        lines.push(line);
        line = [];
        used = 0;
      }
      const before = line.length === 0 ? 0 : gap;
      line.push({ ...word, offset: used + before });
      used += before + wordWidth;
    }
    if (line.length > 0) lines.push(line);
    return lines;
  }

  /** Draws one wrapped line, merging neighbouring words of one font into one run. */
  drawLine(line, { x, baseline, size, color, owner }) {
    let run;
    for (const word of line) {
      const joinable =
        run &&
        run.font === word.font &&
        word.gap === undefined &&
        Math.abs(run.end + this.width(" ", word.font, size) - word.offset) < 0.01;
      if (joinable) {
        run.text += ` ${word.text}`;
      } else {
        if (run)
          this.text(run.text, { x: x + run.x, baseline, size, font: run.font, color, owner });
        run = { text: word.text, font: word.font, x: word.offset };
      }
      run.end = word.offset + this.width(word.text, word.font, size);
    }
    if (run) this.text(run.text, { x: x + run.x, baseline, size, font: run.font, color, owner });
  }
}

const words = (text, font = "regular") =>
  text
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) => ({ text: word, font }));

/** A paragraph in the body size, wrapped to `width`, starting at the current position. */
function paragraph(
  layout,
  text,
  {
    x = margin.left,
    width = contentWidth,
    font = "regular",
    leading = 15,
    size = sizes.body,
    color,
    owner,
  } = {},
) {
  const lines = layout.wrap(words(text, font), size, width);
  for (const line of lines) {
    layout.drawLine(line, { x, baseline: layout.y + size, size, color, owner });
    layout.y += leading;
  }
  return lines.length;
}

function unitHeading(layout, number, title, owner) {
  const label = `Unit ${number}`;
  const baseline = layout.y + sizes.heading;
  layout.text(label, {
    x: margin.left,
    baseline,
    size: sizes.heading,
    font: "bold",
    color: colour.accent,
    owner,
  });
  const titleX = margin.left + layout.width(label, "bold", sizes.heading) + 14;
  layout.text(title, { x: titleX, baseline, size: sizes.heading, font: "bold", owner });
  layout.shape({
    kind: "line",
    x1: margin.left,
    y1: baseline + 9,
    x2: page.width - margin.right,
    y2: baseline + 9,
    thickness: 1.5,
    color: colour.accent,
  });
  layout.y = baseline + 30;
}

function sectionHeading(layout, text) {
  const size = 14;
  layout.text(text, {
    x: margin.left,
    baseline: layout.y + size,
    size,
    font: "bold",
    color: colour.accent,
  });
  layout.y += size + 16;
}

/** Fonts of the columns of a rule: the subject, the form of the verb, an example. */
const fontOf = (cellIndex) => (cellIndex === 1 ? "bold" : cellIndex === 2 ? "italic" : "regular");

/** The table of a rule in a tinted box with a title. */
function ruleBox(layout, block) {
  const size = sizes.body;
  const rowHeight = 18;
  const height = 30 + block.rows.length * rowHeight + 6;
  layout.ensure(height + 10);
  const top = layout.y;
  layout.shape({
    kind: "rect",
    x: margin.left,
    y: top,
    width: contentWidth,
    height,
    fill: colour.tint,
    border: colour.tintBorder,
  });
  layout.text(block.title, {
    x: margin.left + 12,
    baseline: top + 19,
    size: 11,
    font: "bold",
    color: colour.accent,
  });
  const columns = [margin.left + 12];
  for (let cellIndex = 0; cellIndex < 2; cellIndex++) {
    const widest = Math.max(
      ...block.rows.map((row) => layout.width(row[cellIndex], fontOf(cellIndex), size)),
    );
    columns.push(columns[cellIndex] + widest + 24);
  }
  block.rows.forEach((row, index) => {
    const baseline = top + 30 + index * rowHeight + size;
    row.forEach((cell, cellIndex) => {
      const end = columns[cellIndex] + layout.width(cell, fontOf(cellIndex), size);
      if (end > page.width - margin.right - 12) {
        throw new Error(`The rule "${block.title}" is too wide at "${cell}".`);
      }
      layout.text(cell, { x: columns[cellIndex], baseline, size, font: fontOf(cellIndex) });
    });
    if (index > 0) {
      const y = top + 30 + index * rowHeight - 3;
      layout.shape({
        kind: "line",
        x1: margin.left + 12,
        y1: y,
        x2: page.width - margin.right - 12,
        y2: y,
        thickness: 0.5,
        color: colour.tintBorder,
      });
    }
  });
  layout.y = top + height + 14;
}

function noteBox(layout, block) {
  const size = sizes.body;
  const inner = contentWidth - 24;
  const lines = layout.wrap(words(block.text), size, inner);
  const height = 28 + lines.length * 15 + 4;
  layout.ensure(height + 10);
  const top = layout.y;
  layout.shape({
    kind: "rect",
    x: margin.left,
    y: top,
    width: contentWidth,
    height,
    fill: colour.note,
    border: colour.noteBorder,
  });
  layout.text(block.title, { x: margin.left + 12, baseline: top + 18, size: 11, font: "bold" });
  lines.forEach((line, index) => {
    layout.drawLine(line, { x: margin.left + 12, baseline: top + 28 + index * 15 + size, size });
  });
  layout.y = top + height + 14;
}

function examples(layout, block) {
  layout.ensure(block.lines.length * 15 + 8);
  for (const line of block.lines) {
    const baseline = layout.y + sizes.body;
    layout.text("•", { x: margin.left + 10, baseline, size: sizes.body, color: colour.accent });
    layout.text(line, { x: margin.left + 22, baseline, size: sizes.body, font: "italic" });
    layout.y += 15;
  }
  layout.y += 8;
}

function explanation(layout, blocks) {
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
        layout.ensure(30);
        paragraph(layout, block.text);
        layout.y += 8;
        break;
      case "rule":
        ruleBox(layout, block);
        break;
      case "examples":
        examples(layout, block);
        break;
      case "note":
        noteBox(layout, block);
        break;
      default:
        throw new Error(`Unknown block type ${block.type}`);
    }
  }
}

const itemLeading = 17;

/** The lines of an item: the prompt wrapped beside its number, choices after it in brackets. */
function itemLines(layout, item) {
  const prompt = words(item.prompt);
  if (item.choices) {
    const choices = words(`[${item.choices.join(" / ")}]`, "bold");
    choices[0] = { ...choices[0], gap: 12 };
    prompt.push(...choices);
  }
  return layout.wrap(prompt, sizes.body, page.width - margin.right - column.prompt);
}

function exerciseHeading(layout, exercise, owner) {
  const size = sizes.task;
  const numberWidth = layout.width(exercise.id, "bold", size);
  const taskX = margin.left + Math.max(numberWidth + 10, 30);
  const lines = layout.wrap(words(exercise.task, "bold"), size, page.width - margin.right - taskX);
  layout.text(exercise.id, {
    x: margin.left,
    baseline: layout.y + size,
    size,
    font: "bold",
    color: colour.accent,
    owner,
  });
  for (const line of lines) {
    layout.drawLine(line, { x: taskX, baseline: layout.y + size, size, owner });
    layout.y += 15;
  }
  layout.y += 5;
}

function itemsExercise(layout, exercise, owner) {
  const prepared = exercise.items.map((item) => itemLines(layout, item));
  // A ruled line to write the answer on, under each item of an exercise that asks for sentences.
  const answerLine = exercise.answerLines ? 22 : 0;
  const heightOf = (lines) => lines.length * itemLeading + answerLine;
  const headingHeight = 20 + Math.ceil(layout.width(exercise.task, "bold", sizes.task) / 380) * 15;
  const firstTwo = prepared.slice(0, 2).reduce((sum, lines) => sum + heightOf(lines), 0);
  layout.ensure(headingHeight + firstTwo);
  exerciseHeading(layout, exercise, owner);
  prepared.forEach((lines, index) => {
    if (layout.ensure(heightOf(lines))) {
      layout.y += 4;
    }
    const baseline = layout.y + sizes.body;
    layout.text(String(index + 1), {
      x: column.item,
      baseline,
      size: sizes.body,
      font: "bold",
      color: colour.accent,
      owner,
    });
    for (const line of lines) {
      layout.drawLine(line, {
        x: column.prompt,
        baseline: layout.y + sizes.body,
        size: sizes.body,
        owner,
      });
      layout.y += itemLeading;
    }
    if (answerLine) {
      layout.y += answerLine - 6;
      layout.shape({
        kind: "line",
        x1: column.prompt,
        y1: layout.y,
        x2: page.width - margin.right,
        y2: layout.y,
        thickness: 0.6,
        color: colour.rule,
      });
      layout.y += 6;
    }
    const next = prepared[index + 1];
    if (next && layout.y + heightOf(next) > lowest) {
      layout.current.footnote = `Exercise ${exercise.id} continues on the next page.`;
    }
  });
  layout.y += 14;
}

function textExercise(layout, exercise, owner) {
  const width = page.width - margin.right - column.prompt - 12;
  const lines = layout.wrap(words(exercise.prompt), sizes.body, width);
  const boxHeight = lines.length * 16 + 16;
  const writing = lines.length + 1;
  layout.ensure(40 + boxHeight + writing * 24);
  exerciseHeading(layout, exercise, owner);
  const top = layout.y;
  layout.shape({
    kind: "rect",
    x: column.prompt - 10,
    y: top,
    width: width + 20,
    height: boxHeight,
    fill: colour.tint,
    border: colour.tintBorder,
  });
  lines.forEach((line, index) => {
    layout.drawLine(line, {
      x: column.prompt,
      baseline: top + 10 + index * 16 + sizes.body,
      size: sizes.body,
      owner,
    });
  });
  layout.y = top + boxHeight;
  writingLines(layout, writing);
}

function writingLines(layout, count) {
  for (let index = 0; index < count; index++) {
    layout.y += 24;
    layout.shape({
      kind: "line",
      x1: column.prompt,
      y1: layout.y,
      x2: page.width - margin.right,
      y2: layout.y,
      thickness: 0.6,
      color: colour.rule,
    });
  }
  layout.y += 18;
}

function openExercise(layout, exercise, owner) {
  const width = page.width - margin.right - column.prompt;
  const lines = layout.wrap(words(exercise.prompt, "italic"), sizes.body, width);
  const writing = 4;
  layout.ensure(40 + lines.length * 15 + writing * 24);
  exerciseHeading(layout, exercise, owner);
  for (const line of lines) {
    layout.drawLine(line, {
      x: column.prompt,
      baseline: layout.y + sizes.body,
      size: sizes.body,
      owner,
    });
    layout.y += 15;
  }
  writingLines(layout, writing);
}

function exercises(layout, unit) {
  unit.exercises.forEach((exercise) => {
    const owner = { unit: unit.id, exercise: exercise.id };
    if (exercise.type === "items") itemsExercise(layout, exercise, owner);
    else if (exercise.type === "text") textExercise(layout, exercise, owner);
    else if (exercise.type === "open") openExercise(layout, exercise, owner);
    else throw new Error(`Unknown exercise type ${exercise.type}`);
  });
}

/** The answers of an exercise as printed in the key: numbered, `;` between whole answers. */
function keyWords(exercise) {
  if (exercise.type === "text") return words(exercise.model);
  if (exercise.type === "open") {
    return [...words("Answers will vary. Example:", "italic"), ...words(exercise.sample)];
  }
  const all = [];
  exercise.items.forEach((item, index) => {
    const answer = words(item.accept.join("; "));
    all.push({ text: String(index + 1), font: "bold", gap: index === 0 ? undefined : 14 });
    all.push({ ...answer[0], gap: 5, glue: true }, ...answer.slice(1));
  });
  return all;
}

function answerKey(layout, units) {
  layout.newPage();
  const baseline = layout.y + sizes.heading;
  layout.text("Answer key", {
    x: margin.left,
    baseline,
    size: sizes.heading,
    font: "bold",
    color: colour.accent,
  });
  layout.shape({
    kind: "line",
    x1: margin.left,
    y1: baseline + 9,
    x2: page.width - margin.right,
    y2: baseline + 9,
    thickness: 1.5,
    color: colour.accent,
  });
  layout.y = baseline + 30;
  const keyPage = layout.pageNumber;
  for (const unit of units) {
    layout.ensure(60);
    const size = 12;
    layout.text(`Unit ${unit.id}`, {
      x: margin.left,
      baseline: layout.y + size,
      size,
      font: "bold",
      color: colour.accent,
    });
    layout.text(unit.title, { x: margin.left + 52, baseline: layout.y + size, size, font: "bold" });
    layout.y += size + 12;
    for (const exercise of unit.exercises) {
      const lines = layout.wrap(
        keyWords(exercise),
        sizes.body,
        page.width - margin.right - column.answer,
      );
      layout.ensure(lines.length * 15 + 6);
      layout.text(exercise.id, {
        x: margin.left,
        baseline: layout.y + sizes.body,
        size: sizes.body,
        font: "bold",
        color: colour.accent,
      });
      for (const line of lines) {
        layout.drawLine(line, {
          x: column.answer,
          baseline: layout.y + sizes.body,
          size: sizes.body,
        });
        layout.y += 15;
      }
      layout.y += 6;
    }
    layout.y += 8;
  }
  return keyPage;
}

function titlePage(layout, book) {
  layout.newPage();
  const band = 250;
  layout.shape({ kind: "rect", x: 0, y: 0, width: page.width, height: band, fill: colour.accent });
  layout.text("ENGLISH DRILL BOOK · DEMO", {
    x: margin.left,
    baseline: 92,
    size: 9,
    font: "bold",
    color: colour.white,
  });
  const [series, name] = book.title.split(": ");
  layout.text(series, {
    x: margin.left,
    baseline: 150,
    size: 30,
    font: "bold",
    color: colour.white,
  });
  layout.text(name, { x: margin.left, baseline: 186, size: 22, color: colour.white });
  layout.text(book.subtitle, { x: margin.left, baseline: 218, size: 12, color: colour.white });
  layout.shape({
    kind: "rect",
    x: margin.left,
    y: band + 36,
    width: 76,
    height: 26,
    fill: colour.tint,
    border: colour.tintBorder,
  });
  layout.text(`Level ${book.level}`, {
    x: margin.left + 12,
    baseline: band + 53,
    size: 11,
    font: "bold",
    color: colour.accent,
  });
  layout.y = band + 92;
}

function contents(layout, book, starts, keyPage) {
  sectionHeading(layout, "Contents");
  const size = 11;
  const entries = [
    ...book.units.map((unit) => ({
      label: `Unit ${unit.id}`,
      title: unit.title,
      page: starts.get(unit.id),
    })),
    { label: "", title: "Answer key", page: keyPage },
  ];
  for (const entry of entries) {
    const baseline = layout.y + size;
    if (entry.label)
      layout.text(entry.label, {
        x: margin.left,
        baseline,
        size,
        font: "bold",
        color: colour.accent,
      });
    layout.text(entry.title, { x: margin.left + 54, baseline, size });
    const number = String(entry.page);
    const numberX = page.width - margin.right - layout.width(number, "regular", size);
    layout.text(number, { x: numberX, baseline, size });
    const from = margin.left + 54 + layout.width(entry.title, "regular", size) + 8;
    layout.shape({ kind: "dots", x1: from, x2: numberX - 8, y: baseline, color: colour.muted });
    layout.y += 22;
  }
  layout.y += 10;
}

function smallPrint(layout, book) {
  const text = `Written for the English Drill Book project, ${book.year}. The text of this book is licensed under CC BY 4.0: you may copy, share and adapt it if you give credit. It contains no text from any published textbook.`;
  layout.y = lowest - 30;
  paragraph(layout, text, { size: 8.5, leading: 12, color: colour.muted });
}

/** The page sequence of a book, with page ranges of its units and exercises. */
function layOut(book, fonts, starts = new Map(), keyPage = 0) {
  const layout = new Layout(fonts);
  titlePage(layout, book);
  if (book.layout === "course") {
    for (const text of book.about) {
      paragraph(layout, text);
      layout.y += 8;
    }
    smallPrint(layout, book);
    layout.newPage();
    sectionHeading(layout, "How to use this book");
    paragraph(
      layout,
      "Each unit starts with a page that explains the grammar: a short rule, examples and a note on a common mistake. The exercises follow on the next page. Write a whole sentence where there is a line to write on. Check your answers in the key at the back of the book.",
    );
    layout.y += 18;
    contents(layout, book, starts, keyPage);
    for (const unit of book.units) {
      layout.newPage();
      const owner = { unit: unit.id };
      starts.set(unit.id, layout.pageNumber);
      unitHeading(layout, unit.id, unit.title, owner);
      explanation(layout, unit.explanation);
      layout.newPage();
      sectionHeading(layout, `Exercises for Unit ${unit.id}`);
      exercises(layout, unit);
    }
  } else {
    for (const text of book.about) {
      paragraph(layout, text);
      layout.y += 8;
    }
    layout.y += 10;
    contents(layout, book, starts, keyPage);
    smallPrint(layout, book);
    for (const unit of book.units) {
      layout.newPage();
      starts.set(unit.id, layout.pageNumber);
      unitHeading(layout, unit.id, unit.title, { unit: unit.id });
      paragraph(layout, unit.intro, { font: "italic", color: colour.muted });
      layout.y += 14;
      exercises(layout, unit);
    }
  }
  const key = answerKey(layout, book.units);
  return { layout, starts, keyPage: key };
}

/**
 * What demo/LAYOUT.md promises about the text, checked before anything is laid out: answers have
 * no digits and use `;` only between whole answers; prompts have no square brackets and do not
 * start with a number; no text has a line break or a double space. Returns the problems found.
 */
export function sourceProblems(source) {
  const problems = [];
  const plain = (where, text) => {
    if (/\n|\s{2}|^\s|\s$/u.test(text)) problems.push(`${where}: a line break or extra space`);
  };
  source.units.forEach((unit, unitIndex) => {
    plain(`unit ${unitIndex + 1} title`, unit.title);
    unit.exercises.forEach((exercise, exerciseIndex) => {
      const where = `exercise ${unitIndex + 1}.${exerciseIndex + 1}`;
      plain(`${where} task`, exercise.task);
      if (/^\d+\.\d+ /u.test(exercise.task))
        problems.push(`${where}: the task starts with a number`);
      const answers = [exercise.model, exercise.sample].filter((text) => text !== undefined);
      for (const text of [exercise.prompt, ...answers].filter((value) => value !== undefined)) {
        plain(where, text);
      }
      for (const text of answers) {
        if (/\d/u.test(text)) problems.push(`${where}: a digit in the key`);
      }
      if (exercise.type === "text" && /^\d+ /u.test(exercise.prompt)) {
        problems.push(`${where}: the text starts with a number`);
      }
      if (exercise.type === "open" && exercise.prompt && /^\d+ /u.test(exercise.prompt)) {
        problems.push(`${where}: the ideas start with a number`);
      }
      (exercise.items ?? []).forEach((item, itemIndex) => {
        const at = `${where} item ${itemIndex + 1}`;
        plain(at, item.prompt);
        if (/[[\]]/u.test(item.prompt)) problems.push(`${at}: square brackets in the prompt`);
        for (const pattern of item.accept) {
          plain(at, pattern);
          if (/\d/u.test(pattern)) problems.push(`${at}: a digit in the key`);
          if (pattern.includes(";")) problems.push(`${at}: a semicolon inside an answer`);
          if (pattern.length === 0) problems.push(`${at}: an empty answer`);
        }
        for (const choice of item.choices ?? []) {
          if (/[[\]/]/u.test(choice)) problems.push(`${at}: a bracket or slash in a choice`);
        }
      });
    });
  });
  return problems;
}

/** The source with the IDs the book prints: unit `1`, exercise `1.2`, item `3`. */
export function numbered(source) {
  return {
    ...source,
    units: source.units.map((unit, unitIndex) => {
      const id = String(unitIndex + 1);
      return {
        ...unit,
        id,
        exercises: unit.exercises.map((exercise, exerciseIndex) => ({
          ...exercise,
          id: `${id}.${exerciseIndex + 1}`,
          ...(exercise.items && {
            items: exercise.items.map((item, itemIndex) => ({
              ...item,
              id: String(itemIndex + 1),
            })),
          }),
        })),
      };
    }),
  };
}

/** Pages on which text of each unit and exercise was drawn. */
function pageRanges(layout) {
  const ranges = new Map();
  layout.pages.forEach((laidOut, index) => {
    for (const { owner } of laidOut.texts) {
      if (!owner) continue;
      for (const id of [
        `unit:${owner.unit}`,
        ...(owner.exercise ? [`exercise:${owner.exercise}`] : []),
      ]) {
        const range = ranges.get(id) ?? { from: index + 1, to: index + 1 };
        range.to = index + 1;
        ranges.set(id, range);
      }
    }
  });
  return ranges;
}

function drawFooter(pdfPage, number, book, fonts) {
  if (number === 1) return;
  const size = 8;
  const y = 40;
  pdfPage.drawLine({
    start: { x: margin.left, y: y + 14 },
    end: { x: page.width - margin.right, y: y + 14 },
    thickness: 0.5,
    color: colour.rule,
  });
  pdfPage.drawText(book.title, {
    x: margin.left,
    y,
    size,
    font: fonts.regular,
    color: colour.muted,
  });
  const label = String(number);
  pdfPage.drawText(label, {
    x: page.width - margin.right - fonts.bold.widthOfTextAtSize(label, size),
    y,
    size,
    font: fonts.bold,
    color: colour.muted,
  });
}

function draw(pdf, layout, book, fonts) {
  layout.pages.forEach((laidOut, index) => {
    const pdfPage = pdf.addPage([page.width, page.height]);
    const flip = (y) => page.height - y;
    for (const shape of laidOut.shapes) {
      if (shape.kind === "rect") {
        pdfPage.drawRectangle({
          x: shape.x,
          y: flip(shape.y + shape.height),
          width: shape.width,
          height: shape.height,
          color: shape.fill,
          borderColor: shape.border,
          borderWidth: shape.border ? 0.8 : 0,
        });
      } else if (shape.kind === "line") {
        pdfPage.drawLine({
          start: { x: shape.x1, y: flip(shape.y1) },
          end: { x: shape.x2, y: flip(shape.y2) },
          thickness: shape.thickness,
          color: shape.color,
        });
      } else if (shape.kind === "dots") {
        for (let x = shape.x1; x < shape.x2; x += 4) {
          pdfPage.drawCircle({ x, y: flip(shape.y), size: 0.55, color: shape.color });
        }
      }
    }
    for (const run of laidOut.texts) {
      pdfPage.drawText(run.text, {
        x: run.x,
        y: flip(run.baseline),
        size: run.size,
        font: fonts[run.font],
        color: run.color,
      });
    }
    if (laidOut.footnote) {
      pdfPage.drawText(laidOut.footnote, {
        x: column.prompt,
        y: flip(lowest + 8),
        size: 8,
        font: fonts.italic,
        color: colour.muted,
      });
    }
    drawFooter(pdfPage, index + 1, book, fonts);
  });
}

/** The pack the reader must find in the book, page ranges and document included. */
export function expectedPack(book, ranges, document) {
  const pages = (id) => {
    const range = ranges.get(id);
    if (!range) throw new Error(`Nothing of ${id} was laid out.`);
    return [{ document: documentRole, from: range.from, to: range.to }];
  };
  return {
    kind: "pack",
    schemaVersion: 1,
    id: book.id,
    version: book.version,
    title: book.title,
    language: "en",
    instructionLanguage: "en",
    original: true,
    license: book.license,
    source: {
      title: book.title,
      authors: book.authors,
      edition: book.edition,
      year: book.year,
      documents: [{ role: documentRole, sha256: document.sha256, pages: document.pages }],
    },
    units: book.units.map((unit) => ({
      id: unit.id,
      title: unit.title,
      pages: pages(`unit:${unit.id}`),
      exercises: unit.exercises.map((exercise) => {
        const common = {
          id: exercise.id,
          type: exercise.type,
          task: exercise.task,
          pages: pages(`exercise:${exercise.id}`),
        };
        if (exercise.type === "text")
          return { ...common, prompt: exercise.prompt, model: exercise.model };
        if (exercise.type === "open")
          return { ...common, prompt: exercise.prompt, sample: exercise.sample };
        return {
          ...common,
          items: exercise.items.map((item) => ({
            id: item.id,
            prompt: item.prompt,
            accept: item.accept,
            ...(item.choices && { choices: item.choices }),
          })),
        };
      }),
    })),
  };
}

/** Builds one book: the bytes of its PDF and the pack expected from them. */
export async function buildBook(source) {
  const problems = sourceProblems(source);
  if (problems.length > 0)
    throw new Error(`The source breaks demo/LAYOUT.md:\n- ${problems.join("\n- ")}`);
  const book = numbered(source);
  const pdf = await PDFDocument.create({ updateMetadata: false });
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    italic: await pdf.embedFont(StandardFonts.HelveticaOblique),
  };
  // Two passes: the contents need the pages on which units and the key start.
  const first = layOut(book, fonts);
  const { layout } = layOut(book, fonts, first.starts, first.keyPage);
  draw(pdf, layout, book, fonts);

  pdf.setTitle(book.title);
  pdf.setAuthor(book.authors.join(", "));
  pdf.setSubject(book.subtitle);
  pdf.setKeywords(["English", "grammar", book.level, "English Drill Book", "demo"]);
  pdf.setCreator("English Drill Book, scripts/build-demo-books.mjs");
  pdf.setProducer("pdf-lib");
  pdf.setLanguage("en-GB");
  pdf.setCreationDate(fixedDate(book.year));
  pdf.setModificationDate(fixedDate(book.year));

  const bytes = await pdf.save();
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const pack = expectedPack(book, pageRanges(layout), { sha256, pages: layout.pages.length });
  return { bytes, pack };
}

export function sourcePath(root, name) {
  return join(root, "demo", `${name}.json`);
}

export function pdfPath(root, name) {
  return join(root, "public", "demo", `${name}.pdf`);
}

export function packPath(root, name) {
  return join(root, "demo", `${name}.pack.json`);
}

export function formatPack(pack) {
  return `${JSON.stringify(pack, null, 2)}\n`;
}

async function main() {
  const root = process.cwd();
  for (const name of books) {
    const { bytes, pack } = await buildBook(
      JSON.parse(readFileSync(sourcePath(root, name), "utf8")),
    );
    writeFileSync(pdfPath(root, name), bytes);
    writeFileSync(packPath(root, name), formatPack(pack));
    console.log(
      `${name}: ${pack.source.documents[0].pages} pages, ${(bytes.length / 1000).toFixed(1)} kB`,
    );
  }
}

if (isMain(import.meta.url)) await main();
