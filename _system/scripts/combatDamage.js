module.exports = async (params) => {
    try {
        const { app, quickAddApi: { suggester, inputPrompt } } = params;
        if (!app) throw new Error("'app' parameter missing");

        const file = app.workspace.getActiveFile();
        if (!file) throw new Error("No active file");

        const fileCache = app.metadataCache.getFileCache(file);
        if (!fileCache?.frontmatter) throw new Error("No frontmatter");

        const fm = fileCache.frontmatter;

        if (fm.type !== "encounter") {
            throw new Error("This is not an encounter note!");
        }

        if (fm.status !== "inCombat") {
            new Notice("⚠️ Combat is not active!");
            return;
        }

        const initiatives = fm.initiatives || [];
        if (initiatives.length === 0) {
            new Notice("⚠️ No combatants in initiative!");
            return;
        }

        // Load helpers
        const helpersPath = "_system/scripts/combatHelpers.js";
        const helpersFile = app.vault.getAbstractFileByPath(helpersPath);
        if (!helpersFile) throw new Error("combatHelpers.js not found");
        const helpersContent = await app.vault.read(helpersFile);
        const helpers = eval(helpersContent);

        // Build combatant list for selection
        const combatantChoices = initiatives.map(c => {
            const label = c.label ? ` (${c.label})` : "";
            const hp = c.type === "monster" ? ` [${c.currentHp}/${c.maxHp} HP]` : "";
            return {
                display: `${c.name}${label}${hp}`,
                value: c
            };
        });

        // 1. Select source
        const source = await suggester(
            item => item.display,
            combatantChoices,
            false,
            "Who is dealing damage?"
        );
        if (!source) return;

        // 2. Select target
        const target = await suggester(
            item => item.display,
            combatantChoices,
            false,
            "Who is taking damage?"
        );
        if (!target) return;

        // 3. Damage amount
        const damageStr = await inputPrompt("Damage amount:", "0");
        const damage = parseInt(damageStr) || 0;
        if (damage <= 0) {
            new Notice("⚠️ Invalid damage amount!");
            return;
        }

        // 4. Damage type
        const damageTypes = [
            "slashing", "piercing", "bludgeoning",
            "fire", "cold", "lightning", "thunder",
            "acid", "poison", "necrotic", "radiant",
            "force", "psychic"
        ];
        const damageType = await suggester(
            item => item,
            damageTypes,
            true,
            "Damage type (optional):"
        ) || "";

        // Apply damage
        const targetIndex = initiatives.findIndex(c =>
        c.name === target.value.name && c.label === target.value.label
        );

        if (targetIndex === -1) {
            new Notice("⚠️ Target not found in initiatives!");
            return;
        }

        // Format names for log
        const sourceName = source.value.label
        ? `${source.value.name} (${source.value.label})`
        : source.value.name;
        const targetName = target.value.label
        ? `${target.value.name} (${target.value.label})`
        : target.value.name;

        const round = fm.round || 1;

        // If target is a player (character), just log it - don't track HP or status
        if (target.value.type === "character") {
            const logEntry = helpers.formatLogEntry(round, sourceName, "damage", targetName, damage, damageType);
            await addCombatLog(app, file, logEntry);
            new Notice(`💥 ${sourceName} dealt ${damage}${damageType ? ` ${damageType}` : ""} damage to ${targetName}!`);
            return;
        }

        // For monsters, track HP and status
        const newHp = Math.max(0, target.value.currentHp - damage);
        const isDead = newHp === 0;
        const newStatus = helpers.getHealthStatus(newHp, target.value.maxHp);

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            if (fm.initiatives[targetIndex]) {
                fm.initiatives[targetIndex].currentHp = newHp;
                fm.initiatives[targetIndex].status = newStatus;
            }
        });

        // Add to combat log
        const logEntry = helpers.formatLogEntry(round, sourceName, "damage", targetName, damage, damageType);
        await addCombatLog(app, file, logEntry);

        // If killed, add additional log entry
        if (isDead && target.value.currentHp > 0) {
            const killEntry = helpers.formatLogEntry(round, sourceName, "killed", targetName, 0);
            await addCombatLog(app, file, killEntry);
        }

        // Refresh view - force re-render of dataview blocks
        setTimeout(() => {
            const leaf = app.workspace.getLeaf(false);
            if (leaf && leaf.view && leaf.view.file === file) {
                app.workspace.trigger('dataview:refresh-views');
            }
        }, 100);

        const damageTypeStr = damageType ? ` ${damageType}` : "";
        new Notice(`💥 ${sourceName} dealt ${damage}${damageTypeStr} damage to ${targetName}!`);

    } catch (error) {
        console.error("💥 combatDamage error:", error);
        new Notice(`❌ Error: ${error.message}`);
    }
}

async function addCombatLog(app, file, logEntry) {
    let content = await app.vault.read(file);

    // Find Combat Log section
    const logIndex = content.indexOf('## Combat Log');
    if (logIndex === -1) return;

    // Find the end of the header line
    const logStart = content.indexOf('\n', logIndex) + 1;

    // Skip any existing description text (lines starting with _)
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
