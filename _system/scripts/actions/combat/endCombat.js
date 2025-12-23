/**
 * End Combat Action
 * Ends an active combat encounter and logs final state
 */

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const core = await engine.importJs('_system/scripts/lib/core.js');
        const ui = await engine.importJs('_system/scripts/lib/ui.js');
        const combat = await engine.importJs('_system/scripts/lib/combat.js');

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        const confirmOptions = [
            { label: "Yes, end combat", value: true },
            { label: "Continue fighting", value: false }
        ];
        const confirm = await ui.selectFromList(
            quickAddApi,
            confirmOptions.map(o => o.label),
            confirmOptions,
            "End this combat?"
        );

        if (!confirm || !confirm.value) return;

        await core.updateFrontmatter(app, file, fm => {
            fm.status = "completed";
            fm.completedDate = new Date().toISOString();
        });

        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'end', {});
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess("Combat ended!");

    } catch (error) {
        console.error("endCombat error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
