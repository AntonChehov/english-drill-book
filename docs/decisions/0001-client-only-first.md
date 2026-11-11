# 0001 — Client-only PWA first, backend later

Date: 2026-11-10. Status: accepted.

## Context

The predecessor was three local Python servers, each opening its own browser window. The goal now is one app that anyone can use and that can be shown by a link.

## Decision

Milestones 1–3 deliver a static, offline-first PWA with all data in the browser. A backend (accounts, sync between devices) is milestone 5 and gets its own specification and contract.

## Consequences

- The demo is a static deployment: free to host, nothing to operate, no personal data held by the author.
- To keep the later backend cheap, progress is an append-only log of attempts with globally unique IDs (decision 0003). Sync becomes an exchange of log entries.
- All storage access goes through one interface in `src/storage`, so a remote implementation can be added behind it.
- Until milestone 5 a learner moves between devices by export and import.
