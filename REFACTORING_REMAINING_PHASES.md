# Refactoring Plan: Remaining Phases (2-4)

## Phase 1 Status: ✅ COMPLETED

All Phase 1 tasks completed successfully:
- ✅ Created `_system/scripts/lib/constants.js` with all magic values
- ✅ Added 6 core validation utilities to `core.js` (eliminates 27+ duplications)
- ✅ Added 5 UI utilities to `ui.js` (eliminates 12+ duplications)
- ✅ Added 2 combat utilities to `combat.js` (eliminates 6+ duplications)
- ✅ Fixed `monsters.js` to use constants and remove duplication (eliminates 3+ duplications)

**Phase 1 Impact**: 48+ duplications eliminated, 15+ magic values centralized, 13 new utility functions created

---

## Phase 2: Apply Utilities to Action Scripts (Priority: HIGH)

**Goal**: Refactor all action scripts to use new utilities, eliminating duplication

### Task 2.1: Refactor Combat Actions (applyDamage.js, applyHealing.js)

**IMPORTANT**: Both files must remain separate (QuickAdd cannot pass arguments to macros). Apply same refactoring pattern to each independently.

#### File 1: `_system/scripts/actions/combat/applyDamage.js`

**Current issues**:
- Duplicates validation boilerplate (4 lines)
- Duplicates initiative check (4 lines)
- Duplicates source prompt pattern (3 lines)
- Duplicates number validation (5 lines)
- Duplicates combat logging pattern (11 lines)
- Duplicates dataview refresh (3 lines)
- Duplicates error handling (3 lines)

**Refactoring approach**:

```javascript
import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        // NEW: Use validation utility (eliminates 4 lines of boilerplate)
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);

        // NEW: Use require helper (eliminates 4 lines)
        const initiatives = core.requireInitiatives(fm);

        // NEW: Use source prompt helper (eliminates 3 lines)
        const source = await ui.promptForSource(quickAddApi, initiatives, "attacking");

        const target = await ui.promptForTarget(quickAddApi, initiatives, -1, "Select target:");
        if (!target) return;

        // NEW: Use validated number prompt (eliminates 5 lines)
        const damage = await ui.promptForPositiveNumber(quickAddApi, "Damage amount:", 1);
        if (!damage) return;

        const damageType = await quickAddApi.inputPrompt(
            "Damage type:",
            null,
            "slashing"
        );

        const result = combat.applyDamageToTarget(target, damage);

        await core.updateFrontmatter(app, file, (frontmatter) => {
            const initiativeEntry = frontmatter.initiatives.find(i => i.label === target.label);
            if (initiativeEntry) {
                initiativeEntry.currentHp = result.newHp;
                initiativeEntry.status = result.newStatus;
            }
        });

        // NEW: Use combat logging helper (eliminates 11 lines!)
        await combat.logCombatAction(app, file, fm.round || 1, 'damage', {
            source: source,
            target: target.label || core.stripWikiLinks(target.name),
            amount: damage,
            damageType: damageType,
            oldHp: result.oldHp,
            newHp: result.newHp,
            maxHp: target.maxHp
        });

        // NEW: Use refresh helper (eliminates 3 lines)
        ui.refreshDataview(app);

        ui.notifySuccess(`${target.label || target.name} takes ${damage} ${damageType} damage!`);

    } catch (error) {
        // NEW: Use error handler (eliminates 3 lines)
        core.handleActionError("applyDamage", error);
    }
}
```

**Expected reduction**: ~64 lines → ~40 lines (37% reduction)

---

#### File 2: `_system/scripts/actions/combat/applyHealing.js`

Apply the exact same refactoring pattern:

```javascript
import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);
        const initiatives = core.requireInitiatives(fm);
        const source = await ui.promptForSource(quickAddApi, initiatives, "healing");
        const target = await ui.promptForTarget(quickAddApi, initiatives, -1, "Select target to heal:");
        if (!target) return;

        const healing = await ui.promptForPositiveNumber(quickAddApi, "Healing amount:", 1);
        if (!healing) return;

        const result = combat.applyHealingToTarget(target, healing);

        await core.updateFrontmatter(app, file, (frontmatter) => {
            const initiativeEntry = frontmatter.initiatives.find(i => i.label === target.label);
            if (initiativeEntry) {
                initiativeEntry.currentHp = result.newHp;
                initiativeEntry.status = result.newStatus;
            }
        });

        await combat.logCombatAction(app, file, fm.round || 1, 'heal', {
            source: source,
            target: target.label || core.stripWikiLinks(target.name),
            amount: healing,
            oldHp: result.oldHp,
            newHp: result.newHp,
            maxHp: target.maxHp
        });

        ui.refreshDataview(app);
        ui.notifySuccess(`${target.label || target.name} healed for ${healing} HP!`);

    } catch (error) {
        core.handleActionError("applyHealing", error);
    }
}
```

**Expected reduction**: Similar ~37% reduction

---

### Task 2.2: Refactor nextTurn.js

**File**: `_system/scripts/actions/combat/nextTurn.js`

**Apply utilities**:
- Use `validateEncounterContext()` for validation
- Use `requireInitiatives()` for initiative check
- Use `refreshDataview()` for view refresh
- Use `handleActionError()` for error handling
- Use `logCombatAction()` for combat logging

**Expected reduction**: ~20-25 lines

---

### Task 2.3: Refactor endCombat.js

**File**: `_system/scripts/actions/combat/endCombat.js`

**Apply utilities**:
- Use `validateEncounterContext()` for validation
- Use `confirm()` for confirmation dialog
- Use `refreshDataview()` for view refresh
- Use `handleActionError()` for error handling
- Use `logCombatAction()` for final combat log entry

**Expected reduction**: ~15-20 lines

---

### Task 2.4: Refactor playersInitiatives.js

**File**: `_system/scripts/actions/combat/playersInitiatives.js`

**Apply utilities**:
- Use `validateEncounterContext()` for validation
- Use `promptForPositiveNumber()` for initiative input
- Use `refreshDataview()` for view refresh
- Use `handleActionError()` for error handling

**Expected reduction**: ~15-20 lines

---

### Task 2.5: Refactor enableCombat.js

**File**: `_system/scripts/actions/combat/enableCombat.js`

**Apply utilities**:
- Use `validateEncounterContext()` for validation
- Use `requireNotCompleted()` for status check
- Use `refreshDataview()` for view refresh
- Use `handleActionError()` for error handling
- Use `logCombatAction()` for round start logging
- Use `ENCOUNTER_STATUSES` constant

**Expected reduction**: ~20-25 lines

---

### Task 2.6: Refactor addMonsters.js

**File**: `_system/scripts/actions/encounter/addMonsters.js`

**Apply utilities**:
- Use `validateEncounterContext()` for validation
- Use `requireNotCompleted()` for status check
- Use `selectOption()` for HP mode and initiative mode selection
- Use `confirm()` for "add another monster" prompt
- Use `refreshDataview()` for view refresh
- Use `handleActionError()` for error handling
- Use `PATHS`, `NOTE_TYPES`, `ENCOUNTER_STATUSES` constants

**Expected reduction**: ~20 lines

---

### Task 2.7: Refactor createWorld.js

**File**: `_system/scripts/actions/world/createWorld.js`

**Apply utilities**:
- Use `selectOption()` for role selection
- Use `openFile()` for workspace file opening
- Use `handleActionError()` for error handling
- Use `PATHS` constant for worlds folder

**Expected reduction**: ~10 lines

---

### Phase 2 Impact Summary

- **Files modified**: 7 action scripts
- **Expected total line reduction**: 130-160 lines
- **Duplications eliminated**: 40+ instances
- **Improved consistency**: All actions follow same patterns

---

## Phase 3: Architectural Improvements (Priority: MEDIUM)

**Goal**: Address major anti-patterns and architectural issues

### Task 3.1: Break Up createEncounter.js God Object

**Problem**:
- File is 566 lines long (should be ~150)
- Contains massive inline dataviewjs generation as strings
- Duplicates `parseEnabledSources` function from monsters.js
- Mixes file creation with template content

**Solution**: Extract to template system

#### Step 1: Create Template File

**New file**: `_system/templates/encounter-dataview.js.template`

Create a template file containing the dataviewjs code currently embedded as strings in createEncounter.js. This allows:
- Editing dataviewjs without escaping
- Separation of concerns (file creation vs template content)
- Version control friendliness
- Reusability

**Template structure**:
```javascript
// Encounter dataview template
// Variables: {{encounterName}}, {{worldName}}, etc.

dv.container.className += " encounter-view";

// Initiative tracker code...
// Combat log code...
// Encounter details code...
```

#### Step 2: Refactor createEncounter.js

**Current structure** (566 lines):
- Lines 1-50: Imports and setup
- Lines 51-300: Inline dataviewjs string generation
- Lines 301-400: More inline string templates
- Lines 401-500: File creation logic
- Lines 501-566: Embedded parseEnabledSources function

**New structure** (~150 lines):
```javascript
import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as monsters from '../../lib/monsters.js';
import { PATHS, NOTE_TYPES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        // Validate world context
        const { file, fm } = core.validateEncounterContext(app);
        core.requireNoteType(fm, NOTE_TYPES.WORLD);

        // Gather encounter details
        const encounterName = await ui.promptForText(quickAddApi, "Encounter name:");
        if (!encounterName) return;

        // Load template
        const templatePath = `${PATHS.TEMPLATES_FOLDER}/encounter-dataview.js.template`;
        const templateFile = app.vault.getAbstractFileByPath(templatePath);
        if (!templateFile) {
            throw new Error("Encounter template not found");
        }
        let template = await app.vault.read(templateFile);

        // Simple variable substitution
        template = template.replace(/{{encounterName}}/g, encounterName);
        template = template.replace(/{{worldName}}/g, fm.name);
        // ... other substitutions

        // Create encounter file with template content
        const encounterPath = `${fm.worldPath}/Encounters/${encounterName}.md`;
        await app.vault.create(encounterPath, template);

        // Use monsters.parseEnabledSources instead of duplicating
        const sourcesFile = app.vault.getAbstractFileByPath(PATHS.SRD_SOURCES);
        const sourcesContent = await app.vault.read(sourcesFile);
        const enabledSources = monsters.parseEnabledSources(sourcesContent);

        // ... rest of logic

        ui.refreshDataview(app);
        await core.openFile(app, encounterPath, true);

    } catch (error) {
        core.handleActionError("createEncounter", error);
    }
}
```

**Impact**:
- 566 lines → ~150 lines (73% reduction)
- Eliminates parseEnabledSources duplication
- Template is now maintainable and version-controlled
- Separation of concerns

---

### Task 3.2: Fix Race Conditions

**Problem**: Multiple files use `setTimeout` with arbitrary delays for async operations

**Files affected**:
- `nextTurn.js`
- `enableCombat.js`
- `createEncounter.js`
- (possibly others from Phase 2 refactoring)

**Current anti-pattern**:
```javascript
setTimeout(() => {
    app.workspace.trigger('dataview:refresh-views');
}, 100);

// Or worse:
setTimeout(async () => {
    const file = app.vault.getAbstractFileByPath(filePath);
    await app.workspace.getLeaf('tab').openFile(file);
}, 1000);
```

**Solution 1: Use refreshDataview utility** (already created in Phase 1):
```javascript
// Replace setTimeout for dataview refresh
ui.refreshDataview(app);  // Uses DELAYS.DATAVIEW_REFRESH constant
```

**Solution 2: Use openFile utility with proper async**:
```javascript
// Replace setTimeout for file opening
await new Promise(resolve => setTimeout(resolve, DELAYS.FILE_OPEN));
await core.openFile(app, filePath, true);
```

**Solution 3: For vault operations, use proper async/await**:
```javascript
// Instead of setTimeout wrapping async operations
await app.vault.modify(file, content);
await app.vault.cachedRead(file);  // Force cache update
// Now safe to trigger refresh
ui.refreshDataview(app);
```

**Impact**:
- Eliminates race conditions
- Uses proper async patterns
- Makes timing configurable via DELAYS constants
- Improves reliability

---

### Task 3.3: Add Input Validation

**Problem**: Public functions in lib modules lack input validation

**Solution**: Add validation to critical functions

#### combat.js validations:

```javascript
export function rollHitPoints(dice, mode) {
    if (!dice) return 0;
    if (typeof dice.num !== 'number' || typeof dice.size !== 'number') {
        throw new Error("Invalid dice formula: num and size must be numbers");
    }
    if (dice.num < 0 || dice.size < 1) {
        throw new Error("Invalid dice formula: num must be >= 0, size must be >= 1");
    }
    // ... rest of function
}

export function getHealthStatus(currentHp, maxHp) {
    if (typeof currentHp !== 'number' || typeof maxHp !== 'number') {
        throw new Error("Invalid HP values: must be numbers");
    }
    if (maxHp <= 0) {
        throw new Error("Max HP must be positive");
    }
    if (currentHp < 0) {
        currentHp = 0;  // Clamp to 0
    }
    // ... rest of function
}

export function applyDamageToTarget(target, amount) {
    if (!target || typeof target !== 'object') {
        throw new Error("Invalid target: must be an object");
    }
    if (typeof amount !== 'number' || amount < 0) {
        throw new Error("Damage amount must be a non-negative number");
    }
    // ... rest of function
}
```

#### monsters.js validations:

```javascript
export function calculateDexMod(dexScore) {
    if (typeof dexScore !== 'number') {
        throw new Error("DEX score must be a number");
    }
    if (dexScore < 1 || dexScore > 30) {
        throw new Error("DEX score must be between 1 and 30");
    }
    const mod = Math.floor((dexScore - ABILITY_SCORE_BASE) / ABILITY_MOD_DIVISOR);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function transformSRDToCombatFormat(srdMonster) {
    if (!srdMonster || typeof srdMonster !== 'object') {
        throw new Error("Invalid monster data: must be an object");
    }
    if (!srdMonster.name) {
        throw new Error("Monster must have a name");
    }
    // ... rest of function
}
```

#### ui.js validations:

```javascript
export async function promptForPositiveNumber(quickAddApi, message, defaultValue = 1) {
    if (!quickAddApi) {
        throw new Error("quickAddApi is required");
    }
    if (typeof message !== 'string') {
        throw new Error("Message must be a string");
    }

    const amount = await quickAddApi.inputPrompt(message, null, defaultValue?.toString());
    if (!amount) return null;

    const parsed = parseInt(amount);
    if (isNaN(parsed) || parsed < 1) {
        throw new Error("Invalid amount - must be a positive number");
    }
    return parsed;
}
```

**Impact**:
- Prevents runtime errors
- Improves debugging with clear error messages
- Catches issues at function boundaries
- Documents expected input types

---

### Phase 3 Impact Summary

- **Files modified**: 2 major (createEncounter.js + new template), 3+ for race conditions
- **Line reduction**: 400+ lines from createEncounter.js alone
- **New template files**: 1
- **Architectural improvements**: God Object eliminated, race conditions fixed, validation added
- **Maintainability**: Dramatically improved

---

## Phase 4: Cleanup and Polish (Priority: LOW)

**Goal**: Final improvements for code quality and maintainability

### Task 4.1: Improve Naming Consistency

**Current issues**:
- `fm` used instead of `frontmatter` in many places
- Single-letter loop variables where descriptive names would help
- Inconsistent parameter naming across similar functions

**Changes**:

#### Replace `fm` with descriptive names:

```javascript
// Before
export function validateEncounterContext(app, requiredStatuses = null) {
    const file = getActiveFile(app);
    const fm = getFrontmatter(app, file);
    requireNoteType(fm, NOTE_TYPES.ENCOUNTER);
    return { file, fm };
}

// After
export function validateEncounterContext(app, requiredStatuses = null) {
    const file = getActiveFile(app);
    const frontmatter = getFrontmatter(app, file);
    requireNoteType(frontmatter, NOTE_TYPES.ENCOUNTER);
    return { file, frontmatter };
}
```

#### Improve loop variable names:

```javascript
// Before
for (const i of initiatives) {
    const name = stripWikiLinks(i.name);
    // ...
}

// After
for (const combatant of initiatives) {
    const name = stripWikiLinks(combatant.name);
    // ...
}

// Before
for (let i = 0; i < monsterEntry.qty; i++) {
    const label = generateLabel(startingLabelIndex + i, isGroupInit);
    // ...
}

// After (keep 'i' for numeric indices, but could use 'index')
for (let index = 0; index < monsterEntry.qty; index++) {
    const label = generateLabel(startingLabelIndex + index, isGroupInit);
    // ...
}
```

**Impact**: Improved readability

---

### Task 4.2: Add JSDoc Comments

**Goal**: Document all public functions with JSDoc

**Template**:
```javascript
/**
 * Calculate D&D 5e ability modifier from ability score
 *
 * @param {number} abilityScore - Ability score (1-30)
 * @returns {string} Formatted modifier (e.g., "+3", "-1")
 * @throws {Error} If ability score is invalid
 *
 * @example
 * calculateDexMod(16) // Returns "+3"
 * calculateDexMod(8)  // Returns "-1"
 */
export function calculateDexMod(abilityScore) {
    if (typeof abilityScore !== 'number' || abilityScore < 1 || abilityScore > 30) {
        throw new Error("Ability score must be between 1 and 30");
    }
    const mod = Math.floor((abilityScore - ABILITY_SCORE_BASE) / ABILITY_MOD_DIVISOR);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}
```

**Apply to all public functions in**:
- `core.js` (all exports)
- `combat.js` (all exports)
- `monsters.js` (all exports)
- `ui.js` (all exports)

**Impact**:
- Better IDE autocomplete
- Self-documenting code
- Easier onboarding for new developers

---

### Task 4.3: Add Null Safety

**Goal**: Add defensive checks in key functions

**Examples**:

```javascript
// In combat.js
export function sortInitiatives(initiatives) {
    if (!Array.isArray(initiatives)) {
        throw new Error("Initiatives must be an array");
    }
    return [...initiatives].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
}

export function findTargetByLabel(initiatives, identifier) {
    if (!Array.isArray(initiatives)) {
        throw new Error("Initiatives must be an array");
    }
    if (!identifier) {
        return null;
    }
    return initiatives.find(i =>
        i.label === identifier ||
        stripWikiLinks(i.name) === identifier
    );
}

// In monsters.js
export async function loadBestiaryIndex(app) {
    if (!app?.vault) {
        throw new Error("Invalid app object: vault not available");
    }
    const indexFile = app.vault.getAbstractFileByPath(PATHS.SRD_INDEX);
    if (!indexFile) {
        throw new Error("Bestiary index.json not found. Run setup: git clone in _system/srd/");
    }
    return JSON.parse(await app.vault.read(indexFile));
}

// In core.js
export function stripWikiLinks(text) {
    if (text === null || text === undefined) return '';
    if (typeof text !== 'string') {
        throw new Error("stripWikiLinks expects a string");
    }
    return text.replace(/\[\[|\]\]/g, '');
}
```

**Impact**:
- Prevents null/undefined errors
- Clearer error messages
- More robust code

---

### Task 4.4: Create Module Documentation

**New file**: `_system/scripts/lib/README.md`

Document the library module system:

```markdown
# Library Modules

Shared utilities for TTRPG-DEV action scripts.

## Module Overview

### constants.js
Central location for all magic values and configuration.

**Exports**:
- `D20_SIDES`, `ABILITY_SCORE_BASE`, etc. - Game mechanics constants
- `PATHS` - File path constants
- `NOTE_TYPES` - Note type constants
- `ENCOUNTER_STATUSES` - Encounter status constants
- `DELAYS` - UI timing constants

### core.js
Core utilities for file access, validation, and error handling.

**Key functions**:
- `validateEncounterContext()` - Validate encounter and get context
- `requireInitiatives()` - Ensure initiatives exist
- `handleActionError()` - Standardized error handling
- `stripWikiLinks()` - Clean WikiLink syntax from text

### combat.js
Combat mechanics: initiative, HP, damage, healing, combat log.

**Key functions**:
- `rollInitiative()` - Roll initiative with modifier
- `applyDamageToTarget()` - Apply damage and update status
- `applyHealingToTarget()` - Apply healing and update status
- `logCombatAction()` - Add entry to combat log
- `advanceTurn()` - Move to next turn/round

### monsters.js
Monster data loading and transformation from SRD.

**Key functions**:
- `loadAllMonsters()` - Load all enabled monster sources
- `transformSRDToCombatFormat()` - Convert SRD to combat data
- `calculateDexMod()` - Calculate ability modifier

### ui.js
User interface utilities for prompts, notifications, and selections.

**Key functions**:
- `promptForTarget()` - Select combat target
- `promptForSource()` - Select combat source
- `selectOption()` - Simplified option selection
- `confirm()` - Confirmation dialog
- `refreshDataview()` - Trigger dataview refresh

## Usage Patterns

### Error Handling
All action scripts should use the same pattern:

\`\`\`javascript
import * as core from '../../lib/core.js';

export async function run(context) {
    try {
        // ... action logic
    } catch (error) {
        core.handleActionError("actionName", error);
    }
}
\`\`\`

### Validation
Use validation utilities instead of manual checks:

\`\`\`javascript
// Get and validate encounter context
const { file, frontmatter } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);

// Ensure initiatives exist
const initiatives = core.requireInitiatives(frontmatter);

// Check not completed
core.requireNotCompleted(frontmatter, "this action");
\`\`\`

### UI Patterns
Use consistent UI utilities:

\`\`\`javascript
// Get validated positive number
const amount = await ui.promptForPositiveNumber(quickAddApi, "Amount:", 1);

// Confirm action
const confirmed = await ui.confirm(quickAddApi, "Are you sure?");

// Select from options
const mode = await ui.selectOption(quickAddApi, [
    { label: "Option 1", value: "opt1" },
    { label: "Option 2", value: "opt2" }
], "Choose mode:");
\`\`\`
```

**Impact**: Onboarding documentation for developers

---

### Phase 4 Impact Summary

- **Naming improvements**: All `fm` → `frontmatter`, better loop variables
- **Documentation**: JSDoc for all public functions, module README
- **Null safety**: Defensive checks throughout
- **Developer experience**: Much improved

---

## Implementation Order

Execute phases in order to minimize breaking changes:

1. ✅ **Phase 1** - Foundation (COMPLETED)
   - Created utilities without modifying existing code
   - Low risk, high value

2. **Phase 2** - Apply utilities to action scripts (NEXT)
   - Start with combat actions (most duplication)
   - Then encounter actions
   - Then world creation
   - Test after each file

3. **Phase 3** - Architectural improvements
   - Extract createEncounter.js template (biggest win)
   - Fix race conditions
   - Add validation

4. **Phase 4** - Polish
   - Improve naming
   - Add documentation
   - Final cleanup

---

## Testing Strategy

After each phase:

### Manual Testing Checklist

1. **Create test world**
   - Run createWorld action
   - Verify world folder created
   - Check world note created with correct frontmatter

2. **Create encounter**
   - Run createEncounter action
   - Add monsters via addMonsters
   - Verify monster data loaded correctly
   - Check initiative rolls

3. **Enable combat**
   - Run enableCombat action
   - Verify status changed to inCombat
   - Check combat log created
   - Verify initiatives sorted

4. **Combat actions**
   - Apply damage via applyDamage
   - Verify HP decreased
   - Check status updated
   - Confirm combat log entry
   - Apply healing via applyHealing
   - Verify HP increased
   - Check combat log entry

5. **Turn management**
   - Run nextTurn action
   - Verify currentTurn incremented
   - Check round advancement
   - Verify combat log entry

6. **End combat**
   - Run endCombat action
   - Verify status changed to completed
   - Check combat log final entry

7. **Dataview verification**
   - Check all dataview queries render correctly
   - Verify initiative tracker displays
   - Check combat log displays
   - Confirm encounter details show

### Console Verification

Check browser console (Ctrl+Shift+I) for:
- No errors during any action
- No warnings about undefined variables
- Proper error messages for validation failures

### Git Workflow

After each successful task:
```bash
git add <modified-files>
git commit -m "refactor(phase-X): <description>"
```

Use conventional commits:
- `refactor(combat): apply utilities to applyDamage and applyHealing`
- `refactor(encounter): extract createEncounter template`
- `docs(lib): add JSDoc comments to all public functions`

---

## Success Criteria

- ✅ All 50+ DRY violations eliminated
- ✅ 14 anti-patterns addressed
- ✅ Code reduction: 400-500 lines
- ✅ createEncounter.js: 566 → ~150 lines
- ✅ All manual tests pass
- ✅ No new errors introduced
- ✅ Improved maintainability and readability
- ✅ Comprehensive documentation

---

## Rollback Plan

If issues arise:
1. Each phase is independent - can revert individual phases
2. Git commits after each task allow granular rollback
3. Keep old code as comments initially, remove after testing
4. No breaking API changes - new functions are additions

---

## Critical Files Reference

**Phase 1 Completed** ✅:
- `_system/scripts/lib/constants.js` - NEW
- `_system/scripts/lib/core.js` - MODIFIED
- `_system/scripts/lib/ui.js` - MODIFIED
- `_system/scripts/lib/combat.js` - MODIFIED
- `_system/scripts/lib/monsters.js` - MODIFIED

**Phase 2 To Modify**:
- `_system/scripts/actions/combat/applyDamage.js`
- `_system/scripts/actions/combat/applyHealing.js`
- `_system/scripts/actions/combat/nextTurn.js`
- `_system/scripts/actions/combat/endCombat.js`
- `_system/scripts/actions/combat/playersInitiatives.js`
- `_system/scripts/actions/combat/enableCombat.js`
- `_system/scripts/actions/encounter/addMonsters.js`
- `_system/scripts/actions/world/createWorld.js`

**Phase 3 To Modify**:
- `_system/scripts/actions/encounter/createEncounter.js` - MAJOR REFACTOR
- `_system/templates/encounter-dataview.js.template` - NEW

**Phase 4 To Document**:
- `_system/scripts/lib/README.md` - NEW
- All lib/*.js files - JSDoc additions

---

## Quick Start for Next Session

To continue after reset:

1. Read this file: `REFACTORING_REMAINING_PHASES.md`
2. Check Phase 1 completion status in git log
3. Start with Phase 2, Task 2.1 (applyDamage.js)
4. Follow refactoring pattern from this document
5. Test after each file modification
6. Commit after each successful task
7. Move to next phase when current phase complete

**Current status**: Phase 1 complete, ready to begin Phase 2
