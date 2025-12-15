module.exports = async function addEncounterMonsters(params) {
    const { app, quickAddApi: { inputPrompt, suggester } } = params;

    const file = app.workspace.getActiveFile();
    if (!file) return;

    const fm = app.metadataCache.getFileCache(file).frontmatter;
    if (!fm || fm.type !== "encounter") {
        new Notice("This is not an encounter note!");
        return;
    }

    if (fm.status === "completed") {
        new Notice("Cannot add monsters to completed encounter!");
        return;
    }

    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");
    if (!monstersFile) {
        new Notice("Error: monsters.json not found in _system/data/");
        return;
    }
    const monsters = JSON.parse(await app.vault.read(monstersFile));

    let building = true;
    const newMonsters = [];

    while (building) {
        const monsterName = await suggester(
            item => item,
            monsters.map(m => m.name).sort(),
                                            true,
                                            "Select monster (ESC to finish):"
        );

        if (!monsterName) break;

        const qtyStr = await inputPrompt("Quantity:", "1");
        const qty = parseInt(qtyStr) || 1;

        const initiativeType = await suggester(
            item => item.label,
            [{label: "Individual", value: "individual"}, {label: "Group", value: "group"}],
            false,
            "Initiative mode:"
        );
        const initiative = initiativeType ? initiativeType.value : "individual";

        const hpModeType = await suggester(
            item => item.label,
            [
                {label: "Roll HP", value: "rolled"},
                {label: "Low HP", value: "low"},
                {label: "Average HP", value: "average"},
                {label: "Use Default", value: "default"}
            ],
            false,
            "HP mode:"
        );
        const hpMode = hpModeType ? hpModeType.value : "default";

        newMonsters.push({
            name: monsterName,
            qty: qty,
            initiative: initiative,
            hpMode: hpMode,
            labels: []
        });

        const cont = await suggester(
            item => item.label,
            [{label: "Add another", value: true}, {label: "Finish", value: false}],
            false,
            "Continue?"
        );
        building = cont ? cont.value : false;
    }

    // Update frontmatter
    const updatedMonsters = [...(fm.monsters || []), ...newMonsters];
    await app.fileManager.processFrontMatter(file, fm => {
        fm.monsters = updatedMonsters;
    });

    // FIX: Use simple regeneration without template literals
    await simpleRegenerate(app, file, fm, updatedMonsters);
    new Notice(`Added ${newMonsters.length} monster types!`);
};

async function simpleRegenerate(app, file, fm, monsters) {
    let content = "---\n";
    content += "type: encounter\n";
    content += "world: " + fm.world + "\n";
    content += "status: " + fm.status + "\n";
    content += "session: " + (fm.session || "") + "\n";
    content += "location: " + (fm.location ? '"' + fm.location + '"' : '""') + "\n";
    content += "description: " + (fm.description || "") + "\n";
    content += "monsters:\n";
    monsters.forEach(m => {
        content += '  - name: "' + m.name + '"\n';
        content += '    qty: ' + m.qty + '\n';
        content += '    initiative: ' + m.initiative + '\n';
        content += '    hpMode: ' + m.hpMode + '\n';
        content += '    labels: []\n';
    });
    content += "initiatives: " + JSON.stringify(fm.initiatives || []) + "\n";
    content += "combatLog: " + JSON.stringify(fm.combatLog || []) + "\n";
    content += "---\n\n";

    content += "# " + file.basename + "\n\n";
    content += "**Status:** " + getEmoji(fm.status) + " " + (fm.status || "planned") + "  \n";
    content += "**World:** [[" + fm.world + "]]  \n";
    content += "**Location:** " + (fm.location || "") + "  \n";
    content += "**Description:** " + (fm.description || "") + "\n\n";

    if (fm.status !== "completed") {
        content += getButtons(fm.status);
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

        content += "const container = dv.container;\n";
        content += "const title = container.createEl(\"h2\", { text: \"Planned Forces\" });\n\n";

        content += "if (monsters.length === 0) {\n";
        content += "    container.createEl(\"p\", { text: \"No monsters planned\", cls: \"italic\" });\n";
        content += "} else {\n";
        content += "    const table = container.createEl(\"table\");\n";
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
    }

    if (fm.status === "inCombat") {
        const combatSection = await app.vault.read("_system/templates/enable-encounter.md");
        content += combatSection;
    }

    await app.vault.modify(file, content);
}

function getEmoji(status) {
    switch(status) {
        case "planned": return "📝";
        case "inCombat": return "⚔️";
        case "completed": return "✅";
        default: return "📝";
    }
}

function getButtons(status) {
    let buttons = "### Encounter Actions\n";
    buttons += "```button\n";
    buttons += "name Add Monsters\n";
    buttons += "type command\n";
    buttons += "action QuickAdd: add-monster\n";
    buttons += "```\n";
    buttons += "```button\n";
    buttons += "name Set Player Initiatives\n";
    buttons += "type command\n";
    buttons += "action QuickAdd: add-player-initiative\n";
    buttons += "```\n";

    if (status === "planned") {
        buttons += "```button\n";
        buttons += "name Start Combat\n";
        buttons += "type command\n";
        buttons += "action QuickAdd: start-combat\n";
        buttons += "```\n";
    } else if (status === "inCombat") {
        buttons += "```button\n";
        buttons += "name End Combat\n";
        buttons += "type command\n";
        buttons += "action QuickAdd: end-combat\n";
        buttons += "```\n";
    }

    return buttons;
}
