# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- `CONTRIBUTING.md`, `LICENSE`, and GitHub issue and pull request templates.
- Added world-level schema versioning with `ttrpgSchemaVersion: 2` as the first post-`0.1.0` migration baseline.
- Added shared world and campaign builders to keep canonical note generation aligned across creation and migration.
- Added an Obsidian-native `migrate-legacy-world` QuickAdd command with dry-run and apply modes.
- Added migration support files under `_system/scripts/actions/migration/` and `_system/migrations/schema.json`.
- Added the `Iconize` community plugin to the tracked vault setup.
- Added tracked default banner images under `_system/media/images/banners/`.

### Changed

- Rewrote `README.md` into a more standard public project format.
- Linked the SOP to the rest of the project documentation set.
- Refactored world and campaign creation actions to use shared builders.
- Fixed legacy world migration so a single staged campaign subfolder is flattened into the selected target campaign, with nested asset lookup following that legacy layout.
- Fixed imported campaigns so `Add Session` detects existing session notes even when imported frontmatter values are quoted, and continues numbering from the highest existing session filename.
- Fixed `Add Session` recap generation so it copies only the previous note's `Session Summary` section and no longer duplicates the `Recap` heading when the prior summary is empty.
- Added a refreshable monster source configuration flow driven by the local `5etools-src` bestiary indexes, and updated the source header to show the current `srd-src` version.
- Moved the documentation set from top-level `docs/` into `_system/docs/`.
- Kept `TTRPG Game Index.md` under `Worlds/` as the tracked vault entry note.
- Removed the retired top-level `tools/` migration folder after the Obsidian-native migration flow became the maintained path.

### Docs

- Established a repo-wide documentation workflow for feature work and public-facing updates.
- Documented the monster source refresh workflow in the internal guidance and encounter docs.
- Updated contributor and maintenance references to point at `_system/docs/` and the current migration docs.
