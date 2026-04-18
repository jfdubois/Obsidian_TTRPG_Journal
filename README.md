# TTRPG for Obsidian

An Obsidian vault template for D&D 5e campaign management, encounter prep, and combat tracking.

This project separates shared world knowledge from campaign-specific play spaces, automates note creation, and integrates 5etools SRD data for monster lookup and encounter building.

## Project Status

Active development. The vault is already usable, but the workflow is still evolving and some areas are tailored to the maintainer's current Obsidian setup.

## Highlights

- Shared `World.md` reference notes with multiple campaign hubs per world
- Auto-numbered session notes with recap carry-forward
- Campaign-scoped entities such as NPCs, places, factions, quests, regions, and planes
- Encounter creation with monster import from configured 5etools sources
- Combat workflow with initiative, HP tracking, logging, and end-of-battle summary data
- Obsidian-native migration tooling for older world structures

## Requirements

- [Obsidian](https://obsidian.md/) desktop installed
- Git installed for cloning the SRD source data
- Community plugins enabled in Obsidian

## Compatibility

- Designed for Obsidian desktop
- Built around community plugin workflows
- Not yet documented or tested as a mobile-first setup
- Requires a local clone of the 5etools source data for monster integration

Required community plugins:

- Dataview
- JS Engine
- QuickAdd
- Templater
- Modal Forms
- Buttons
- Banners
- Homepage
- Leaflet

Recommended plugins:

- Style Settings

## Installation

1. Clone or download this repository into your Obsidian vaults folder.
2. Clone the 5etools source data:

```bash
cd _system/srd
git clone https://github.com/5etools-mirror-1/5etools-mirror-1.github.io.git 5etools-src
```

3. Open the vault in Obsidian.
4. Enable community plugins in `Settings -> Community plugins`.
5. Make sure the required plugins listed above are installed and enabled.
6. Open `Worlds/TTRPG Game Index.md` and run a test world creation flow.

## How to Use

### Create a world

1. Open `Worlds/TTRPG Game Index.md`.
2. Click `Create World`.
3. Enter the world name, role, and initial campaign name.
4. The vault creates a shared `World.md` plus the first `Campaign.md`.

### Add a campaign

1. Use `Create Campaign` from the index, or `Add Campaign` from `World.md`.
2. Choose the world if needed.
3. Enter a campaign name and optional timeline notes.
4. A new campaign hub is created inside the selected world folder.

### Run sessions

1. Open a campaign's `Campaign.md`.
2. Click `Add Session`.
3. The vault creates the next session note as `NNN_YYYYMMDD.md`.
4. The new note includes a recap area, summary area, and session log space.

### Create entities

You can create structured entities in two ways:

- From `Campaign.md`, click `Add Entity` and complete the modal form.
- From a session note, create a note from an unresolved wikilink such as `[[New NPC]]`.

### Plan and run encounters

1. From `Campaign.md`, click `Create Encounter`.
2. Add monsters from enabled 5etools sources.
3. Start combat to roll initiative and generate combatants.
4. Use the combat actions to advance turns, apply damage, apply healing, and close the battle.

### Migrate a legacy world

1. Place the legacy world folder in `_system/migrations/_import/legacy-worlds/`.
2. If the old notes use pasted images from the vault attachment folder, run `QuickAdd: prepare-legacy-world-import` first.
3. Review the generated prep report and confirm staged notes now link to local `Ressources/` files.
4. Run `QuickAdd: migrate-legacy-world`.
5. Choose the source world, target world, target campaign, role, and mode.
6. Start with `Dry Run` and review the generated migration report.
7. Run `Apply Migration` once the report looks correct.

The migration flow is designed to keep staged source files in place and write reports to `_system/migrations/reports/`.

## Configuration

### Monster sources

Edit `_system/srd/sources.md` to control which source books appear in the monster selector.

Example:

```markdown
- **MM**: enabled: true - Monster Manual
- **VGM**: enabled: false - Volo's Guide to Monsters
```

By default, core rulebooks are enabled and the rest are disabled to keep the selector manageable.

## Documentation

- [README.md](README.md): public project overview and setup
- [docs/SOP - TTRPG note creation.md](<docs/SOP - TTRPG note creation.md>): detailed note-creation workflow reference
- [CONTRIBUTING.md](CONTRIBUTING.md): contribution and pull request expectations
- [CHANGELOG.md](CHANGELOG.md): human-readable record of notable changes

## Repository Structure

```text
TTRPG-DEV/
├── _system/migrations/          # Migration schema, staged imports, and reports
│   ├── _import/
│   │   └── legacy-worlds/
│   ├── reports/
│   └── schema.json
├── Worlds/                      # Campaign data (gitignored except index)
│   ├── TTRPG Game Index.md
│   └── <WorldName>/
│       ├── World.md
│       ├── Ressources/
│       └── <CampaignName>/
│           ├── Campaign.md
│           ├── 001_YYYYMMDD.md
│           ├── E0001_Name.md
│           ├── EntityName.md
│           └── Ressources/
├── _system/                     # Templates, scripts, migration logic, and system assets
├── docs/                        # Project process and SOP documentation
├── tools/                       # Utility scripts such as migrations
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

Actual campaign content inside `Worlds/` is intentionally ignored so the repository can stay usable as a reusable vault template rather than a personal campaign archive.

## Changelog

Latest notable update:

- `Documentation and repo baseline`: added contributor docs, a Codex context sheet, GitHub templates, and a rewritten README.

See [CHANGELOG.md](CHANGELOG.md) for the full history.

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md) so the docs and workflow stay aligned with the vault behavior.

## License

This project is released under the [MIT License](LICENSE).
