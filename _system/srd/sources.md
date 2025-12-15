# Monster Sources Configuration

This file defines which SRD sources are enabled for monster selection in encounters.

## Core Rulebooks

- **MM**: `enabled: true` - Monster Manual - Core monster collection
- **DMG**: `enabled: true` - Dungeon Master's Guide - Additional monsters and NPCs
- **PHB**: `enabled: true` - Player's Handbook - Basic monsters and NPCs

## Adventure Modules

- **CoS**: `enabled: false` - Curse of Strahd - Monsters from the adventure
- **SKT**: `enabled: false` - Storm King's Thunder - Monsters from the adventure
- **TftYP**: `enabled: false` - Tales from the Yawning Portal - Classic monsters
- **ToA**: `enabled: false` - Tomb of Annihilation - Monsters from the adventure
- **WDH**: `enabled: false` - Waterdeep: Dragon Heist - City-based monsters
- **WDMM**: `enabled: false` - Waterdeep: Dungeon of the Mad Mage - Undermountain monsters

## Campaign Settings

- **ERLW**: `enabled: false` - Eberron: Rising from the Last War - Eberron monsters
- **VGM**: `enabled: false` - Volo's Guide to Monsters - Expanded monster collection
- **GGR**: `enabled: false` - Guildmasters' Guide to Ravnica - Ravnica monsters

## Supplemental Books

- **XGE**: `enabled: false` - Xanathar's Guide to Everything - Additional monsters
- **TCE**: `enabled: false` - Tasha's Cauldron of Everything - New monsters
- **FTD**: `enabled: false` - Fizban's Treasury of Dragons - Dragon-related monsters

## Usage Notes

- Only monsters from enabled sources will appear in encounter monster selection
- Edit the `enabled: true/false` values to control which sources are active
- The system reads this file each time monsters are added to encounters
- Changes take effect immediately - no restart required