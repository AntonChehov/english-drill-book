# 0004 — Stack

Date: 2026-11-10. Status: accepted.

## Decision

- **Vue 3 + TypeScript + Vite**, single-page app with Vue Router. No server-side rendering: the app is offline-first and has no content to index beyond the landing view.
- **oxlint** for linting, chosen for speed; type checking of templates is done by `vue-tsc`. If oxlint cannot express a rule the constitution needs (layer boundaries, C-08), a second tool is added for that rule only, with a decision record.
- **Vitest** for unit and component tests, **Playwright** for end-to-end tests on Chromium, Firefox and WebKit, **axe** for accessibility checks.
- **IndexedDB** through a thin typed wrapper. A helper library is allowed if its decision record shows it is smaller than what it replaces.
- **Service worker** generated at build time for offline use.
- **GitHub Actions** for CI and deployment of the demo to GitHub Pages.

## Left to the implementation

State management (Pinia or composables), the Markdown renderer, the schema validator and the CSS approach are chosen during implementation within the constitution's budgets (C-06) and dependency rule (C-12), each with a short decision record.
