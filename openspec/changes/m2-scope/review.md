# Review of m2-scope

## Round 1

Reviewed: 785623128b4d
Verdict: changes requested

### F1 Edits made in the review queue are neither kept nor exported

Severity: critical

Where: `docs/product/02-content-packs.md` PACK-008, `docs/product/06-progress-and-data.md` DATA-007, DATA-009.

What: PACK-008 lets the learner accept or edit an extracted answer, but says nothing about where that edit lives. DATA-007 exports only "key corrections (`PLAY-022`)", and PACK-005 says the pack is built from the PDF. Read as written, an edit made in the queue is part of the pack: rebuilding the pack, or exporting and importing into another profile with the same book (DATA-009), loses it, and the accept marks too.

Why: this is work the learner did and marked. Losing it on export or rebuild breaks DATA-009. Fix: state that an accept or an edit in the queue is recorded like a PLAY-022 correction (kept on the device, survives a rebuild of the pack, exported with progress), and name PACK-008 in DATA-007.

### F2 "Keys never leave the device" against exported key corrections

Severity: minor

Where: PACK-005 ("The files and the keys never leave the device"), DATA-007 ("contains no book content"), PLAY-022 ("exported with progress").

What: a corrected key, or the learner's answer kept as a key variant, is in the export file, which DATA-013 offers to send through a messenger. The three texts do not say what a correction holds, so it is unclear whether a corrected key counts as a key that leaves the device or as book content.

Why: slice 1 and slice 3 need one reading. Say what a correction holds (item ID and the learner's own text, never the extracted key) and that "never leave the device" means the app sends nothing.

### F3 The proposal's requirement list does not match the diff

Severity: minor

Where: `proposal.md` section Requirements, `tasks.md` 1.2.

What: on `origin/main` there is no PACK-005, PACK-006 or PACK-007. All three are new in this diff, so PACK-005 is not "rewritten" and PACK-006 is not "kept". PACK-007 («Убрать демо») is new and named nowhere in the proposal. DATA-007 changed (key corrections) and is not listed under Changed. The milestone retags (PLAY-017, PLAY-018, PLAY-021, PROG-001 – PROG-010, PROG-015, PROG-018 to M1; DATA-006, DATA-010, PLAY-014, PROD-010 to later) are covered only by "milestone tags" in task 1.2.

Why: the owner approves the proposal by its list. Make it New: PACK-005 – PACK-008, PLAY-022; Changed: PROD-002, PROG-013, DATA-007, DATA-009, DATA-014.

### F4 PLAY-013 keeps the tag M2 although it was delivered in M1

Severity: minor

Where: `docs/product/04-exercise-player.md` PLAY-013.

What: PLAY-013 shipped in slice 1.5 (roadmap table) and is binding in `openspec/specs/study/spec.md`. It still carries `[M2]`, but it is in no slice of the new M2 and not in the "after 1.0" list. Every other M1-delivered requirement was retagged in this diff.

Why: `docs/product/README.md` now says M2 is version 1.0, so the tag says something false. Retag it M1.

### F5 M3 and the BOOK requirements still claim the own book and its first profiles

Severity: minor

Where: `docs/roadmap.md` "M3 — The learner's own books" ("adding a book by pointing to its file ... profiles for Murphy and Golitsynsky"); `docs/product/02-content-packs.md` BOOK-002, BOOK-012 [M3].

What: PACK-005 [M2] now covers adding an own PDF and names the first editions as *Essential Grammar in Use* 4th, *English Grammar in Use* 4th and Golitsynsky 9th. BOOK-012 [M3] names other first profiles ("Grammar in Use, Elementary and Intermediate, 2015 eBook editions"). The proposal and roadmap say "*English Grammar in Use* 4th (red and blue)", and PACK-005 does not. So the product text gives two answers to which editions come first, and three wordings of the edition list.

Why: slice 1 needs one list it can follow. Rename or trim M3 to what is left (the catalogue, recognition by content, audio, key pages, the real program), reconcile BOOK-012 with PACK-005, and use one edition list everywhere.

### F6 DATA-014 offers "install the app" while PWA install moved to later

Severity: minor

Where: `docs/product/06-progress-and-data.md` DATA-014; PROD-010 retagged `[later]`.

What: DATA-014 (slice 3 of 1.0) asks for a button that installs the app as a remedy. PROD-010 is now after 1.0, and `main` has no web manifest (`vite.config.ts` only builds the asset manifest), so slice 3 cannot meet DATA-014 as written.

Why: a requirement of 1.0 must not depend on one deferred past it. Either drop the install remedy from DATA-014 until PROD-010, or bring PROD-010 back into M2.

### F7 What a key correction does to checks already made is not stated

Severity: minor

Where: PLAY-022, PLAY-008, PLAY-010, DATA-003, PACK-008.

What: «Мой ответ верный» overlaps PLAY-008 (count a wrong answer as correct), and the text does not say how they differ. It also does not say whether a corrected key grades again the attempts already in the log: derived state is recomputed from the log (DATA-003), and a done exercise stays done (PLAY-010). Separately, PACK-008 does not say whether N in «N ответов проверить» counts every extracted answer or only those flagged as low confidence.

Why: these are behaviours a test will pin in slice 1. A short sentence each now saves a design argument later.

### F8 The proposal is over the ceiling of a small change

Severity: minor

Where: `openspec/changes/m2-scope/proposal.md`.

What: about 381 words of prose without headings, against 300 for a small change (`docs/process.md`, small change: "Why, What Changes, Requirements"). It also has a fourth section, Capabilities.

Why: the limit is the process's. The owner edited this text, so declining it with that reason is acceptable.

### F9 Tasks 1.1 and 1.2 are done in the diff but not ticked

Severity: minor

Where: `openspec/changes/m2-scope/tasks.md`.

What: the roadmap and `docs/product/` edits are in the diff, and `pnpm check` passes, but 1.1 and 1.2 are still `[ ]`. Their checks ("every ID named exists", ID coherence) were not finished, as F3 – F5 show.

Why: archiving needs every task ticked. Tick them once their checks hold.

### Notes

Checked and true: README status (tag `v0.2.0` and `package.json` 0.2.0 on `main`, two demo books, Study, demo program, offline after first load), the demo link, and the screenshot `docs/images/today.png`, which shows only the original demo course and Russian interface text. In `docs/how-it-works.md`: 19 constraints; 113 unique IDs in `docs/product/` with no duplicates; 71 requirements in `openspec/specs`, each named by a test (`pnpm trace`); the C-06, C-07, C-10 and C-19 figures; the artifact limits; validation at 0.9 over three runs. All links resolve. `pnpm check` passes on 785623128b4d.

Every ID the roadmap names exists in `docs/product/`. No textbook text in the diff (C-01): only edition titles, author names and UI strings.

Known and accepted for slice 1: `contracts/export.schema.json` has no field for key corrections yet, which DATA-007 now requires. The schema changes in slice 1, and it should cover the queue edits of F1 too.

PROD-002 and PROG-013 are binding in `openspec/specs` with their M1 wording, which now differs from `docs/product/`. That is expected until the slice 1 change carries the new text.

PACK-006 refuses any PDF whose hash differs from the profile's. That is stricter than the old README line about copies with shifted pages, and that line is removed, consistently.

The CLAUDE.md comment rule reads clearly. Whether the owner approved its wording, as task 1.5 says, is not visible from the diff.

## Round 2

Reviewed: 4330277f2862
Verdict: changes requested

- F1: fixed
- F2: fixed
- F3: fixed
- F4: fixed
- F5: fixed
- F6: fixed
- F7: fixed
- F8: not fixed — the proposal now calls itself "Large", but `.openspec.yaml` is still `schema: lite` with `skip_specs: true`, and `docs/process.md` and `CLAUDE.md` equate lite with small and give a large change delta specs; at about 381 words it is still over the 300 of a small change, so trim it to 300 or decline the finding with the owner's reason
- F9: fixed

### Notes

Same reviewer as round 1. I reviewed the whole diff `origin/main...HEAD` again at dfd014a, and `pnpm check` passes.

Fix of F1: PACK-008 now records an accept or an edit as a PLAY-022 correction. It is kept, survives a rebuild of the pack and is exported, and DATA-007 names PACK-008. An accept holds no text of the learner's, so a correction may hold only the item and its state. The schema work of slice 1 should allow that, besides the learner's own text.

Fix of F7: PLAY-022 now grades earlier checks again against the corrected key. Slice 1 should still settle one case: what wins when a check had a verdict changed by hand (PLAY-008) and its key is corrected afterwards. That is for the design of slice 1, not this change.

Fix of F5: M3 is renamed, BOOK-002 and BOOK-012 defer to PACK-005, and the edition lists now agree in the proposal, the roadmap and PACK-005.

Task 1.5: the coordinator relays that the owner approved the CLAUDE.md comment rule in chat on 2026-11-26. I cannot see that from the repository and accept it as relayed.

Still accepted for slice 1: `contracts/export.schema.json` has no field for key corrections.
