# Proposal

## Why

Nothing can be built, checked or shown until there is a project that builds, a pipeline that judges every change against the constitution, and a public address the result is deployed to. Doing this first means every later change is measured by the same gates from its first commit.

## What Changes

- A Vue 3 + TypeScript + Vite project with the three layers of constitution C-08 and a minimal shell: one window, a start screen, a not-found view, Russian interface text.
- The quality gates of the constitution as commands that run locally and in CI: types, lint, formatting, unit tests with coverage, end-to-end tests, accessibility check, third-party request check, bundle budgets, Lighthouse, commit messages, OpenSpec validation, requirement traceability.
- The pull request evidence check (C-18): description, review record, screenshots taken by CI, numbers against `main`.
- Deployment of the demo to GitHub Pages on every merge to `main`, with versions and a changelog generated from history.
- The bot identity (a GitHub App) that agents commit and open pull requests as, and branch protection on `main`.

Requirements delivered, from `docs/product/01-product.md`: **PROD-001**, **PROD-008**.

Left for later changes: every screen beyond the start placeholder, storage, offline use and the service worker (C-04, slice 1.6), books and exercises.

## Capabilities

### New Capabilities

- `app-shell`: the window every screen lives in — navigation in one window, an address for every view, behaviour for unknown addresses.

### Modified Capabilities

None.

## Impact

- New: the whole project tree (`src/`, `e2e/`, `scripts/`, `.github/workflows/`, configuration files).
- Runtime dependencies: `vue`, `vue-router`.
- External: two GitHub repositories (public `english-drill-book`, private holdout), a GitHub App, GitHub Pages, branch protection. The steps only the owner can perform are marked in `tasks.md`.
