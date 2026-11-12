# Tasks

Tasks marked **(owner)** need the owner and cannot be done by an agent.

## 1. Patterns

- [x] 1.1 Add `fast-check` as a development dependency with a fixed seed in the test setup; verify `pnpm audit` passes and a sample property runs — `fast-check` 4.10.2, seed set in `vitest.setup.ts`; `pnpm audit` found no vulnerabilities; a sample property ran with the global seed
- [x] 1.2 Write `expandPattern` in `src/domain/checking/pattern.ts` as in design D2 with the errors of D1; verify with unit tests named `@req CHK-001` and `@req CHK-002` covering every scenario of the delta spec for the two requirements
- [x] 1.3 Add the property "expanding any string never throws, and a valid result has 1 to 4000 variants"; verify it passes

## 2. Normalisation

- [x] 2.1 Write `readings` in `normalise.ts` as in design D3; verify with unit tests named `@req CHK-003` and `@req CHK-004` covering their scenarios, including the bound of four independent readings
- [x] 2.2 Forbid `toLocaleLowerCase`, `toLocaleUpperCase`, `localeCompare`, `Intl` and `Date` under `src/domain/checking` by a lint rule; verify with a deliberately failing file that is then removed — a probe file in `src/domain/checking` failed on each of them and on the rules of `src/domain` kept by the override; the same calls in `src/domain` outside `checking` passed; the probe was removed

## 3. Verdicts

- [x] 3.1 Write `isOneEditApart` in `distance.ts`; verify with unit tests and with a property comparing it to a plain Levenshtein distance written in the test
- [x] 3.2 Write `compileKey` in `key.ts` as in design D4; verify that an invalid pattern gives errors with its index and no key
- [x] 3.3 Write `checkAnswer` in `check.ts` as in design D5 and export the interface from `index.ts`; verify with unit tests named `@req CHK-005` – `@req CHK-009` covering every scenario of the delta spec
- [x ] 3.4 Add the properties of design D6 named `@req CHK-012` and `@req CHK-013`, and the scenario of the capital `I`; verify they pass with the fixed seed and with `LANG=tr_TR.UTF-8` — 96 checker tests passed with the fixed seed, with `LANG=tr_TR.UTF-8 LC_ALL=tr_TR.UTF-8` (default locale `tr-TR`) as without; lowering case with `toLocaleLowerCase("tr")` instead made 8 of them fail
- [x ] 3.5 Add the speed test of design D7 named `@req CHK-014`, printing the medians of checking and of preparing; verify it passes locally and record both numbers here — on the owner's machine, over three runs: median of 200 checks 0.28 – 0.32 ms; median of 11 preparations of the key 106 – 107 ms

## 4. Product description

- [ ] 4.1 Make the four clarifications of design D8 in `docs/product/03-answer-checking.md`; verify the delta spec and the text state the same rules

## 5. Review and evidence

- [ ] 5.1 Run `pnpm verify` from a clean build; verify it passes, coverage of `src/domain` is at least 95 % of lines and branches, and `pnpm size` shows the bundle unchanged
- [ ] 5.2 Open the pull request as the bot with the sections of C-18 item 1, stating that there is no visual change; verify every check but `evidence` is green
- [ ] 5.3 A reviewing agent with a fresh context writes round 1 in `review.md`; fix or decline each finding; a reviewing agent writes the next round; repeat until a round approves the latest content; verify the `evidence` check is green
- [ ] 5.4 **(owner)** Read the pull request and the declined findings, approve and merge
