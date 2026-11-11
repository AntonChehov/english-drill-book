# 0003 — Progress is an append-only attempt log

Date: 2026-11-10. Status: accepted.

## Context

The predecessor stored, per exercise, the latest answers and results, overwriting earlier ones. That loses history and makes merging two copies ambiguous.

## Decision

Store every check as an immutable attempt with a UUID. Derive done marks, levels and the mistakes list from the log; cache derived values if needed.

## Consequences

- Import is a set union by attempt ID: idempotent and conflict-free.
- Later features (statistics, spaced repetition, sync) read the same log.
- The log grows. At 200 attempts a day for five years it holds about 365 000 small records, within IndexedDB's comfortable range; derived state is cached per exercise so screens do not scan the log.
- Drafts are mutable and are kept apart from the log.
