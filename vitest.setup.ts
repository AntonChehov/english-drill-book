import { configureGlobal } from "fast-check";

// Property tests run with one fixed seed, so a run does not depend on chance (constitution C-10).
// A failure prints the seed and the path of the smallest counterexample it found.
configureGlobal({ seed: 20_261_112 });
