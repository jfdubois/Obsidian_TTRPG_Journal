# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- `CONTRIBUTING.md`, `LICENSE`, and GitHub issue and pull request templates.
- Added world-level schema versioning with `ttrpgSchemaVersion: 2` as the first post-`0.1.0` migration baseline.
- Added shared world and campaign builders to keep canonical note generation aligned across creation and migration.
- Added an Obsidian-native `migrate-legacy-world` QuickAdd command with dry-run and apply modes.
- Added migration support files under `_system/scripts/actions/migration/` and `_system/migrations/schema.json`.

### Changed

- Rewrote `README.md` into a more standard public project format.
- Linked the SOP to the rest of the project documentation set.
- Refactored world and campaign creation actions to use shared builders.
- Added a refreshable monster source configuration flow driven by the local `5etools-src` bestiary indexes, and updated the source header to show the current `srd-src` version.

### Docs

- Established a repo-wide documentation workflow for feature work and public-facing updates.
- Documented the monster source refresh workflow in the internal guidance and encounter docs.
