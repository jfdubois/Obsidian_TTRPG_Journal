module.exports = async (params) => {
    const { quickAddApi: { inputPrompt, suggester } } = params;

    const activeFile = app.workspace.getActiveFile();
    const worldName = activeFile.path.match(/Worlds\/([^\/]+)/)[1];
    const worldFolder = `Worlds/${worldName}`;

    // Encounter Name
    const encounterName = await inputPrompt("Encounter Name:");
    if (!encounterName) return;

    // Auto-number (E0001 pattern)
    const existingEncounters = app.vault.getFiles()
    .filter(f => f.path.includes(worldFolder) && f.basename.match(/^E\d{4}_/))
    .sort();
    const lastNum = existingEncounters.length > 0
    ? parseInt(existingEncounters.last().basename.match(/E(\d{4})/)[1])
    : 0;
    const nextNum = String(lastNum + 1).padStart(4, '0');
    const fileName = `E${nextNum}_${encounterName.replace(/\s+/g, '_')}.md`;

    // Description
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

    content += `## Description\n\n`;

    content += `## Additional information\n\n`;

    // Planned monsters section
    content += "## Planification\n";
    content += "\n```dataviewjs\n";
    content += "const monsters = dv.current().monsters || [];\n";
    content += "const file = app.workspace.getActiveFile();\n\n";

    content += "async function deleteMonster(index) {\n";
    content += "    await app.fileManager.processFrontMatter(file, (frontmatter) => {\n";
    content += "        if (frontmatter.monsters && frontmatter.monsters[index]) {\n";
    content += "            frontmatter.monsters.splice(index, 1);\n";
    content += "        }\n";
    content += "    });\n";
    content += "}\n\n";

    content += "if (monsters.length === 0) {\n";
    content += "    dv.paragraph(\"_No monster planned_\");\n";
    content += "} else {\n";
    content += "    const table = dv.container.createEl(\"table\");\n";
    content += "    table.style.width = \"100%\";\n";
    content += "    const thead = table.createEl(\"thead\");\n";
    content += "    const headerRow = thead.createEl(\"tr\");\n";
    content += "    [\"Monster\", \"Qty\", \"Initiative\", \"HP Mode\", \"Actions\"].forEach(header => {\n";
    content += "        headerRow.createEl(\"th\", { text: header });\n";
    content += "    });\n";
    content += "    const tbody = table.createEl(\"tbody\");\n";
    content += "    monsters.forEach((monster, index) => {\n";
    content += "        const row = tbody.createEl(\"tr\");\n";
    content += "        row.createEl(\"td\", { text: monster.name });\n";
    content += "        row.createEl(\"td\", { text: monster.qty });\n";
    content += "        row.createEl(\"td\", { text: monster.initiative });\n";
    content += "        row.createEl(\"td\", { text: monster.hpMode });\n";
    content += "        const actionCell = row.createEl(\"td\");\n";
    content += "        const deleteBtn = actionCell.createEl(\"button\", { text: \"Delete\" });\n";
    content += "        deleteBtn.style.cursor = \"pointer\";\n";
    content += "        deleteBtn.style.padding = \"2px 8px\";\n";
    content += "        deleteBtn.style.backgroundColor = \"#dc3545\";\n";
    content += "        deleteBtn.style.color = \"white\";\n";
    content += "        deleteBtn.style.border = \"none\";\n";
    content += "        deleteBtn.style.borderRadius = \"3px\";\n";
    content += "        deleteBtn.addEventListener(\"click\", async () => {\n";
    content += "            if (confirm(`Delete ${monster.name}?`)) {\n";
    content += "                await deleteMonster(index);\n";
    content += "            }\n";
    content += "        });\n";
    content += "    });\n";
    content += "}\n";
    content += "```\n";

    content += `#### Actions\n`;
    content += `\`\`\`button\n`;
    content += `name Add Monsters\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-monster\n`;
    content += `\`\`\`\n`;
    content += `\`\`\`button\n`;
    content += `name Set Players Initiatives\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-player-initiative\n`;
    content += `\`\`\`\n`;
    content += `\`\`\`button\n`;
    content += `name Start Combat\n`;
    content += `type command\n`;
    content += `action QuickAdd: start-combat\n`;
    content += `\`\`\`\n`;
    content += `\`\`\`button\n`;
    content += `name End Combat\n`;
    content += `type command\n`;
    content += `action QuickAdd: end-combat\n`;
    content += `\`\`\`\n\n`;

    content += `## Initiative\n\n`
    // Dynamic initiative table with dataviewjs
    content += `\`\`\`dataviewjs\n`;
    content += `const initiatives = dv.current().initiatives || [];\n`;
    content += `const status = dv.current().status || ""\n`;
    content += `const currentTurn = dv.current().currentTurn || 0;\n\n`;

    content += `if (status === "planned") {\n`;
    content += `    dv.paragraph("_Combat has not started_");\n`;
    content += `} else {\n`;
    content += `    const table = dv.container.createEl("table");\n`;
    content += `    table.style.width = "100%";\n`;
    content += `    const thead = table.createEl("thead");\n`;
    content += `    const headerRow = thead.createEl("tr");\n`;
    content += `    ["Turn", "Name", "Label", "Initiative", "HP", "AC", "Speed", "Status"].forEach(h => {\n`;
    content += `        headerRow.createEl("th", { text: h });\n`;
    content += `    });\n`;
    content += `    const tbody = table.createEl("tbody");\n`;
    content += `    initiatives.forEach((combatant, idx) => {\n`;
    content += `        const row = tbody.createEl("tr");\n`;
    content += `        if (idx === currentTurn) {\n`;
    content += `            row.style.backgroundColor = "var(--background-modifier-success)";\n`;
    content += `            row.style.fontWeight = "bold";\n`;
    content += `        }\n`;
    content += `        const turnCell = row.createEl("td", { text: idx === currentTurn ? "➤" : "" });\n`;
    content += `        turnCell.style.textAlign = "center";\n`;
    content += `        const nameCell = row.createEl("td");\n`;
    content += `        if (combatant.name && combatant.name.path) {\n`;
    content += `            const basename = combatant.name.path.split("/").pop().replace(/\\.md$/, "");\n`;
    content += `            const link = nameCell.createEl("a", {\n`;
    content += `                cls: "internal-link",\n`;
    content += `                href: combatant.name.path,\n`;
    content += `                text: basename\n`;
    content += `            });\n`;
    content += `        } else if (typeof combatant.name === "string") {\n`;
    content += `            nameCell.textContent = combatant.name.replace(/\\.md$/, "");\n`;
    content += `        } else {\n`;
    content += `            nameCell.textContent = "Unknown";\n`;
    content += `        }\n`;
    content += `        row.createEl("td", { text: combatant.label || "--" });\n`;
    content += `        row.createEl("td", { text: combatant.initiative || 0 });\n`;
    content += `        const hp = combatant.type === "monster" ? \`\${combatant.currentHp}/\${combatant.maxHp}\` : "--";\n`;
    content += `        row.createEl("td", { text: hp });\n`;
    content += `        row.createEl("td", { text: combatant.ac || "--" });\n`;
    content += `        row.createEl("td", { text: combatant.speed || "--" });\n`;
    content += `        row.createEl("td", { text: combatant.status || "healthy" });\n`;
    content += `    });\n`;
    content += `}\n`;
    content += `\`\`\`\n\n`;

    // Combat action buttons
    content += `\`\`\`button\n`;
    content += `name Next Turn\n`;
    content += `type command\n`;
    content += `action QuickAdd: next-turn\n`;
    content += `\`\`\`\n`;

    content += `\`\`\`button\n`;
    content += `name Apply Damage\n`;
    content += `type command\n`;
    content += `action QuickAdd: combat-damage\n`;
    content += `\`\`\`\n`;

    content += `\`\`\`button\n`;
    content += `name Apply Healing\n`;
    content += `type command\n`;
    content += `action QuickAdd: combat-heal\n`;
    content += `\`\`\`\n`;

    content += `## Combat Log\n\n`

    await app.vault.create(filePath, content);

    new Notice(`Created ${fileName}`);

    // Add delay before opening to let Obsidian index the file
    setTimeout(async () => {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (file) {
            await app.workspace.getLeaf('tab').openFile(file);
        }
    }, 1000);
};
