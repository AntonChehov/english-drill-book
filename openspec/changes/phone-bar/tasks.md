# Tasks

## 1. Housekeeping

- [ ] 1.1 Add the speed-budget flakes of CHK-014 and PACK-003 on CI runners to `docs/tech-debt.md` and correct the header of `scripts/changes.mjs` (the file check runs inside `unit` and `build`); verify `pnpm check`

## 2. The bar

- [ ] 2.1 The rule of showing and hiding the bar (scroll direction with a threshold, top of the page, focus inside, list open) as a function with unit tests `@req PROD-012`; verify `pnpm test` passes
- [ ] 2.2 The compact bar in `App.vue` below 1024 px with the app's name and the sections, fixed to the top, sliding unless reduced motion is asked; verify an end-to-end test at 360 px `@req PROD-012`: it hides on a scroll down, returns on a scroll up, returns when focused by keyboard; at 1280 px the top bar is unchanged
- [ ] 2.3 In Study the bar carries ‹, the unit, › and «Все разделы», and they leave the header of the unit below 1024 px; verify the Study end-to-end tests pass at both widths and a new one at 360 px goes to the next unit from the bar

## 3. The mark of a finished unit and book

- [ ] 3.1 A check mark component, drawn in on the change from not done to done and drawn already otherwise or with reduced motion, with a hidden «выполнено»; used in the list of units, the bar and the cards of units and books; verify unit tests `@req PROD-012` and an end-to-end test that finishing the last exercise of a demo unit shows the green mark in the list and on the card

## 4. Gates

- [ ] 4.1 Run `pnpm verify`; verify it passes and the CI screenshots at phone width show the bar
