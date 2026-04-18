# Legacy World Migration

This tool migrates legacy flat world folders from the old vault layout:

```text
Worlds/<WorldName>/
  World.md
  001_YYYYMMDD.md
  NPC.md
  Story/...
  Ressources/...
```

into the new layout used by this vault:

```text
Worlds/<WorldName>/
  World.md
  Ressources/
  <CampaignName>/
    Campaign.md
    001_YYYYMMDD.md
    NPC.md
    Story/...
    Ressources/...
```

## What it updates

- reads only from the configured source `Worlds/` folder
- creates a new `World.md` and `Campaign.md`
- moves legacy notes under the campaign folder
- preserves subfolders like `Story/`
- adds `alive: true` when missing on `npc` and `character` notes
- adds `playerName` to `character` notes when it can infer it from the old `Players` section
- rewrites old `Worlds/<WorldName>` query paths to the new campaign path

## First run

From the vault root:

```bash
python3 tools/migrate_legacy_worlds.py --config tools/migration.config.example.json --dry-run
```

## Real run

Linux/macOS:

```bash
python3 tools/migrate_legacy_worlds.py --config tools/migration.config.example.json
```

Windows:

```powershell
py .\tools\migrate_legacy_worlds.py --config .\tools\migration.config.example.json
```

## Config fields

- `sourceWorldsRoot`: source path that contains the legacy world folders
- `targetVaultRoot`: target TTRPGv2 vault root
- `worlds`: explicit migrations to run

Each `worlds[]` entry supports:

- `sourceWorld`
- `targetWorld`
- `targetCampaign`
- `role`
- `timelineNotes`

The tool is intentionally explicit. It does not auto-migrate every world unless you list it in the config.

## Using Obsidian CLI

Obsidian CLI gives us a good way to make migration feel native to the vault instead of asking users to leave Obsidian and run a separate toolchain.

This is the best fit for the current TTRPG project:

- use the CLI as the user-facing entrypoint
- keep the actual migration logic in a dedicated TTRPG migration action
- use the CLI again for validation and post-migration checks

### Why this helps

The official Obsidian CLI can:

- execute plugin commands
- create, move, rename, and read files in the vault
- list files, folders, links, unresolved links, and search results
- run JavaScript in the Obsidian app with `obsidian eval`

That means we can make migration feel like a first-class vault action instead of an external maintenance script.

### What the CLI should do for us

For this vault, the CLI is strongest in three places:

1. Start the migration from a single command.
2. Let power users script repeated migrations.
3. Verify the migrated vault structure afterward.

Good examples:

```bash
obsidian commands filter=quickadd:
obsidian command id=quickadd:choice:<migration-choice-id>
obsidian unresolved counts
obsidian files folder="Worlds/My World/My Campaign" ext=md total
obsidian read path="Worlds/My World/World.md"
obsidian read path="Worlds/My World/My Campaign/Campaign.md"
```

### What the CLI should not replace

The CLI is not a full migration engine by itself.

Our migration needs more than file moves:

- parse and rewrite frontmatter
- create a new `World.md`
- create a new `Campaign.md`
- rewrite old `Worlds/<WorldName>` paths
- infer missing fields like `alive` and `playerName`
- copy resources to the correct world-level or campaign-level location

Those rules should stay in one owned migration module, not be spread across shell commands.

### Recommended direction

If we want to minimize external tools, the cleanest path is to move the current Python logic into an in-vault JavaScript migration action and expose it through QuickAdd.

Recommended flow:

1. Add a staging folder inside the vault, for example `_system/migrations/_import/legacy-worlds/`.
2. Ask the user to place the old world folder there before running migration.
3. Add a new action such as `_system/scripts/actions/migration/migrateLegacyWorld.js`.
4. Expose it as a QuickAdd choice with `command: true`.
5. Run it from Obsidian directly or from terminal with `obsidian command id=...`.
6. Run CLI verification commands after migration.

This avoids a separate Python dependency for normal users while keeping the migration logic explicit and testable.

### Why a staging folder is important

The current Python tool can read from any configured path on disk and write to another vault.

An in-vault migration command will be much simpler and safer if the source data is already inside the target vault in a known import folder. That gives us:

- one vault context
- normal Obsidian file APIs
- easier previews and dry runs
- fewer OS-specific path issues

In practice, the UX becomes:

1. copy old world folder into `_system/migrations/_import/legacy-worlds/`
2. run `Migrate Legacy World`
3. review the generated `World.md` and `Campaign.md`
4. run CLI verification checks
5. delete the staging copy when satisfied

### Best split of responsibilities

Use Obsidian CLI for:

- launching the migration command
- listing available commands
- reading migration reports
- checking unresolved links
- checking final file layout

Use the TTRPG migration action for:

- frontmatter normalization
- note content rewriting
- resource placement
- default-field inference
- dry-run summaries
- migration warnings

### Practical implementation plan

Phase 1:

- keep `tools/migrate_legacy_worlds.py` as the working fallback
- add a new documented Obsidian-native migration path

Phase 2:

- port the Python migration rules into `_system/scripts/actions/migration/migrateLegacyWorld.js`
- add a QuickAdd command such as `migrate-legacy-world`
- add a small form for `sourceWorld`, `targetWorld`, `targetCampaign`, `role`, and `timelineNotes`
- add an optional `dryRun` mode that writes a migration report note instead of changing files

Phase 3:

- add a migration dashboard note with buttons and troubleshooting
- add CLI-oriented verification commands to this document
- optionally add a second command for batch migration of all staged worlds

### Recommendation

Use Obsidian CLI as the front door, not as the migration brain.

That gives users a native workflow and automation-friendly entrypoint, while we keep the actual transformation logic inside the vault where it can understand TTRPG-specific rules.

## Recreate Vs Transform

Not every legacy note should be migrated the same way.

The current note creation backend is the source of truth for the latest schema, but recreating every note from the latest templates would throw away user-authored content and any older fields that still matter.

Recommended split:

- recreate system scaffold notes whose structure is mostly generated:
  - `World.md`
  - `Campaign.md`
- transform notes that mostly contain authored play content:
  - sessions
  - entities
  - encounters, unless they can be safely regenerated from preserved data

In practice this means:

- use the current generators to define the target shape
- normalize frontmatter on legacy notes to match the latest schema
- preserve body content whenever possible
- rebuild only the derived sections that are meant to be system-owned

Because this project currently has one known legacy user, it is reasonable to choose the current baseline as the official migration target instead of trying to preserve every historical intermediate format.

## Migration Baseline

When updating migration rules, always compare against the live generators first:

- `_system/scripts/actions/world/createWorld.js`
- `_system/scripts/actions/campaign/createCampaign.js`
- `_system/templates/new-session.md`
- `_system/templates/new-entity.md`
- `_system/templates/encounter-template.md`

If those generators changed, the migration tool must be updated in the same change so it still targets the latest schema.

## User Flow

Recommended user flow for the future Obsidian-native migration command:

1. Place the legacy world in the migration staging folder.
2. Choose the source world, target world, target campaign, role, and timeline notes.
3. Run a dry-run first.
4. Review the migration report:
   recreated notes
   transformed notes
   unmapped fields
   warnings
5. Run the real migration.
6. Open the generated `World.md` and `Campaign.md`.
7. Run validation checks:
   unresolved links
   missing required properties
   notes that still need manual review

The user should not need to understand the internal schema. The migration feature should explain what changed and what still needs attention.

Current implementation status:

- `migrate-legacy-world` QuickAdd command is implemented
- source staging folder: `_system/migrations/_import/legacy-worlds/`
- migration reports: `_system/migrations/reports/`
- world schema marker: `ttrpgSchemaVersion: 2`
- world and campaign builders are implemented and reused by creation actions

## Versioning

Migration should follow schema versioning instead of one-off conversions.

Recommended meaning:

- patch: implementation-only fix, no note migration required
- minor: backward-compatible schema expansion or normalization
- major: breaking change to note schema, note placement, or required workflow

Recommended rules:

- every migration-sensitive schema change should update a schema version marker
- minor migrations should be safe to run in place
- major migrations should always have an explicit dry-run and a user-facing migration path
- migration docs should state which legacy schema versions are supported

For implementation, a simple first step is:

- keep one vault-level migration manifest for supported schema versions
- optionally add per-note schema markers later if note-level branching becomes necessary

## Technical Design

This section describes the recommended implementation for an Obsidian-native migration flow that does not require external tools for normal usage.

### Design Goals

- run migration from Obsidian or Obsidian CLI
- keep migration logic inside the vault
- avoid reimplementing note schemas in multiple places
- preserve user-authored note content
- support both minor and major schema evolution
- keep migration deterministic and non-interactive once inputs are chosen

### High-Level Architecture

Use four layers:

1. CLI and command layer
2. migration action layer
3. shared builder layer
4. detection and validation layer

Recommended flow:

```text
Obsidian CLI / QuickAdd command
  -> QuickAdd wrapper
  -> JS Engine migration action
  -> scan + detect legacy shape
  -> build migration plan
  -> generate latest canonical note output through shared builders
  -> merge preserved user content
  -> write migrated notes + report
  -> run validation checks
```

### Command Layer

Recommended new command path:

- QuickAdd choice: `migrate-legacy-world`
- QuickAdd script wrapper: `_system/scripts/quickadd/migrateLegacyWorld.js`
- JS Engine action: `_system/scripts/actions/migration/migrateLegacyWorld.js`

The CLI should only be responsible for launching the command, for example:

```bash
obsidian command id=quickadd:choice:<migration-choice-id>
```

The actual migration logic should live in the JS Engine action, not in the CLI shell command.

### Shared Builder Layer

Do not make migration call the interactive note templates directly.

Instead, extract canonical note-generation logic into shared builder modules that accept structured input and return note content.

Recommended builder files:

- `_system/scripts/builders/worldBuilder.js`
- `_system/scripts/builders/campaignBuilder.js`
- `_system/scripts/builders/sessionBuilder.js`
- `_system/scripts/builders/entityBuilder.js`
- `_system/scripts/builders/encounterBuilder.js`

Recommended builder API shape:

```js
buildWorldNote(data) -> { frontmatter, content }
buildCampaignNote(data) -> { frontmatter, content }
buildSessionNote(data) -> { frontmatter, content }
buildEntityNote(data) -> { frontmatter, content }
buildEncounterNote(data) -> { frontmatter, content }
```

The current create-world, create-campaign, and future migration actions should all depend on these builders so the canonical output stays aligned.

### Detection Layer

Migration should use both schema version markers and actual note inspection.

Recommended detection inputs:

- `World.md` frontmatter `ttrpgSchemaVersion`
- note `type`
- presence or absence of `campaign`
- current folder layout
- required frontmatter keys for each note type
- legacy query paths such as old `Worlds/<WorldName>` references
- outdated system-owned sections such as old Dataview blocks

Recommended rule:

- version marker decides whether migration is likely required
- live note inspection decides what exact transformations are needed

### Version Markers

Recommended first version marker:

```yaml
ttrpgSchemaVersion: 2
```

Initial guidance:

- add `ttrpgSchemaVersion` to generated `World.md`
- optionally add a vault migration manifest later, for example `_system/migrations/schema.json`
- only add per-note schema markers if note-level branching becomes necessary

This keeps the first implementation simple while still giving us a reliable world-level trigger.

### Migration Modes

Support two migration modes:

- dry run
- apply

Dry run should:

- scan the source world
- detect schema differences
- classify each note action
- generate a migration report
- write nothing to the canonical target area

Apply should:

- perform the planned writes
- keep legacy source notes in staging
- write a migration report note
- run post-migration validation

### Note Handling Rules

Recommended default note strategy by type:

- `World.md`
  - recreate from builder
  - preserve safe user-authored world notes content when mapping is clear
- `Campaign.md`
  - recreate from builder
  - preserve safe legacy sections such as player notes when possible
- `session`
  - transform existing note
  - normalize frontmatter
  - preserve authored recap, logs, and summary content
- `npc`, `character`, `place`, `store`, `faction`, `quest`, `plane`, `region`
  - transform existing note
  - normalize frontmatter
  - rebuild system-owned derived sections only when needed
- `encounter`
  - transform existing note
  - normalize combat-related frontmatter
  - preserve logs and custom notes

### Rebuild Strategy

For transformed notes, use this merge model:

1. Parse the legacy note.
2. Map legacy frontmatter into normalized builder input.
3. Generate the latest canonical note output from the builder.
4. Preserve selected user-authored body sections from the legacy note.
5. Replace outdated system-owned sections when necessary.
6. Write the migrated note.

This gives us a safe middle ground:

- latest schema and derived sections come from the builder
- custom writing is preserved from the source note

### Entity Migration Rules

Entities are the main place where property drift will happen over time.

Recommended entity migration rules:

- always normalize required shared properties:
  - `type`
  - `date`
  - `world`
  - `campaign`
  - `plane`
  - `region`
  - `location`
  - `description`
  - `introducedIn`
- add missing defaults for type-specific required properties
- keep unknown legacy properties unless they conflict with current reserved fields
- record unknown properties in the migration report
- allow future config for included or excluded entity types

If a future schema changes a system-owned Dataview block for `place`, `plane`, or `region`, the builder should own that block and migration should refresh it automatically.

### Validation Layer

Recommended post-migration validation:

- unresolved wikilinks
- missing required frontmatter by note type
- invalid world/campaign folder placement
- duplicate target note names
- unsupported legacy entity types
- notes with preserved unknown properties

Validation output should be written to a migration report note and optionally echoed in a terminal-friendly format when launched by CLI.

### Migration Report

Recommended report sections:

- source world
- target world
- source schema version
- target schema version
- recreated notes
- transformed notes
- copied resources
- warnings
- unmapped fields
- manual follow-up notes
- validation failures

### Suggested File Additions

Recommended first implementation files:

- `_system/scripts/quickadd/migrateLegacyWorld.js`
- `_system/scripts/actions/migration/migrateLegacyWorld.js`
- `_system/scripts/actions/migration/lib/detectLegacyWorld.js`
- `_system/scripts/actions/migration/lib/planMigration.js`
- `_system/scripts/actions/migration/lib/applyMigration.js`
- `_system/scripts/actions/migration/lib/reportMigration.js`
- `_system/scripts/builders/worldBuilder.js`
- `_system/scripts/builders/campaignBuilder.js`
- `_system/scripts/builders/entityBuilder.js`

Second wave, once the pattern is working:

- `_system/scripts/builders/sessionBuilder.js`
- `_system/scripts/builders/encounterBuilder.js`
- `_system/migrations/schema.json`

### Suggested Refactors

To make this sustainable, existing creation actions should gradually move their canonical content generation into builders.

Recommended sequence:

1. Extract `World.md` builder from `createWorld.js`.
2. Extract `Campaign.md` builder from `createCampaign.js`.
3. Introduce world-level schema version marker in generated `World.md`.
4. Implement dry-run migration command for structural world-to-campaign migration.
5. Add entity normalization using shared builder logic.
6. Add session and encounter normalization.

### Example World Frontmatter

Recommended generated world frontmatter shape:

```yaml
type: world
world: My World
status: active
role: player
system:
banner: "![[world-banner.jpg]]"
ttrpgSchemaVersion: 2
```

### Complexity Assessment

This approach is not too complex for the value it gives, as long as it is phased.

The complexity stays manageable because:

- the CLI remains a launcher only
- builders centralize canonical output
- migration uses explicit rules instead of template automation hacks
- source notes are preserved in staging for manual recovery

### Recommended Next Build Step

The best next implementation step is:

1. run the migration flow against a real staged legacy world
2. compare migrated entity, session, and encounter notes against current creation expectations
3. harden merge rules for system-owned sections that still need smarter refresh behavior
4. add CLI-based validation and regression checks once a test fixture world exists

That will move the feature from implemented baseline to validated migration workflow.
