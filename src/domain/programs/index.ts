// Built-in programs and progress over them (capability `program`, design of `demo-program`).

import demo from "./demo.json";
import type { Program } from "./types";

/** The demo program over the two demo books (PROG-015), active while they are added (PROG-013). */
export const demoProgram: Program = demo;

export { currentLevel, levelShares, todayTopic, topicProgress, topicStep } from "./progress";
export type { Topic } from "./types";
