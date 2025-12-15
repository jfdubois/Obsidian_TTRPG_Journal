module.exports = async function addPlayerInitiatives(params) {
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

    // Get characters for this world
    const characters = app.vault.getFiles()
    .filter(f => f.path.includes(`Worlds/${world}`) && f.frontmatter?.type === "character")
    .sort((a, b) => a.basename.localeCompare(b.basename));

    // Build pre-filled values (FIX: strip wikilinks for comparison)
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

    try {
        const result = await modalForm.openForm("addPlayerInitiatives", {
            values: {
                entityWorld: currentWorld
            }
        });
        if (result.status === "cancelled") return;

        // Parse results: collect all filled entries (FIX: more robust validation)
        const updates = new Map(); // Use Map to track by name and avoid duplicates

        for (let i = 1; i <= 8; i++) {
            const name = result.data[`player${i}`]?.trim();
            const initStr = result.data[`initiative${i}`]?.toString().trim();

            // Skip if name is empty OR initiative is empty/invalid
            if (!name || !initStr || initStr === "") {
                continue;
            }

            const initiative = parseInt(initStr);
            if (isNaN(initiative)) {
                console.warn(`Invalid initiative for "${name}": ${initStr}`);
                continue;
            }

            // Store update keyed by name (overwrites if same name appears twice)
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

        // Update frontmatter: merge with existing (FIX: append/update instead of replace)
        await app.fileManager.processFrontMatter(file, fm => {
            const currentInitiatives = fm.initiatives || [];

            // Keep existing initiatives that aren't being updated
            const preserved = currentInitiatives.filter(p => {
                const cleanName = p.name?.replace?.(/\[\[(.*?)\]\]/g, '$1') || '';
                return !updates.has(cleanName);
            });

            // Combine preserved + new/updated (sorted by initiative, descending)
            fm.initiatives = [...preserved, ...Array.from(updates.values())]
            .sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
        });

        new Notice(`Updated ${updates.size} initiative(s)!`);

        // Refresh view if in combat
        if (fm.status === "inCombat") {
            const activeView = app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView) {
                app.workspace.trigger('file-open', activeView.file);
            }
        }

    } catch (e) {
        new Notice("Error processing form. Check console for details.");
        console.error(e);
    }
};
