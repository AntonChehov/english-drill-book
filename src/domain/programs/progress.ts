// Progress over a program (PROG-001 – PROG-005; design D3 of `demo-program`).

import { progressOf, type Progress } from "../study/progress";
import type { Topic } from "./types";

type TopicState = "new" | "started" | "passed";

/** What a topic's progress says; Today and Topics show it (PROG-001, PROG-008). */
export interface TopicProgress {
  /** The exercises of the lead unit. */
  readonly lead: Progress;
  /** The supplements: how many are done, how many the topic needs and how many it offers. */
  readonly drills: { readonly done: number; readonly needed: number; readonly total: number };
  readonly passed: boolean;
  readonly state: TopicState;
  /**
   * Where the topic goes on: the first lead exercise not done, else the first supplement not
   * done; none once the topic is passed.
   */
  readonly next: { readonly pack: string; readonly exercise: string } | undefined;
}

/**
 * A topic is passed when every exercise of its lead unit is done and at least
 * `min(supplementMin, supplements)` of its supplements are done (PROG-001). Every supplement
 * counts as available: the program is active only with all its books (design D5).
 */
export function topicProgress(
  topic: Topic,
  leadExercises: readonly string[],
  isDone: (pack: string, exercise: string) => boolean,
  supplementMin: number,
): TopicProgress {
  const lead = progressOf(leadExercises, (exercise) => isDone(topic.lead.pack, exercise));
  const total = topic.supplements.length;
  const done = topic.supplements.filter(({ pack, exercise }) => isDone(pack, exercise)).length;
  const needed = Math.min(supplementMin, total);
  const passed = lead.done === lead.total && done >= needed;
  const state = passed ? "passed" : lead.done + done > 0 ? "started" : "new";
  const leadNext = leadExercises.find((exercise) => !isDone(topic.lead.pack, exercise));
  const next = passed
    ? undefined
    : leadNext === undefined
      ? topic.supplements.find(({ pack, exercise }) => !isDone(pack, exercise))
      : { pack: topic.lead.pack, exercise: leadNext };
  return { lead, drills: { done, needed, total }, passed, state, next };
}

interface LevelShare {
  readonly level: string;
  readonly passed: number;
  readonly total: number;
  /** Passed topics of the level over all of them; 1 for a level with no topics (PROG-002). */
  readonly share: number;
}

/** The share of each level of the scale, lowest first (PROG-002). */
export function levelShares(
  scale: readonly string[],
  topics: readonly Topic[],
  passed: (topic: Topic) => boolean,
): LevelShare[] {
  return scale.map((level) => {
    const of = topics.filter((topic) => topic.level === level);
    const done = of.filter(passed).length;
    return { level, passed: done, total: of.length, share: of.length ? done / of.length : 1 };
  });
}

interface CurrentLevel {
  /** The index on the scale of the current level; -1 for "below" the lowest (PROG-003). */
  readonly index: number;
  /** The share of the next level is at least `plusThreshold` (PROG-004). */
  readonly plus: boolean;
}

/** The highest level whose share and every lower share reach the threshold, with its "+". */
export function currentLevel(
  shares: readonly LevelShare[],
  levelThreshold: number,
  plusThreshold: number,
): CurrentLevel {
  const firstShort = shares.findIndex(({ share }) => share < levelThreshold);
  const index = firstShort === -1 ? shares.length - 1 : firstShort - 1;
  const next = shares[index + 1];
  return { index, plus: next !== undefined && next.share >= plusThreshold };
}

/**
 * Today's topic (PROG-005): the index of the topic whose id is `focus` when it is not passed, else
 * of the first topic not passed; -1 when every topic is passed. A `focus` that names no topic is
 * ignored.
 */
export function todayTopic(
  topics: readonly Topic[],
  passed: (topic: Topic) => boolean,
  focus?: string,
): number {
  const focused = topics.findIndex((topic) => topic.id === focus);
  if (focused !== -1 && !passed(topics[focused]!)) return focused;
  return topics.findIndex((topic) => !passed(topic));
}
