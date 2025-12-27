---
type: encounter
world: {{worldName}}
status: planned
session:
location:
description: {{description}}
monsters: []
initiatives: []
combatLog: []
---

# {{encounterName}}

## Description

## Additional information

## Planification

```dataviewjs
const monsters = dv.current().monsters || [];
const file = app.workspace.getActiveFile();

async function loadMonsterModal() {
    if (!window.showMonsterModal) {
        try {
            const modalFile = app.vault.getAbstractFileByPath("_system/scripts/ui/monsterModal.js");
            if (!modalFile) {
                throw new Error("monsterModal.js not found");
            }
            const modalCode = await app.vault.read(modalFile);

            const wrappedCode = `
                (function() {
                    ${modalCode.replace(/export async function/g, 'window.').replace(/export function/g, 'window.')}
                })();
            `;

            eval(wrappedCode);

            if (!window.showMonsterModal) {
                throw new Error("showMonsterModal not exported correctly");
            }
        } catch (error) {
            console.error('Failed to load monster modal:', error);
            new Notice('Failed to load monster modal. Check console for details.');
            return null;
        }
    }
    return window.showMonsterModal;
}

async function deleteMonster(index) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (frontmatter.monsters && frontmatter.monsters[index]) {
            frontmatter.monsters.splice(index, 1);
        }
    });
}

if (monsters.length === 0) {
    dv.paragraph("_No monster planned_");
} else {
    const table = dv.container.createEl("table");
    table.style.width = "100%";
    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    ["Monster", "Qty", "Initiative", "HP Mode", "Actions"].forEach(header => {
        headerRow.createEl("th", { text: header });
    });
    const tbody = table.createEl("tbody");
    monsters.forEach((monster, index) => {
        const row = tbody.createEl("tr");
        const nameCell = row.createEl("td");
        const nameButton = nameCell.createEl("button", { text: monster.name });
        nameButton.style.cursor = "pointer";
        nameButton.style.backgroundColor = "transparent";
        nameButton.style.border = "none";
        nameButton.style.color = "var(--text-normal)";
        nameButton.style.textDecoration = "underline";
        nameButton.style.padding = "0";
        nameButton.style.fontSize = "inherit";
        nameButton.addEventListener("click", async () => {
            const showModal = await loadMonsterModal();
            if (showModal) {
                await showModal(app, monster.name);
            }
        });
        row.createEl("td", { text: monster.qty });
        row.createEl("td", { text: monster.initiative });
        row.createEl("td", { text: monster.hpMode });
        const actionCell = row.createEl("td");
        const deleteBtn = actionCell.createEl("button", { text: "Delete" });
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.padding = "2px 8px";
        deleteBtn.style.backgroundColor = "#dc3545";
        deleteBtn.style.color = "white";
        deleteBtn.style.border = "none";
        deleteBtn.style.borderRadius = "3px";
        deleteBtn.addEventListener("click", async () => {
            if (confirm(`Delete ${monster.name}?`)) {
                await deleteMonster(index);
            }
        });
    });
}
```

#### Actions
```button
name Add Monsters
type command
action QuickAdd: add-monster
```
```button
name Set Players Initiatives
type command
action QuickAdd: add-player-initiative
```
```button
name Start Combat
type command
action QuickAdd: start-combat
```
```button
name End Combat
type command
action QuickAdd: end-combat
```

## Initiative

```dataviewjs
const initiatives = dv.current().initiatives || [];
const status = dv.current().status || ""
const currentTurn = dv.current().currentTurn || 0;

if (status === "planned") {
    dv.paragraph("_Combat has not started_");
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
        const nameCell = row.createEl("td");
        if (combatant.name && combatant.name.path) {
            const basename = combatant.name.path.split("/").pop().replace(/\.md$/, "");
            const link = nameCell.createEl("a", {
                cls: "internal-link",
                href: combatant.name.path,
                text: basename
            });
        } else if (typeof combatant.name === "string") {
            nameCell.textContent = combatant.name.replace(/\.md$/, "");
        } else {
            nameCell.textContent = "Unknown";
        }
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

#### Actions
```button
name Next Turn
type command
action QuickAdd: next-turn
```
```button
name Apply Damage
type command
action QuickAdd: combat-damage
```
```button
name Apply Healing
type command
action QuickAdd: combat-heal
```

## Combat Log
