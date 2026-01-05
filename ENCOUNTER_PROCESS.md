# Encounter Starting Process Documentation

## Overview

The encounter starting process in this TTRPG vault follows a 3-phase workflow:

```
1. Create Encounter  →  2. Add Monsters  →  3. Enable Combat
   (Empty template)      (Load from SRD)     (Roll initiative & HP)
```

Each phase progressively builds the encounter data structure, culminating in a combat-ready encounter with rolled initiatives and hit points.

---

## Phase 1: Create Encounter

**Action Script:** `_system/scripts/actions/encounter/createEncounter.js`

**Purpose:** Create an empty encounter note with auto-incremented numbering.

### Function Call Sequence

1. **`run(context)`** - Entry point (line 5)
2. **Extract world name** from active file path (line 10)
3. **`ui.promptForText()`** - Prompt for encounter name (line 13)
4. **Scan for existing encounters** with pattern `E\d{4}_` (lines 16-18)
5. **Generate next number** with zero-padding (line 22)
   ```javascript
   const nextNum = String(maxNum + 1).padStart(4, '0');
   // Result: "0001", "0002", "0003", etc.
   ```
6. **`ui.promptForText()`** - Prompt for description (line 25)
7. **Load template file** from `_system/templates/encounter.md` (lines 27-31)
8. **Replace template placeholders** (lines 35-37)
   - `{{encounterName}}` → user input
   - `{{encounterDescription}}` → user input
   - `{{world}}` → world name
9. **`app.vault.create()`** - Create encounter file (line 40)
10. **`core.openFile()`** - Navigate to new file (line 42)

### Output

Creates file: `Worlds/<WorldName>/E####_<EncounterName>.md`

**Frontmatter:**
```yaml
type: encounter
world: <WorldName>
status: planned
session: ""
location: ""
description: <UserDescription>
monsters: []
initiatives: []
combatLog: []
round: 0
currentTurn: 0
```

### SRD Usage

**None** - This phase only creates the empty structure.

---

## Phase 2: Add Monsters

**Action Script:** `_system/scripts/actions/encounter/addMonsters.js`

**Purpose:** Load monster data from SRD and add to encounter configuration.

### Function Call Sequence

1. **`run(context)`** - Entry point (line 6)
2. **`core.getActiveFile()`** - Get current encounter file (line 10)
3. **`core.getFrontmatter()`** - Extract YAML frontmatter (line 11)
4. **`core.requireNoteType(fm, 'encounter')`** - Validate note type (line 12)
5. **`core.requireNotCompleted(fm)`** - Ensure not completed (line 13)

### SRD Loading - Stage 1: Load All Monsters

6. **`monsters.loadAllMonsters()`** (line 15)
   - **Purpose:** Load all monsters from enabled sources for selection

   **Sub-calls:**

   a. **Read sources configuration** (monsters.js:54-59)
      ```javascript
      const sourcesFile = app.vault.getAbstractFileByPath('_system/srd/sources.md');
      const sourcesContent = await app.vault.read(sourcesFile);
      ```

   b. **`monsters.parseEnabledSources(content)`** (monsters.js:60)
      - Parses markdown format:
        ```markdown
        - **MM**: `enabled: true` - Monster Manual
        - **VGM**: `enabled: false` - Volo's Guide to Monsters
        ```
      - Returns: `['MM', 'MTF', ...]`

   c. **`monsters.loadBestiaryIndex()`** (monsters.js:66)
      - Loads `_system/srd/5etools-src/data/bestiary/index.json`
      - Returns source→filename mapping:
        ```json
        {
          "MM": "bestiary-mm.json",
          "VGM": "bestiary-vgm.json"
        }
        ```

   d. **Loop through enabled sources** (monsters.js:69)
      - For each source:
        - **`monsters.loadMonstersBySource(source, index)`** (line 70)
          - Reads `_system/srd/5etools-src/data/bestiary/bestiary-{source}.json`
          - Parses JSON to extract monster array
          - Returns all monsters from that source

   e. **Combine arrays** (monsters.js:71)
      ```javascript
      allMonsters.push(...monstersFromSource);
      ```

### User Interaction

7. **Build choice list** (addMonsters.js:26)
   ```javascript
   const choices = allMonsters.map(m => `${m.name} (${m.source})`);
   // Example: ["Goblin (MM)", "Orc (MM)", "Beholder (MM)"]
   ```

8. **`ui.selectFromList(choices, 'Select monster')`** - User selects (line 27-32)

9. **Parse selection** (lines 36-44)
   ```javascript
   const match = selected.match(/^(.*?)\s*\(([^)]+)\)$/);
   const monsterName = match[1];  // "Goblin"
   const source = match[2];       // "MM"
   ```

10. **`ui.promptForPositiveNumber('Quantity')`** - Get quantity (line 51)

11. **`ui.selectOption('Initiative mode')`** - individual/group (lines 54-59)
    - **individual:** Each monster rolls separate initiative
    - **group:** All monsters of same type roll together

12. **`ui.selectOption('HP mode')`** - rolled/low/average/default (lines 61-68)
    - **rolled:** Roll hit dice for each monster
    - **low:** Use minimum HP (1 per die)
    - **average:** Use average from formula
    - **default:** Use SRD average value

13. **Add to `newMonsters` array** (lines 70-80)
    ```javascript
    newMonsters.push({
        name: monsterName,
        source: source,
        qty: quantity,
        initiative: initiativeMode,
        hpMode: hpMode
    });
    ```

14. **Loop for additional monsters** (line 82)
    - Prompt: "Add another monster?"

15. **`core.updateFrontmatter(file, updater)`** - Save to frontmatter (lines 87-89)
    ```javascript
    await core.updateFrontmatter(file, (fm) => {
        fm.monsters.push(...newMonsters);
    });
    ```

### Output

**Updated Frontmatter:**
```yaml
monsters:
  - name: Goblin
    source: MM
    qty: 4
    initiative: individual
    hpMode: rolled
  - name: Orc
    source: MM
    qty: 2
    initiative: group
    hpMode: default
```

### SRD Usage

**Loads:** All monsters from enabled sources (`sources.md`)

**Files Read:**
- `_system/srd/sources.md` (config)
- `_system/srd/5etools-src/data/bestiary/index.json` (mapping)
- `_system/srd/5etools-src/data/bestiary/bestiary-mm.json` (if MM enabled)
- `_system/srd/5etools-src/data/bestiary/bestiary-mtf.json` (if MTF enabled)
- ... (for each enabled source)

---

## Phase 3: Enable Combat

**Action Script:** `_system/scripts/actions/combat/enableCombat.js`

**Purpose:** Transform monster configurations into combat-ready initiative entries with rolled HP and initiative.

### Function Call Sequence

1. **`run(context)`** - Entry point (line 7)
2. **`core.getActiveFile()`** - Get encounter file (line 11)
3. **`core.getFrontmatter()`** - Extract frontmatter (line 12)
4. **`core.requireNoteType(fm, 'encounter')`** - Validate (line 13)
5. **Check not already in combat** (lines 16-19)
   ```javascript
   if (fm.status === 'inCombat') {
       throw new Error('Combat already enabled');
   }
   ```
6. **`core.requireStatus(fm, 'planned')`** - Validate status (line 21)

### SRD Loading - Stage 2: Load Specific Monsters

7. **`monsters.loadMonsterDataFromSRD(monsterNames)`** (line 23)
   - **Purpose:** Load full stat blocks for specific monsters

   **Input:** Array of monster names from frontmatter
   ```javascript
   const monsterNames = fm.monsters.map(m => m.name);
   // Example: ["Goblin", "Orc"]
   ```

   **Sub-calls:**

   a. **`monsters.loadBestiaryIndex()`** (monsters.js:79)
      - Same as Phase 2 (load index.json)

   b. **Group monsters by source** (monsters.js:81-88)
      ```javascript
      const monstersBySource = new Map();
      for (const monster of fm.monsters) {
          if (!monstersBySource.has(monster.source)) {
              monstersBySource.set(monster.source, []);
          }
          monstersBySource.get(monster.source).push(monster.name);
      }
      ```

   c. **For each source:** (monsters.js:90-96)
      - **`monsters.loadMonstersBySource(source, index)`** (line 91)
        - Read `bestiary-{source}.json`

      - **Find monsters by name** (lines 92-93)
        ```javascript
        const foundMonster = monstersData.find(m => m.name === monsterName);
        ```

      - **`monsters.transformSRDToCombatFormat(foundMonster)`** (line 94)

        **Transformation Details (monsters.js:98-136):**

        **Extract DEX modifier:**
        ```javascript
        const dex = srdMonster.dex || 10;
        const dexMod = Math.floor((dex - 10) / 2);
        const dexModStr = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;
        ```

        **Extract HP formula:**
        ```javascript
        const hpFormula = srdMonster.hp?.formula || '1d8';
        const avgHp = srdMonster.hp?.average || 4;
        ```

        **Extract AC:**
        ```javascript
        let ac = 10;
        if (Array.isArray(srdMonster.ac)) {
            ac = srdMonster.ac[0]?.ac || 10;
        } else if (typeof srdMonster.ac === 'number') {
            ac = srdMonster.ac;
        }
        ```

        **Extract Speed:**
        ```javascript
        const speed = srdMonster.speed || {};
        const speedParts = [];
        if (speed.walk) speedParts.push(`${speed.walk} ft.`);
        if (speed.fly) speedParts.push(`fly ${speed.fly} ft.`);
        if (speed.swim) speedParts.push(`swim ${speed.swim} ft.`);
        const speedStr = speedParts.join(', ') || '30 ft.';
        ```

        **Return Format:**
        ```javascript
        return {
            name: srdMonster.name,
            "DEX_mod": dexModStr,       // "+2"
            "Hit Points": `${avgHp} (${hpFormula})`,  // "7 (2d6)"
            "Armor Class": ac,          // 15
            "Speed": speedStr           // "30 ft."
        };
        ```

      - **Store in Map** (monsters.js:95)
        ```javascript
        monsterDataMap.set(monsterName, transformedData);
        ```

### Process Monsters to Combat Entries

8. **Loop through frontmatter monsters** (enableCombat.js:28)

9. **Get monster data from Map** (lines 29-32)
   ```javascript
   const monsterData = monsterDataMap.get(monster.name);
   if (!monsterData) {
       throw new Error(`Monster ${monster.name} not found in SRD`);
   }
   ```

10. **`monsters.processMonsterToCombat(monsterData, qty, initMode, hpMode)`** (line 35)

    **Processing Details (monsters.js:144-175):**

    a. **Determine initiative mode** (lines 146-147)
       ```javascript
       const inCombat = true;
       const groupInit = (initMode === 'group');
       ```

    b. **Roll group initiative once** (if group mode) (lines 161-163)
       ```javascript
       let groupInitValue = null;
       if (groupInit && inCombat) {
           groupInitValue = combat.rollInitiative(dexMod);
       }
       ```

    c. **Loop through quantity** (lines 149-175)

       For each instance:

       - **`combat.generateLabel(name, existingInitiatives)`** (line 150)
         ```javascript
         // Generates: "G1", "G2", "G3", "G4" for Goblins
         // Uses first letter + sequence number
         ```

       - **Extract or roll HP** (lines 153-159)
         ```javascript
         let hp;
         if (hpMode === 'default') {
             // Extract from "7 (2d6)" → 7
             const match = hpData.match(/^(\d+)/);
             hp = match ? parseInt(match[1]) : 1;
         } else {
             // Roll using formula
             hp = combat.rollHitPoints(hpFormula, hpMode);
         }
         ```

         **`combat.rollHitPoints(formula, mode)`** (combat.js:43-66):
         - **Parse formula** → `{count: 2, sides: 6, bonus: 0}`
         - **Roll based on mode:**
           - `rolled`: Roll each die normally
           - `low`: Use 1 per die
           - `average`: Use (sides+1)/2 per die
           - `max`: Use max value per die
         - **Add bonus and return**

       - **Roll initiative** (if individual mode) (lines 161-163)
         ```javascript
         let initiative = groupInitValue;
         if (!groupInit && inCombat) {
             initiative = combat.rollInitiative(dexMod);
         }
         ```

         **`combat.rollInitiative(dexMod)`** (combat.js:19-22):
         ```javascript
         const roll = Math.floor(Math.random() * 20) + 1;
         return roll + dexMod;
         ```

       - **Build initiative entry** (lines 165-175)
         ```javascript
         entries.push({
             name: monsterData.name,
             label: label,
             type: 'monster',
             initiative: initiative,
             maxHp: hp,
             currentHp: hp,
             ac: monsterData["Armor Class"],
             speed: monsterData["Speed"],
             status: 'healthy'
         });
         ```

11. **Add existing player initiatives** (enableCombat.js:40-41)
    ```javascript
    if (fm.initiatives?.length > 0) {
        allInitiatives.push(...fm.initiatives);
    }
    ```

12. **`combat.sortInitiatives(initiatives)`** - Sort descending (line 43)
    ```javascript
    return initiatives.slice().sort((a, b) => b.initiative - a.initiative);
    ```

13. **`core.updateFrontmatter(file, updater)`** - Update encounter (lines 45-57)
    ```javascript
    await core.updateFrontmatter(file, (fm) => {
        fm.status = 'inCombat';
        fm.round = 1;
        fm.currentTurn = 0;
        fm.initiatives = sortedInitiatives;
        fm.combatStats = combat.initializeCombatStats();
        fm.monsters = fm.monsters.map(m => ({...m, addedToCombat: true}));
    });
    ```

14. **`combat.logCombatAction(type, data, round)`** - Log round start (line 59)
    ```javascript
    combat.logCombatAction('round', {round: 1}, 1);
    ```

### Output

**Updated Frontmatter:**
```yaml
type: encounter
status: inCombat
round: 1
currentTurn: 0
monsters:
  - name: Goblin
    source: MM
    qty: 4
    initiative: individual
    hpMode: rolled
    addedToCombat: true
initiatives:
  - name: Goblin
    label: G1
    type: monster
    initiative: 18
    maxHp: 9
    currentHp: 9
    ac: 15
    speed: 30 ft.
    status: healthy
  - name: Goblin
    label: G2
    type: monster
    initiative: 14
    maxHp: 7
    currentHp: 7
    ac: 15
    speed: 30 ft.
    status: healthy
  - name: Goblin
    label: G3
    type: monster
    initiative: 12
    maxHp: 5
    currentHp: 5
    ac: 15
    speed: 30 ft.
    status: healthy
  - name: Goblin
    label: G4
    type: monster
    initiative: 8
    maxHp: 8
    currentHp: 8
    ac: 15
    speed: 30 ft.
    status: healthy
combatLog:
  - "Round 1 begins"
combatStats:
  totalDamageDealt: 0
  totalHealingDone: 0
  monstersDefeated: 0
```

### SRD Usage

**Loads:** Specific monsters by name for stat extraction

**Files Read:**
- `_system/srd/5etools-src/data/bestiary/index.json` (mapping)
- `_system/srd/5etools-src/data/bestiary/bestiary-mm.json` (if monsters from MM)
- ... (only sources needed for specified monsters)

**Data Extracted:**
- DEX score (for initiative modifier)
- HP formula (for rolling HP)
- Armor Class
- Speed values

---

## SRD Data Flow

### File Structure

```
_system/srd/
├── sources.md                              # Configuration
└── 5etools-src/data/bestiary/
    ├── index.json                          # Source → filename mapping
    ├── bestiary-mm.json                    # Monster Manual
    ├── bestiary-vgm.json                   # Volo's Guide to Monsters
    ├── bestiary-mtf.json                   # Mordenkainen's Tome of Foes
    └── [...100+ source files]
```

### Data Transformation Pipeline

**Stage 1: Configuration (sources.md)**
```markdown
- **MM**: `enabled: true` - Monster Manual
- **VGM**: `enabled: false` - Volo's Guide to Monsters
```

↓ `parseEnabledSources()`

**Stage 2: Source Mapping (index.json)**
```json
{
  "MM": "bestiary-mm.json",
  "VGM": "bestiary-vgm.json"
}
```

↓ `loadBestiaryIndex()`

**Stage 3: Raw SRD Data (bestiary-mm.json)**
```json
{
  "monster": [
    {
      "name": "Goblin",
      "source": "MM",
      "hp": {
        "average": 7,
        "formula": "2d6"
      },
      "ac": [
        {
          "ac": 15,
          "from": ["leather armor", "shield"]
        }
      ],
      "dex": 14,
      "speed": {
        "walk": 30
      }
    }
  ]
}
```

↓ `transformSRDToCombatFormat()`

**Stage 4: Combat Format**
```javascript
{
  name: "Goblin",
  "DEX_mod": "+2",
  "Hit Points": "7 (2d6)",
  "Armor Class": 15,
  "Speed": "30 ft."
}
```

↓ `processMonsterToCombat()`

**Stage 5: Initiative Entry (Final)**
```javascript
{
  name: "Goblin",
  label: "G1",
  type: "monster",
  initiative: 16,        // Rolled: 1d20+2 = 14+2 = 16
  maxHp: 9,             // Rolled: 2d6 = 3+6 = 9
  currentHp: 9,
  ac: 15,
  speed: "30 ft.",
  status: "healthy"
}
```

---

## Function Reference

### monsters.js (`_system/scripts/lib/monsters.js`)

#### `parseEnabledSources(content: String) → Array<String>`
**Purpose:** Parse sources.md markdown to extract enabled sources

**Input:**
```markdown
- **MM**: `enabled: true` - Monster Manual
- **VGM**: `enabled: false` - Volo's Guide to Monsters
```

**Output:** `['MM']`

**Location:** Line 7-21

---

#### `loadBestiaryIndex() → Promise<Object>`
**Purpose:** Load index.json mapping of sources to filenames

**Output:**
```javascript
{
  "MM": "bestiary-mm.json",
  "VGM": "bestiary-vgm.json"
}
```

**Location:** Line 23-33

---

#### `loadMonstersBySource(source: String, index: Object) → Promise<Array>`
**Purpose:** Load all monsters from a specific source file

**Parameters:**
- `source` - Source code (e.g., "MM")
- `index` - Index object from `loadBestiaryIndex()`

**Output:** Array of monster objects from that source

**Location:** Line 35-51

---

#### `loadAllMonsters(enabledSources: Array, index: Object) → Promise<Array>`
**Purpose:** Load all monsters from all enabled sources

**Parameters:**
- `enabledSources` - Array of source codes
- `index` - Index object

**Output:** Combined array of all monsters

**Location:** Line 53-74

---

#### `loadMonsterDataFromSRD(monsterNames: Array) → Promise<Map>`
**Purpose:** Load specific monsters by name from SRD

**Parameters:**
- `monsterNames` - Array of monster names to load

**Output:** Map of monsterName → transformed combat data

**Process:**
1. Load index
2. Group monsters by source
3. Load each source's bestiary file
4. Find monsters by name
5. Transform to combat format
6. Return Map

**Location:** Line 77-97

---

#### `transformSRDToCombatFormat(srdMonster: Object) → Object`
**Purpose:** Transform raw SRD monster data to combat-ready format

**Input:**
```javascript
{
  name: "Goblin",
  dex: 14,
  hp: {average: 7, formula: "2d6"},
  ac: [{ac: 15}],
  speed: {walk: 30}
}
```

**Output:**
```javascript
{
  name: "Goblin",
  "DEX_mod": "+2",
  "Hit Points": "7 (2d6)",
  "Armor Class": 15,
  "Speed": "30 ft."
}
```

**Extracts:**
- DEX modifier for initiative
- HP average and formula
- AC value (from array or number)
- Speed strings (walk, fly, swim, etc.)

**Location:** Line 99-137

---

#### `processMonsterToCombat(monsterData: Object, qty: Number, initMode: String, hpMode: String) → Array`
**Purpose:** Create combat-ready initiative entries with rolled values

**Parameters:**
- `monsterData` - Transformed monster data
- `qty` - Number of monsters
- `initMode` - "individual" or "group"
- `hpMode` - "rolled", "low", "average", "default", "max"

**Output:** Array of initiative entries

**Process:**
1. Parse DEX modifier and HP formula
2. Roll group initiative if group mode
3. For each instance:
   - Generate unique label
   - Roll or extract HP based on mode
   - Roll individual initiative if individual mode
   - Create entry with all combat stats

**Location:** Line 144-177

---

### combat.js (`_system/scripts/lib/combat.js`)

#### `rollInitiative(dexMod: Number) → Number`
**Purpose:** Roll 1d20 + DEX modifier for initiative

**Parameters:**
- `dexMod` - DEX modifier (-5 to +10 typically)

**Output:** Initiative value (1-30 range typically)

**Formula:** `1d20 + dexMod`

**Location:** Line 19-22

---

#### `parseHitDice(formula: String) → Object`
**Purpose:** Parse hit dice string into components

**Input:** `"2d8+4"` or `"1d6"` or `"3d10-2"`

**Output:**
```javascript
{
  count: 2,    // Number of dice
  sides: 8,    // Sides per die
  bonus: 4     // Bonus modifier
}
```

**Location:** Line 24-41

---

#### `rollHitPoints(formula: String, mode: String) → Number`
**Purpose:** Roll hit points based on formula and mode

**Parameters:**
- `formula` - Hit dice formula (e.g., "2d8+4")
- `mode` - "rolled", "low", "average", "max"

**Modes:**
- **rolled:** Roll each die normally (1-sides)
- **low:** Use 1 per die (minimum possible)
- **average:** Use (sides+1)/2 per die
- **max:** Use max value (sides) per die

**Output:** Calculated HP value

**Location:** Line 43-67

---

#### `generateLabel(name: String, existingInitiatives: Array) → String`
**Purpose:** Generate unique label for combatant

**Parameters:**
- `name` - Monster/character name
- `existingInitiatives` - Array of existing entries

**Output:** Unique label (e.g., "G1", "G2", "O1")

**Logic:**
- Uses first letter of name (uppercase)
- Counts existing labels with same prefix
- Increments sequence number

**Examples:**
- "Goblin" → "G1", "G2", "G3"
- "Orc" → "O1", "O2"
- "Ancient Red Dragon" → "A1"

**Location:** Line 69-81

---

#### `sortInitiatives(initiatives: Array) → Array`
**Purpose:** Sort initiatives in descending order

**Parameters:**
- `initiatives` - Array of initiative entries

**Output:** New sorted array (original unchanged)

**Sort Order:** Highest initiative first

**Location:** Line 131-133

---

#### `initializeCombatStats() → Object`
**Purpose:** Create combat statistics tracking object

**Output:**
```javascript
{
  totalDamageDealt: 0,
  totalHealingDone: 0,
  monstersDefeated: 0
}
```

**Location:** Line 169-174

---

### core.js (`_system/scripts/lib/core.js`)

#### `getActiveFile() → TFile | null`
**Purpose:** Get currently active file with validation

**Output:** Obsidian TFile object or null

**Throws:** Error if no active file

**Location:** Line 5-11

---

#### `getFrontmatter(file: TFile) → Object`
**Purpose:** Extract and parse YAML frontmatter from file

**Parameters:**
- `file` - Obsidian TFile object

**Output:** Parsed frontmatter object

**Throws:** Error if frontmatter invalid or missing

**Location:** Line 13-20

---

#### `updateFrontmatter(file: TFile, updater: Function) → Promise<void>`
**Purpose:** Update frontmatter using processor function

**Parameters:**
- `file` - File to update
- `updater` - Function that receives frontmatter and modifies it

**Usage:**
```javascript
await core.updateFrontmatter(file, (fm) => {
    fm.status = 'inCombat';
    fm.round = 1;
});
```

**Process:**
1. Processes file using `processFrontMatter()`
2. Calls updater with frontmatter object
3. Writes changes back to file

**Location:** Line 22-27

---

#### `requireNoteType(frontmatter: Object, type: String) → void`
**Purpose:** Validate note type matches expected

**Parameters:**
- `frontmatter` - Frontmatter object
- `type` - Expected type (e.g., "encounter")

**Throws:** Error if type doesn't match

**Location:** Line 29-33

---

#### `requireStatus(frontmatter: Object, status: String) → void`
**Purpose:** Validate status field matches expected

**Parameters:**
- `frontmatter` - Frontmatter object
- `status` - Expected status (e.g., "planned")

**Throws:** Error if status doesn't match

**Location:** Line 35-39

---

#### `requireNotCompleted(frontmatter: Object) → void`
**Purpose:** Ensure encounter is not completed

**Parameters:**
- `frontmatter` - Frontmatter object

**Throws:** Error if status is "completed"

**Location:** Line 41-45

---

## Process Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE ENCOUNTER                             │
│                                                                 │
│  User Action → QuickAdd → createEncounter.js                   │
│                                                                 │
│  1. Prompt for name                                            │
│  2. Auto-number (E0001, E0002...)                              │
│  3. Load template                                              │
│  4. Create file                                                │
│                                                                 │
│  Output: Empty encounter (status: planned)                     │
│  SRD: None                                                     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ADD MONSTERS                                │
│                                                                 │
│  User Action → QuickAdd → addMonsters.js                       │
│                                                                 │
│  1. Validate encounter (planned status)                        │
│  2. Load SRD sources config                                    │
│  3. Load bestiary index                                        │
│  4. Load all enabled source files                             │
│  5. Present selection list                                     │
│  6. Prompt for quantity, init mode, HP mode                    │
│  7. Save to frontmatter                                        │
│                                                                 │
│  Output: monsters[] array populated                            │
│  SRD: Load ALL monsters from enabled sources                   │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ENABLE COMBAT                                │
│                                                                 │
│  User Action → QuickAdd → enableCombat.js                      │
│                                                                 │
│  1. Validate encounter (planned status)                        │
│  2. Load specific monsters by name                             │
│  3. Transform SRD → combat format                              │
│  4. For each monster instance:                                 │
│     - Generate label (G1, G2...)                               │
│     - Roll HP (based on mode)                                  │
│     - Roll initiative (based on mode)                          │
│  5. Sort initiatives descending                                │
│  6. Update frontmatter (status: inCombat)                      │
│  7. Log combat start                                           │
│                                                                 │
│  Output: Combat-ready encounter with initiatives[]             │
│  SRD: Load SPECIFIC monsters for stat extraction               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
                    Combat Ready!
```

---

## SRD Integration Summary

### Phase 2 (Add Monsters) vs Phase 3 (Enable Combat)

| Aspect | Phase 2: Add Monsters | Phase 3: Enable Combat |
|--------|----------------------|------------------------|
| **Function** | `loadAllMonsters()` | `loadMonsterDataFromSRD()` |
| **Scope** | All monsters from enabled sources | Specific monsters by name |
| **Purpose** | Provide selection list | Extract combat stats |
| **Files Loaded** | All enabled bestiary files | Only needed source files |
| **Transform** | None (raw SRD) | `transformSRDToCombatFormat()` |
| **Output** | Array of monster objects | Map of name → combat data |
| **Performance** | Slower (loads everything) | Faster (targeted loading) |

### Why Two Loading Phases?

1. **Phase 2** needs complete monster list for user selection
2. **Phase 3** only needs stats for chosen monsters
3. Separation reduces memory usage during combat
4. Allows monster selection without committing to combat stats yet

---

## Summary

The encounter starting process is a carefully orchestrated 3-phase workflow:

1. **Create Encounter:** Establish structure with auto-numbering
2. **Add Monsters:** Configure monster selection from SRD
3. **Enable Combat:** Transform configuration into live combat data

Each phase builds on the previous, with SRD integration happening in phases 2 and 3:
- Phase 2 loads all monsters for selection
- Phase 3 loads specific monsters for stat extraction and rolling

The final output is a combat-ready encounter with:
- Unique labels for each combatant
- Rolled initiative values
- Rolled hit points
- Sorted turn order
- Combat tracking ready to begin
