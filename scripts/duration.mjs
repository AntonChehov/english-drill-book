#!/usr/bin/env node
// Reports the wall-clock time of the current workflow run so far (constitution C-19:
// the checks of a pull request finish within 3 minutes). Over the budget it warns while
// the pipeline settles in, and fails once ENFORCE_DURATION_BUDGET is "true" (design D7).
// Usage: node scripts/duration.mjs   prints the seconds and sets the output `seconds`
// Environment: GITHUB_REPOSITORY, GITHUB_RUN_ID, GITHUB_TOKEN, GITHUB_API_URL (optional),
// ENFORCE_DURATION_BUDGET (optional).
import { appendSummary, isMain, requireEnv, setOutput } from "./common.mjs";
import { createGithub } from "./github.mjs";

export const budgetSeconds = 180;

export function elapsedSeconds(startedAt, now) {
  return Math.round((now.getTime() - new Date(startedAt).getTime()) / 1000);
}

/** The job summary line and whether the run is over the budget. */
export function verdict(seconds, budget = budgetSeconds) {
  const minutes = `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  const over = seconds > budget;
  return {
    over,
    markdown: `### Pipeline duration\n\n${minutes} from the start of the run to the evidence job, ${over ? "over" : "within"} the budget of ${budget / 60} minutes (C-19).\n`,
  };
}

async function main() {
  const github = createGithub({
    token: requireEnv("GITHUB_TOKEN"),
    apiUrl: process.env["GITHUB_API_URL"],
  });
  const run = await github.request(
    "GET",
    `/repos/${requireEnv("GITHUB_REPOSITORY")}/actions/runs/${requireEnv("GITHUB_RUN_ID")}`,
  );
  const seconds = elapsedSeconds(run.run_started_at, new Date());
  const { over, markdown } = verdict(seconds);
  appendSummary(markdown);
  setOutput("seconds", seconds);
  console.log(markdown);
  if (over) {
    if (process.env["ENFORCE_DURATION_BUDGET"] === "true") {
      console.error(
        `::error::The run took ${seconds} s, over the budget of ${budgetSeconds} s (C-19).`,
      );
      process.exitCode = 1;
    } else {
      console.log(
        `::warning::The run took ${seconds} s, over the budget of ${budgetSeconds} s (C-19).`,
      );
    }
  }
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
