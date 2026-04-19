# How to Migrate a World to a New TTRPG Vault Version

## Purpose

This guide explains how to migrate a legacy world into the current TTRPG Vault structure.

## Prerequisites

Before using this workflow:

- confirm that the legacy world folder contains a `World.md` note
- place the full legacy world folder in `_system/migrations/_import/legacy-worlds/`
- decide the target world name
- decide the target campaign name
- decide whether the migrated world should use the `player` or `dm` role
- prepare optional timeline notes if you want to add them during setup

## Open the Migration Actions

1. Open `Worlds/TTRPG Game Index.md`.
2. Use the migration actions in the `Migration` section.

The available actions are:

- `Prep Legacy Import`
- `Run Legacy Migration`

## Prepare a Legacy Import

Use this step when the staged legacy notes contain pasted image embeds that still point to the vault attachment folder.

1. Click `Prep Legacy Import`.
2. Select the staged legacy world.

The preparation step:

- copies linked assets into the staged world's `Ressources/` folder
- rewrites staged note embeds to use `Ressources/...`
- creates a prep report in `_system/migrations/reports/`

If your staged world does not use pasted-image attachments, you can skip this step.

## Run a Dry Run First

Before applying the migration:

1. Click `Run Legacy Migration`.
2. Select the staged legacy world.
3. Enter the target world name.
4. Enter the target campaign name.
5. Select the role.
6. Enter optional timeline notes.
7. Select `Dry Run`.

The dry run does not create the migrated world in `Worlds/`.

Instead, it creates a migration report in `_system/migrations/reports/` that shows:

- recreated notes
- transformed notes
- copied resources
- warnings
- unmapped fields
- manual follow-up items
- validation failures

Review this report before continuing.

## Apply the Migration

When the dry run looks correct:

1. Click `Run Legacy Migration` again.
2. Enter the same migration details.
3. Select `Apply Migration`.

The migration creates the new structure automatically.

## What Happens Next

After the migration completes:

- a new `World.md` note is created in `Worlds/<TargetWorld>/`
- a new `Campaign.md` note is created in `Worlds/<TargetWorld>/<TargetCampaign>/`
- migrated notes are placed in the new campaign structure
- staged resources are copied into the new world and campaign `Ressources/` folders as needed
- a migration report is created in `_system/migrations/reports/`

The staged source world remains in `_system/migrations/_import/legacy-worlds/`.

## Review the Migrated World

After migration:

1. Open the generated migration report.
2. Review any warnings, manual follow-up items, or validation failures.
3. Open the new `World.md` and `Campaign.md` notes.
4. Confirm that important notes, links, and image embeds migrated correctly.

## Result

At the end of this process, you have a migrated world and campaign in the current TTRPG Vault structure, with a report that records what was recreated, transformed, copied, and still needs review.
