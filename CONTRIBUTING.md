# Contributing

Thanks for taking an interest in this project.

This repository is an Obsidian vault template with automation scripts and supporting documentation. Contributions are welcome, especially when they keep the workflow clear and the public docs accurate.

## Before You Start

- Read [README.md](README.md) for the public overview and setup steps.
- Read [docs/SOP - TTRPG note creation.md](<docs/SOP - TTRPG note creation.md>) if your change affects note creation or user workflow.

## Local Setup

1. Clone the repository.
2. Clone the 5etools source data into `_system/srd/5etools-src`.
3. Open the vault in Obsidian.
4. Install and enable the required community plugins listed in the README.

## Contribution Guidelines

- Keep changes focused and avoid unrelated cleanup in the same pull request.
- Preserve the existing world, campaign, session, and entity model unless the change is deliberate and documented.
- Update docs in the same change when behavior changes.
- Do not include personal campaign data inside `Worlds/`; that content is intentionally ignored.

## Documentation Expectations

If your change affects user-facing behavior, update the relevant files:

- `README.md` for setup, feature overview, or usage changes
- `docs/SOP - TTRPG note creation.md` for workflow and creation-flow changes
- `CHANGELOG.md` for notable changes

## Pull Request Checklist

Before opening a pull request, confirm that:

- the change is explained clearly
- related docs were updated
- any plugin or setup impact is called out
- manual testing or verification steps are included
- follow-up work is noted if the change is intentionally incomplete

## Reporting Issues

When reporting a bug, include:

- what you expected to happen
- what actually happened
- the note or workflow you were using
- relevant plugin context
- steps to reproduce the issue
