# Library Modules

Shared utilities for TTRPG-DEV action scripts.

## Module Overview

### constants.js
Central location for all magic values and configuration.

**Exports**:
- `D20_SIDES`, `ABILITY_SCORE_BASE`, `ABILITY_MOD_DIVISOR` - Game mechanics constants
- `ALPHABET_LENGTH`, `MAX_PLAYERS` - System limits
- `DEFAULT_HP`, `DEFAULT_SPEED` - Default values
- `PATHS` - File path constants (SRD, worlds, templates)
- `NOTE_TYPES` - Note type constants (encounter, world, session, etc.)
- `ENCOUNTER_STATUSES` - Encounter status constants (planned, inCombat, completed)
- `DELAYS` - UI timing constants (dataview refresh, file open)

### core.js
Core utilities for file access, frontmatter management, and validation.

**Key functions**:
- `getActiveFile(app)` - Get currently active file with validation
- `getFrontmatter(app, file)` - Extract frontmatter from file
- `updateFrontmatter(app, file, updateFn)` - Update frontmatter via processor function
- `validateEncounterContext(app, requiredStatuses)` - Validate and get encounter context (eliminates 7+ duplications)
- `requireNoteType(fm, type)` - Validate note type matches expected
- `requireStatus(fm, statuses)` - Validate status is in allowed list
- `requireNotCompleted(fm, actionName)` - Ensure encounter is not completed
- `requireInitiatives(fm)` - Get and validate initiatives array exists
- `handleActionError(actionName, error)` - Standardized error handling (eliminates 8+ duplications)
- `openFile(app, path, newTab)` - Open file in workspace
- `stripWikiLinks(text)` - Remove WikiLink brackets from text (eliminates 7+ duplications)

### combat.js
Combat mechanics: initiative, HP, damage, healing, combat log.

**Key functions**:
- `rollInitiative(dexMod)` - Roll 1d20 + DEX modifier
- `parseHitDice(hpString)` - Parse hit dice formula string
- `rollHitPoints(dice, mode)` - Roll HP based on mode (rolled/low/average)
- `generateLabel(index, isGroup)` - Generate unique combatant labels (A1, B2, G1, etc.)
- `getHealthStatus(currentHp, maxHp)` - Determine health status (healthy/bloodied/critical/dead)
- `applyDamageToTarget(target, amount)` - Apply damage and update status
- `applyHealingToTarget(target, amount)` - Apply healing and update status
- `sortInitiatives(initiatives)` - Sort initiatives by value descending
- `findTargetByLabel(initiatives, identifier)` - Find combatant by label or name
- `advanceTurn(fm)` - Calculate next turn and round
- `formatLogEntry(round, action, data)` - Format combat log entry
- `appendToLog(content, entry)` - Add entry to combat log
- `logCombatAction(app, file, round, actionType, data)` - Write combat action to log (eliminates 4+ duplications)

### monsters.js
Monster data loading and transformation from 5etools SRD.

**Key functions**:
- `parseEnabledSources(content)` - Parse sources.md for enabled sources
- `loadBestiaryIndex(app)` - Load SRD bestiary index
- `loadMonstersBySource(app, source, index)` - Load monsters from specific source
- `loadAllMonsters(app)` - Load all monsters from enabled sources
- `loadMonsterDataFromSRD(app, monsterEntries)` - Load specific monsters by name
- `transformSRDToCombatFormat(srdMonster)` - Convert SRD format to combat format
- `processMonsterToCombat(entry, monsterData, labelCounter, isGroup)` - Create initiative entries from monster data
- `calculateDexMod(dexScore)` - Calculate D&D 5e ability modifier

### ui.js
User interface utilities for prompts, notifications, and selections.

**Key functions**:
- `notifySuccess(message)` - Show success notification
- `notifyWarning(message)` - Show warning notification
- `notifyError(message)` - Show error notification
- `selectFromList(quickAddApi, displayChoices, values, placeholder)` - Dropdown selection
- `promptForText(quickAddApi, message, defaultValue)` - Text input prompt
- `promptForNumber(quickAddApi, message, defaultValue)` - Number input prompt
- `promptForPositiveNumber(quickAddApi, message, defaultValue)` - Validated positive number prompt (eliminates 5+ duplications)
- `showForm(app, formName, options)` - ModalForms integration
- `buildTargetChoices(initiatives)` - Build target dropdown choices
- `buildSourceChoices(initiatives)` - Build source dropdown choices
- `promptForTarget(quickAddApi, initiatives, placeholder)` - Combat target selection (eliminates 3+ duplications)
- `promptForSource(quickAddApi, initiatives, action)` - Combat source selection (eliminates 2+ duplications)
- `selectOption(quickAddApi, options, placeholder)` - Simplified option selection (eliminates 5+ duplications)
- `confirm(quickAddApi, question, yesLabel, noLabel)` - Confirmation dialog (eliminates 2+ duplications)
- `refreshDataview(app, delayMs)` - Trigger dataview refresh (eliminates 3+ duplications)

**Constants**:
- `DAMAGE_TYPES` - Array of D&D 5e damage types for selection

## Usage Patterns

### Error Handling
All action scripts should use the same pattern:

```javascript
import * as core from '../../lib/core.js';

export async function run(context) {
    try {
        // ... action logic
    } catch (error) {
        core.handleActionError("actionName", error);
    }
}
```

### Validation
Use validation utilities instead of manual checks:

```javascript
// Get and validate encounter context
const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);

// Ensure initiatives exist
const initiatives = core.requireInitiatives(fm);

// Check not completed
core.requireNotCompleted(fm, "this action");
```

### UI Patterns
Use consistent UI utilities:

```javascript
// Get validated positive number
const amount = await ui.promptForPositiveNumber(quickAddApi, "Amount:", 1);

// Confirm action
const confirmed = await ui.confirm(quickAddApi, "Are you sure?");

// Select from options
const mode = await ui.selectOption(quickAddApi, [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" }
], "Choose mode:");
```

### Combat Flow
Standard combat action pattern:

```javascript
import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        // Validate context
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);
        const initiatives = core.requireInitiatives(fm);

        // Get target
        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target:");
        if (!target) return;

        // Get amount
        const amount = await ui.promptForPositiveNumber(quickAddApi, "Amount:", 1);
        if (!amount) return;

        // Apply effect
        const result = combat.applyDamageToTarget(target, amount);

        // Update frontmatter
        await core.updateFrontmatter(app, file, (frontmatter) => {
            const initiativeEntry = frontmatter.initiatives.find(i => i.label === target.label);
            if (initiativeEntry) {
                initiativeEntry.currentHp = result.newHp;
                initiativeEntry.status = result.newStatus;
            }
        });

        // Log action
        await combat.logCombatAction(app, file, fm.round || 1, 'damage', {
            source: source,
            target: target.label,
            amount: amount,
            oldHp: result.oldHp,
            newHp: result.newHp,
            maxHp: target.maxHp
        });

        // Refresh UI
        ui.refreshDataview(app);
        ui.notifySuccess(`Applied ${amount} damage!`);

    } catch (error) {
        core.handleActionError("applyDamage", error);
    }
}
```

## Architecture Benefits

**DRY (Don't Repeat Yourself)**:
- 48+ code duplications eliminated across codebase
- Consistent patterns enforced via shared utilities
- Single source of truth for common operations

**Error Handling**:
- Validation at function boundaries
- Clear, actionable error messages
- Fail-fast with meaningful errors

**Maintainability**:
- Fix bugs once in utilities, applies everywhere
- Easy to add features (modify utility, all actions benefit)
- Clear separation of concerns

**Type Safety** (via JSDoc):
- IDE autocomplete support
- Self-documenting code
- Easier debugging

## Development Guidelines

### Adding New Actions

1. **Import required utilities**:
```javascript
import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js'; // if combat-related
import { NOTE_TYPES, ENCOUNTER_STATUSES, PATHS } from '../../lib/constants.js';
```

2. **Use standard error handling**:
```javascript
export async function run(context) {
    const { app, quickAddApi } = context;
    try {
        // ... logic
    } catch (error) {
        core.handleActionError("actionName", error);
    }
}
```

3. **Leverage validation helpers**:
- Don't manually check note types → use `core.requireNoteType()`
- Don't manually check status → use `core.validateEncounterContext()`
- Don't manually prompt for numbers → use `ui.promptForPositiveNumber()`

4. **Use constants**:
- Never hardcode "encounter", "inCombat", etc. → use `NOTE_TYPES`, `ENCOUNTER_STATUSES`
- Never hardcode "Worlds/", "_system/templates/" → use `PATHS`

### Modifying Utilities

**When adding new utility functions**:
1. Identify duplication (appears in 2+ action scripts)
2. Extract to appropriate module (core/ui/combat/monsters)
3. Add JSDoc documentation
4. Add input validation for public functions
5. Update this README

**When modifying existing utilities**:
1. Check all usages (grep the codebase)
2. Maintain backwards compatibility if possible
3. Update JSDoc if signature changes
4. Test affected actions

## Refactoring Impact Summary

**Phase 1**: Foundation
- Created constants.js, enhanced core.js/ui.js/combat.js/monsters.js
- 48+ duplications eliminated
- 15+ magic values centralized

**Phase 2**: Action Scripts
- 8 action scripts refactored
- 560 → 432 lines (23% reduction)
- 40+ additional duplications eliminated

**Phase 3**: Architectural Improvements
- createEncounter.js: 566 → 50 lines (91% reduction)
- Template system established
- Race conditions eliminated
- Input validation added

**Phase 4**: Polish
- JSDoc documentation added
- Null safety improved
- This README created

**Total Impact**:
- ~650 lines of code eliminated
- 90+ duplications removed
- Consistent patterns enforced
- Developer experience dramatically improved
