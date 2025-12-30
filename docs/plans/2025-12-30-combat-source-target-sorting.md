# Combat Source/Target Selection Improvements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sort source selections to prioritize current turn combatant and add "Source: " / "Target: " prefixes to selection prompts.

**Architecture:** Modify `ui.js` library functions to accept current turn index and prepend labels. Update `applyDamage.js` and `applyHealing.js` to pass current turn context to UI functions.

**Tech Stack:** JavaScript ES6, Obsidian QuickAdd API

---

## Task 1: Update `buildSourceChoices` to support current turn prioritization

**Files:**
- Modify: `_system/scripts/lib/ui.js:68-76`

**Step 1: Add current turn parameter to buildSourceChoices**

Modify the function signature and implementation:

```javascript
export function buildSourceChoices(initiatives, currentTurnIndex = null) {
    // Sort initiatives to put current turn first
    let sortedInitiatives = [...initiatives];
    if (currentTurnIndex !== null && currentTurnIndex >= 0 && currentTurnIndex < initiatives.length) {
        const currentTurn = initiatives[currentTurnIndex];
        sortedInitiatives = [
            currentTurn,
            ...initiatives.filter((_, idx) => idx !== currentTurnIndex)
        ];
    }

    const displayChoices = sortedInitiatives.map(i => {
        const name = stripWikiLinks(i.name) || 'Unknown';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}`;
    });

    return { displayChoices, values: displayChoices };
}
```

**Step 2: Verify syntax**

Run: `node -c _system/scripts/lib/ui.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add _system/scripts/lib/ui.js
git commit -m "refactor(lib): add current turn prioritization to buildSourceChoices"
```

---

## Task 2: Update `buildTargetChoices` to support current turn prioritization

**Files:**
- Modify: `_system/scripts/lib/ui.js:44-55`

**Step 1: Add current turn parameter to buildTargetChoices**

Modify the function signature and implementation:

```javascript
export function buildTargetChoices(initiatives, currentTurnIndex = null) {
    // Sort initiatives to put current turn first
    let sortedInitiatives = [...initiatives];
    if (currentTurnIndex !== null && currentTurnIndex >= 0 && currentTurnIndex < initiatives.length) {
        const currentTurn = initiatives[currentTurnIndex];
        sortedInitiatives = [
            currentTurn,
            ...initiatives.filter((_, idx) => idx !== currentTurnIndex)
        ];
    }

    const displayChoices = sortedInitiatives.map(i => {
        const name = stripWikiLinks(i.name) || 'Unknown';
        const hp = i.type === "monster" ? ` [${i.currentHp}/${i.maxHp} HP]` : '';
        const label = i.label ? ` (${i.label})` : '';
        return `${name}${label}${hp}`;
    });

    const values = sortedInitiatives.map(i => i.label || stripWikiLinks(i.name) || 'Unknown');

    return { displayChoices, values };
}
```

**Step 2: Verify syntax**

Run: `node -c _system/scripts/lib/ui.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add _system/scripts/lib/ui.js
git commit -m "refactor(lib): add current turn prioritization to buildTargetChoices"
```

---

## Task 3: Update `promptForSource` to add "Source: " prefix

**Files:**
- Modify: `_system/scripts/lib/ui.js:136-143`

**Step 1: Add prefix to placeholder parameter**

Modify the function:

```javascript
export async function promptForSource(quickAddApi, initiatives, action = "acting", currentTurnIndex = null) {
    const { displayChoices, values } = buildSourceChoices(initiatives, currentTurnIndex);
    const source = await selectFromList(quickAddApi, displayChoices, values, `Source: Who is ${action}?`);
    if (!source) {
        throw new Error("Source selection cancelled");
    }
    return source;
}
```

**Step 2: Verify syntax**

Run: `node -c _system/scripts/lib/ui.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add _system/scripts/lib/ui.js
git commit -m "feat(lib): add 'Source: ' prefix to promptForSource"
```

---

## Task 4: Update `promptForTarget` to add "Target: " prefix

**Files:**
- Modify: `_system/scripts/lib/ui.js:57-66`

**Step 1: Add prefix to placeholder and current turn parameter**

Modify the function:

```javascript
export async function promptForTarget(quickAddApi, initiatives, placeholder = "Select target...", currentTurnIndex = null) {
    const { displayChoices, values } = buildTargetChoices(initiatives, currentTurnIndex);
    const selectedLabel = await selectFromList(quickAddApi, displayChoices, values, `Target: ${placeholder}`);
    if (!selectedLabel) return null;

    // Find in original initiatives array, not sorted
    return initiatives.find(i =>
        i.label === selectedLabel ||
        stripWikiLinks(i.name) === selectedLabel
    );
}
```

**Step 2: Verify syntax**

Run: `node -c _system/scripts/lib/ui.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add _system/scripts/lib/ui.js
git commit -m "feat(lib): add 'Target: ' prefix to promptForTarget"
```

---

## Task 5: Update `applyDamage.js` to pass current turn index

**Files:**
- Modify: `_system/scripts/actions/combat/applyDamage.js:13-14`

**Step 1: Pass currentTurn index to promptForSource and promptForTarget**

Modify the prompt calls:

```javascript
const source = await ui.promptForSource(quickAddApi, initiatives, "attacking", fm.currentTurn);
const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target:", fm.currentTurn);
```

**Step 2: Verify syntax**

Run: `node -c _system/scripts/actions/combat/applyDamage.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/applyDamage.js
git commit -m "feat(actions): pass current turn index to source/target prompts in applyDamage"
```

---

## Task 6: Update `applyHealing.js` to pass current turn index

**Files:**
- Modify: `_system/scripts/actions/combat/applyHealing.js:13-14`

**Step 1: Pass currentTurn index to promptForSource and promptForTarget**

Modify the prompt calls:

```javascript
const source = await ui.promptForSource(quickAddApi, initiatives, "healing", fm.currentTurn);
const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target to heal:", fm.currentTurn);
```

**Step 2: Verify syntax**

Run: `node -c _system/scripts/actions/combat/applyHealing.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add _system/scripts/actions/combat/applyHealing.js
git commit -m "feat(actions): pass current turn index to source/target prompts in applyHealing"
```

---

## Task 7: Manual testing in Obsidian

**Files:**
- Test: All modified files in live Obsidian environment

**Step 1: Create test encounter**

1. Open Obsidian vault at `/home/jdubois/Documents/ObsidianVault/TTRPG-DEV`
2. Create or use existing test world
3. Create test encounter with multiple monsters
4. Enable combat

**Step 2: Test applyDamage with current turn sorting**

1. Navigate to active encounter
2. Click "Apply Damage" button
3. Verify "Source: Who is attacking?" shows current turn combatant first
4. Verify "Target: Select target:" shows current turn combatant first
5. Apply damage and verify it works

**Step 3: Test applyHealing with current turn sorting**

1. Navigate to active encounter
2. Click "Apply Healing" button
3. Verify "Source: Who is healing?" shows current turn combatant first
4. Verify "Target: Select target to heal:" shows current turn combatant first
5. Apply healing and verify it works

**Step 4: Test edge cases**

1. Test with `currentTurn = 0` (first combatant)
2. Test with `currentTurn = undefined` (backward compatibility)
3. Test with single combatant in initiative
4. Verify all actions work correctly

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify source/target sorting in combat actions"
```

---

## Notes

- Backward compatibility maintained: `currentTurnIndex = null` means no sorting
- All existing calls without `currentTurn` parameter will continue to work
- Sorting creates a new array, original initiatives array unchanged
- Finding target uses original initiatives array to ensure correct reference
