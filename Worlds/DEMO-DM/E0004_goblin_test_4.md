---
type: encounter
world: DEMO-DM
status: inCombat
round: 2
currentTurn: 2
session:
location:
description: goblins test 4
monsters:
  - name: Goblin
    qty: 3
    initiative: individual
    hpMode: default
    labels: []
initiatives:
  - name: Goblin
    label: C3
    type: monster
    initiative: 18
    maxHp: 7
    currentHp: 0
    ac: 15 (Leather Armor, Shield)
    speed: "30 ft. "
    status: 💀 dead
  - name: "[[nes]]"
    type: character
    initiative: 15
  - name: "[[Eryn]]"
    type: character
    initiative: 14
    currentHp: .nan
    status: 💀 dying
  - name: Goblin
    label: B2
    type: monster
    initiative: 13
    maxHp: 7
    currentHp: 0
    ac: 15 (Leather Armor, Shield)
    speed: "30 ft. "
    status: 💀 dead
  - name: Goblin
    label: A1
    type: monster
    initiative: 5
    maxHp: 7
    currentHp: 7
    ac: 15 (Leather Armor, Shield)
    speed: "30 ft. "
    status: healthy
  - name: "[[Wal]]"
    type: character
    initiative: 5
---

# goblin test 4

## Description

goblins test 4

## Monster's Notes

_Add tactical notes, environmental factors, or special considerations..._

## Monsters

```button
name Add Monsters
type command
action QuickAdd: add-monster
```
^button-add-monsters

```button
name Players Initiative
type command
action QuickAdd: add-player-initiative
```
^button-player-init

```button
name Start Combat
type command
action QuickAdd: enable-combat
```
^button-start-combat

```button
name End Combat
type command
action QuickAdd: end-combat
```
^button-end-combat

```dataviewjs
const monsters = dv.current().monsters || [];
const file = app.workspace.getActiveFile();
const status = dv.current().status;

async function deleteMonster(index) {
    if (status === "inCombat") {
        new Notice("⚠️ Cannot delete monsters during combat!");
        return;
    }
    if (confirm(`Delete ${monsters[index].name}?`)) {
        await app.fileManager.processFrontMatter(file, (fm) => {
            if (fm.monsters && fm.monsters[index]) {
                fm.monsters.splice(index, 1);
            }
        });
    }
}

async function showMonsterInfo(monsterName) {
    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");
    if (!monstersFile) {
        new Notice("Error: monsters.json not found");
        return;
    }
    const monstersData = JSON.parse(await app.vault.read(monstersFile));
    const monster = monstersData.find(m => m.name === monsterName);
    if (!monster) {
        new Notice(`Monster "${monsterName}" not found`);
        return;
    }
    // Simple alert for now - you can enhance this later with a modal
    const info = `${monster.name}\n${monster.meta}\nAC: ${monster["Armor Class"]}\nHP: ${monster["Hit Points"]}\nSpeed: ${monster.Speed}`;
    new Notice(info, 5000);
}

if (monsters.length === 0) {
    dv.paragraph("_No monsters added yet. Click 'Add Monsters' above._");
} else {
    const table = dv.container.createEl("table");
    table.style.width = "100%";
    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    ["Monster", "Qty", "Initiative", "HP Mode", "Actions"].forEach(h => {
        headerRow.createEl("th", { text: h });
    });
    const tbody = table.createEl("tbody");
    monsters.forEach((monster, idx) => {
        const row = tbody.createEl("tr");
        const nameCell = row.createEl("td", { text: monster.name });
        nameCell.style.cursor = "pointer";
        nameCell.style.color = "var(--text-accent)";
        nameCell.style.textDecoration = "underline";
        nameCell.onclick = () => showMonsterInfo(monster.name);
        row.createEl("td", { text: monster.qty });
        row.createEl("td", { text: monster.initiative });
        row.createEl("td", { text: monster.hpMode });
        const actionCell = row.createEl("td");
        if (status === "planned") {
            const deleteBtn = actionCell.createEl("button", { text: "Delete" });
            deleteBtn.style.cssText = "cursor:pointer;padding:2px 8px;background:#dc3545;color:white;border:none;border-radius:3px;";
            deleteBtn.onclick = () => deleteMonster(idx);
        } else {
            actionCell.createEl("span", { text: "—", cls: "muted" });
        }
    });
}
```

## Initiative

**Round:** 1 | **Status:** ⚔️ In Combat

```button
name Next Turn
type command
action QuickAdd: next-turn
```
^button-next-turn

```button
name Apply Damage
type command
action QuickAdd: combat-damage
```
^button-damage

```button
name Apply Healing
type command
action QuickAdd: combat-heal
```
^button-heal

```dataviewjs
const initiatives = dv.current().initiatives || [];
const currentTurn = dv.current().currentTurn || 0;

if (initiatives.length === 0) {
    dv.paragraph("_No combatants in initiative._");
} else {
    const table = dv.container.createEl("table");
    table.style.width = "100%";
    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    ["Turn", "Name", "Label", "Initiative", "HP", "AC", "Speed", "Status"].forEach(h => {
        headerRow.createEl("th", { text: h });
    });
    const tbody = table.createEl("tbody");
    initiatives.forEach((combatant, idx) => {
        const row = tbody.createEl("tr");
        if (idx === currentTurn) {
            row.style.backgroundColor = "var(--background-modifier-success)";
            row.style.fontWeight = "bold";
        }
        const turnCell = row.createEl("td", { text: idx === currentTurn ? "➤" : "" });
        turnCell.style.textAlign = "center";
        row.createEl("td", { text: combatant.name || "Unknown" });
        row.createEl("td", { text: combatant.label || "--" });
        row.createEl("td", { text: combatant.initiative || 0 });
        const hp = combatant.type === "monster" ? `${combatant.currentHp}/${combatant.maxHp}` : "--";
        row.createEl("td", { text: hp });
        row.createEl("td", { text: combatant.ac || "--" });
        row.createEl("td", { text: combatant.speed || "--" });
        row.createEl("td", { text: combatant.status || "healthy" });
    });
}
```

## Combat Log
- **Round 2** [11:54 PM] - [[Eryn]] healed Goblin (A1) for **7 HP**
- **Round 2** [11:48 PM] - 💀 [[Eryn]] killed Goblin (B2)
- **Round 2** [11:48 PM] - [[Eryn]] dealt **3 lightning damage** to Goblin (B2)
- **Round 2** [11:47 PM] - 💀 [[nes]] killed Goblin (A1)
- **Round 2** [11:47 PM] - [[nes]] dealt **9 slashing damage** to Goblin (A1)
🔄 **Round 2 begins!**
- **Round 1** [11:46 PM] - Goblin (B2) dealt **23 piercing damage** to [[Eryn]]
- **Round 1** [11:45 PM] - 💀 [[Eryn]] killed Goblin (C3)
- **Round 1** [11:45 PM] - [[Eryn]] dealt **9 slashing damage** to Goblin (C3)
- **Round 1** [11:44 PM] - [[nes]] dealt **4 piercing damage** to Goblin (B2)

_Combat events will be logged here automatically._
