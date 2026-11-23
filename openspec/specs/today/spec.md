# today Specification

## Purpose
What the learner is offered to do on opening the app.

## Requirements

### Requirement: PROG-014 Today before programs

Until programs are delivered, Today SHALL list the units of the demo book in order with their done counts and links to Study.

#### Scenario: Units lead to Study

- **GIVEN** the demo books are added
- **WHEN** the learner chooses a unit on the start screen
- **THEN** Study opens for that unit

#### Scenario: Done counts

- **GIVEN** the learner completed two exercises of unit 1
- **WHEN** they return to the start screen
- **THEN** unit 1 shows two of three done, and the book shows its total

#### Scenario: Where to continue

- **GIVEN** unit 1 is finished and unit 2 is not
- **WHEN** the start screen is shown
- **THEN** unit 2 is marked as the one to continue

### Requirement: PROG-005 Today's topic

Today's topic SHALL be the focus topic if one is set and not passed; otherwise the first topic in order that is not passed. When every topic is passed, Today SHALL say the program is complete.

#### Scenario: The first topic not passed

- **GIVEN** no focus is set, topic 1 of the demo program is passed and topic 2 is not
- **WHEN** Today is shown
- **THEN** today's topic is topic 2

#### Scenario: Not passed is not the same as not started

- **GIVEN** no focus is set, topic 1 is in progress and topic 2 is passed
- **WHEN** Today is shown
- **THEN** today's topic is topic 1

#### Scenario: The focus topic

- **GIVEN** topic 3 is the focus and is not passed, and topic 1 is not passed
- **WHEN** Today is shown
- **THEN** today's topic is topic 3

#### Scenario: A passed focus

- **GIVEN** topic 3 was chosen as the focus and has since been passed, and topic 1 is not passed
- **WHEN** Today is shown
- **THEN** today's topic is topic 1

#### Scenario: A focus the program does not have

- **GIVEN** the stored focus names no topic of the demo program
- **WHEN** Today is shown
- **THEN** today's topic is the first topic not passed

#### Scenario: Program complete

- **GIVEN** every topic of the demo program is passed
- **WHEN** Today is shown
- **THEN** Today says «Программа пройдена: все темы зачтены.» and shows no topic

### Requirement: PROG-006 What Today shows

Today SHALL show: the goal, the current level on the scale with the share of each level, today's topic with its lead unit and supplements and their states, and the daily checklist.

#### Scenario: A fresh start

- **GIVEN** the demo books were just added
- **WHEN** Today is shown
- **THEN** it shows the goal «A1 → A2», the level «ниже A1», a row per level with «пройдено 0 из 2 тем», and today's topic «Глагол to be: am, is, are» at A1, «не начата», with step 1 «сделано 0 из 3» and step 2 «сделано 0 из 2 нужных» and the note «Для зачёта темы достаточно 2 из 3.»
- **AND** a card «Другие дела дня» with the three blocks of the demo program, none ticked

#### Scenario: Progress shown

- **GIVEN** the three exercises of unit 1 of the course and two drill exercises of topic 1 are done
- **WHEN** Today is shown
- **THEN** the row A1 reads «пройдено 1 из 2 тем», the level is «почти A1», and today's topic is the second

#### Scenario: Steps lead to Study

- **GIVEN** Today shows topic 1 and nothing is done
- **WHEN** the learner chooses «Открыть раздел», exercise 1.2 of step 1, or «Упр. 1.2» of step 2
- **THEN** Study opens in the same window at exercise 1.1 of the course, at exercise 1.2 of the course, or at exercise 1.2 of the drill book

#### Scenario: The main action goes where the topic goes on

- **GIVEN** exercise 1.1 of the course is done
- **WHEN** the learner chooses «Открыть раздел»
- **THEN** Study opens at exercise 1.2 of the course; once unit 1 of the course and drill 1.1 are done, it opens at exercise 1.2 of the drill book

#### Scenario: More drills than needed

- **GIVEN** the three drill exercises of topic 1 are done and none of its course unit
- **WHEN** Today is shown
- **THEN** step 2 reads «сделано 2 из 2 нужных», not «3 из 2»

#### Scenario: The focus after adding the demo

- **GIVEN** the learner adds the demo with the keyboard
- **WHEN** the books are stored
- **THEN** the focus is on the heading «Сегодня», and the next Tab reaches «другая тема», then «Открыть раздел»

#### Scenario: Not by colour alone

- **GIVEN** exercise 1.1 of the course is done and 1.2 is not
- **WHEN** Today is shown
- **THEN** each exercise link says by a sign and its accessible name whether it is done, and each level's share is given as text beside its bar

#### Scenario: The checklist when the program is complete

- **GIVEN** every topic is passed
- **WHEN** Today is shown
- **THEN** it says the program is complete and still shows «Другие дела дня»

### Requirement: PROG-013 One active program

Exactly one program SHALL be active at a time. With no active program, Today SHALL offer the units of the added books directly.

#### Scenario: The demo program is active with the demo books

- **GIVEN** the demo books are stored
- **WHEN** Today is shown, also after a reload
- **THEN** the demo program's goal and today cards are shown above the book cards

#### Scenario: No books, no program

- **GIVEN** a clean browser
- **WHEN** Today is shown
- **THEN** there is no goal card and no today card, only the offer to try the demo

### Requirement: PROG-009 The daily checklist

The daily checklist SHALL be per calendar day in the device's time zone. Ticks SHALL be stored for the day and start empty the next day.

#### Scenario: A tick is kept for the day

- **GIVEN** Today shows «Другие дела дня»
- **WHEN** the learner ticks «Прочитать страницу текста на английском» and reloads the page
- **THEN** that block is ticked and the other two are not

#### Scenario: The next day

- **GIVEN** a block was ticked on 23 November
- **WHEN** Today is shown on 24 November in the device's time zone
- **THEN** no block is ticked

#### Scenario: The day of the device

- **GIVEN** the device's time zone is three hours ahead of UTC
- **WHEN** a block is ticked at 22:30 UTC on 23 November
- **THEN** the tick belongs to 24 November

#### Scenario: The tick could not be kept

- **GIVEN** the browser refuses the write
- **WHEN** the learner ticks a block
- **THEN** the block stays unticked, a message beside the list says the tick could not be kept, and ticking again after the fault is gone keeps it

### Requirement: PROG-018 Today answers the pointer

On a device with a pointer, Today SHALL highlight the item under the pointer by its background: each step of today's topic and each rung of the level ladder. It SHALL show no tooltip for them.

#### Scenario: A rung under the pointer

- **GIVEN** Today shows the goal card
- **WHEN** the pointer rests on the rung A1
- **THEN** that rung's background differs from the rung A2's, and returns when the pointer leaves

#### Scenario: A step under the pointer

- **GIVEN** Today shows today's topic
- **WHEN** the pointer rests on step 2
- **THEN** step 2's background differs from step 1's

#### Scenario: No tooltip

- **WHEN** the pointer rests on a rung or a step
- **THEN** no tooltip appears and no element of the goal or today card has a `title`
