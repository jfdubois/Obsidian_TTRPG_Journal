# Encounter Management System - Setup Guide

This comprehensive encounter management system streamlines D&D combat tracking in Obsidian.

## 📋 Prerequisites

- **Obsidian** with the following plugins:
  - QuickAdd
  - Buttons
  - Dataview
  - ModalForms (for player initiatives)
  - Templater (for auto-template on new files)

## 📁 File Structure

Place all scripts in `_system/scripts/`:

```
_system/
├── scripts/
│   ├── combatHelpers.js
│   ├── createEncounter.js
│   ├── addEncounterMonsters.js
│   ├── addPlayerInitiatives.js
│   ├── enableCombat.js
│   ├── nextTurn.js
│   ├── combatDamage.js
│   ├── combatHeal.js
│   └── endCombat.js
└── data/
    └── monsters.json
```

## ⚙️ QuickAdd Configuration

Set up these QuickAdd macros:

### 1. **create-encounter**
- Type: Macro
- Script: `_system/scripts/createEncounter.js`

### 2. **add-monster**
- Type: Macro
- Script: `_system/scripts/addEncounterMonsters.js`

### 3. **add-player-initiative**
- Type: Macro
- Script: `_system/scripts/addPlayerInitiatives.js`

### 4. **enable-combat**
- Type: Macro
- Script: `_system/scripts/enableCombat.js`

### 5. **next-turn**
- Type: Macro
- Script: `_system/scripts/nextTurn.js`

### 6. **combat-damage**
- Type: Macro
- Script: `_system/scripts/combatDamage.js`

### 7. **combat-heal**
- Type: Macro
- Script: `_system/scripts/combatHeal.js`

### 8. **end-combat**
- Type: Macro
- Script: `_system/scripts/endCombat.js`

## 🎮 Features

### ✨ Phase 1: Planning
1. **Create Encounter** - Auto-numbered (E0001, E0002, etc.)
2. **Add Monsters** - Multiple types, quantities, HP modes
3. **Add Player Initiatives** - Via ModalForms
4. **View Planned Forces** - Dynamic table showing all monsters

### ⚔️ Phase 2: Combat
5. **Start Combat** - Rolls initiatives, generates combat tracker
6. **Turn Tracking** - Visual indicator (➤) shows current turn
7. **Round Advancement** - Automatic round counter
8. **Add Reinforcements** - Add monsters/players mid-combat
9. **Apply Damage** - Tracks HP, auto-updates status
10. **Apply Healing** - Cannot exceed max HP
11. **Combat Log** - Timestamped events with structured formatting

### 🏁 Phase 3: Completion
12. **End Combat** - Marks encounter complete, preserves all data

## 📊 Combat Tracker Features

### Initiative Table Columns:
- **Turn**: Shows ➤ for active combatant
- **Name**: Monster/character name
- **Label**: Instance identifier (A1, A2, G1, etc.)
- **Initiative**: Rolled initiative value
- **HP**: Current/Max (for monsters)
- **AC**: Armor Class
- **Speed**: Movement speed
- **Status**: Auto-calculated health status

### Health Status Indicators:
- `healthy` - 100% HP
- `scratched` - 75-99% HP
- `⚠️ bloodied` - 50-74% HP
- `🔴 critical` - 25-49% HP
- `💀 dying` - 1-24% HP
- `💀 dead` - 0 HP

## 🔧 Advanced Features

### HP Modes:
- **Default**: Use stat block average
- **Rolled**: Roll hit dice
- **Low**: Minimum HP (num of dice + mod)
- **Average**: Mathematical average

### Initiative Modes:
- **Individual**: Each creature rolls separately
- **Group**: All creatures share one initiative

### Adding During Combat:
- Monsters and players can join mid-combat
- Initiatives auto-rolled and sorted
- Turn tracker adjusts automatically
- Logged as "joined combat" events

## 📝 Combat Log Format

```markdown
- **Round 1** [02:45 PM] - ⚔️ Goblin (A1) joined combat (Initiative: 14)
- **Round 1** [02:46 PM] - Thorin dealt **8 slashing damage** to Goblin (A1)
- **Round 2** [02:47 PM] - 🔄 **Round 2 begins!**
- **Round 2** [02:48 PM] - Cleric healed Thorin for **12 HP**
- **Round 3** [02:50 PM] - 💀 Thorin killed Goblin (A1)
- **Combat Ended** [02:52 PM] - ✅ Encounter completed after 3 rounds
```

## 🎯 Workflow Example

1. **Create encounter** from World note
2. **Add monsters** (qty, init mode, HP mode)
3. **Add player initiatives** (via ModalForms)
4. **Start combat** (auto-rolls everything)
5. Use **Next Turn** to advance through combatants
6. Use **Apply Damage/Heal** as needed
7. **Add monsters** if reinforcements arrive
8. **End combat** when finished

## 🐛 Troubleshooting

### "combatHelpers.js not found"
- Ensure file is at `_system/scripts/combatHelpers.js`
- Check file permissions

### "monsters.json not found"
- Place JSON file at `_system/data/monsters.json`
- Verify JSON is valid

### Turn tracker not updating
- Refresh the note (Ctrl+R or Cmd+R)
- Check that `status: inCombat` in frontmatter

### Combat log not appearing
- Ensure `## Combat Log` heading exists
- Check that file has write permissions

## 🚀 Future Enhancements

Potential additions mentioned:
- Condition tracking (Hexed, Blessed, Prone, etc.)
- Enhanced monster modal with full stat blocks
- XP calculation on combat end
- Session integration
- Treasure/loot tracking

## 💡 Tips

- **Backup regularly** - Combat data is stored in frontmatter
- **Use consistent naming** - Helps with wikilinks to characters
- **Test with throwaway encounter** - Get familiar with workflow
- **Customize log format** - Edit `combatHelpers.js` `formatLogEntry()`
- **Add CSS styling** - Customize table appearance in `.obsidian/snippets/`

## ✅ Checklist

Before your first encounter:
- [ ] All scripts in `_system/scripts/`
- [ ] `monsters.json` in `_system/data/`
- [ ] All 8 QuickAdd macros configured
- [ ] Buttons plugin enabled
- [ ] Dataview plugin enabled
- [ ] ModalForms configured (if using player initiatives)
- [ ] Test encounter created and working

---

**Need help?** Check the scripts for inline comments or review the artifact documentation.
