# 06 — Progress and data

## Purpose

The learner's history is the most valuable thing the app holds and the only thing that cannot be regenerated. It stays on the device, survives updates of the app and re-reading of books, and can be taken out in a documented format.

## Model

Progress is an append-only log of **attempts**. Everything shown — done marks, levels, mistakes — is derived from the log. Why: a log merges without conflicts, which makes export/import safe today and makes sync between devices (milestone 5) a matter of exchanging entries rather than reconciling states.

An attempt (`contracts/export.schema.json#/$defs/attempt`) records: a unique `id`, time, pack `id` and `version`, exercise ID, the answers, the verdict per item, which items were revealed or overridden, and whether the exercise was fully correct.

Besides attempts the app stores: drafts, the daily checklist ticks, settings (theme, active program, focus topic), the packs built from the learner's books, and the references to their files.

## Requirements

- **DATA-001 [M1]** All data is stored in the browser (IndexedDB). The app makes no network request other than loading its own static files, the demo books among them, from its own origin.
- **DATA-002 [M1]** Every check, override, reveal and "mark as done" appends an attempt. Attempts are never edited or deleted by normal use.
- **DATA-003 [M1]** Derived state is recomputed from the log. Derived values may be cached, and a cache that is missing or stale is rebuilt without loss.
- **DATA-004 [M1]** A write that fails is reported to the learner next to the action that caused it, and the action can be retried. The app does not show a result as saved before the write has succeeded.
- **DATA-005 [M1]** The storage schema is versioned. Opening data written by an older version migrates it in place; opening data written by a newer version stops with a message and changes nothing.
- **DATA-006 [M2]** Mistakes lists every item whose latest verdict is `bad` or `near`, grouped by unit, with the learner's answer and a link to the exercise. An item leaves the list when a later attempt makes it `ok`, or when the learner removes it by hand. A removed item returns only if it is answered wrongly again. The removal is recorded in the log.
- **DATA-013 [M2]** Progress is saved automatically, so taking it out is named "Export data", never "save". It is one action. It offers to save the file on the device and, where the system provides a share dialog, to send it through the learner's own apps (messenger, mail and others). Where there is no share dialog only saving is offered, with a one-line hint that the file can be sent by any means. The app itself sends nothing anywhere.
- **DATA-007 [M2]** The exported file is one JSON file valid against `export.schema.json`, containing all attempts, checklist ticks and settings. It contains no book content, no packs and no file references.
- **DATA-008 [M2]** Import validates the file, then merges: attempts are added by `id` and existing ones are left unchanged; checklist ticks are united; settings are taken from the file only if the learner asks. Importing the same file twice changes nothing the second time.
- **DATA-009 [M2]** Export from one browser profile followed by import into an empty one, with the same books added, yields identical Today, Topics and Mistakes screens.
- **DATA-010 [M2]** The learner can erase all data. This requires typing a confirmation word and offers an export first.
- **DATA-011 [M2]** The app asks the browser for persistent storage after the first check. Why: without it a browser may delete months of progress when the disk runs low.
- **DATA-014 [M2]** If persistent storage is not granted, the app says so once after the request and permanently in Library, in at most three short sentences: what can happen (the browser may delete the progress when the disk is nearly full), and what to do (install the app, which makes the browser keep its data, or export the data to a file regularly). Each remedy is a button next to the text. The message uses no technical terms.
- **DATA-012 [M1]** Two tabs of the app open at once do not corrupt data, and an attempt made in one is visible in the other after it regains focus.
