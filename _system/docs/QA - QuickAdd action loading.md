# QA - QuickAdd Action Loading

## Purpose

This checklist verifies that QuickAdd action wrappers load the latest local script changes and that the fresh-import fix did not break other QuickAdd-driven workflows.

## Scope

Use this checklist after changes to:

- `_system/scripts/quickadd/`
- `_system/scripts/actions/`
- `_system/scripts/builders/`

## Test Environment

- Open the vault in Obsidian desktop.
- Enable the required community plugins from `README.md`.
- Reload Obsidian after changing local scripts.

## Test 1 - World Creation Uses Latest Builder

Purpose:
Confirm that `Create World` uses the current `worldBuilder.js` output.

Steps:

1. Open `Worlds/TTRPG Game Index.md`.
2. Click `Create World`.
3. Enter a unique world name such as `QA World A`.
4. Select either role.
5. Enter an initial campaign name such as `QA Campaign A`.
6. Open the generated `Worlds/QA World A/World.md`.
7. Inspect the `World knowledge` base block.

Expected result:

- The note contains the latest generated structure from `worldBuilder.js`.
- The `World knowledge` section contains:
  - `- world == "QA World A"`
  - `- file.name != "Campaign"`
  - `- '!type.contains("world")'`
  - `- '!type.contains("session")'`
  - `- '!type.contains("encounter")'`
- The first campaign note is also created and opened.

## Test 2 - Create Campaign from Index Still Works

Purpose:
Confirm that the fresh-import change did not break `create-campaign` from the index.

Steps:

1. Open `Worlds/TTRPG Game Index.md`.
2. Click `Create Campaign`.
3. Select `QA World A`.
4. Enter a unique campaign name such as `QA Campaign B`.
5. Enter optional timeline notes.

Expected result:

- `Worlds/QA World A/QA Campaign B/Campaign.md` is created.
- The note opens automatically.
- `Worlds/QA World A/World.md` lists the new campaign in the `Campaigns` section.

## Test 3 - Create Campaign from World Note Still Works

Purpose:
Confirm that the world-note campaign shortcut still works.

Steps:

1. Open `Worlds/QA World A/World.md`.
2. Click `Add Campaign`.
3. Enter a unique campaign name such as `QA Campaign C`.
4. Enter optional timeline notes.

Expected result:

- `Worlds/QA World A/QA Campaign C/Campaign.md` is created.
- The note opens automatically.
- No world-selection prompt appears when launched from `World.md`.

## Test 4 - Encounter Creation Still Works

Purpose:
Confirm that another QuickAdd wrapper still imports and runs its latest action module.

Steps:

1. Use a world with `role: dm`.
2. Open a campaign note in that world.
3. Click `Create Encounter`.
4. Complete the required prompts.

Expected result:

- A new encounter note is created in the campaign.
- No import or module-loading error appears.

## Test 5 - Migration Entry Point Still Works

Purpose:
Confirm that the migration wrappers still load after the import change.

Steps:

1. Open `Worlds/TTRPG Game Index.md`.
2. Click `Prep Legacy Import`.
3. If you have a staged legacy world, complete the prompt flow.
4. Click `Run Legacy Migration`.
5. Run a `Dry Run` migration.

Expected result:

- The prep action opens and runs without a module-loading error.
- The migration action opens and runs without a module-loading error.
- A migration dry-run report is created when valid staged input is provided.

## Test 6 - Fresh Import Regression Check

Purpose:
Confirm that a local script edit is actually picked up after reload.

Steps:

1. Add a temporary visible marker to a generated output in one builder or action.
2. Reload Obsidian.
3. Run the related QuickAdd command once.
4. Confirm the marker appears.
5. Remove the marker.
6. Reload Obsidian.
7. Run the same QuickAdd command again with a new unique note name.

Expected result:

- The first generated note includes the marker.
- The second generated note no longer includes the marker.
- This confirms QuickAdd is loading the current local file contents rather than a stale cached module.

## Pass Criteria

The fix is validated when:

- Test 1 passes with the current world builder output.
- Tests 2 through 5 complete without module-loading regressions.
- Test 6 proves local edits are reflected after reload.
