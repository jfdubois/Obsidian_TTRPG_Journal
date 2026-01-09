# TTRPG-DEV

An Obsidian vault for D&D 5e campaign management with automated combat tracking and 5etools SRD integration.

Manage multiple campaigns, track sessions with auto-numbering, plan encounters with monster data from 100+ D&D sources, and run combat with initiative tracking, damage/healing application, and battle statistics.

## Quick Start

### Prerequisites

- [Obsidian](https://obsidian.md/) installed
- Git installed (for 5etools SRD data)

### Setup

1. **Clone or download this vault** to your Obsidian vaults folder

2. **Set up 5etools SRD data** (required for monster integration):
   ```bash
   cd _system/srd
   git clone https://github.com/5etools-mirror-1/5etools-mirror-1.github.io.git 5etools-src
   ```

3. **Open the vault in Obsidian**

4. **Install required community plugins:**
   - Dataview
   - JS Engine
   - QuickAdd
   - Templater
   - ModalForms
   - Buttons

   Optional plugins (recommended):
   - Homepage
   - Banners
   - Leaflet (for maps)
   - Custom Frames
   - Style Settings

5. **Enable community plugins** in Obsidian settings (Settings → Community Plugins → Turn on community plugins)

6. **Verify setup:**
   - Open `Worlds/TTRPG Game Index.md`
   - Click "Create World" button
   - Enter a test world name
   - Success: You should see a new world folder and `World.md` file created with action buttons

## Core Features

- **Multi-Campaign Management**: Create separate worlds for each campaign with isolated data
- **Auto-Numbered Sessions**: Sessions auto-increment (001, 002...) with automatic recap from previous session
- **Entity System**: Create and link NPCs, locations, factions, quests, planes, and regions using wikilinks for relationship tracking
- **Encounter Planning**: Auto-numbered encounters (E0001, E0002...) with monster selection from 5etools database
- **5etools Integration**: Access 100+ D&D sources (Core Rulebooks, Adventure Modules, Campaign Settings) with external links to full stat blocks
- **Combat Tracking**: Automated initiative order, damage/healing application, combat log with rounds, and battle statistics (damage dealt/taken, healing, kills)

## Workflows

### Creating Your First World

1. Open `Worlds/TTRPG Game Index.md`
2. Click "Create World"
3. Enter world name
4. Select role (DM or Player)
5. Result: New world folder created with `World.md` hub containing action buttons and dataview queries

### Managing Sessions

1. Open your world's `World.md`
2. Click "Add Session"
3. Session note created with:
   - Auto-incremented number (001, 002, 003...)
   - Recap section with previous session summary
   - Date and location fields
   - Session notes area

### Creating Entities

1. Click "Add Entity" button in `World.md`
2. Choose entity type from ModalForms dialog:
   - **NPC**: Character with occupation, race, faction
   - **Place**: Location with ruler and region
   - **Store**: Shop with owner and price point
   - **Faction**: Organization with leader
   - **Quest**: Quest with giver and status
   - **Region**: Geographic area within a plane
   - **Plane**: Planar realm (Material Plane, Feywild, etc.)
3. Fill in details
4. Entity created with wikilink relationships for backlinks and graph navigation

### Planning Encounters

1. Click "Create Encounter" in `World.md`
2. Enter encounter description
3. Click "Add Monsters":
   - Search 5etools monster database
   - Configure:
     - **Quantity**: How many of this monster
     - **Initiative Mode**: Individual (separate rolls) or Group (single roll for all)
     - **HP Mode**: Rolled (random), Default (average), Max (maximum HP)
4. Monsters display in table with clickable 5e.tools links for stat blocks

### Running Combat

1. **Start Combat**: Click "Start Combat" in encounter
   - Rolls initiative for all monsters
   - Rolls HP based on HP mode
   - Generates unique labels (A1, G1, G2, O1, etc.)
   - Sorts by initiative descending

2. **Add Players**: Click "Set Players Initiatives"
   - Enter player name and initiative
   - Repeat for all players
   - Initiative order updates automatically

3. **Combat Loop**:
   - **Next Turn**: Advances current turn, increments round when needed
   - **Apply Damage**: Select target → enter damage amount and type → HP and status updated
   - **Apply Healing**: Select target → enter healing amount → HP restored (capped at max)
   - Combat log auto-updates with all actions

4. **End Combat**: Click "End Combat" to mark encounter completed

## Configuration

### Monster Sources

Edit `_system/srd/sources.md` to control which D&D sources are available in monster selection:

```markdown
- **MM**: enabled: true - Monster Manual
- **VGM**: enabled: false - Volo's Guide to Monsters
```

**Categories:**
- 2014 & 2024 Core Rulebooks (MM, DMG, PHB + updated versions)
- Supplemental Books (VGM, MTF, MPMM, XGE, TCE, etc.)
- Adventure Modules (CoS, SKT, ToA, BGDIA, etc.)
- Campaign Settings (ERLW, GGR, MOT, VRGR, etc.)
- Starter Sets, Anthologies, and Special Releases

**Default**: Core rulebooks enabled, all others disabled (reduce clutter)

Changes take effect immediately—no restart required.

## File Structure

```
TTRPG-DEV/
├── Worlds/                      # Campaign data (gitignored except index)
│   ├── TTRPG Game Index.md      # Entry point with Create World button
│   └── <WorldName>/             # Per-world folder
│       ├── World.md             # World hub with buttons and queries
│       ├── 001_YYYYMMDD.md      # Session notes (auto-numbered)
│       ├── E0001_Name.md        # Encounters (auto-numbered)
│       ├── EntityName.md        # NPCs, locations, factions, etc.
│       └── Ressources/          # World-specific media
├── _system/                     # System files (don't modify unless customizing)
│   ├── scripts/                 # JavaScript automation
│   │   ├── lib/                 # Core libraries (core, ui, combat, monsters)
│   │   └── actions/             # User-triggered actions
│   ├── templates/               # Note templates
│   │   ├── new-session.md       # Session template
│   │   ├── new-entity.md        # Entity creation with ModalForms
│   │   └── encounter-template.md # Combat tracking interface
│   ├── srd/                     # 5etools integration
│   │   ├── sources.md           # Source configuration
│   │   └── 5etools-src/         # Git submodule (cloned in setup)
│   └── media/                   # System media files
└── README.md                    # This file
```

## Tips & Troubleshooting

### Tips

- **Wikilinks**: Use `[[EntityName]]` to create bidirectional links—view relationships in graph view and backlinks panel
- **Combat Log**: Auto-formats damage, healing, and reinforcements with round collapsing
- **Encounter Reuse**: Duplicate encounter files to rerun the same battle with fresh initiative/HP rolls
- **Source Control**: Enable only sources you use to reduce monster selection clutter
- **Battle Statistics**: After combat, view damage dealt/taken, healing provided, and kills per combatant

### Troubleshooting

**"Add Monsters" shows no monsters**
- Verify 5etools clone completed: Check `_system/srd/5etools-src/` contains data
- Verify at least one source enabled in `_system/srd/sources.md`

**Buttons not working**
- Verify QuickAdd plugin enabled in Community Plugins
- Check `.obsidian/plugins/quickadd/data.json` exists

**Templates not applying**
- Verify Templater plugin enabled
- Check Templater settings: Template folder should be `_system/templates/`

**Dataview queries not rendering**
- Verify Dataview plugin enabled
- Enable JavaScript queries: Settings → Dataview → Enable JavaScript Queries

**5etools links broken**
- Monster links point to `https://5e.tools/bestiary/`—requires internet connection
- Verify monster name and source code match 5etools format

## Requirements

- [Obsidian](https://obsidian.md/)
- Git (for 5etools SRD clone)
- **Community Plugins**:
  - Dataview
  - QuickAdd
  - Templater
  - ModalForms
  - Buttons

## Contributing

This vault is designed for D&D 5e but can be adapted for other TTRPG systems. Modify templates and scripts in `_system/` to customize for your preferred game system.
