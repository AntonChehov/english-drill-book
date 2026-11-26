// Built-in programs and progress over them.

import demo from "./demo.json";
import type { Program } from "./types";

/** The demo program over the two demo books, active while they are added. */
export const demoProgram: Program = demo;

export { currentLevel, levelShares, todayTopic, topicProgress, topicStep } from "./progress";
export type { TopicStep } from "./progress";
export type { Topic } from "./types";
