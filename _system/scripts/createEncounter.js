module.exports = async (params) => {
    const { quickAddApi: { inputPrompt, suggester } } = params;

    // Get world from active file path
    const activeFile = app.workspace.getActiveFile();
    const worldName = activeFile.path.match(/Worlds\/([^\/]+)/)[1];
    const worldFolder = `Worlds/${worldName}`;

    // 1. Encounter Name
    const encounterName = await inputPrompt("Encounter Name:");
    if (!encounterName) return;

    // 2. Auto-number (E0001 pattern)
    const existingEncounters = app.vault.getFiles()
    .filter(f => f.path.includes(worldFolder) && f.basename.match(/^E\d{4}_/))
    .sort();
    const lastNum = existingEncounters.length > 0
    ? parseInt(existingEncounters.last().basename.match(/E(\d{4})/)[1])
    : 0;
    const nextNum = String(lastNum + 1).padStart(4, '0');
    const fileName = `E${nextNum}_${encounterName.replace(/\s+/g, '_')}.md`;

    // 4. Description
    const description = await inputPrompt("Brief description:");

    // Create file with frontmatter
    const filePath = `${worldFolder}/${fileName}`;
    let content = `---\n`;
    content += `type: encounter\n`;
    content += `world: ${worldName}\n`;
    content += `status: planned\n`;
    content += `session: \n`;
    content += `location: \n`;
    content += `description: ${description}\n`;
    content += `monsters: []\n`;
    content += `initiatives: []\n`;
    content += `combatLog: []\n`;
    content += `---\n\n`;

    content += `# ${encounterName}\n\n`;
    content += `*Planning phase - add monsters below*\n\n`;

    content += `### Actions\n`;
    content += `\`\`\`button\n`;
    content += `name Add Monsters\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-monster\n`;
    content += `\`\`\`\n\n`;

    // NEW SECTION ------------------------------------------------------
    content += "```dataviewjs\n";
    content += `const monsters = dv.current().monsters || [];\n`;
    content += `const file = app.workspace.getActiveFile();\n\n`;

    content += `async function loadMonsterData(monsterName) {\n`;
    content += `    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");\n`;
    content += `    if (!monstersFile) {\n`;
    content += `        new Notice("Error: monsters.json not found");\n`;
    content += `        return null;\n`;
    content += `    }\n`;
    content += `    const monstersData = JSON.parse(await app.vault.read(monstersFile));\n`;
    content += `    return monstersData.find(m => m.name === monsterName);\n`;
    content += `}\n\n`;

    content += `async function showMonsterModal(monsterName) {\n`;
    content += `    const monsterData = await loadMonsterData(monsterName);\n`;
    content += `    if (!monsterData) {\n`;
    content += `        new Notice(\`Monster "\${monsterName}" not found in database\`);\n`;
    content += `        return;\n`;
    content += `    }\n`;
    content += `    const overlay = document.createElement('div');\n`;
    content += `    overlay.className = 'monster-modal-overlay active';\n`;
    content += `    const modalContent = document.createElement('div');\n`;
    content += `    modalContent.className = 'monster-modal-content';\n`;
    content += `    modalContent.onclick = (e) => e.stopPropagation();\n`;
    content += "    modalContent.innerHTML = `\n";
    content += `        <div class="monster-modal-header">\n`;
    content += `            <button class="monster-close-btn">&times;</button>\n`;
    content += `            <h2 class="monster-name">\${monsterData.name}</h2>\n`;
    content += `            <p class="monster-meta">\${monsterData.meta}</p>\n`;
    content += `        </div>\n`;
    content += `        <div class="monster-modal-body">\n`;
    content += `            <div class="monster-stat-block">\n`;
    content += `                <div class="monster-stat-row">\n`;
    content += `                    <div class="monster-stat-item"><div class="monster-stat-label">Armor Class</div><div class="monster-stat-value">\${monsterData["Armor Class"]}</div></div>\n`;
    content += `                    <div class="monster-stat-item"><div class="monster-stat-label">Hit Points</div><div class="monster-stat-value">\${monsterData["Hit Points"]}</div></div>\n`;
    content += `                </div>\n`;
    content += `                <div class="monster-stat-row">\n`;
    content += `                    <div class="monster-stat-item"><div class="monster-stat-label">Speed</div><div class="monster-stat-value">\${monsterData.Speed}</div></div>\n`;
    content += `                    <div class="monster-stat-item"><div class="monster-stat-label">Challenge</div><div class="monster-stat-value">\${monsterData.Challenge}</div></div>\n`;
    content += `                </div>\n`;
    content += `            </div>\n`;
    content += `            <div class="monster-ability-scores">\n`;
    content += `                <div class="monster-ability"><div class="monster-ability-name">STR</div><div class="monster-ability-score">\${monsterData.STR}</div><div class="monster-ability-mod">\${monsterData.STR_mod}</div></div>\n`;
    content += `                <div class="monster-ability"><div class="monster-ability-name">DEX</div><div class="monster-ability-score">\${monsterData.DEX}</div><div class="monster-ability-mod">\${monsterData.DEX_mod}</div></div>\n`;
    content += `                <div class="monster-ability"><div class="monster-ability-name">CON</div><div class="monster-ability-score">\${monsterData.CON}</div><div class="monster-ability-mod">\${monsterData.CON_mod}</div></div>\n`;
    content += `                <div class="monster-ability"><div class="monster-ability-name">INT</div><div class="monster-ability-score">\${monsterData.INT}</div><div class="monster-ability-mod">\${monsterData.INT_mod}</div></div>\n`;
    content += `                <div class="monster-ability"><div class="monster-ability-name">WIS</div><div class="monster-ability-score">\${monsterData.WIS}</div><div class="monster-ability-mod">\${monsterData.WIS_mod}</div></div>\n`;
    content += `                <div class="monster-ability"><div class="monster-ability-name">CHA</div><div class="monster-ability-score">\${monsterData.CHA}</div><div class="monster-ability-mod">\${monsterData.CHA_mod}</div></div>\n`;
    content += `            </div>\n`;
    content += `            <div class="monster-stat-block">\n`;
    content += `                \${monsterData["Saving Throws"] ? \`<div class="monster-stat-item"><div class="monster-stat-label">Saving Throws</div><div class="monster-stat-value">\${monsterData["Saving Throws"]}</div></div>\` : ''}\n`;
    content += `                \${monsterData.Skills ? \`<div class="monster-stat-item"><div class="monster-stat-label">Skills</div><div class="monster-stat-value">\${monsterData.Skills}</div></div>\` : ''}\n`;
    content += `                \${monsterData.Senses ? \`<div class="monster-stat-item"><div class="monster-stat-label">Senses</div><div class="monster-stat-value">\${monsterData.Senses}</div></div>\` : ''}\n`;
    content += `                \${monsterData.Languages ? \`<div class="monster-stat-item"><div class="monster-stat-label">Languages</div><div class="monster-stat-value">\${monsterData.Languages}</div></div>\` : ''}\n`;
    content += `            </div>\n`;
    content += `            \${monsterData.Traits ? \`<h3 class="monster-section-title">Traits</h3><div class="monster-trait-content">\${monsterData.Traits}</div>\` : ''}\n`;
    content += `            \${monsterData.Actions ? \`<h3 class="monster-section-title">Actions</h3><div class="monster-action-content">\${monsterData.Actions}</div>\` : ''}\n`;
    content += `            \${monsterData["Legendary Actions"] ? \`<h3 class="monster-section-title">Legendary Actions</h3><div class="monster-action-content">\${monsterData["Legendary Actions"]}</div>\` : ''}\n`;
    content += `        </div>\n`;
    content += "    `;\n";
    content += `    overlay.appendChild(modalContent);\n`;
    content += `    document.body.appendChild(overlay);\n`;
    content += `    const closeBtn = modalContent.querySelector('.monster-close-btn');\n`;
    content += `    closeBtn.onclick = () => overlay.remove();\n`;
    content += `    overlay.onclick = () => overlay.remove();\n`;
    content += `    const escHandler = (e) => {\n`;
    content += `        if (e.key === 'Escape') {\n`;
    content += `            overlay.remove();\n`;
    content += `            document.removeEventListener('keydown', escHandler);\n`;
    content += `        }\n`;
    content += `    };\n`;
    content += `    document.addEventListener('keydown', escHandler);\n`;
    content += `}\n\n`;

    content += `async function deleteMonster(index) {\n`;
    content += `    await app.fileManager.processFrontMatter(file, (frontmatter) => {\n`;
    content += `        if (frontmatter.monsters && frontmatter.monsters[index]) {\n`;
    content += `            frontmatter.monsters.splice(index, 1);\n`;
    content += `        }\n`;
    content += `    });\n`;
    content += `}\n\n`;

    content += `const container = dv.container;\n`;
    content += `container.createEl("h2", { text: "Planned Forces" });\n\n`;

    content += `if (monsters.length === 0) {\n`;
    content += `    container.createEl("p", { text: "No monsters planned", cls: "italic" });\n`;
    content += `} else {\n`;
    content += `    const table = container.createEl("table");\n`;
    content += `    table.style.width = "100%";\n`;
    content += `    const thead = table.createEl("thead");\n`;
    content += `    const headerRow = thead.createEl("tr");\n`;
    content += `    ["Monster", "Qty", "Initiative", "HP Mode", "Actions"].forEach(header => headerRow.createEl("th", { text: header }));\n`;
    content += `    const tbody = table.createEl("tbody");\n`;
    content += `    monsters.forEach((monster, index) => {\n`;
    content += `        const row = tbody.createEl("tr");\n`;
    content += `        const nameCell = row.createEl("td", { text: monster.name });\n`;
    content += `        nameCell.style.cursor = "pointer";\n`;
    content += `        nameCell.style.color = "var(--text-accent)";\n`;
    content += `        nameCell.style.textDecoration = "underline";\n`;
    content += `        nameCell.onclick = () => showMonsterModal(monster.name);\n`;
    content += `        row.createEl("td", { text: monster.qty });\n`;
    content += `        row.createEl("td", { text: monster.initiative });\n`;
    content += `        row.createEl("td", { text: monster.hpMode });\n`;
    content += `        const actionCell = row.createEl("td");\n`;
    content += `        const deleteBtn = actionCell.createEl("button", { text: "Delete" });\n`;
    content += `        deleteBtn.style.cursor = "pointer";\n`;
    content += `        deleteBtn.style.padding = "2px 8px";\n`;
    content += `        deleteBtn.style.backgroundColor = "#dc3545";\n`;
    content += `        deleteBtn.style.color = "white";\n`;
    content += `        deleteBtn.style.border = "none";\n`;
    content += `        deleteBtn.style.borderRadius = "3px";\n`;
    content += `        deleteBtn.addEventListener("click", async () => {\n`;
    content += `            if (confirm(\`Delete \${monster.name}?\`)) await deleteMonster(index);\n`;
    content += `        });\n`;
    content += `    });\n`;
    content += `}\n`;
    content += "```\n\n";
    // END NEW SECTION ------------------------------------------------------

    // Create without opening immediately
    await app.vault.create(filePath, content);
    new Notice(`Created ${fileName}`);

    // Delay open (Obsidian indexing)
    setTimeout(async () => {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (file) {
            await app.workspace.getLeaf('tab').openFile(file);
        }
    }, 1000);
};
