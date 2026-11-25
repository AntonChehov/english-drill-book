# Tasks

## 1. Documents

- [ ] 1.1 `docs/roadmap.md`: M2 as slices 0 – 3, the later list, the note on the old M2; verify every ID named exists in `docs/product/`
- [ ] 1.2 `docs/product/`: milestone tags, the new PACK requirements, PROG-013, PROD-002, DATA-009, DATA-014, no converter, no migration; verify with `pnpm check`
- [ ] 1.3 `README.md`: status, demo link, screenshot, roles; verify the link and the screenshot resolve
- [ ] 1.4 `docs/how-it-works.md`: one page, roles diagram, numbers, links; verify the numbers against `docs/` and CI
- [ ] 1.5 `CLAUDE.md`: no design references in code comments, requirement IDs only in tests; verify the owner approved the text

## 2. Gates

- [ ] 2.1 Run `pnpm check`; verify it passes

The code of slice 0 (the splits, thresholds, component tests, timing headroom) is its own change, not these tasks.
