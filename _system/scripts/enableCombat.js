module.exports = async function enableCombat(params) {
    try {
        const { app } = params;
        if (!app) throw new Error("'app' parameter missing from QuickAdd");

        const file = app.workspace.getActiveFile();
        if (!file) throw new Error("No active file");

        const fileCache = app.metadataCache.getFileCache(file);
        if (!fileCache?.frontmatter) throw new Error("No frontmatter");

        const fm = fileCache.frontmatter;

        if (fm.type !== "encounter") {
            throw new Error(`Note type is '${fm.type}', must be 'encounter'`);
        }

        if (fm.status === "completed") {
            throw new Error(`Cannot start encounter when status is completed`);
        }

        if (fm.status === "inCombat") {
            new Notice("⚠️ Combat already in progress!");
            return;
        }

        if (fm.status !== "planned") {
            throw new Error(`Status is '${fm.status}', must be 'planned'`);
        }

        // Load helper functions
        const helpersPath = "_system/scripts/combatHelpers.js";
        const helpersFile = app.vault.getAbstractFileByPath(helpersPath);
        if (!helpersFile) throw new Error("combatHelpers.js not found");

        const helpersContent = await app.vault.read(helpersFile);
        const helpers = eval(helpersContent);

        // Load monster data from SRD sources based on encounter monsters
        const monsterDataMap = await loadMonsterDataFromSRD(app, fm.monsters || []);

        // Process monster entries into combat initiatives
        const initiativeData = [];
        let labelCounter = 0;

        for (const entry of fm.monsters || []) {
            const monster = monsterDataMap.get(entry.name);
            if (!monster) {
                new Notice(`⚠️ Monster not found: ${entry.name}`);
                continue;
            }

            const entries = await helpers.processMonsterToCombat(entry, monster, labelCounter, true);
            initiativeData.push(...entries);
            labelCounter += entry.qty;
        }

        // Preserve any existing players
        const existingPlayers = (fm.initiatives || []).filter(p => p.type === "character");
        initiativeData.push(...existingPlayers);

        // Sort by initiative
        const sortedInitiatives = helpers.sortInitiatives(initiativeData);

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            fm.status = "inCombat";
            fm.round = fm.round || 1;
            fm.currentTurn = 0;
            fm.initiatives = sortedInitiatives;
        });

        // Wait a bit for metadata cache to update
        await new Promise(resolve => setTimeout(resolve, 200));

        // Regenerate the note content
        //await regenerateCombatTracker(app, file, sortedInitiatives, 1, 0);

        // Force reload the file to show changes
        const leaf = app.workspace.getLeaf(false);
        await leaf.openFile(file, { state: { mode: 'source' } });

        new Notice("⚔️ Combat started!");

    } catch (error) {
        console.error("💥 enableCombat error:", error);
        new Notice(`❌ Combat failed: ${error.message}`);
    }
}

/**
 * Load monster data from SRD bestiary files based on encounter monsters
 * Returns a Map<name, monsterData> with combat-compatible monster data
 */
async function loadMonsterDataFromSRD(app, encounterMonsters) {
    const monsterDataMap = new Map();

    // Load bestiary index
    const indexFile = app.vault.getAbstractFileByPath("_system/srd/5etools-src/data/bestiary/index.json");
    if (!indexFile) throw new Error("Bestiary index.json not found");
    const index = JSON.parse(await app.vault.read(indexFile));

    // Group monsters by source to minimize file reads
    const monstersBySource = new Map();
    for (const monster of encounterMonsters) {
        if (!monster.source) continue;
        if (!monstersBySource.has(monster.source)) {
            monstersBySource.set(monster.source, []);
        }
        monstersBySource.get(monster.source).push(monster.name);
    }

    // Load each source file and extract monster data
    for (const [source, monsterNames] of monstersBySource) {
        const bestiaryFile = index[source];
        if (!bestiaryFile) continue;

        const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;
        const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

        if (bestiaryFileObj) {
            try {
                const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
                if (bestiaryData.monster) {
                    for (const monster of bestiaryData.monster) {
                        if (monsterNames.includes(monster.name)) {
                            // Transform SRD format to combat-compatible format
                            const combatMonster = transformSRDToCombatFormat(monster);
                            monsterDataMap.set(monster.name, combatMonster);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading ${bestiaryPath}:`, error);
            }
        }
    }

    return monsterDataMap;
}

/**
 * Transform SRD monster data format to combat-compatible format
 */
function transformSRDToCombatFormat(srdMonster) {
    // Calculate DEX modifier from dexterity score
    const dexMod = Math.floor((srdMonster.dex - 10) / 2);
    const dexModString = dexMod >= 0 ? `+${dexMod}` : `${dexMod}`;

    // Format HP string
    const hpString = `${srdMonster.hp.average} (${srdMonster.hp.formula})`;

    // Extract AC value
    let acValue;
    if (Array.isArray(srdMonster.ac)) {
        acValue = srdMonster.ac[0]?.ac || srdMonster.ac[0];
    } else {
        acValue = srdMonster.ac;
    }

    // Format speed string
    let speedString = "30 ft."; // default
    if (srdMonster.speed) {
        const speeds = [];
        if (srdMonster.speed.walk) speeds.push(`walk ${srdMonster.speed.walk}`);
        if (srdMonster.speed.fly) speeds.push(`fly ${srdMonster.speed.fly}`);
        if (srdMonster.speed.swim) speeds.push(`swim ${srdMonster.speed.swim}`);
        if (speeds.length > 0) {
            speedString = speeds.join(", ");
        }
    }

    return {
        name: srdMonster.name,
        "DEX_mod": dexModString,
        "Hit Points": hpString,
        "Armor Class": acValue,
        "Speed": speedString
    };
}

async function regenerateCombatTracker(app, file, initiatives, round, currentTurn) {
    let content = await app.vault.read(file);

    console.log("🔍 Original content length:", content.length);
    console.log("⚔️ Initiatives passed:", initiatives?.length || 0);

    // Find the Initiative section
    const initiativeStart = content.indexOf('## Initiative');
    const combatLogStart = content.indexOf('## Combat Log');

    console.log("📍 Initiative at:", initiativeStart);
    console.log("📍 Combat Log at:", combatLogStart);

    if (initiativeStart === -1 || combatLogStart === -1) {
        new Notice("⚠️ Could not find Initiative or Combat Log sections!");
        return;
    }

    // Build new combat tracker
    let tracker = `## Initiative\n\n`;
    tracker += `\`\`\`dataviewjs\n`;
    tracker += `dv.paragraph("**Round:** " + (dv.current().round || 1) + " | **Status:** ⚔️ In Combat");\n`;
    tracker += `\`\`\`\n\n`;

    // Combat action buttons
    tracker += `\`\`\`button\n`;
    tracker += `name Next Turn\n`;
    tracker += `type command\n`;
    tracker += `action QuickAdd: next-turn\n`;
    tracker += `\`\`\`\n`;
    tracker += `^button-next-turn\n\n`;

    tracker += `\`\`\`button\n`;
    tracker += `name Apply Damage\n`;
    tracker += `type command\n`;
    tracker += `action QuickAdd: combat-damage\n`;
    tracker += `\`\`\`\n`;
    tracker += `^button-damage\n\n`;

    tracker += `\`\`\`button\n`;
    tracker += `name Apply Healing\n`;
    tracker += `type command\n`;
    tracker += `action QuickAdd: combat-heal\n`;
    tracker += `\`\`\`\n`;
    tracker += `^button-heal\n\n`;

    // Dynamic initiative table with dataviewjs
    tracker += `\`\`\`dataviewjs\n`;
    tracker += `const initiatives = dv.current().initiatives || [];\n`;
    tracker += `const currentTurn = dv.current().currentTurn || 0;\n\n`;

    tracker += `if (initiatives.length === 0) {\n`;
    tracker += `    dv.paragraph("_No combatants in initiative._");\n`;
    tracker += `} else {\n`;
    tracker += `    const table = dv.container.createEl("table");\n`;
    tracker += `    table.style.width = "100%";\n`;
    tracker += `    const thead = table.createEl("thead");\n`;
    tracker += `    const headerRow = thead.createEl("tr");\n`;
    tracker += `    ["Turn", "Name", "Label", "Initiative", "HP", "AC", "Speed", "Status"].forEach(h => {\n`;
    tracker += `        headerRow.createEl("th", { text: h });\n`;
    tracker += `    });\n`;
    tracker += `    const tbody = table.createEl("tbody");\n`;
    tracker += `    initiatives.forEach((combatant, idx) => {\n`;
    tracker += `        const row = tbody.createEl("tr");\n`;
    tracker += `        if (idx === currentTurn) {\n`;
    tracker += `            row.style.backgroundColor = "var(--background-modifier-success)";\n`;
    tracker += `            row.style.fontWeight = "bold";\n`;
    tracker += `        }\n`;
    tracker += `        const turnCell = row.createEl("td", { text: idx === currentTurn ? "➤" : "" });\n`;
    tracker += `        turnCell.style.textAlign = "center";\n`;
    tracker += `        row.createEl("td", { text: combatant.name || "Unknown" });\n`;
    tracker += `        row.createEl("td", { text: combatant.label || "--" });\n`;
    tracker += `        row.createEl("td", { text: combatant.initiative || 0 });\n`;
    tracker += `        const hp = combatant.type === "monster" ? \`\${combatant.currentHp}/\${combatant.maxHp}\` : "--";\n`;
    tracker += `        row.createEl("td", { text: hp });\n`;
    tracker += `        row.createEl("td", { text: combatant.ac || "--" });\n`;
    tracker += `        row.createEl("td", { text: combatant.speed || "--" });\n`;
    tracker += `        row.createEl("td", { text: combatant.status || "healthy" });\n`;
    tracker += `    });\n`;
    tracker += `}\n`;
    tracker += `\`\`\`\n\n`;

    // Replace content between Initiative and Combat Log
    const beforeInitiative = content.substring(0, initiativeStart);
    const afterCombatLog = content.substring(combatLogStart);

    content = beforeInitiative + tracker + afterCombatLog;

    console.log("✏️ New content length:", content.length);
    console.log("📝 Tracker length:", tracker.length);

    await app.vault.modify(file, content);
    console.log("✅ File modified successfully");
}
