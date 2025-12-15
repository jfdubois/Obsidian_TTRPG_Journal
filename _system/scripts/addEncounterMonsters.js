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

    // ---------------------------------------------------
    // Load enabled sources from sources.md
    // ---------------------------------------------------
    const sourcesFile = app.vault.getAbstractFileByPath("_system/srd/sources.md");
    if (!sourcesFile) {
        new Notice("Error: sources.md not found in _system/srd/");
        return;
    }

    const sourcesContent = await app.vault.read(sourcesFile);
    const enabledSources = parseEnabledSources(sourcesContent);

    if (enabledSources.length === 0) {
        new Notice("No monster sources enabled in sources.md!");
        return;
    }

    // ---------------------------------------------------
    // Load bestiary index
    // ---------------------------------------------------
    const indexFile = app.vault.getAbstractFileByPath("_system/srd/5etools-src/data/bestiary/index.json");
    if (!indexFile) {
        new Notice("Error: bestiary index.json not found!");
        return;
    }

    const index = JSON.parse(await app.vault.read(indexFile));

    // ---------------------------------------------------
    // Load monsters from enabled sources
    // ---------------------------------------------------
    const allMonsters = [];
    for (const source of enabledSources) {
        const bestiaryFile = index[source];
        if (!bestiaryFile) continue;

        const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;
        const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

        if (bestiaryFileObj) {
            try {
                const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
                if (bestiaryData.monster) {
                    allMonsters.push(...bestiaryData.monster);
                }
            } catch (error) {
                console.error(`Error loading ${bestiaryPath}:`, error);
            }
        }
    }

    if (allMonsters.length === 0) {
        new Notice("No monsters found in enabled sources!");
        return;
    }

    let building = true;
    const newMonsters = [];

    while (building) {
        // ---------------------------------------------------
        // Select Monster
        // ---------------------------------------------------
        const monsterName = await suggester(
            item => item,
            allMonsters.map(m => `${m.name} (${m.source})`).sort(),
            true,
            "Select monster (ESC to finish):"
        );

        if (!monsterName) break;

        // Extract name from "name (source)" format
        const monsterNameOnly = monsterName.replace(/\s*\([^)]*\)$/, '');
        const selectedMonster = allMonsters.find(m => m.name === monsterNameOnly);

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
            name: monsterNameOnly,
            source: selectedMonster?.source || 'Unknown',
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

// ---------------------------------------------------
// Helper function to parse enabled sources from sources.md
// ---------------------------------------------------
function parseEnabledSources(content) {
    const enabledSources = [];
    const lines = content.split('\n');

    for (const line of lines) {
        // Look for lines with source codes and enabled status
        const match = line.match(/- \*\*([A-Z0-9-]+)\*\*.*:\s*`enabled:\s*(true|false)`/);
        if (match) {
            const source = match[1];
            const enabled = match[2] === 'true';
            if (enabled) {
                enabledSources.push(source);
            }
        }
    }

    return enabledSources;
}
