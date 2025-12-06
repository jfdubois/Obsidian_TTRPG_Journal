module.exports = async (params) => {
    try {
        const { app, quickAddApi: { suggester } } = params;
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

        // Confirm ending combat
        const confirm = await suggester(
            item => item.label,
            [
                { label: "Yes, end combat", value: true },
                { label: "No, cancel", value: false }
            ],
            false,
            "End combat and mark encounter as completed?"
        );

        if (!confirm || !confirm.value) {
            new Notice("Cancelled.");
            return;
        }

        const finalRound = fm.round || 1;

        // Update frontmatter
        await app.fileManager.processFrontMatter(file, fm => {
            fm.status = "completed";
            // Keep initiatives and round for reference
        });

        // Add final log entry
        const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const logEntry = `- **Combat Ended** [${timestamp}] - ✅ Encounter completed after ${finalRound} rounds`;
        await addCombatLog(app, file, logEntry);

        // Update the Initiative section to show completion
        let content = await app.vault.read(file);
        content = content.replace(
            /## Initiative[\s\S]*?(?=## Combat Log|$)/,
                                  `## Initiative\n\n**Status:** ✅ Completed | **Final Round:** ${finalRound}\n\n_Combat has ended. Review the combat log below for details._\n\n`
        );
        await app.vault.modify(file, content);

        // Refresh view - force re-render of dataview blocks
        setTimeout(() => {
            const leaf = app.workspace.getLeaf(false);
            if (leaf && leaf.view && leaf.view.file === file) {
                app.workspace.trigger('dataview:refresh-views');
            }
        }, 100);

        new Notice(`✅ Combat ended after ${finalRound} rounds!`);

    } catch (error) {
        console.error("💥 endCombat error:", error);
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
