# 0002 — Content is JSON packs; PDFs are an optional view

Date: 2026-11-10. Status: accepted.

## Context

Workbooks are usually owned as PDFs. The app could treat the PDF as the content, or treat structured data as the content.

## Decision

Content is a versioned JSON pack validated against a published schema. A PDF is never required. A learner may attach their own PDF to a pack built from it; the pack records document hashes and page ranges so the app can verify the edition and show the right pages.

## Reasons

- Checking, progress and the mistakes list need keys and stable IDs as data. Extracting them from a PDF at run time is slow and unreliable.
- The public repository can then hold only original content, and third-party material never needs to pass through it or through any server.
- The pack format is a contract others can target with their own converters.

## Consequences

- Converters for particular books are separate, private tools.
- Edition handling is explicit: one pack `id` per edition, semantic versions for data fixes, ID migrations on major versions, SHA-256 verification of attached documents.
