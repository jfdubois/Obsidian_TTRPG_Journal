# How to Create and Run an Encounter

## Purpose

This guide explains how to create an encounter, add monsters, run combat, and close the encounter.

## Prerequisites

Before using this workflow:

- open the relevant `Campaign.md` note
- confirm that encounter actions are available in the campaign note
- ensure that monster sources are available if you plan to import monsters
- after updating `_system/srd/5etools-src`, open `_system/srd/sources.md` and click `Refresh Monster Sources` to resync the available bestiary sources

## Create an Encounter

1. Open the relevant `Campaign.md` note.
2. Click `Create Encounter`.
3. Enter the encounter name.
4. Enter an optional short description.

The system creates a new encounter note with an incremental encounter ID in the filename. The initial encounter status is `planned`.

The new encounter note includes:

- a short description
- additional encounter information
- the planned monster list
- initiative and combat tracking

## Add Monsters

To add monsters to the encounter:

1. Open the encounter note.
2. In the `Actions` section, click `Add Monsters`.
3. Select the monster to add.
4. Enter the quantity.
5. Choose whether the monsters should share one initiative value or roll separate initiatives.
6. Select the HP mode:
   - `Rolled HP`
   - `Low HP`
   - `Average HP`
   - `Default HP`

Repeat this process until the encounter contains all planned monsters.

The source list used by `Add Monsters` comes from `_system/srd/sources.md`. That file now shows the current local `srd-src` version at the top so you can confirm which 5etools snapshot the source list was built from.

## Start Combat

When combat begins:

1. Click `Set Players Initiatives`.
2. Enter up to 8 player combatants.
3. Select each player from the dropdown list when a character note exists, or enter the name manually if needed.
4. Enter each player’s initiative value.
5. Click `Start Combat`.

When combat starts:

- monster initiatives are rolled automatically
- monster HP is generated according to the selected HP mode
- the initiative table is populated
- the encounter status changes from `planned` to `inCombat`

Monster names in the encounter table can be opened for quick reference during combat.

## Track Combat

After combat has started, use the buttons under the initiative table to manage the encounter:

- `Next Turn` advances the active turn marker to the next combatant.
- `Apply Damage` records a damage event by source, target, amount, and damage type.
- `Apply Healing` records a healing event by source, target, and amount.

Each action updates the `Combat Log`, which provides a running record of combat events.

## Add Reinforcements or Additional Waves

If more monsters need to join the encounter after combat has started:

1. Click `Add Monsters`.
2. Add the new monsters using the same process as the initial setup.
3. Click `Update Combat`.

`Update Combat` calculates HP for the newly added monsters and inserts them into the initiative table.

## End Combat

When the encounter is complete:

1. Click `End Combat`.

This changes the encounter status to `Completed` and closes the combat workflow for that note.

## Result

At the end of this process, you have a completed encounter note with the combat history recorded for future reference.
