# Tasks

## 1. Comments

- [ ] 1.1 `src/`: no comment cites a design document, decision (`D7`) or section; reasons kept in words; outside tests no comment names a requirement ID; verify with `git grep` for both patterns, no hits
- [ ] 1.2 `e2e/` and `scripts/`: no design references; verify with `git grep`, no hits

## 2. Roles

- [ ] 2.1 `README.md` and `docs/how-it-works.md` (text and diagram): the owner's role includes the core of each slice; agents do the rest of the implementation, review and validation; verify the two texts agree

## 3. Speed test

- [ ] 3.1 `src/domain/checking/speed.test.ts` runs alone after a warm-up, limit 5 ms unchanged; verify `pnpm test` passes 5 times in a row with another `pnpm test` running beside it

## 4. Gates

- [ ] 4.1 `pnpm check`, `pnpm test`, `pnpm e2e` on Chromium pass
