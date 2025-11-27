module.exports = async function addEncounterMonsters(params) {
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

    const monstersFile = app.vault.getAbstractFileByPath("_system/data/monsters.json");
    if (!monstersFile) {
        new Notice("Error: monsters.json not found in _system/data/");
        return;
    }

    const monsters = JSON.parse(await app.vault.read(monstersFile));
    let building = true;
    const newMonsters = [];

    while (building) {
        // ---------------------------------------------------
        // Select Monster
        // ---------------------------------------------------
        const monsterName = await suggester(
            item => item,
            monsters.map(m => m.name).sort(),
                                            true,
                                            "Select monster (ESC to finish):"
        );

        if (!monsterName) break;

        // ---------------------------------------------------
        // Quantity
        // ---------------------------------------------------
        const qtyStr = await inputPrompt("Quantity:", "1");
        const qty = parseInt(qtyStr) || 1;

        // ---------------------------------------------------
        // Initiative Mode
        // ---------------------------------------------------
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

        // ---------------------------------------------------
        // HP Mode
        // ---------------------------------------------------
        const hpModeType = await suggester(
            item => item.label,
            [
                { label: "Roll HP", value: "rolled" },
                { label: "Low HP", value: "low" },
                { label: "Average HP", value: "average" },
                { label: "Use Default", value: "default" }
            ],
            false,
            "HP mode:"
        );
        const hpMode = hpModeType?.value ?? "default";

        // ---------------------------------------------------
        // Push to temporary monster list
        // ---------------------------------------------------
        newMonsters.push({
            name: monsterName,
            qty: qty,
            initiative: initiative,
            hpMode: hpMode,
            labels: []
        });

        // ---------------------------------------------------
        // Continue / Finish
        // ---------------------------------------------------
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

    // ---------------------------------------------------
    // Append monsters to frontmatter only
    // ---------------------------------------------------
    await app.fileManager.processFrontMatter(file, fm => {
        fm.monsters = [...(fm.monsters || []), ...newMonsters];
    });

    new Notice(`Added ${newMonsters.length} monster types!`);
};
