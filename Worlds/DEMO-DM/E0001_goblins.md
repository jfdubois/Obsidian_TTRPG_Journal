---
type: encounter
world: DEMO-DM
status: inCombat
round: 1
currentTurn: 0
session:
location:
description: goblinsss
monsters:
  - name: Goblin
    qty: 3
    initiative: individual
    hpMode: default
    labels: []
initiatives:
  - name: "[[Eryn]]"
    type: character
    initiative: 23
  - name: Goblin
    label: B2
    type: monster
    initiative: 20
    maxHp: 7
    currentHp: 7
    ac: 15 (Leather Armor, Shield)
    speed: "30 ft. "
    status: healthy
  - name: "[[Nes]]"
    type: character
    initiative: 15
  - name: Goblin
    label: C3
    type: monster
    initiative: 12
    maxHp: 7
    currentHp: 7
    ac: 15 (Leather Armor, Shield)
    speed: "30 ft. "
    status: healthy
  - name: Goblin
    label: A1
    type: monster
    initiative: 8
    maxHp: 7
    currentHp: 7
    ac: 15 (Leather Armor, Shield)
    speed: "30 ft. "
    status: healthy
  - name: "[[Wal]]"
    type: character
    initiative: 5
---

# goblins

## Description

goblinsss

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

if (status === "planned") {
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
            const deleteBtn = actionCell.createEl("button", { text: "Delete" });
            deleteBtn.style.cssText = "cursor:pointer;padding:2px 8px;background:#dc3545;color:white;border:none;border-radius:3px;";
            deleteBtn.onclick = () => deleteMonster(idx);
        });
    }
}
```

## Initiative

_Combat tracker will appear here when you start combat._

## Combat Log

_Combat events will be logged here automatically._
