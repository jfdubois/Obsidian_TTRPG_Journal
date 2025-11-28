---
type: encounter
world: DEMO-DM
status: planned
session: 
location: 
description: Forest ambush
monsters: []
initiatives: []
combatLog: []
---

# Goblins and Dragon

*Planning phase - add monsters below*

### Actions
```button
name Add Monsters
type command
action QuickAdd: add-monster
```

```dataviewjs
const status = dv.current().status


```

```dataviewjs
const monsters = dv.current().monsters || [];
const file = app.workspace.getActiveFile();

async function loadMonsterData(monsterName) {
    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");
    if (!monstersFile) {
        new Notice("Error: monsters.json not found");
        return null;
    }
    const monstersData = JSON.parse(await app.vault.read(monstersFile));
    return monstersData.find(m => m.name === monsterName);
}

async function showMonsterModal(monsterName) {
    const monsterData = await loadMonsterData(monsterName);
    if (!monsterData) {
        new Notice(`Monster "${monsterName}" not found in database`);
        return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'monster-modal-overlay active';
    const modalContent = document.createElement('div');
    modalContent.className = 'monster-modal-content';
    modalContent.onclick = (e) => e.stopPropagation();
    modalContent.innerHTML = `
        <div class="monster-modal-header">
            <button class="monster-close-btn">&times;</button>
            <h2 class="monster-name">${monsterData.name}</h2>
            <p class="monster-meta">${monsterData.meta}</p>
        </div>
        <div class="monster-modal-body">
            <div class="monster-stat-block">
                <div class="monster-stat-row">
                    <div class="monster-stat-item"><div class="monster-stat-label">Armor Class</div><div class="monster-stat-value">${monsterData["Armor Class"]}</div></div>
                    <div class="monster-stat-item"><div class="monster-stat-label">Hit Points</div><div class="monster-stat-value">${monsterData["Hit Points"]}</div></div>
                </div>
                <div class="monster-stat-row">
                    <div class="monster-stat-item"><div class="monster-stat-label">Speed</div><div class="monster-stat-value">${monsterData.Speed}</div></div>
                    <div class="monster-stat-item"><div class="monster-stat-label">Challenge</div><div class="monster-stat-value">${monsterData.Challenge}</div></div>
                </div>
            </div>
            <div class="monster-ability-scores">
                <div class="monster-ability"><div class="monster-ability-name">STR</div><div class="monster-ability-score">${monsterData.STR}</div><div class="monster-ability-mod">${monsterData.STR_mod}</div></div>
                <div class="monster-ability"><div class="monster-ability-name">DEX</div><div class="monster-ability-score">${monsterData.DEX}</div><div class="monster-ability-mod">${monsterData.DEX_mod}</div></div>
                <div class="monster-ability"><div class="monster-ability-name">CON</div><div class="monster-ability-score">${monsterData.CON}</div><div class="monster-ability-mod">${monsterData.CON_mod}</div></div>
                <div class="monster-ability"><div class="monster-ability-name">INT</div><div class="monster-ability-score">${monsterData.INT}</div><div class="monster-ability-mod">${monsterData.INT_mod}</div></div>
                <div class="monster-ability"><div class="monster-ability-name">WIS</div><div class="monster-ability-score">${monsterData.WIS}</div><div class="monster-ability-mod">${monsterData.WIS_mod}</div></div>
                <div class="monster-ability"><div class="monster-ability-name">CHA</div><div class="monster-ability-score">${monsterData.CHA}</div><div class="monster-ability-mod">${monsterData.CHA_mod}</div></div>
            </div>
            <div class="monster-stat-block">
                ${monsterData["Saving Throws"] ? `<div class="monster-stat-item"><div class="monster-stat-label">Saving Throws</div><div class="monster-stat-value">${monsterData["Saving Throws"]}</div></div>` : ''}
                ${monsterData.Skills ? `<div class="monster-stat-item"><div class="monster-stat-label">Skills</div><div class="monster-stat-value">${monsterData.Skills}</div></div>` : ''}
                ${monsterData.Senses ? `<div class="monster-stat-item"><div class="monster-stat-label">Senses</div><div class="monster-stat-value">${monsterData.Senses}</div></div>` : ''}
                ${monsterData.Languages ? `<div class="monster-stat-item"><div class="monster-stat-label">Languages</div><div class="monster-stat-value">${monsterData.Languages}</div></div>` : ''}
            </div>
            ${monsterData.Traits ? `<h3 class="monster-section-title">Traits</h3><div class="monster-trait-content">${monsterData.Traits}</div>` : ''}
            ${monsterData.Actions ? `<h3 class="monster-section-title">Actions</h3><div class="monster-action-content">${monsterData.Actions}</div>` : ''}
            ${monsterData["Legendary Actions"] ? `<h3 class="monster-section-title">Legendary Actions</h3><div class="monster-action-content">${monsterData["Legendary Actions"]}</div>` : ''}
        </div>
    `;
    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);
    const closeBtn = modalContent.querySelector('.monster-close-btn');
    closeBtn.onclick = () => overlay.remove();
    overlay.onclick = () => overlay.remove();
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

async function deleteMonster(index) {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (frontmatter.monsters && frontmatter.monsters[index]) {
            frontmatter.monsters.splice(index, 1);
        }
    });
}

const container = dv.container;
container.createEl("h2", { text: "Planned Forces" });

if (monsters.length === 0) {
    container.createEl("p", { text: "No monsters planned", cls: "italic" });
} else {
    const table = container.createEl("table");
    table.style.width = "100%";
    const thead = table.createEl("thead");
    const headerRow = thead.createEl("tr");
    ["Monster", "Qty", "Initiative", "HP Mode", "Actions"].forEach(header => headerRow.createEl("th", { text: header }));
    const tbody = table.createEl("tbody");
    monsters.forEach((monster, index) => {
        const row = tbody.createEl("tr");
        const nameCell = row.createEl("td", { text: monster.name });
        nameCell.style.cursor = "pointer";
        nameCell.style.color = "var(--text-accent)";
        nameCell.style.textDecoration = "underline";
        nameCell.onclick = () => showMonsterModal(monster.name);
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
            if (confirm(`Delete ${monster.name}?`)) await deleteMonster(index);
        });
    });
}
```

