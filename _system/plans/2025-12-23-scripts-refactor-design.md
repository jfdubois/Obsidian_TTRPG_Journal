# Obsidian TTRPG Scripts Refactor Design

**Date:** 2025-12-23
**Branch:** ref
**Status:** Approved

## Overview

Refactor the Obsidian TTRPG vault scripts to eliminate code duplication and establish clean architecture using JS-Engine modules.

## Current State

- ~2,663 lines of JavaScript across 11 scripts in `_system/scripts/`
- Significant code duplication (target selection, HP status, combat log appending repeated 3+ times)
- `combatHelpers.js` exists but isn't consistently used
- `eval()` for imports instead of proper module system
- Duplicate file (`createEncounter copy.js`) and obsolete file (`combatActions.js`)

## Key Decisions

| Decision | Choice |
|----------|--------|
| Primary concern | Code duplication in combat scripts |
| Module system | JS-Engine with `engine.importJs()` (ES6 exports) |
| Migration scope | All 10 scripts (full migration) |
| Structure | Two-level (`lib/` for shared, `actions/` for entry points) |
| Lib organization | By domain (`core`, `combat`, `monsters`, `ui`) |
| Error handling | Lib throws, actions catch and notify |
| QuickAdd role | Thin wrapper layer calling JS-Engine API |

## New Directory Structure

```
_system/scripts/
├── lib/                          # Shared modules (ES6 exports)
│   ├── core.js                   # Frontmatter, file utils, validation
│   ├── combat.js                 # Target selection, HP, logs, initiatives
│   ├── monsters.js               # SRD loading, monster transformation
│   └── ui.js                     # Prompts, suggesters, Notices
│
├── actions/                      # Entry points (JS-Engine scripts)
│   ├── world/
│   │   └── createWorld.js
│   ├── encounter/
│   │   ├── createEncounter.js
│   │   └── addMonsters.js
│   └── combat/
│       ├── enableCombat.js
│       ├── playersInitiatives.js
│       ├── nextTurn.js
│       ├── endCombat.js
│       ├── applyDamage.js
│       └── applyHealing.js
│
└── quickadd/
    └── macros.js                 # All QuickAdd wrapper functions
```

## Lib Module Contents

### `lib/core.js` - Cross-cutting utilities

```javascript
// Frontmatter helpers
export async function getFrontmatter(app, file) { ... }
export async function updateFrontmatter(app, file, updates) { ... }

// Validation
export function requireNoteType(fm, expectedType) { ... }
export function requireStatus(fm, allowedStatuses) { ... }

// File utilities
export function getActiveFile(app) { ... }
export function getFileByPath(app, path) { ... }
```

### `lib/combat.js` - Combat-specific utilities

```javascript
// Target selection (extracted from 3 files)
export function buildTargetChoices(initiatives) { ... }
export function findTargetByLabel(initiatives, label) { ... }

// HP and status
export function getHealthStatus(current, max) { ... }
export function applyDamageToTarget(target, amount) { ... }
export function applyHealingToTarget(target, amount) { ... }

// Initiative
export function rollInitiative(dexMod) { ... }
export function sortInitiatives(list) { ... }
export function generateLabel(index) { ... }

// Combat log
export function formatLogEntry(action, target, amount, result) { ... }
export function appendToLog(fm, entry) { ... }

// Turn management
export function advanceTurn(fm) { ... }
```

### `lib/monsters.js` - SRD data loading

```javascript
// SRD loading
export async function loadBestiaryIndex(app) { ... }
export async function loadMonstersBySource(app, source) { ... }
export async function loadMonsterDataFromSRD(app, monsterList) { ... }

// Monster transformation
export function transformSRDToCombatFormat(srdMonster) { ... }
export function parseHitDice(hpString) { ... }
export function rollHitPoints(formula) { ... }
export function calculateDexMod(dexScore) { ... }

// Combat entry creation
export function processMonsterToCombat(entry, monsterData, labelStart, rollInit) { ... }
```

### `lib/ui.js` - User interaction

```javascript
// QuickAdd prompts
export async function selectFromList(params, choices, placeholder) { ... }
export async function promptForNumber(params, message, defaultVal) { ... }

// ModalForms wrapper
export async function showForm(app, formName) { ... }

// Notifications
export function notifySuccess(message) { ... }
export function notifyWarning(message) { ... }
export function notifyError(message) { ... }

// Combat-specific prompts
export async function promptForTarget(params, initiatives) { ... }
export async function promptForDamageAmount(params) { ... }
export async function promptForHealAmount(params) { ... }
```

## Action Scripts

Each action script follows the pattern:
1. Import from lib modules
2. Validate context (note type, status)
3. Execute business logic using lib functions
4. Handle errors with user-friendly notices

### World Actions

**`createWorld.js`** - Creates world folder structure with World.md, generates role-based buttons (player vs DM), sets up dataview queries.

### Encounter Actions

**`createEncounter.js`** - Creates encounter note with auto-numbered filename, sets initial frontmatter, generates monster-adding blocks.

**`addMonsters.js`** - Prompts for monster selection from SRD, prompts for quantity and initiative type, appends to encounter's monsters array.

### Combat Actions

**`enableCombat.js`** - Validates encounter, loads monster data from SRD, processes into initiative entries, updates status to "inCombat".

**`playersInitiatives.js`** - Opens ModalForm for player entry, adds to initiatives array, re-sorts.

**`nextTurn.js`** - Advances currentTurn, wraps to next round, logs turn change.

**`applyDamage.js`** - Prompts for target and amount, applies damage, updates status, logs action.

**`applyHealing.js`** - Same pattern as damage but for healing, cannot exceed maxHp.

**`endCombat.js`** - Updates status to "completed", logs final state.

## QuickAdd Integration

All wrappers in single file `quickadd/macros.js`:

```javascript
async function executeAction(params, actionPath) {
    const jsEngine = params.app.plugins.plugins['js-engine'];
    if (!jsEngine) {
        new Notice('JS-Engine plugin not found');
        return;
    }
    await jsEngine.api.executeFileSimple(actionPath, {
        app: params.app,
        quickAdd: params.quickAdd
    });
}

module.exports.createWorld = async (params) => {
    await executeAction(params, '_system/scripts/actions/world/createWorld.js');
};

// ... etc for all actions
```

### QuickAdd Macro Configuration

| Macro Name | Export |
|------------|--------|
| create-world | `createWorld` |
| create-encounter | `createEncounter` |
| add-monster | `addMonsters` |
| start-combat | `enableCombat` |
| add-player-initiative | `playersInitiatives` |
| next-turn | `nextTurn` |
| combat-damage | `applyDamage` |
| combat-heal | `applyHealing` |
| end-combat | `endCombat` |

## Migration Strategy

### Phase 1: Setup (non-destructive)

1. Create new directory structure
2. Create empty lib modules with exports
3. Delete unnecessary files:
   - `createEncounter copy.js` (duplicate)
   - `combatActions.js` (replaced)

### Phase 2: Extract shared logic

1. Extract from `combatHelpers.js` → `lib/combat.js`
2. Extract from `enableCombat.js` → `lib/monsters.js`
3. Extract common patterns → `lib/core.js` and `lib/ui.js`
4. Test each lib module in isolation

### Phase 3: Migrate actions (one at a time)

Order by dependency (least dependent first):

| Order | Action | Reason |
|-------|--------|--------|
| 1 | endCombat.js | Simplest, minimal dependencies |
| 2 | nextTurn.js | Simple, only uses combat.js |
| 3 | applyHealing.js | Uses combat.js + ui.js |
| 4 | applyDamage.js | Same pattern as healing |
| 5 | playersInitiatives.js | Uses ui.js (ModalForms) |
| 6 | enableCombat.js | Uses monsters.js + combat.js |
| 7 | addMonsters.js | Uses monsters.js + ui.js |
| 8 | createEncounter.js | Uses core.js + ui.js |
| 9 | createWorld.js | Standalone, can be last |

For each action:
1. Create new action in `actions/` folder
2. Add wrapper export to `quickadd/macros.js`
3. Update QuickAdd config to point to new wrapper
4. Test thoroughly
5. Delete old script only after confirming new one works

### Phase 4: Cleanup

1. Remove old scripts from `_system/scripts/` root
2. Update any templates referencing old paths
3. Final test of all workflows

## Files to Delete

| File | Reason |
|------|--------|
| `combatActions.js` | Replaced by combatDamage/combatHeal |
| `createEncounter copy.js` | Duplicate file |

## Rollback Safety

- Keep old scripts until Phase 4 complete
- Git branch `ref` allows easy rollback
- Each phase is independently testable
