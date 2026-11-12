# Spec Delta

## Purpose

Where the learner's data is kept, how the history of their work is recorded, and what is derived from it.

## ADDED Requirements

### Requirement: DATA-001 Data stays in the browser

All data SHALL be stored in the browser (IndexedDB). The app SHALL make no network request other than loading its own static files, the demo books among them, from its own origin.

#### Scenario: The demo is kept

- **GIVEN** a visitor added the demo books
- **WHEN** they reload the page
- **THEN** the demo books are shown as added, and no demo file and no file of the PDF library is requested

#### Scenario: Nothing is sent

- **WHEN** the demo is added and the page is reloaded
- **THEN** every request went to the app's own origin and none carried data of the visitor

#### Scenario: Little is stored

- **WHEN** the demo is added
- **THEN** the site's stored data grows by less than 5 MB

### Requirement: DATA-002 The attempt log

Every check, override, reveal and "mark as done" SHALL append an attempt. Attempts SHALL never be edited or deleted by normal use.

#### Scenario: An attempt is appended

- **WHEN** an attempt is appended for an exercise
- **THEN** reading the attempts of that exercise returns it after the earlier ones, unchanged

#### Scenario: An attempt cannot be replaced

- **GIVEN** an attempt is in the log
- **WHEN** an attempt with the same `id` is appended
- **THEN** the write is refused and the log is as it was

#### Scenario: An attempt is what the export format defines

- **WHEN** an attempt is built from an exercise, answers and verdicts
- **THEN** it is valid against the attempt of `export.schema.json`

### Requirement: DATA-003 Derived state

Derived state SHALL be recomputed from the log. Derived values may be cached, and a cache that is missing or stale SHALL be rebuilt without loss.

#### Scenario: Done stays done

- **GIVEN** an exercise with a complete attempt followed by an attempt with a wrong item
- **WHEN** its state is derived
- **THEN** the exercise is done and that item's latest verdict is `bad`

#### Scenario: A missing cache

- **GIVEN** attempts in the log and the cached state deleted
- **WHEN** the state of the exercise is read
- **THEN** it equals the state derived from the log, and the cache is written again

#### Scenario: A stale cache

- **GIVEN** a cached state built from fewer attempts than the log now holds
- **WHEN** the state of the exercise is read
- **THEN** it equals the state derived from the whole log

### Requirement: DATA-004 Failed writes

A write that fails SHALL be reported to the learner next to the action that caused it, and the action SHALL be retryable. The app SHALL NOT show a result as saved before the write has succeeded.

#### Scenario: The demo cannot be kept

- **GIVEN** the browser refuses to store data
- **WHEN** the visitor adds the demo
- **THEN** a message in Russian, where the demo was being added, says the books could not be kept, with a way to try again
- **AND** the books are not shown as added

#### Scenario: All or nothing

- **GIVEN** the write of an attempt fails halfway
- **WHEN** the log and the cached state are read
- **THEN** neither contains anything of that attempt

### Requirement: DATA-005 Versioned schema

The storage schema SHALL be versioned. Opening data written by an older version SHALL migrate it in place; opening data written by a newer version SHALL stop with a message and change nothing.

#### Scenario: Older data

- **GIVEN** a database written by an earlier schema version
- **WHEN** the app opens it
- **THEN** the data is migrated and every attempt and pack is still there

#### Scenario: Newer data

- **GIVEN** a database written by a later schema version
- **WHEN** the app opens it
- **THEN** a message in Russian says the data was written by a newer version of the app, nothing that writes is offered, and the database is unchanged

#### Scenario: Another tab upgrades

- **GIVEN** the app is open in a tab
- **WHEN** a newer version of the app in another tab upgrades the database
- **THEN** the first tab does not block the upgrade and shows the same message

### Requirement: DATA-012 Two tabs

Two tabs of the app open at once SHALL NOT corrupt data, and an attempt made in one SHALL be visible in the other after it regains focus.

#### Scenario: Seen in the other tab

- **GIVEN** the app is open in two tabs
- **WHEN** the demo is added in the first and the second regains focus
- **THEN** the second shows the demo as added without a reload

#### Scenario: Attempts from two connections

- **GIVEN** two connections to the database
- **WHEN** each appends attempts to the same exercise in turn
- **THEN** the log holds every attempt once, and the state read through either connection is the state derived from the whole log
