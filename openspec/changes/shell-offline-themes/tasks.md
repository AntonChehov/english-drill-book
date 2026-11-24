## 1. Offline

- [x] 1.1 Add the service worker and its build plugin, registered from `main.ts`, and make offline Today read the store only (design D1); verify with `e2e/offline.spec.ts` named `@req PROD-003` (design, Tests) and `pnpm check`

## 2. Theme

- [x] 2.1 Split the dark colours by `data-theme` and add `applyTheme`, applied before mount (design D2); verify with unit tests named `@req PROD-005`
- [x] 2.2 Add «Оформление» to «О приложении» (design D2); verify with end-to-end tests named `@req PROD-005`: «Тёмная» kept over a reload, «Светлая» over emulated dark, a write failure said beside the group; axe in both themes

## 3. Failures and dialogs

- [ ] 3.1 Add `FailureBoundary.vue` around the route and Study's columns (design D3); verify with component tests named `@req PROD-011`
- [ ] 3.2 Show an unreadable stored pack on its card (design D3); verify with a test named `@req PROD-011`
- [ ] 3.3 Turn on `no-alert` (design D4); verify with a test named `@req PROD-009`

## 4. Languages and first launch

- [ ] 4.1 Add `e2e/languages.spec.ts` and fix any gap (design D5); named `@req PROD-004`
- [ ] 4.2 Add the line about own books (design D6); verify with a StartView test named `@req PROD-002`

## 5. Housekeeping

- [ ] 5.1 Name the Pages artifact per attempt and mark slice 1.8 in progress in `docs/roadmap.md` (design D7)
- [x] 5.2 Remove the two offline entries from `docs/tech-debt.md` once 1.1 passes
