module.exports = async (params) => {
    const { app, quickAddApi: { inputPrompt, suggester } } = params;

    const file = app.workspace.getActiveFile();
    if (!file) return;

    const cache = app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;

    if (!fm || fm.type !== "encounter") {
        new Notice("This is not an encounter note!");
        return;
    }

    if (fm.status === "completed") {
        new Notice("Cannot add monsters to completed encounter!");
        return;
    }

    const inCombat = fm.status === "inCombat";

    // Load monsters database
    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");
    if (!monstersFile) {
        new Notice("Error: monsters.json not found in _system/data/");
        return;
    }
    const monsters = JSON.parse(await app.vault.read(monstersFile));

    // Load helpers if in combat
    let helpers = null;
    if (inCombat) {
        const helpersPath = "_system/scripts/combatHelpers.js";
        const helpersFile = app.vault.getAbstractFileByPath(helpersPath);
        if (!helpersFile) {
            new Notice("Error: combatHelpers.js not found!");
            return;
        }
        const helpersContent = await app.vault.read(helpersFile);
        helpers = eval(helpersContent);
    }

    let building = true;
    const newMonsters = [];

    while (building) {
        // Select Monster
        const monsterName = await suggester(
            item => item,
            monsters.map(m => m.name).sort(),
                                            true,
                                            "Select monster (ESC to finish):"
        );

        if (!monsterName) break;

        // Quantity
        const qtyStr = await inputPrompt("Quantity:", "1");
        const qty = parseInt(qtyStr) || 1;

        // Initiative Mode
        const initiativeType = await suggester(
            item => item.label,
            [
                { label: "Individual", value: "individual" },
                { label: "Group", value: "group" }
            ],
            false,
            "Initiative mode:"
        );
        const initiative = initiativeType?.value ?? "individual";

        // HP Mode
        const hpModeType = await suggester(
            item => item.label,
            [
                { label: "Use Default", value: "default" },
                { label: "Roll HP", value: "rolled" },
                { label: "Low HP", value: "low" },
                { label: "Average HP", value: "average" }
            ],
            false,
            "HP mode:"
        );
        const hpMode = hpModeType?.value ?? "default";

        // Push to temporary monster list
        newMonsters.push({
            name: monsterName,
            qty: qty,
            initiative: initiative,
            hpMode: hpMode,
            labels: []
        });

        // Continue / Finish
        const cont = await suggester(
            item => item.label,
            [
                { label: "Add another", value: true },
                { label: "Finish", value: false }
            ],
            false,
            "Continue?"
        );

        building = cont?.value ?? false;
    }

    if (newMonsters.length === 0) {
        new Notice("No monsters added.");
        return;
    }

    // If in combat, process monsters into initiatives
    if (inCombat) {
        const currentInitiatives = fm.initiatives || [];

        // Calculate starting label counter
        const monsterCount = currentInitiatives.filter(i => i.type === "monster").length;
        let labelCounter = monsterCount;

        const newInitiatives = [];

        for (const entry of newMonsters) {
            const monster = monsters.find(m => m.name === entry.name);
            if (!monster) {
                new Notice(`⚠️ Monster not found: ${entry.name}`);
                continue;
            }

            const entries = await helpers.processMonsterToCombat(entry, monster, labelCounter, true);
            newInitiatives.push(...entries);
            labelCounter += entry.qty;

            // Log joining combat
            const round = fm.round || 1;
            for (const combatant of entries) {
                const combatantName = combatant.label
                ? `${combatant.name} (${combatant.label})`
                : combatant.name;
                const logEntry = helpers.formatLogEntry(round, combatantName, "joined", "", combatant.initiative);
                await addCombatLog(app, file, logEntry);
            }
        }

        // Merge and sort initiatives
        const allInitiatives = [...currentInitiatives, ...newInitiatives];
        const sortedInitiatives = helpers.sortInitiatives(allInitiatives);

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            fm.monsters = [...(fm.monsters || []), ...newMonsters];
            fm.initiatives = sortedInitiatives;

            // Adjust currentTurn if needed (keep pointing to same combatant if possible)
            const currentTurn = fm.currentTurn || 0;
            const currentCombatant = currentInitiatives[currentTurn];
            if (currentCombatant) {
                const newIndex = sortedInitiatives.findIndex(c =>
                c.name === currentCombatant.name && c.label === currentCombatant.label
                );
                if (newIndex !== -1) {
                    fm.currentTurn = newIndex;
                }
            }
        });

        // Refresh view - force re-render of dataview blocks
        setTimeout(() => {
            const leaf = app.workspace.getLeaf(false);
            if (leaf && leaf.view && leaf.view.file === file) {
                app.workspace.trigger('dataview:refresh-views');
            }
        }, 100);

        new Notice(`⚔️ Added ${newInitiatives.length} combatants to combat!`);

    } else {
        // Planning phase - just add to monsters array
        await app.fileManager.processFrontMatter(file, fm => {
            fm.monsters = [...(fm.monsters || []), ...newMonsters];
        });

        new Notice(`Added ${newMonsters.length} monster types!`);
    }
};

async function addCombatLog(app, file, logEntry) {
    let content = await app.vault.read(file);

    // Find Combat Log section
    const logIndex = content.indexOf('## Combat Log');
    if (logIndex === -1) return;

    // Find the end of the header line
    const logStart = content.indexOf('\n', logIndex) + 1;

    // Skip any existing description text
    let insertPoint = logStart;
    const lines = content.substring(logStart).split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('_')) {
            insertPoint = logStart + lines[i].length + 1;
        } else {
            break;
        }
    }

    content = content.substring(0, insertPoint) + logEntry + '\n' + content.substring(insertPoint);
    await app.vault.modify(file, content);
}
