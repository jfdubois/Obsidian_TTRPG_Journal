module.exports = async function enableCombat(params) {

    try {
        const { app } = params;
        if (!app) throw new Error("'app' parameter missing from QuickAdd");

        const file = app.workspace.getActiveFile();
        if (!file) throw new Error("No active file");

        const fileCache = app.metadataCache.getFileCache(file);
        if (!fileCache?.frontmatter) throw new Error("No frontmatter");

        const fm = fileCache.frontmatter;
        console.log(`📋 Note: ${file.path} | Type: ${fm.type} | Status: ${fm.status}`);

        if (fm.type !== "encounter") {
            throw new Error(`Note type is '${fm.type}', must be 'encounter'`);
        }

        if (fm.status === "completed") {
            throw new Error(`Cannot start encounter when status is completed`);
        }

        const alreadyInCombat = fm.status === "inCombat";
        if (alreadyInCombat) {
            new Notice("♻️ Regenerating combat order...");
        } else if (fm.status !== "planned") {
            throw new Error(`Status is '${fm.status}', must be 'planned'`);
        }

        // Load monsters
        const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");
        if (!monstersFile) throw new Error("Monsters file not found at: _system/data/monsters.json");

        const monsters = JSON.parse(await app.vault.read(monstersFile));
        console.log(`📊 Loaded ${monsters.length} monsters`);

        // Process initiatives
        const initiativeData = [];
        let labelCounter = 0;

        for (const entry of fm.monsters || []) {
            const monster = monsters.find(m => m.name === entry.name);
            if (!monster) {
                new Notice(`⚠️ Monster not found: ${entry.name}`);
                continue;
            }

            const groupInit = entry.initiative === "group" ? rollInitiative(monster["DEX_mod"]) : null;

            for (let i = 0; i < entry.qty; i++) {
                const label = entry.initiative === "group"
                ? `G${labelCounter + 1}`
                : `${String.fromCharCode(65 + Math.floor(labelCounter / 26))}${(labelCounter % 26) + 1}`;

                const maxHp = entry.hpMode !== "default"
                ? rollHitPoints(parseHitDice(monster["Hit Points"]), entry.hpMode)
                : parseInt(monster["Hit Points"].match(/^(\d+)/)[1]);

                initiativeData.push({
                    name: monster.name,
                    label: label,
                    type: "monster",
                    initiative: groupInit || rollInitiative(monster["DEX_mod"]),
                                    maxHp: maxHp,
                                    currentHp: maxHp,
                                    ac: monster["Armor Class"],
                                    speed: monster["Speed"] || "30 ft.",
                                    status: "healthy"
                });
                labelCounter++;
            }
        }

        // Preserve players
        const existingPlayers = (fm.initiatives || []).filter(p => p.type === "character");
        initiativeData.push(...existingPlayers);

        // Sort
        initiativeData.sort((a, b) => b.initiative - a.initiative);
        console.log(`📈 Sorted ${initiativeData.length} combatants`);

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            fm.status = "inCombat";
            fm.round = fm.round || 1;
            fm.initiatives = initiativeData;
        });

        // Regenerate UI
        await regenerateEncounterNote(app, file, fm, initiativeData);

        new Notice(alreadyInCombat ? "✅ Order regenerated!" : "⚔️ Combat started!");

    } catch (error) {
        console.error("💥 enableCombat error:", error);
        new Notice(`❌ Combat failed: ${error.message}`);
    }
}

// Helper functions
function rollInitiative(dexMod) {
    const mod = dexMod?.match(/([+-]?\d+)/);
    return Math.floor(Math.random() * 20) + 1 + (mod ? parseInt(mod[1]) : 0);
}

function rollHitPoints(dice, mode) {
    if (!dice) return 0;
    let total = 0;
    if (mode === "low") total = dice.num + (dice.op === '+' ? dice.mod : -dice.mod);
    else if (mode === "average") total = Math.floor(dice.num * (dice.size + 1) / 2) + (dice.op === '+' ? dice.mod : -dice.mod);
    else {
        for (let i = 0; i < dice.num; i++) total += Math.floor(Math.random() * dice.size) + 1;
        total += dice.op === '+' ? dice.mod : -dice.mod;
    }
    return Math.max(1, total);
}

function parseHitDice(hpString) {
    const match = hpString?.match(/\((\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\)/);
    return match ? {
        num: parseInt(match[1]),
        size: parseInt(match[2]),
        op: match[3] || '+',
        mod: parseInt(match[4] || 0)
    } : null;
}

async function regenerateEncounterNote(app, file, fm, initiativesArray) {
    const initiatives = initiativesArray || fm.initiatives || [];
    let content = await app.vault.read(file);

    content = content.replace(/## Combat Status:[\s\S]*?(?=## Combat Log|$)/, '');

    let tracker = `\n---\n\n## Combat Status: ⚔️ In Combat (Round ${fm.round || 1})\n\n`;
    tracker += "| Combatant | Initiative | HP | AC | Speed | Status |\n";
    tracker += "|-----------|------------|----|----|-------|\n";

    for (const entry of initiatives) {
        const name = entry.name || entry.label || "Unknown";
        const initiative = entry.initiative || 0;
        const hp = entry.type === "monster" ? `${entry.currentHp}/${entry.maxHp}` : "--";
        const ac = entry.type === "monster" ? entry.ac || "--" : "--";
        const speed = entry.type === "monster" ? entry.speed || "--" : "--";
        const status = entry.status || "healthy";

        tracker += `| ${name} | ${initiative} | ${hp} | ${ac} | ${speed} | ${status} |\n`;
    }

    tracker += `\n### Combat Actions\n\n`;
    tracker += `\`\`\`button\nname Apply Damage\ntype command\naction QuickAdd: combat-damage\n\`\`\`\n`;
    tracker += `\`\`\`button\nname Apply Healing\ntype command\naction QuickAdd: combat-heal\n\`\`\`\n`;

    content += tracker + "\n";
    await app.vault.modify(file, content);
}

// Critical: Proper export
module.exports = enableCombat;
console.log("✅ enableCombat.js loaded successfully");
