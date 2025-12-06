module.exports = async (params) => {
    const { app } = params;

    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("No active file found!");
        return;
    }

    const fileCache = app.metadataCache.getFileCache(file);
    if (!fileCache?.frontmatter) {
        new Notice("No frontmatter found in the active file!");
        return;
    }

    const fm = fileCache.frontmatter;
    if (fm.type !== "encounter") {
        new Notice("This is not an encounter note!");
        return;
    }

    const world = fm.world;
    if (!world) {
        new Notice("No world specified in encounter note!");
        return;
    }

    const inCombat = fm.status === "inCombat";

    // Get characters for this world
    const characters = app.vault.getFiles()
    .filter(f => f.path.includes(`Worlds/${world}`) && f.frontmatter?.type === "character")
    .sort((a, b) => a.basename.localeCompare(b.basename));

    // Build pre-filled values
    const values = {};
    const existingInitiatives = fm.initiatives || [];

    for (let i = 1; i <= 8; i++) {
        const char = characters[i - 1];
        const charName = char?.basename || "";

        // Find existing initiative by comparing names without wikilink brackets
        const existing = existingInitiatives.find(p => {
            const cleanName = p.name?.replace?.(/\[\[(.*?)\]\]/g, '$1') || '';
            return cleanName === charName;
        });

        values[`player${i}`] = charName;
        values[`initiative${i}`] = existing?.initiative?.toString() || "";
    }

    // Verify ModalForms is available
    const modalForm = app.plugins.plugins.modalforms?.api;
    if (!modalForm) {
        new Notice("ModalForms plugin is not enabled!");
        console.error("ModalForms plugin not found");
        return;
    }

    const currentFile = app.workspace.getActiveFile();
    const currentWorld = currentFile.parent?.name || '';

    // Load helpers if in combat
    let helpers = null;
    if (inCombat) {
        const helpersPath = "_system/scripts/combatHelpers.js";
        const helpersFile = app.vault.getAbstractFileByPath(helpersPath);
        if (helpersFile) {
            const helpersContent = await app.vault.read(helpersFile);
            helpers = eval(helpersContent);
        }
    }

    try {
        const result = await modalForm.openForm("addPlayerInitiatives", {
            values: {
                entityWorld: currentWorld
            }
        });
        if (result.status === "cancelled") return;

        // Parse results: collect all filled entries
        const updates = new Map();

        for (let i = 1; i <= 8; i++) {
            const name = result.data[`player${i}`]?.trim();
            const initStr = result.data[`initiative${i}`]?.toString().trim();

            if (!name || !initStr || initStr === "") {
                continue;
            }

            const initiative = parseInt(initStr);
            if (isNaN(initiative)) {
                console.warn(`Invalid initiative for "${name}": ${initStr}`);
                continue;
            }

            updates.set(name, {
                name: `[[${name}]]`,
                type: "character",
                initiative: initiative
            });
        }

        if (updates.size === 0) {
            new Notice("No valid initiatives entered!");
            return;
        }

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            const currentInitiatives = fm.initiatives || [];

            // Keep existing initiatives that aren't being updated
            const preserved = currentInitiatives.filter(p => {
                const cleanName = p.name?.replace?.(/\[\[(.*?)\]\]/g, '$1') || '';
                return !updates.has(cleanName);
            });

            // Combine preserved + new/updated (sorted by initiative, descending)
            const combined = [...preserved, ...Array.from(updates.values())];
            fm.initiatives = combined.sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

            // Adjust currentTurn if in combat and initiative order changed
            if (inCombat) {
                const currentTurn = fm.currentTurn || 0;
                const currentCombatant = currentInitiatives[currentTurn];
                if (currentCombatant) {
                    const newIndex = fm.initiatives.findIndex(c =>
                    c.name === currentCombatant.name && c.label === currentCombatant.label
                    );
                    if (newIndex !== -1) {
                        fm.currentTurn = newIndex;
                    }
                }
            }
        });

        // If in combat, log the additions
        if (inCombat && helpers) {
            const round = fm.round || 1;
            for (const [name, data] of updates) {
                const logEntry = helpers.formatLogEntry(round, name, "joined", "", data.initiative);
                await addCombatLog(app, file, logEntry);
            }
        }

        new Notice(`Updated ${updates.size} initiative(s)!`);

        // Refresh view - force re-render of dataview blocks
        setTimeout(() => {
            const leaf = app.workspace.getLeaf(false);
            if (leaf && leaf.view && leaf.view.file === file) {
                app.workspace.trigger('dataview:refresh-views');
            }
        }, 100);

    } catch (e) {
        new Notice("Error processing form. Check console for details.");
        console.error(e);
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
