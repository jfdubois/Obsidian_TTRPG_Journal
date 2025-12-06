module.exports = async (params) => {
    const { quickAddApi: { inputPrompt } } = params;

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

    // 3. Description
    const description = await inputPrompt("Brief description:");

    // Create file with frontmatter
    const filePath = `${worldFolder}/${fileName}`;
    let content = `---\n`;
    content += `type: encounter\n`;
    content += `world: ${worldName}\n`;
    content += `status: planned\n`;
    content += `round: 1\n`;
    content += `currentTurn: 0\n`;
    content += `session: \n`;
    content += `location: \n`;
    content += `description: ${description || ""}\n`;
    content += `monsters: []\n`;
    content += `initiatives: []\n`;
    content += `---\n\n`;

    // Main heading
    content += `# ${encounterName}\n\n`;

    // Description section
    content += `## Description\n\n`;
    content += `${description || "_Add encounter description here..._"}\n\n`;

    // Monster's notes section
    content += `## Monster's Notes\n\n`;
    content += `_Add tactical notes, environmental factors, or special considerations..._\n\n`;

    // Monsters section with action buttons
    content += `## Monsters\n\n`;

    content += `\`\`\`button\n`;
    content += `name Add Monsters\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-monster\n`;
    content += `\`\`\`\n`;
    content += `^button-add-monsters\n\n`;

    content += `\`\`\`button\n`;
    content += `name Players Initiative\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-player-initiative\n`;
    content += `\`\`\`\n`;
    content += `^button-player-init\n\n`;

    content += `\`\`\`button\n`;
    content += `name Start Combat\n`;
    content += `type command\n`;
    content += `action QuickAdd: enable-combat\n`;
    content += `\`\`\`\n`;
    content += `^button-start-combat\n\n`;

    content += `\`\`\`button\n`;
    content += `name End Combat\n`;
    content += `type command\n`;
    content += `action QuickAdd: end-combat\n`;
    content += `\`\`\`\n`;
    content += `^button-end-combat\n\n`;

    // Planned monsters table (dataviewjs)
    content += `\`\`\`dataviewjs\n`;
    content += `const monsters = dv.current().monsters || [];\n`;
    content += `const file = app.workspace.getActiveFile();\n`;
    content += `const status = dv.current().status;\n\n`;

    content += `async function deleteMonster(index) {\n`;
    content += `    if (status === "inCombat") {\n`;
    content += `        new Notice("⚠️ Cannot delete monsters during combat!");\n`;
    content += `        return;\n`;
    content += `    }\n`;
    content += `    if (confirm(\`Delete \${monsters[index].name}?\`)) {\n`;
    content += `        await app.fileManager.processFrontMatter(file, (fm) => {\n`;
    content += `            if (fm.monsters && fm.monsters[index]) {\n`;
    content += `                fm.monsters.splice(index, 1);\n`;
    content += `            }\n`;
    content += `        });\n`;
    content += `    }\n`;
    content += `}\n\n`;

    content += `async function showMonsterInfo(monsterName) {\n`;
    content += `    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");\n`;
    content += `    if (!monstersFile) {\n`;
    content += `        new Notice("Error: monsters.json not found");\n`;
    content += `        return;\n`;
    content += `    }\n`;
    content += `    const monstersData = JSON.parse(await app.vault.read(monstersFile));\n`;
    content += `    const monster = monstersData.find(m => m.name === monsterName);\n`;
    content += `    if (!monster) {\n`;
    content += `        new Notice(\`Monster "\${monsterName}" not found\`);\n`;
    content += `        return;\n`;
    content += `    }\n`;
    content += `    // Simple alert for now - you can enhance this later with a modal\n`;
    content += `    const info = \`\${monster.name}\\n\${monster.meta}\\nAC: \${monster["Armor Class"]}\\nHP: \${monster["Hit Points"]}\\nSpeed: \${monster.Speed}\`;\n`;
    content += `    new Notice(info, 5000);\n`;
    content += `}\n\n`;

    content += `if (monsters.length === 0) {\n`;
    content += `    dv.paragraph("_No monsters added yet. Click 'Add Monsters' above._");\n`;
    content += `} else {\n`;
    content += `    const table = dv.container.createEl("table");\n`;
    content += `    table.style.width = "100%";\n`;
    content += `    const thead = table.createEl("thead");\n`;
    content += `    const headerRow = thead.createEl("tr");\n`;
    content += `    ["Monster", "Qty", "Initiative", "HP Mode", "Actions"].forEach(h => {\n`;
    content += `        headerRow.createEl("th", { text: h });\n`;
    content += `    });\n`;
    content += `    const tbody = table.createEl("tbody");\n`;
    content += `    monsters.forEach((monster, idx) => {\n`;
    content += `        const row = tbody.createEl("tr");\n`;
    content += `        const nameCell = row.createEl("td", { text: monster.name });\n`;
    content += `        nameCell.style.cursor = "pointer";\n`;
    content += `        nameCell.style.color = "var(--text-accent)";\n`;
    content += `        nameCell.style.textDecoration = "underline";\n`;
    content += `        nameCell.onclick = () => showMonsterInfo(monster.name);\n`;
    content += `        row.createEl("td", { text: monster.qty });\n`;
    content += `        row.createEl("td", { text: monster.initiative });\n`;
    content += `        row.createEl("td", { text: monster.hpMode });\n`;
    content += `        const actionCell = row.createEl("td");\n`;
    content += `        if (status === "planned") {\n`;
    content += `            const deleteBtn = actionCell.createEl("button", { text: "Delete" });\n`;
    content += `            deleteBtn.style.cssText = "cursor:pointer;padding:2px 8px;background:#dc3545;color:white;border:none;border-radius:3px;";\n`;
    content += `            deleteBtn.onclick = () => deleteMonster(idx);\n`;
    content += `        } else {\n`;
    content += `            actionCell.createEl("span", { text: "—", cls: "muted" });\n`;
    content += `        }\n`;
    content += `    });\n`;
    content += `}\n`;
    content += `\`\`\`\n\n`;

    // Combat section (will be populated when combat starts)
    content += `## Initiative\n\n`;
    content += `_Combat tracker will appear here when you start combat._\n\n`;

    // Combat log section
    content += `## Combat Log\n\n`;

    // Create the file
    await app.vault.create(filePath, content);
    new Notice(`✅ Created ${fileName}`);

    // Open after a short delay
    setTimeout(async () => {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (file) {
            await app.workspace.getLeaf('tab').openFile(file);
        }
    }, 500);
};
