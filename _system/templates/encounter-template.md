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

## Monsters

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
                    ${modalCode
                        .replace(/export async function\s+(\w+)/g, 'window.$1 = async function')
                        .replace(/export function\s+(\w+)/g, 'window.$1 = function')}
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
    ["Status", "Monster", "Qty", "Initiative", "HP Mode", "Actions"].forEach(header => {
        headerRow.createEl("th", { text: header });
    });
    const tbody = table.createEl("tbody");
    monsters.forEach((monster, index) => {
        const row = tbody.createEl("tr");
        const statusCell = row.createEl("td");
        const statusText = monster.planned === false ? "U" : "P";
        const statusColor = monster.planned === false ? "#ffc107" : "var(--text-normal)";
        statusCell.textContent = statusText;
        statusCell.style.fontWeight = "bold";
        statusCell.style.color = statusColor;
        statusCell.style.textAlign = "center";
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
                await showModal(app, monster.name, monster.source);
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
name Update Combat
type command
action QuickAdd: update-combat
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
        const statusText = combatant.type === "monster" ? (combatant.status || "healthy") : "--";
        row.createEl("td", { text: statusText });
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

```dataviewjs
const logs = dv.current().combatLog || [];

if (logs.length === 0) {
    dv.paragraph("_No combat events yet_");
} else {
    const logsByRound = {};
    for (const entry of logs) {
        const round = typeof entry === 'string'
            ? (entry.match(/^Round (\d+)/) || [null, 1])[1]
            : entry.round || 1;
        if (!logsByRound[round]) logsByRound[round] = [];
        logsByRound[round].push(entry);
    }

    const currentRound = dv.current().round;

    for (const [round, entries] of Object.entries(logsByRound).sort((a, b) => a[0] - b[0])) {
        const details = dv.container.createEl('details', { cls: 'combat-round' });
        if (parseInt(round) === currentRound) details.setAttribute('open', 'open');

        const summary = details.createEl('summary');
        summary.style.cursor = 'pointer';
        summary.style.fontWeight = 'bold';
        summary.style.padding = '8px';
        summary.style.backgroundColor = 'var(--background-secondary)';
        summary.style.borderRadius = '4px';
        summary.style.marginBottom = '4px';
        summary.textContent = `Round ${round} (${entries.length} events)`;

        const logList = details.createEl('ul');
        logList.style.marginTop = '8px';
        logList.style.paddingLeft = '20px';

        for (const entry of entries) {
            const li = logList.createEl('li');
            li.style.marginBottom = '4px';

            if (typeof entry === 'string') {
                li.textContent = entry.replace(/^Round \d+:\s*/, '');
            } else {
                const data = entry.data;
                switch (entry.type) {
                    case 'round':
                        li.innerHTML = '<strong>Round begins</strong>';
                        break;
                    case 'damage':
                        const killed = data.killed ? ' <span style="color: red;">(KILLED)</span>' : '';
                        li.innerHTML = `${data.source || '?'} → ${data.target}: <strong>${data.amount} ${data.damageType}</strong> damage (${data.newHp}/${data.maxHp} HP)${killed}`;
                        break;
                    case 'heal':
                        li.innerHTML = `${data.source || '?'} → ${data.target}: <strong>+${data.amount} HP</strong> (${data.newHp}/${data.maxHp} HP)`;
                        break;
                    case 'reinforcement':
                        li.innerHTML = `<strong style="color: orange;">${data.name} x${data.qty} reinforcements arrived!</strong>`;
                        break;
                    case 'end':
                        li.innerHTML = '<strong style="color: green;">Combat ended</strong>';
                        break;
                    default:
                        li.textContent = JSON.stringify(entry);
                }
            }
        }
    }
}
```

## Battle Statistics

```dataviewjs
const status = dv.current().status;
const stats = dv.current().combatStats;

if (status === 'planned') {
    dv.paragraph("_Combat has not started_");
} else if (!stats || Object.keys(stats.damageDealt || {}).length === 0) {
    dv.paragraph("_No battle statistics yet_");
} else {
    if (Object.keys(stats.damageDealt || {}).length > 0) {
        const section = dv.container.createEl('div');
        section.style.marginBottom = '16px';
        section.createEl('h4', { text: 'Damage Dealt' });
        const table = section.createEl('table');
        table.style.width = '100%';
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Combatant' });
        headerRow.createEl('th', { text: 'Total Damage' });
        const tbody = table.createEl('tbody');

        Object.entries(stats.damageDealt)
            .sort((a, b) => b[1] - a[1])
            .forEach(([combatant, damage]) => {
                const row = tbody.createEl('tr');
                row.createEl('td', { text: combatant });
                row.createEl('td', { text: damage });
            });
    }

    if (Object.keys(stats.damageTaken || {}).length > 0) {
        const section = dv.container.createEl('div');
        section.style.marginBottom = '16px';
        section.createEl('h4', { text: 'Damage Taken' });
        const table = section.createEl('table');
        table.style.width = '100%';
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Combatant' });
        headerRow.createEl('th', { text: 'Total Damage' });
        const tbody = table.createEl('tbody');

        Object.entries(stats.damageTaken)
            .sort((a, b) => b[1] - a[1])
            .forEach(([combatant, damage]) => {
                const row = tbody.createEl('tr');
                row.createEl('td', { text: combatant });
                row.createEl('td', { text: damage });
            });
    }

    if (Object.keys(stats.healingProvided || {}).length > 0) {
        const section = dv.container.createEl('div');
        section.style.marginBottom = '16px';
        section.createEl('h4', { text: 'Healing Provided' });
        const table = section.createEl('table');
        table.style.width = '100%';
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Healer' });
        headerRow.createEl('th', { text: 'Total Healing' });
        const tbody = table.createEl('tbody');

        Object.entries(stats.healingProvided)
            .sort((a, b) => b[1] - a[1])
            .forEach(([healer, healing]) => {
                const row = tbody.createEl('tr');
                row.createEl('td', { text: healer });
                row.createEl('td', { text: healing });
            });
    }

    if (Object.keys(stats.kills || {}).length > 0) {
        const section = dv.container.createEl('div');
        section.createEl('h4', { text: 'Kills/Takedowns' });
        const table = section.createEl('table');
        table.style.width = '100%';
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Combatant' });
        headerRow.createEl('th', { text: 'Kills' });
        headerRow.createEl('th', { text: 'Targets' });
        const tbody = table.createEl('tbody');

        Object.entries(stats.kills)
            .sort((a, b) => b[1].length - a[1].length)
            .forEach(([combatant, targets]) => {
                const row = tbody.createEl('tr');
                row.createEl('td', { text: combatant });
                row.createEl('td', { text: targets.length });
                row.createEl('td', { text: targets.join(', ') });
            });
    }
}
```
