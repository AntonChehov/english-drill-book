# Proposal

## Why

On a phone the top bar and the header of Study take about a fifth of the screen, and a finished unit is told from an unfinished one only by its count. Asked for by the owner on 2026-11-16.

## What Changes

Size: small (one requirement, no schema or storage change).

- **A compact bar below 1024 px**, fixed to the top of the screen, in place of the top bar: the app's name, leading to the start screen, and the sections. It slides out of view on a scroll down and back on a scroll up; it is shown at the top of the page, while focus is inside it and while the list of units is open. With reduced motion it appears and goes without sliding.
- **In Study** the bar carries the unit's navigation: **‹**, the unit, **›** and «Все разделы», taken out of the unit's header on a narrow screen.
- **A finished unit** (every exercise done) is shown in green with a check mark in the list of units, in the bar and on the cards of the start screen; **a finished book** (every unit done), the same on its card. The mark is drawn in when the last exercise is finished, and shown already drawn otherwise or with reduced motion. A screen reader hears «выполнено».
- From 1024 px nothing changes.
- **Housekeeping**: two speed-budget checks that fail on loaded CI runners go to `docs/tech-debt.md` (CHK-014, 100.36 ms in the unit tests; PACK-003, 2 000 ms on Firefox end-to-end); the stale header of `scripts/changes.mjs` is corrected.

## Requirements

**PROD-012** (`01-product.md`; the bar and the mark in `08-interface-reference.md`), in full.

Left for later: touch targets under 44 px in the bar's neighbours (already in `docs/tech-debt.md`).

## Capabilities

None.
