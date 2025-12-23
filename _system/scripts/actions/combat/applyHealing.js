/**
 * Apply Healing Action
 * Heals a target in combat
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

        const initiatives = fm.initiatives || [];

        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target to heal:");
        if (!target) return;

        const { displayChoices: sourceChoices, values: sourceValues } = ui.buildSourceChoices(initiatives);
        const source = await ui.selectFromList(quickAddApi, sourceChoices, sourceValues, "Who is healing?");
        if (!source) return;

        const healAmount = await ui.promptForNumber(quickAddApi, "Heal amount:");
        if (!healAmount || healAmount < 1) {
            ui.notifyWarning("Invalid amount!");
            return;
        }

        const { oldHp, newHp } = combat.applyHealingToTarget(target, healAmount);

        await core.updateFrontmatter(app, file, fm => {
            fm.initiatives = initiatives;
        });

        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'heal', {
            source: source,
            target: target.name,
            amount: healAmount,
            oldHp: oldHp,
            newHp: newHp,
            maxHp: target.maxHp
        });
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess(`${target.name} healed ${healAmount} HP!`);

    } catch (error) {
        console.error("applyHealing error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
