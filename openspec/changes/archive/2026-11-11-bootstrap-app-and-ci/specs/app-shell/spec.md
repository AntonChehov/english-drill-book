# Spec Delta

## Purpose

The window every screen of the app lives in: navigation that stays in one window, a stable address for every view, and a defined outcome for addresses that lead nowhere.

## ADDED Requirements

### Requirement: PROD-001 Single window

The app SHALL be a single-page application. All study SHALL happen in one window; no screen SHALL open another window or tab.

#### Scenario: Navigation stays in the window

- **WHEN** the learner follows any navigation link of the app
- **THEN** the destination is shown in the same window
- **AND** no other window or tab is opened

### Requirement: PROD-008 Addressable views

Each screen SHALL have its own URL. Reloading the page or opening that URL in another browser SHALL restore the same view.

#### Scenario: Reload keeps the view

- **GIVEN** the learner is on a screen other than the start screen
- **WHEN** they reload the page
- **THEN** the same screen is shown

#### Scenario: A copied address opens the same view

- **WHEN** the address of a screen is opened in a clean browser profile
- **THEN** that screen is shown

#### Scenario: Unknown address

- **WHEN** an address that matches no screen is opened
- **THEN** a not-found view is shown in Russian with a link to the start screen
- **AND** the page is not blank
