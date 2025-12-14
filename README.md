# TTRPG-DEV

An Obsidian vault for managing Tabletop Role-Playing Game (TTRPG) campaigns and worlds.

## Overview

This vault provides a structured system for organizing TTRPG campaigns, including worlds, sessions, entities, and resources. It leverages Obsidian's note-taking capabilities along with plugins like Dataview, QuickAdd, and Templater to create an interactive campaign management tool.

## Features

- **World Creation**: Easily create new worlds with predefined structures
- **Session Tracking**: Automated session numbering and recap integration
- **Entity Management**: Templates for characters, locations, and other game elements
- **Interactive Buttons**: Quick actions for adding sessions, entities, and maps
- **Dataview Integration**: Dynamic tables and views for campaign data

## Structure

- `Worlds/`: Contains individual world folders
  - Each world has a `World.md` file with overview and actions
  - `Ressources/` subfolder for media and assets
- `_system/`: System files and templates
  - `scripts/`: JavaScript automation scripts
  - `templates/`: Note templates for consistent structure
  - `media/`: Placeholder for system media

## Setup

1. Clone or download this vault into your Obsidian vaults folder
2. Open the vault in Obsidian
3. Install required plugins:
   - Dataview
   - QuickAdd
   - Templater
   - Buttons (optional, for enhanced UI)
4. Configure QuickAdd macros:
   - Import or create the "create-world" macro using `_system/scripts/createWorld.js`
5. Configure Templater templates:
   - Point Templater to the `_system/templates/` folder

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

## Templates

- `new-session.md`: Creates numbered session notes with automatic recap
- `new-entity.md`: Template for game entities (characters, locations, etc.)
- `add-map.md`: Template for adding maps to worlds
- `inline-combat.md`: Template for combat encounters

## Contributing

Feel free to modify templates and scripts to fit your specific TTRPG system or preferences.

## Requirements

- Obsidian.md
- Community plugins: Dataview, QuickAdd, Templater