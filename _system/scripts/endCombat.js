module.exports = async function endCombat(params) {
    const { app, quickAddApi } = params;

    const file = app.workspace.getActiveFile();
    if (!file) return;

    const fm = app.metadataCache.getFileCache(file).frontmatter;
    if (!fm || fm.status !== "inCombat") {
        new Notice("Encounter is not in combat!");
        return;
    }

    // Confirm end combat
    const confirm = await quickAddApi.suggester(
        item => item.label,
        [{label: "✅ Yes, end combat", value: true}, {label: "⏳ Continue fighting", value: false}],
        false,
        "End this combat?"
    );
    if (!confirm || !confirm.value) return;

    // Update status
    await app.fileManager.processFrontMatter(file, fm => {
        fm.status = "completed";
        fm.completedDate = new Date().toISOString();
    });

    // Add to combat log
    const timestamp = new Date().toLocaleString();
    await addLogEntry(file, "=== COMBAT ENDED === (" + timestamp + ")");

    // Simple regeneration
    await simpleRegenerate(app, file);
    new Notice("Combat ended and logged!");
};

async function addLogEntry(file, entry) {
    const content = await app.vault.read(file);
    const logStart = content.indexOf("### Combat Log");

    if (logStart === -1) {
        const newContent = content + "\n\n### Combat Log\n- " + entry + "\n";
        await app.vault.modify(file, newContent);
    } else {
        const insertPos = content.indexOf("\n", logStart) + 1;
        const newContent = content.slice(0, insertPos) + "- " + entry + "\n" + content.slice(insertPos);
        await app.vault.modify(file, newContent);
    }
}

async function simpleRegenerate(app, file) {
    const fm = app.metadataCache.getFileCache(file).frontmatter;
    const monsters = fm.monsters || [];

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
    content += "completedDate: " + (fm.completedDate || "") + "\n";
    content += "---\n\n";

    content += "# " + file.basename + "\n\n";
    content += "**Status:** " + getEmoji(fm.status) + " " + (fm.status || "planned") + "  \n";
    content += "**World:** [[" + fm.world + "]]  \n";
    content += "**Location:** " + (fm.location || "") + "  \n";
    content += "**Description:** " + (fm.description || "") + "\n\n";

    if (fm.status !== "completed") {
        content += "## Planned Forces\n";
        content += "| Monster | Qty | Initiative | HP Mode |\n";
        content += "|---------|-----|------------|---------|\n";
        monsters.forEach(m => content += "| " + m.name + " | " + m.qty + " | " + m.initiative + " | " + m.hpMode + " |\n");
        content += "\n---\n\n";
        content += getButtons(fm.status);
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
    let buttons = "### Actions\n";
    buttons += "```button\n";
    buttons += "name Add Monsters\n";
    buttons += "type command\n";
    buttons += "action QuickAdd: add-monster\n";
    buttons += "```\n\n";
    buttons += "```button\n";
    buttons += "name Set Player Initiatives\n";
    buttons += "type command\n";
    buttons += "action QuickAdd: add-player-initiative\n";
    buttons += "```\n\n";

    if (status === "planned") {
        buttons += "```button\n";
        buttons += "name Start Combat\n";
        buttons += "type command\n";
        buttons += "action QuickAdd: start-combat\n";
        buttons += "```\n\n";
    } else if (status === "inCombat") {
        buttons += "```button\n";
        buttons += "name End Combat\n";
        buttons += "type command\n";
        buttons += "action QuickAdd: end-combat\n";
        buttons += "```\n\n";
    }

    return buttons;
}
