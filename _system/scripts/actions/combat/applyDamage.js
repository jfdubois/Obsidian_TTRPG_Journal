/**
 * Apply Damage Action
 * Applies damage to a target in combat
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

        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target:");
        if (!target) return;

        const { displayChoices: sourceChoices, values: sourceValues } = ui.buildSourceChoices(initiatives);
        const source = await ui.selectFromList(quickAddApi, sourceChoices, sourceValues, "Who is attacking?");
        if (!source) return;

        const damageAmount = await ui.promptForNumber(quickAddApi, "Damage amount:");
        if (!damageAmount || damageAmount < 1) {
            ui.notifyWarning("Invalid amount!");
            return;
        }

        const damageTypeLabels = ui.DAMAGE_TYPES.map(t => t.label);
        const damageTypeValues = ui.DAMAGE_TYPES.map(t => t.value);
        const damageType = await ui.selectFromList(quickAddApi, damageTypeLabels, damageTypeValues, "Damage type:");
        if (!damageType) return;

        const { oldHp, newHp } = combat.applyDamageToTarget(target, damageAmount);

        await core.updateFrontmatter(app, file, fm => {
            fm.initiatives = initiatives;
        });

        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'damage', {
            source: source,
            target: target.name,
            amount: damageAmount,
            damageType: damageType,
            oldHp: oldHp,
            newHp: newHp,
            maxHp: target.maxHp
        });
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess(`${target.name} took ${damageAmount} ${damageType} damage!`);

    } catch (error) {
        console.error("applyDamage error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
