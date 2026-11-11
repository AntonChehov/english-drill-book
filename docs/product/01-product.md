# 01 — Product

## Purpose

A learner working through grammar workbooks needs three things the books cannot give: checking of answers, memory of what was done and what went wrong, and a daily answer to "what do I do now". English Drill Book provides them in one window, for any workbook described as a content pack.

It also joins material from different books. A learner rarely uses one book: a grammar course explains a topic and gives a few exercises, and a separate drill book has many more on the same topic, under its own numbering. English Drill Book ties a grammar topic to its exercises in each book, so the learner studies a topic, not a book, and does not have to find the matching pages themselves.

The app is for Russian speakers learning English: the interface is in Russian, the material is in English.

## Users

- **Learner** — studies alone, usually on a laptop, sometimes on a phone. May be offline. Does not want an account.
- **Pack author** — writes or converts a workbook into a pack. Needs clear validation errors.
- **Visitor** — opens the public demo to see what the app does. Must reach a working exercise in under a minute, with no setup.

## Screens

| Screen | Purpose |
| --- | --- |
| Today | goal and current level, today's topic with its exercises, daily checklist |
| Topics | the whole program in order, grouped by level, with status per topic |
| Study | one unit: the book's pages on one side, exercises on the other |
| Mistakes | items whose latest result is wrong |
| Library | installed packs and programs; import, update, remove; export and import of progress |
| Settings | theme |

## Requirements

- **PROD-001 [M1]** The app is a single-page application. All study happens in one window; no screen opens another window or tab.
- **PROD-002 [M1]** On first launch with no data the app opens Today, which offers to try the demo book with one action and to add the learner's own books. Why: a visitor must see a working product without reading instructions.
- **PROD-003 [M1]** After its first successful load the app works without a network connection for every book added from the learner's own files. The demo book is the exception (`PACK-003`).
- **PROD-004 [M1]** The interface is in Russian. Pack content is shown as authored and is not translated. Interface text and pack content are each marked with their language (`lang`), so that screen readers pronounce both correctly.
- **PROD-005 [M1]** Light and dark themes follow the system setting and can be overridden.
- **PROD-006 [M1]** Layout adapts from 360 px wide upward. In Study, pages and exercises sit side by side from 1024 px and stack below that.
- **PROD-007 [M1]** Every action is available from the keyboard. In Study, Enter checks the current exercise and Tab moves through its fields in order.
- **PROD-008 [M1]** Each screen and each unit has its own URL. Reloading or sharing a URL restores the same view.
- **PROD-009 [M1]** The app never shows a blocking browser dialog (`alert`, `confirm`, `prompt`). Destructive actions use an inline two-step confirmation.
- **PROD-010 [M2]** The app can be installed as a PWA and, once installed, starts offline.
- **PROD-011 [M1]** A failure in one part (a corrupt pack, a storage error) shows a message in that part and leaves the rest of the app usable. No failure produces a blank page.

## Non-goals for milestones 1–3

Accounts and sync between devices (planned as milestone 5, see decision 0001), spaced repetition, speech, gamification beyond levels, AI-generated feedback, an in-app pack editor.
