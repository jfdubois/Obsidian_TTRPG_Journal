# TTRPG-DEV

An Obsidian vault for managing Tabletop Role-Playing Game (TTRPG) campaigns and worlds.

## Overview

This vault provides a structured system for organizing TTRPG campaigns, including worlds, sessions, entities, and resources. It leverages Obsidian's note-taking capabilities along with plugins like Dataview, QuickAdd, and Templater to create an interactive campaign management tool.

## Features

- **World Creation**: Easily create new worlds with predefined structures and DM role assignment
- **Session Tracking**: Automated session numbering and recap integration
- **Entity Management**: Templates for characters, locations, and other game elements
- **Interactive Buttons**: Quick actions for adding sessions, entities, and maps
- **Encounter Management**: Create encounters with initiative tracking capabilities
- **Battle Logs**: Track damage and healing during combat encounters
- **Dataview Integration**: Dynamic tables and views for campaign data

## Structure

- `Worlds/`: Contains individual world folders
  - Each world has a `World.md` file with overview and actions
  - `Ressources/` subfolder for media and assets
- `_system/`: System files and templates
  - `scripts/`: JavaScript automation scripts
  - `templates/`: Note templates for consistent structure
  - `media/`: Placeholder for system media
  - `srd/`: Placeholder for external SRD data

## Setup

1. Clone or download this vault into your Obsidian vaults folder
2. Clone the SRD 5etools repository for monster data:
    ```bash
    cd _system/srd
    git clone https://github.com/5etools-mirror-1/5etools-mirror-1.github.io.git 5etools-src
    ```
3. Open the vault in Obsidian
4. Install required plugins:
    - Dataview
    - QuickAdd
    - Templater
    - Buttons (optional, for enhanced UI)
5. Configure QuickAdd macros:
    - Import or create the "create-world" macro using `_system/scripts/createWorld.js`
6. Configure Templater templates:
    - Point Templater to the `_system/templates/` folder
7. Configure monster sources:
    - Edit `_system/srd/sources.md` to enable/disable SRD sources you want to use for encounters

## Usage

### Creating a New World

1. Open `Worlds/TTRPG Game Index.md`
2. Click the "Create World" button
3. Enter the world name when prompted
4. A new world folder and `World.md` file will be created

### Adding Sessions

From a world's `World.md` file, click "Add Session" to create a new session note with automatic numbering and recap from the previous session.

### Adding Entities

Use the "Add Entity" button to create new characters, locations, or other game elements using predefined templates.

### Creating Encounters

From a world's `World.md` file, click "Create Encounter" to set up a new combat encounter with initiative tracking. The encounter will automatically generate an initiative order based on participant dexterity scores and allow for real-time initiative management during gameplay.

### Managing Battle Logs

During encounters, use the battle log functionality to track damage dealt and healing received by all participants. Battle logs provide a complete record of combat actions and can be reviewed or exported for session summaries.

## Templates

- `new-session.md`: Creates numbered session notes with automatic recap
- `new-entity.md`: Template for game entities (characters, locations, etc.)
- `add-map.md`: Template for adding maps to worlds
- `inline-combat.md`: Template for combat encounters
- `encounter-initiative.md`: Template for encounters with initiative tracking
- `battle-log.md`: Template for tracking damage and healing in combat

## Contributing

Feel free to modify templates and scripts to fit your specific TTRPG system or preferences.

## Requirements

- Obsidian.md
- Community plugins: Dataview, QuickAdd, Templater