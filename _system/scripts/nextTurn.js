module.exports = async (params) => {
    try {
        const { app } = params;
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

        const currentTurn = fm.currentTurn || 0;
        const currentRound = fm.round || 1;

        // Calculate next turn
        let nextTurn = currentTurn + 1;
        let nextRound = currentRound;

        // If we've gone through all combatants, reset to 0 and increment round
        if (nextTurn >= initiatives.length) {
            nextTurn = 0;
            nextRound = currentRound + 1;

            // Add round change to combat log
            await addCombatLog(app, file, currentRound, `🔄 **Round ${nextRound} begins!**`, null);
        }

        const currentCombatant = initiatives[nextTurn];
        const combatantName = currentCombatant.label
        ? `${currentCombatant.name} (${currentCombatant.label})`
        : currentCombatant.name;

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            fm.currentTurn = nextTurn;
            fm.round = nextRound;
        });

        // Refresh view - force re-render of dataview blocks
        setTimeout(() => {
            const leaf = app.workspace.getLeaf(false);
            if (leaf && leaf.view && leaf.view.file === file) {
                app.workspace.trigger('dataview:refresh-views');
            }
        }, 100);

        new Notice(`➤ ${combatantName}'s turn! (Round ${nextRound})`);

    } catch (error) {
        console.error("💥 nextTurn error:", error);
        new Notice(`❌ Error: ${error.message}`);
    }
}

async function addCombatLog(app, file, round, message, damageType) {
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

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const logEntry = `${message}\n`;

    content = content.substring(0, insertPoint) + logEntry + content.substring(insertPoint);
    await app.vault.modify(file, content);
}
