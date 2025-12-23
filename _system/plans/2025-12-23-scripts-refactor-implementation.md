# Scripts Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all QuickAdd scripts to JS-Engine modules with proper ES6 imports, eliminating code duplication.

**Architecture:** Two-level structure with `lib/` for shared modules and `actions/` for entry points. QuickAdd becomes a thin wrapper layer that calls JS-Engine API to execute action scripts.

**Tech Stack:** JS-Engine plugin, ES6 modules, QuickAdd macros

**Testing Note:** This is an Obsidian plugin environment without automated testing. Each task includes manual verification steps to run in Obsidian.

---

## Phase 1: Setup

### Task 1.1: Create Directory Structure

**Files:**
- Create: `_system/scripts/lib/`
- Create: `_system/scripts/actions/world/`
- Create: `_system/scripts/actions/encounter/`
- Create: `_system/scripts/actions/combat/`
- Create: `_system/scripts/quickadd/`

**Step 1: Create all directories**

```bash
mkdir -p _system/scripts/lib
mkdir -p _system/scripts/actions/world
mkdir -p _system/scripts/actions/encounter
mkdir -p _system/scripts/actions/combat
mkdir -p _system/scripts/quickadd
```

**Step 2: Verify structure**

```bash
find _system/scripts -type d | sort
```

Expected output:
```
_system/scripts
_system/scripts/actions
_system/scripts/actions/combat
_system/scripts/actions/encounter
_system/scripts/actions/world
_system/scripts/lib
_system/scripts/quickadd
```

**Step 3: Commit**

```bash
git add _system/scripts/
git commit -m "chore: create new script directory structure"
```

---

### Task 1.2: Delete Obsolete Files

**Files:**
- Delete: `_system/scripts/createEncounter copy.js`
- Delete: `_system/scripts/combatActions.js`

**Step 1: Delete files**

```bash
rm "_system/scripts/createEncounter copy.js"
rm "_system/scripts/combatActions.js"
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete scripts (duplicate and replaced)"
```

---

## Phase 2: Create Lib Modules

### Task 2.1: Create lib/core.js

**Files:**
- Create: `_system/scripts/lib/core.js`

**Step 1: Write the core module**

```javascript
/**
 * Core utilities for Obsidian scripts
 * Cross-cutting concerns: frontmatter, validation, file access
 */

/**
 * Get the active file or throw
 * @param {App} app - Obsidian app instance
 * @returns {TFile} The active file
 * @throws {Error} If no file is active
 */
export function getActiveFile(app) {
    const file = app.workspace.getActiveFile();
    if (!file) {
        throw new Error("No active file");
    }
    return file;
}

/**
 * Get frontmatter from a file
 * @param {App} app - Obsidian app instance
 * @param {TFile} file - The file to read
 * @returns {Object} The frontmatter object
 * @throws {Error} If no frontmatter exists
 */
export function getFrontmatter(app, file) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) {
        throw new Error("No frontmatter found");
    }
    return cache.frontmatter;
}

/**
 * Update frontmatter using processFrontMatter
 * @param {App} app - Obsidian app instance
 * @param {TFile} file - The file to update
 * @param {Function} updateFn - Function that receives and modifies frontmatter
 */
export async function updateFrontmatter(app, file, updateFn) {
    await app.fileManager.processFrontMatter(file, updateFn);
}

/**
 * Validate note type matches expected
 * @param {Object} fm - Frontmatter object
 * @param {string} expectedType - Expected type value
 * @throws {Error} If type doesn't match
 */
export function requireNoteType(fm, expectedType) {
    if (fm.type !== expectedType) {
        throw new Error(`Note type is '${fm.type}', expected '${expectedType}'`);
    }
}

/**
 * Validate status is one of allowed values
 * @param {Object} fm - Frontmatter object
 * @param {string[]} allowedStatuses - Array of allowed status values
 * @throws {Error} If status is not allowed
 */
export function requireStatus(fm, allowedStatuses) {
    if (!allowedStatuses.includes(fm.status)) {
        throw new Error(`Status '${fm.status}' not allowed. Expected: ${allowedStatuses.join(', ')}`);
    }
}

/**
 * Get a file by path or throw
 * @param {App} app - Obsidian app instance
 * @param {string} path - Path to the file
 * @returns {TFile} The file
 * @throws {Error} If file not found
 */
export function getFileByPath(app, path) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) {
        throw new Error(`File not found: ${path}`);
    }
    return file;
}

/**
 * Read file content as text
 * @param {App} app - Obsidian app instance
 * @param {TFile} file - The file to read
 * @returns {Promise<string>} File content
 */
export async function readFile(app, file) {
    return await app.vault.read(file);
}

/**
 * Write content to file
 * @param {App} app - Obsidian app instance
 * @param {TFile} file - The file to write
 * @param {string} content - Content to write
 */
export async function writeFile(app, file, content) {
    await app.vault.modify(file, content);
}
```

**Step 2: Verify syntax**

Open Obsidian and create a test note with:
```
```js-engine
const core = await engine.importJs('_system/scripts/lib/core.js');
console.log('Core module loaded:', Object.keys(core));
```
```

Check console for: `Core module loaded: ['getActiveFile', 'getFrontmatter', ...]`

**Step 3: Commit**

```bash
git add _system/scripts/lib/core.js
git commit -m "feat(lib): add core.js with frontmatter and validation utilities"
```

---

### Task 2.2: Create lib/ui.js

**Files:**
- Create: `_system/scripts/lib/ui.js`

**Step 1: Write the UI module**

```javascript
/**
 * UI utilities for Obsidian scripts
 * Prompts, notifications, and user interaction
 */

/**
 * Show success notification
 * @param {string} message - Message to display
 */
export function notifySuccess(message) {
    new Notice(message);
}

/**
 * Show warning notification
 * @param {string} message - Message to display
 */
export function notifyWarning(message) {
    new Notice(`${message}`);
}

/**
 * Show error notification
 * @param {string} message - Message to display
 */
export function notifyError(message) {
    new Notice(`${message}`);
}

/**
 * Prompt user to select from a list
 * @param {Object} quickAddApi - QuickAdd API
 * @param {string[]} displayChoices - Labels shown to user
 * @param {any[]} values - Values returned on selection
 * @param {string} placeholder - Placeholder text
 * @returns {Promise<any>} Selected value or undefined
 */
export async function selectFromList(quickAddApi, displayChoices, values, placeholder = "Select...") {
    return await quickAddApi.suggester(displayChoices, values, false, placeholder);
}

/**
 * Prompt user for text input
 * @param {Object} quickAddApi - QuickAdd API
 * @param {string} message - Prompt message
 * @param {string} defaultValue - Default value
 * @returns {Promise<string>} User input or undefined
 */
export async function promptForText(quickAddApi, message, defaultValue = "") {
    return await quickAddApi.inputPrompt(message, defaultValue);
}

/**
 * Prompt user for a number
 * @param {Object} quickAddApi - QuickAdd API
 * @param {string} message - Prompt message
 * @param {number} defaultValue - Default value
 * @returns {Promise<number|null>} Parsed number or null if invalid
 */
export async function promptForNumber(quickAddApi, message, defaultValue = 0) {
    const input = await quickAddApi.inputPrompt(message, String(defaultValue));
    if (!input) return null;
    const num = parseInt(input);
    return isNaN(num) ? null : num;
}

/**
 * Open a ModalForms form
 * @param {App} app - Obsidian app instance
 * @param {string} formName - Name of the form to open
 * @param {Object} options - Form options (values, etc.)
 * @returns {Promise<Object>} Form result
 * @throws {Error} If ModalForms not available
 */
export async function showForm(app, formName, options = {}) {
    const modalForm = app.plugins.plugins.modalforms?.api;
    if (!modalForm) {
        throw new Error("ModalForms plugin is not enabled");
    }
    return await modalForm.openForm(formName, options);
}

/**
 * Build target choices for combat selection
 * @param {Object[]} initiatives - Array of initiative entries
 * @returns {Object} { displayChoices: string[], values: string[] }
 */
export function buildTargetChoices(initiatives) {
    const displayChoices = initiatives.map(i => {
        const name = i.name ? i.name.replace(/\[\[|\]\]/g, '') : 'Unknown';
        const hp = i.type === "monster" ? ` [${i.currentHp}/${i.maxHp} HP]` : '';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}${hp}`;
    });

    const values = initiatives.map(i => i.label || i.name?.replace(/\[\[|\]\]/g, '') || 'Unknown');

    return { displayChoices, values };
}

/**
 * Prompt user to select a combat target
 * @param {Object} quickAddApi - QuickAdd API
 * @param {Object[]} initiatives - Array of initiative entries
 * @param {string} placeholder - Placeholder text
 * @returns {Promise<Object|null>} Selected target or null
 */
export async function promptForTarget(quickAddApi, initiatives, placeholder = "Select target...") {
    const { displayChoices, values } = buildTargetChoices(initiatives);
    const selectedLabel = await selectFromList(quickAddApi, displayChoices, values, placeholder);
    if (!selectedLabel) return null;

    return initiatives.find(i =>
        i.label === selectedLabel ||
        (i.name && i.name.replace(/\[\[|\]\]/g, '') === selectedLabel)
    );
}

/**
 * Build source/attacker choices for combat
 * @param {Object[]} initiatives - Array of initiative entries
 * @returns {Object} { displayChoices: string[], values: string[] }
 */
export function buildSourceChoices(initiatives) {
    const displayChoices = initiatives.map(i => {
        const name = i.name ? i.name.replace(/\[\[|\]\]/g, '') : 'Unknown';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}`;
    });

    return { displayChoices, values: displayChoices };
}

/**
 * Damage type options with emojis
 */
export const DAMAGE_TYPES = [
    { label: "Slashing", value: "Slashing" },
    { label: "Piercing", value: "Piercing" },
    { label: "Bludgeoning", value: "Bludgeoning" },
    { label: "Fire", value: "Fire" },
    { label: "Cold", value: "Cold" },
    { label: "Lightning", value: "Lightning" },
    { label: "Thunder", value: "Thunder" },
    { label: "Poison", value: "Poison" },
    { label: "Acid", value: "Acid" },
    { label: "Psychic", value: "Psychic" },
    { label: "Force", value: "Force" },
    { label: "Radiant", value: "Radiant" },
    { label: "Necrotic", value: "Necrotic" }
];
```

**Step 2: Verify syntax in Obsidian console**

**Step 3: Commit**

```bash
git add _system/scripts/lib/ui.js
git commit -m "feat(lib): add ui.js with prompts and notification utilities"
```

---

### Task 2.3: Create lib/combat.js

**Files:**
- Create: `_system/scripts/lib/combat.js`

**Step 1: Write the combat module**

```javascript
/**
 * Combat utilities for D&D 5e encounters
 * Initiative, HP, damage, healing, combat log
 */

/**
 * Roll a d20 + modifier for initiative
 * @param {string} dexModString - DEX modifier string like "+3" or "-1"
 * @returns {number} Initiative roll result
 */
export function rollInitiative(dexModString) {
    const mod = dexModString?.match(/([+-]?\d+)/);
    return Math.floor(Math.random() * 20) + 1 + (mod ? parseInt(mod[1]) : 0);
}

/**
 * Parse hit dice string like "45 (7d8 + 14)"
 * @param {string} hpString - HP string from monster data
 * @returns {Object|null} { num, size, op, mod } or null
 */
export function parseHitDice(hpString) {
    const match = hpString?.match(/\((\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\)/);
    return match ? {
        num: parseInt(match[1]),
        size: parseInt(match[2]),
        op: match[3] || '+',
        mod: parseInt(match[4] || 0)
    } : null;
}

/**
 * Roll HP based on mode
 * @param {Object} dice - Parsed dice { num, size, op, mod }
 * @param {string} mode - 'rolled', 'low', 'average', 'default'
 * @returns {number} Calculated HP
 */
export function rollHitPoints(dice, mode) {
    if (!dice) return 0;
    let total = 0;

    if (mode === "low") {
        total = dice.num + (dice.op === '+' ? dice.mod : -dice.mod);
    } else if (mode === "average") {
        total = Math.floor(dice.num * (dice.size + 1) / 2) + (dice.op === '+' ? dice.mod : -dice.mod);
    } else {
        // rolled mode
        for (let i = 0; i < dice.num; i++) {
            total += Math.floor(Math.random() * dice.size) + 1;
        }
        total += dice.op === '+' ? dice.mod : -dice.mod;
    }

    return Math.max(1, total);
}

/**
 * Generate unique labels for monster instances
 * @param {number} index - Monster index
 * @param {boolean} isGroup - Whether using group initiative
 * @returns {string} Label like "G1", "A1", "AA1"
 */
export function generateLabel(index, isGroup) {
    if (isGroup) {
        return `G${index + 1}`;
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterIndex = Math.floor(index / 26);
    const numIndex = (index % 26) + 1;
    const letter = letterIndex === 0 ? alphabet[index % 26] : alphabet[letterIndex - 1] + alphabet[index % 26];
    return `${letter}${numIndex}`;
}

/**
 * Calculate HP status based on current/max ratio
 * @param {number} currentHp - Current HP
 * @param {number} maxHp - Maximum HP
 * @returns {string} Status string
 */
export function getHealthStatus(currentHp, maxHp) {
    if (currentHp <= 0) return "dead";
    const ratio = currentHp / maxHp;
    if (ratio >= 1) return "healthy";
    if (ratio >= 0.75) return "scratched";
    if (ratio >= 0.5) return "bloodied";
    if (ratio >= 0.25) return "critical";
    return "dying";
}

/**
 * Apply damage to a target
 * @param {Object} target - Initiative entry
 * @param {number} amount - Damage amount
 * @returns {Object} { oldHp, newHp, newStatus }
 */
export function applyDamageToTarget(target, amount) {
    const oldHp = target.currentHp;
    const newHp = Math.max(0, target.currentHp - amount);
    target.currentHp = newHp;
    target.status = getHealthStatus(newHp, target.maxHp);
    return { oldHp, newHp, newStatus: target.status };
}

/**
 * Apply healing to a target
 * @param {Object} target - Initiative entry
 * @param {number} amount - Heal amount
 * @returns {Object} { oldHp, newHp, newStatus }
 */
export function applyHealingToTarget(target, amount) {
    const oldHp = target.currentHp;
    const newHp = Math.min(target.maxHp, target.currentHp + amount);
    target.currentHp = newHp;
    target.status = getHealthStatus(newHp, target.maxHp);
    return { oldHp, newHp, newStatus: target.status };
}

/**
 * Sort initiatives by initiative value (descending)
 * @param {Object[]} initiatives - Array of initiative entries
 * @returns {Object[]} Sorted array
 */
export function sortInitiatives(initiatives) {
    return [...initiatives].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
}

/**
 * Find target by label or name
 * @param {Object[]} initiatives - Array of initiative entries
 * @param {string} identifier - Label or name to find
 * @returns {Object|undefined} Found target or undefined
 */
export function findTargetByLabel(initiatives, identifier) {
    return initiatives.find(i =>
        i.label === identifier ||
        (i.name && i.name.replace(/\[\[|\]\]/g, '') === identifier)
    );
}

/**
 * Advance turn in combat
 * @param {Object} fm - Frontmatter with currentTurn, round, initiatives
 * @returns {Object} { nextTurn, nextRound, isNewRound }
 */
export function advanceTurn(fm) {
    const currentTurn = fm.currentTurn || 0;
    const currentRound = fm.round || 1;
    const initiativeCount = (fm.initiatives || []).length;

    let nextTurn = currentTurn + 1;
    let nextRound = currentRound;
    let isNewRound = false;

    if (nextTurn >= initiativeCount) {
        nextTurn = 0;
        nextRound = currentRound + 1;
        isNewRound = true;
    }

    return { nextTurn, nextRound, isNewRound };
}

/**
 * Format a combat log entry
 * @param {number} round - Current round
 * @param {string} action - Action type: 'damage', 'heal', 'turn', 'round'
 * @param {Object} data - Action-specific data
 * @returns {string} Formatted log entry
 */
export function formatLogEntry(round, action, data) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    switch (action) {
        case 'damage':
            return `- ${timestamp}: ${data.source} dealt ${data.amount} ${data.damageType} damage to ${data.target} (${data.oldHp} -> ${data.newHp}/${data.maxHp})`;
        case 'heal':
            return `- ${timestamp}: ${data.source} healed ${data.target} for ${data.amount} HP (${data.oldHp} -> ${data.newHp}/${data.maxHp})`;
        case 'round':
            return `- **Round ${data.round} begins!**`;
        case 'end':
            return `- === COMBAT ENDED === (${timestamp})`;
        default:
            return `- ${timestamp}: ${data.message || action}`;
    }
}

/**
 * Append entry to combat log in file content
 * @param {string} content - File content
 * @param {string} entry - Log entry to append
 * @returns {string} Updated content
 */
export function appendToLog(content, entry) {
    if (content.includes("## Combat Log")) {
        return content.replace(/(## Combat Log\n)/, `$1${entry}\n`);
    } else {
        return content + `\n\n## Combat Log\n${entry}\n`;
    }
}
```

**Step 2: Verify in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/lib/combat.js
git commit -m "feat(lib): add combat.js with initiative, HP, and combat log utilities"
```

---

### Task 2.4: Create lib/monsters.js

**Files:**
- Create: `_system/scripts/lib/monsters.js`

**Step 1: Write the monsters module**

```javascript
/**
 * Monster and SRD data utilities
 * Loading, parsing, and transforming monster data
 */

import { parseHitDice, rollHitPoints, rollInitiative, generateLabel } from './combat.js';

/**
 * Parse enabled sources from sources.md content
 * @param {string} content - Content of sources.md
 * @returns {string[]} Array of enabled source codes
 */
export function parseEnabledSources(content) {
    const enabledSources = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const match = line.match(/- \*\*([A-Z0-9-]+)\*\*.*:\s*`enabled:\s*(true|false)`/);
        if (match) {
            const source = match[1];
            const enabled = match[2] === 'true';
            if (enabled) {
                enabledSources.push(source);
            }
        }
    }

    return enabledSources;
}

/**
 * Load bestiary index
 * @param {App} app - Obsidian app instance
 * @returns {Promise<Object>} Index mapping source to filename
 */
export async function loadBestiaryIndex(app) {
    const indexPath = "_system/srd/5etools-src/data/bestiary/index.json";
    const indexFile = app.vault.getAbstractFileByPath(indexPath);
    if (!indexFile) {
        throw new Error("Bestiary index.json not found");
    }
    return JSON.parse(await app.vault.read(indexFile));
}

/**
 * Load monsters from a specific source
 * @param {App} app - Obsidian app instance
 * @param {Object} index - Bestiary index
 * @param {string} source - Source code
 * @returns {Promise<Object[]>} Array of monster objects
 */
export async function loadMonstersBySource(app, index, source) {
    const bestiaryFile = index[source];
    if (!bestiaryFile) return [];

    const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;
    const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

    if (!bestiaryFileObj) return [];

    try {
        const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
        return bestiaryData.monster || [];
    } catch (error) {
        console.error(`Error loading ${bestiaryPath}:`, error);
        return [];
    }
}

/**
 * Load all monsters from enabled sources
 * @param {App} app - Obsidian app instance
 * @returns {Promise<Object[]>} Array of all monsters
 */
export async function loadAllMonsters(app) {
    // Load sources.md
    const sourcesFile = app.vault.getAbstractFileByPath("_system/srd/sources.md");
    if (!sourcesFile) {
        throw new Error("sources.md not found in _system/srd/");
    }

    const sourcesContent = await app.vault.read(sourcesFile);
    const enabledSources = parseEnabledSources(sourcesContent);

    if (enabledSources.length === 0) {
        throw new Error("No monster sources enabled in sources.md");
    }

    const index = await loadBestiaryIndex(app);
    const allMonsters = [];

    for (const source of enabledSources) {
        const monsters = await loadMonstersBySource(app, index, source);
        allMonsters.push(...monsters);
    }

    return allMonsters;
}

/**
 * Load specific monster data for an encounter
 * @param {App} app - Obsidian app instance
 * @param {Object[]} encounterMonsters - Array of { name, source } objects
 * @returns {Promise<Map>} Map of name -> monster data
 */
export async function loadMonsterDataFromSRD(app, encounterMonsters) {
    const monsterDataMap = new Map();
    const index = await loadBestiaryIndex(app);

    // Group monsters by source to minimize file reads
    const monstersBySource = new Map();
    for (const monster of encounterMonsters) {
        if (!monster.source) continue;
        if (!monstersBySource.has(monster.source)) {
            monstersBySource.set(monster.source, []);
        }
        monstersBySource.get(monster.source).push(monster.name);
    }

    // Load each source file and extract monster data
    for (const [source, monsterNames] of monstersBySource) {
        const monsters = await loadMonstersBySource(app, index, source);
        for (const monster of monsters) {
            if (monsterNames.includes(monster.name)) {
                const combatMonster = transformSRDToCombatFormat(monster);
                monsterDataMap.set(monster.name, combatMonster);
            }
        }
    }

    return monsterDataMap;
}

/**
 * Transform SRD monster data to combat-compatible format
 * @param {Object} srdMonster - Raw SRD monster data
 * @returns {Object} Combat-ready monster data
 */
export function transformSRDToCombatFormat(srdMonster) {
    // Calculate DEX modifier
    const dexMod = Math.floor((srdMonster.dex - 10) / 2);
    const dexModString = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

    // Format HP string
    const hpString = srdMonster.hp
        ? `${srdMonster.hp.average} (${srdMonster.hp.formula})`
        : "0";

    // Extract AC value
    let acValue;
    if (Array.isArray(srdMonster.ac)) {
        acValue = srdMonster.ac[0]?.ac || srdMonster.ac[0];
    } else {
        acValue = srdMonster.ac;
    }

    // Format speed string
    let speedString = "30 ft.";
    if (srdMonster.speed) {
        const speeds = [];
        if (srdMonster.speed.walk) speeds.push(`${srdMonster.speed.walk} ft.`);
        if (srdMonster.speed.fly) speeds.push(`fly ${srdMonster.speed.fly} ft.`);
        if (srdMonster.speed.swim) speeds.push(`swim ${srdMonster.speed.swim} ft.`);
        if (srdMonster.speed.climb) speeds.push(`climb ${srdMonster.speed.climb} ft.`);
        if (srdMonster.speed.burrow) speeds.push(`burrow ${srdMonster.speed.burrow} ft.`);
        if (speeds.length > 0) {
            speedString = speeds.join(", ");
        }
    }

    return {
        name: srdMonster.name,
        "DEX_mod": dexModString,
        "Hit Points": hpString,
        "Armor Class": acValue,
        "Speed": speedString
    };
}

/**
 * Calculate DEX modifier from score
 * @param {number} dexScore - DEX ability score
 * @returns {string} Modifier string like "+3" or "-1"
 */
export function calculateDexMod(dexScore) {
    const mod = Math.floor((dexScore - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Process a monster entry into combat initiative entries
 * @param {Object} monsterEntry - { name, qty, initiative, hpMode, source }
 * @param {Object} monsterData - Combat-formatted monster data
 * @param {number} startingLabelIndex - Starting index for labels
 * @param {boolean} inCombat - Whether to roll initiative now
 * @returns {Object[]} Array of initiative entries
 */
export function processMonsterToCombat(monsterEntry, monsterData, startingLabelIndex, inCombat = false) {
    const initiativeEntries = [];
    const isGroupInit = monsterEntry.initiative === "group";
    const groupInit = isGroupInit && inCombat ? rollInitiative(monsterData["DEX_mod"]) : null;

    for (let i = 0; i < monsterEntry.qty; i++) {
        const label = generateLabel(startingLabelIndex + i, isGroupInit);

        // Calculate HP
        let maxHp;
        if (monsterEntry.hpMode === "default") {
            const hpMatch = monsterData["Hit Points"].match(/^(\d+)/);
            maxHp = hpMatch ? parseInt(hpMatch[1]) : 10;
        } else {
            const dice = parseHitDice(monsterData["Hit Points"]);
            maxHp = rollHitPoints(dice, monsterEntry.hpMode);
        }

        // Roll or use group initiative
        const initiative = inCombat
            ? (groupInit !== null ? groupInit : rollInitiative(monsterData["DEX_mod"]))
            : 0;

        initiativeEntries.push({
            name: monsterData.name,
            label: label,
            type: "monster",
            initiative: initiative,
            maxHp: maxHp,
            currentHp: maxHp,
            ac: monsterData["Armor Class"],
            speed: monsterData["Speed"] || "30 ft.",
            status: "healthy"
        });
    }

    return initiativeEntries;
}
```

**Step 2: Verify in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/lib/monsters.js
git commit -m "feat(lib): add monsters.js with SRD loading and monster processing"
```

---

## Phase 3: Migrate Action Scripts

### Task 3.1: Create QuickAdd Wrapper (macros.js)

**Files:**
- Create: `_system/scripts/quickadd/macros.js`

**Step 1: Write the macros wrapper**

```javascript
/**
 * QuickAdd macro wrappers
 * Thin layer that calls JS-Engine to execute action scripts
 */

async function executeAction(params, actionPath) {
    try {
        const jsEngine = params.app.plugins.plugins['js-engine'];
        if (!jsEngine) {
            new Notice('JS-Engine plugin not found');
            return;
        }

        // Execute the action script with context
        await jsEngine.api.executeFileSimple(actionPath, {
            app: params.app,
            quickAddApi: params.quickAddApi
        });
    } catch (error) {
        console.error(`Error executing ${actionPath}:`, error);
        new Notice(`Error: ${error.message}`);
    }
}

// World actions
module.exports.createWorld = async (params) => {
    await executeAction(params, '_system/scripts/actions/world/createWorld.js');
};

// Encounter actions
module.exports.createEncounter = async (params) => {
    await executeAction(params, '_system/scripts/actions/encounter/createEncounter.js');
};

module.exports.addMonsters = async (params) => {
    await executeAction(params, '_system/scripts/actions/encounter/addMonsters.js');
};

// Combat actions
module.exports.enableCombat = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/enableCombat.js');
};

module.exports.playersInitiatives = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/playersInitiatives.js');
};

module.exports.nextTurn = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/nextTurn.js');
};

module.exports.applyDamage = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/applyDamage.js');
};

module.exports.applyHealing = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/applyHealing.js');
};

module.exports.endCombat = async (params) => {
    await executeAction(params, '_system/scripts/actions/combat/endCombat.js');
};
```

**Step 2: Commit**

```bash
git add _system/scripts/quickadd/macros.js
git commit -m "feat(quickadd): add macros.js wrapper for JS-Engine integration"
```

---

### Task 3.2: Create actions/combat/endCombat.js

**Files:**
- Create: `_system/scripts/actions/combat/endCombat.js`

**Step 1: Write the action script**

```javascript
/**
 * End Combat Action
 * Ends an active combat encounter and logs final state
 */

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        // Import lib modules
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');

        // Get and validate file
        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        // Confirm end combat
        const confirmOptions = [
            { label: "Yes, end combat", value: true },
            { label: "Continue fighting", value: false }
        ];
        const confirm = await ui.selectFromList(
            quickAddApi,
            confirmOptions.map(o => o.label),
            confirmOptions,
            "End this combat?"
        );

        if (!confirm || !confirm.value) return;

        // Update status
        await core.updateFrontmatter(app, file, fm => {
            fm.status = "completed";
            fm.completedDate = new Date().toISOString();
        });

        // Add to combat log
        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'end', {});
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess("Combat ended!");

    } catch (error) {
        console.error("endCombat error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

1. Create a test encounter note with `status: inCombat`
2. Update QuickAdd `end-combat` macro to use `_system/scripts/quickadd/macros.js` with export `endCombat`
3. Run the macro
4. Verify status changes to "completed"

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/endCombat.js
git commit -m "feat(actions): add endCombat.js action"
```

---

### Task 3.3: Create actions/combat/nextTurn.js

**Files:**
- Create: `_system/scripts/actions/combat/nextTurn.js`

**Step 1: Write the action script**

```javascript
/**
 * Next Turn Action
 * Advances to the next combatant's turn
 */

export async function run(context) {
    const { app } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        const initiatives = fm.initiatives || [];
        if (initiatives.length === 0) {
            ui.notifyWarning("No combatants in initiative!");
            return;
        }

        // Calculate next turn
        const { nextTurn, nextRound, isNewRound } = combat.advanceTurn(fm);

        // Update frontmatter
        await core.updateFrontmatter(app, file, fm => {
            fm.currentTurn = nextTurn;
            fm.round = nextRound;
        });

        // Log round change if new round
        if (isNewRound) {
            let content = await core.readFile(app, file);
            const logEntry = combat.formatLogEntry(nextRound, 'round', { round: nextRound });
            content = combat.appendToLog(content, logEntry);
            await core.writeFile(app, file, content);
        }

        // Get current combatant name
        const currentCombatant = initiatives[nextTurn];
        const combatantName = currentCombatant.label
            ? `${currentCombatant.name} (${currentCombatant.label})`
            : currentCombatant.name;

        // Refresh dataview
        setTimeout(() => {
            app.workspace.trigger('dataview:refresh-views');
        }, 100);

        ui.notifySuccess(`${combatantName}'s turn! (Round ${nextRound})`);

    } catch (error) {
        console.error("nextTurn error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/nextTurn.js
git commit -m "feat(actions): add nextTurn.js action"
```

---

### Task 3.4: Create actions/combat/applyHealing.js

**Files:**
- Create: `_system/scripts/actions/combat/applyHealing.js`

**Step 1: Write the action script**

```javascript
/**
 * Apply Healing Action
 * Heals a target in combat
 */

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        const initiatives = fm.initiatives || [];

        // Select target
        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target to heal:");
        if (!target) return;

        // Select source
        const { displayChoices: sourceChoices, values: sourceValues } = ui.buildSourceChoices(initiatives);
        const source = await ui.selectFromList(quickAddApi, sourceChoices, sourceValues, "Who is healing?");
        if (!source) return;

        // Get heal amount
        const healAmount = await ui.promptForNumber(quickAddApi, "Heal amount:");
        if (!healAmount || healAmount < 1) {
            ui.notifyWarning("Invalid amount!");
            return;
        }

        // Apply healing
        const { oldHp, newHp } = combat.applyHealingToTarget(target, healAmount);

        // Save to frontmatter
        await core.updateFrontmatter(app, file, fm => {
            fm.initiatives = initiatives;
        });

        // Add to combat log
        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'heal', {
            source: source,
            target: target.name,
            amount: healAmount,
            oldHp: oldHp,
            newHp: newHp,
            maxHp: target.maxHp
        });
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess(`${target.name} healed ${healAmount} HP!`);

    } catch (error) {
        console.error("applyHealing error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/applyHealing.js
git commit -m "feat(actions): add applyHealing.js action"
```

---

### Task 3.5: Create actions/combat/applyDamage.js

**Files:**
- Create: `_system/scripts/actions/combat/applyDamage.js`

**Step 1: Write the action script**

```javascript
/**
 * Apply Damage Action
 * Applies damage to a target in combat
 */

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        const initiatives = fm.initiatives || [];

        // Select target
        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target:");
        if (!target) return;

        // Select source
        const { displayChoices: sourceChoices, values: sourceValues } = ui.buildSourceChoices(initiatives);
        const source = await ui.selectFromList(quickAddApi, sourceChoices, sourceValues, "Who is attacking?");
        if (!source) return;

        // Get damage amount
        const damageAmount = await ui.promptForNumber(quickAddApi, "Damage amount:");
        if (!damageAmount || damageAmount < 1) {
            ui.notifyWarning("Invalid amount!");
            return;
        }

        // Select damage type
        const damageTypeLabels = ui.DAMAGE_TYPES.map(t => t.label);
        const damageTypeValues = ui.DAMAGE_TYPES.map(t => t.value);
        const damageType = await ui.selectFromList(quickAddApi, damageTypeLabels, damageTypeValues, "Damage type:");
        if (!damageType) return;

        // Apply damage
        const { oldHp, newHp } = combat.applyDamageToTarget(target, damageAmount);

        // Save to frontmatter
        await core.updateFrontmatter(app, file, fm => {
            fm.initiatives = initiatives;
        });

        // Add to combat log
        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'damage', {
            source: source,
            target: target.name,
            amount: damageAmount,
            damageType: damageType,
            oldHp: oldHp,
            newHp: newHp,
            maxHp: target.maxHp
        });
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess(`${target.name} took ${damageAmount} ${damageType} damage!`);

    } catch (error) {
        console.error("applyDamage error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/applyDamage.js
git commit -m "feat(actions): add applyDamage.js action"
```

---

### Task 3.6: Create actions/combat/playersInitiatives.js

**Files:**
- Create: `_system/scripts/actions/combat/playersInitiatives.js`

**Step 1: Write the action script**

```javascript
/**
 * Players Initiatives Action
 * Add or update player character initiatives using ModalForms
 */

export async function run(context) {
    const { app } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');

        const world = fm.world;
        if (!world) {
            ui.notifyWarning("No world specified in encounter note!");
            return;
        }

        // Open the form
        const result = await ui.showForm(app, 'addPlayerInitiatives', {
            values: {
                entityWorld: world
            }
        });

        if (result.status === "cancelled") return;

        // Parse results: collect all filled entries
        const updates = new Map();

        for (let i = 1; i <= 8; i++) {
            const name = result.data[`player${i}`]?.trim();
            const initStr = result.data[`initiative${i}`]?.toString().trim();

            if (!name || !initStr || initStr === "") continue;

            const initiative = parseInt(initStr);
            if (isNaN(initiative)) {
                console.warn(`Invalid initiative for "${name}": ${initStr}`);
                continue;
            }

            updates.set(name, {
                name: `[[${name}]]`,
                type: "character",
                initiative: initiative
            });
        }

        if (updates.size === 0) {
            ui.notifyWarning("No valid initiatives entered!");
            return;
        }

        // Update frontmatter
        await core.updateFrontmatter(app, file, fm => {
            const currentInitiatives = fm.initiatives || [];

            // Keep existing initiatives that aren't being updated
            const preserved = currentInitiatives.filter(p => {
                const cleanName = p.name?.replace?.(/\[\[(.*?)\]\]/g, '$1') || '';
                return !updates.has(cleanName);
            });

            // Combine and sort
            fm.initiatives = combat.sortInitiatives([...preserved, ...Array.from(updates.values())]);
        });

        ui.notifySuccess(`Updated ${updates.size} initiative(s)!`);

    } catch (error) {
        console.error("playersInitiatives error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/playersInitiatives.js
git commit -m "feat(actions): add playersInitiatives.js action"
```

---

### Task 3.7: Create actions/combat/enableCombat.js

**Files:**
- Create: `_system/scripts/actions/combat/enableCombat.js`

**Step 1: Write the action script**

```javascript
/**
 * Enable Combat Action
 * Transitions a planned encounter to active combat
 */

export async function run(context) {
    const { app } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');
        const monsters = await engine.importJs('_system/scripts/lib/monsters.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');

        if (fm.status === "completed") {
            throw new Error("Cannot start encounter when status is completed");
        }

        if (fm.status === "inCombat") {
            ui.notifyWarning("Combat already in progress!");
            return;
        }

        core.requireStatus(fm, ['planned']);

        // Load monster data from SRD
        const monsterDataMap = await monsters.loadMonsterDataFromSRD(app, fm.monsters || []);

        // Process monster entries into combat initiatives
        const initiativeData = [];
        let labelCounter = 0;

        for (const entry of fm.monsters || []) {
            const monsterData = monsterDataMap.get(entry.name);
            if (!monsterData) {
                ui.notifyWarning(`Monster not found: ${entry.name}`);
                continue;
            }

            const entries = monsters.processMonsterToCombat(entry, monsterData, labelCounter, true);
            initiativeData.push(...entries);
            labelCounter += entry.qty;
        }

        // Preserve any existing players
        const existingPlayers = (fm.initiatives || []).filter(p => p.type === "character");
        initiativeData.push(...existingPlayers);

        // Sort by initiative
        const sortedInitiatives = combat.sortInitiatives(initiativeData);

        // Update frontmatter
        await core.updateFrontmatter(app, file, fm => {
            fm.status = "inCombat";
            fm.round = fm.round || 1;
            fm.currentTurn = 0;
            fm.initiatives = sortedInitiatives;
        });

        // Refresh view
        setTimeout(() => {
            app.workspace.trigger('dataview:refresh-views');
        }, 200);

        ui.notifySuccess("Combat started!");

    } catch (error) {
        console.error("enableCombat error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/enableCombat.js
git commit -m "feat(actions): add enableCombat.js action"
```

---

### Task 3.8: Create actions/encounter/addMonsters.js

**Files:**
- Create: `_system/scripts/actions/encounter/addMonsters.js`

**Step 1: Write the action script**

```javascript
/**
 * Add Monsters Action
 * Add monsters to a planned encounter from SRD
 */

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const monstersLib = await engine.importJs('_system/scripts/lib/monsters.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');

        if (fm.status === "completed") {
            ui.notifyWarning("Cannot add monsters to completed encounter!");
            return;
        }

        // Load all monsters from enabled sources
        const allMonsters = await monstersLib.loadAllMonsters(app);

        if (allMonsters.length === 0) {
            ui.notifyWarning("No monsters found in enabled sources!");
            return;
        }

        let building = true;
        const newMonsters = [];

        while (building) {
            // Select monster
            const monsterChoices = allMonsters.map(m => `${m.name} (${m.source})`).sort();
            const monsterName = await ui.selectFromList(
                quickAddApi,
                monsterChoices,
                monsterChoices,
                "Select monster (ESC to finish):"
            );

            if (!monsterName) break;

            // Extract name from "name (source)" format
            const monsterNameOnly = monsterName.replace(/\s*\([^)]*\)$/, '');
            const selectedMonster = allMonsters.find(m => m.name === monsterNameOnly);

            // Quantity
            const qty = await ui.promptForNumber(quickAddApi, "Quantity:", 1) || 1;

            // Initiative mode
            const initiativeOptions = [
                { label: "Individual", value: "individual" },
                { label: "Group", value: "group" }
            ];
            const initiativeType = await ui.selectFromList(
                quickAddApi,
                initiativeOptions.map(o => o.label),
                initiativeOptions,
                "Initiative mode:"
            );
            const initiative = initiativeType?.value ?? "individual";

            // HP mode
            const hpOptions = [
                { label: "Roll HP", value: "rolled" },
                { label: "Low HP", value: "low" },
                { label: "Average HP", value: "average" },
                { label: "Use Default", value: "default" }
            ];
            const hpModeType = await ui.selectFromList(
                quickAddApi,
                hpOptions.map(o => o.label),
                hpOptions,
                "HP mode:"
            );
            const hpMode = hpModeType?.value ?? "default";

            // Add to list
            newMonsters.push({
                name: monsterNameOnly,
                source: selectedMonster?.source || 'Unknown',
                qty: qty,
                initiative: initiative,
                hpMode: hpMode,
                planned: fm.status !== "inCombat",
                labels: []
            });

            // Continue?
            const continueOptions = [
                { label: "Add another", value: true },
                { label: "Finish", value: false }
            ];
            const cont = await ui.selectFromList(
                quickAddApi,
                continueOptions.map(o => o.label),
                continueOptions,
                "Continue?"
            );

            building = cont?.value ?? false;
        }

        if (newMonsters.length === 0) return;

        // Append monsters to frontmatter
        await core.updateFrontmatter(app, file, fm => {
            fm.monsters = [...(fm.monsters || []), ...newMonsters];
        });

        ui.notifySuccess(`Added ${newMonsters.length} monster types!`);

    } catch (error) {
        console.error("addMonsters error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
```

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/encounter/addMonsters.js
git commit -m "feat(actions): add addMonsters.js action"
```

---

### Task 3.9: Create actions/encounter/createEncounter.js

**Files:**
- Create: `_system/scripts/actions/encounter/createEncounter.js`

This is a large script that generates encounter notes with embedded dataviewjs. Due to size, this will be a direct port of the original with lib imports where applicable.

**Step 1: Write the action script**

Port the existing `createEncounter.js` logic, updating to use ES6 exports and lib imports for any shared functionality.

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/encounter/createEncounter.js
git commit -m "feat(actions): add createEncounter.js action"
```

---

### Task 3.10: Create actions/world/createWorld.js

**Files:**
- Create: `_system/scripts/actions/world/createWorld.js`

**Step 1: Write the action script**

Port the existing `createWorld.js` logic with ES6 exports.

**Step 2: Test in Obsidian**

**Step 3: Commit**

```bash
git add _system/scripts/actions/world/createWorld.js
git commit -m "feat(actions): add createWorld.js action"
```

---

## Phase 4: Update QuickAdd Configuration

### Task 4.1: Update QuickAdd Macros

**Files:**
- Modify: `.obsidian/plugins/quickadd/data.json`

**Step 1: Update each macro to point to new wrapper**

For each macro, update the script path:
- `create-world` -> `_system/scripts/quickadd/macros.js` export `createWorld`
- `create-encounter` -> `_system/scripts/quickadd/macros.js` export `createEncounter`
- `add-monster` -> `_system/scripts/quickadd/macros.js` export `addMonsters`
- `start-combat` -> `_system/scripts/quickadd/macros.js` export `enableCombat`
- `add-player-initiative` -> `_system/scripts/quickadd/macros.js` export `playersInitiatives`
- `next-turn` -> `_system/scripts/quickadd/macros.js` export `nextTurn`
- `combat-damage` -> `_system/scripts/quickadd/macros.js` export `applyDamage`
- `combat-heal` -> `_system/scripts/quickadd/macros.js` export `applyHealing`
- `end-combat` -> `_system/scripts/quickadd/macros.js` export `endCombat`

**Step 2: Test each macro**

**Step 3: Commit**

```bash
git add .obsidian/plugins/quickadd/data.json
git commit -m "chore: update QuickAdd macros to use new script structure"
```

---

## Phase 5: Cleanup

### Task 5.1: Delete Old Scripts

**Files:**
- Delete: `_system/scripts/combatHelpers.js`
- Delete: `_system/scripts/combatDamage.js`
- Delete: `_system/scripts/combatHeal.js`
- Delete: `_system/scripts/nextTurn.js`
- Delete: `_system/scripts/endCombat.js`
- Delete: `_system/scripts/enableCombat.js`
- Delete: `_system/scripts/addPlayerInitiatives.js`
- Delete: `_system/scripts/addEncounterMonsters.js`
- Delete: `_system/scripts/createEncounter.js`
- Delete: `_system/scripts/createWorld.js`

**Step 1: Verify all new scripts work**

Run through complete workflow:
1. Create world
2. Create encounter
3. Add monsters
4. Add player initiatives
5. Start combat
6. Next turn
7. Apply damage
8. Apply healing
9. End combat

**Step 2: Delete old scripts**

```bash
rm _system/scripts/combatHelpers.js
rm _system/scripts/combatDamage.js
rm _system/scripts/combatHeal.js
rm _system/scripts/nextTurn.js
rm _system/scripts/endCombat.js
rm _system/scripts/enableCombat.js
rm _system/scripts/addPlayerInitiatives.js
rm _system/scripts/addEncounterMonsters.js
rm _system/scripts/createEncounter.js
rm _system/scripts/createWorld.js
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old scripts after successful migration"
```

---

### Task 5.2: Final Verification

**Step 1: Full workflow test**

Run through the complete TTRPG workflow end-to-end.

**Step 2: Commit any fixes**

**Step 3: Tag release**

```bash
git tag -a v2.0.0 -m "Refactored to JS-Engine modules"
```
