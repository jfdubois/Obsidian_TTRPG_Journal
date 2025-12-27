import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);
        const initiatives = core.requireInitiatives(fm);

        const source = await ui.promptForSource(quickAddApi, initiatives, "attacking");
        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target:");
        if (!target) return;

        const damageAmount = await ui.promptForPositiveNumber(quickAddApi, "Damage amount:", 1);
        if (!damageAmount) return;

        const damageTypeLabels = ui.DAMAGE_TYPES.map(t => t.label);
        const damageTypeValues = ui.DAMAGE_TYPES.map(t => t.value);
        const damageType = await ui.selectFromList(quickAddApi, damageTypeLabels, damageTypeValues, "Damage type:");
        if (!damageType) return;

        const result = combat.applyDamageToTarget(target, damageAmount);

        if (result.skipped) {
            await combat.logCombatAction(app, file, fm.round || 1, 'damage', {
                source: source,
                target: target.label || core.stripWikiLinks(target.name),
                amount: damageAmount,
                damageType: damageType,
                oldHp: undefined,
                newHp: undefined,
                maxHp: undefined
            });
            ui.refreshDataview(app);
            ui.notifyWarning(`${target.label || target.name} has no HP tracked - damage not applied`);
        } else {
            await core.updateFrontmatter(app, file, (frontmatter) => {
                const initiativeEntry = frontmatter.initiatives.find(i => i.label === target.label);
                if (initiativeEntry) {
                    initiativeEntry.currentHp = result.newHp;
                    initiativeEntry.status = result.newStatus;
                }
            });

            await combat.logCombatAction(app, file, fm.round || 1, 'damage', {
                source: source,
                target: target.label || core.stripWikiLinks(target.name),
                amount: damageAmount,
                damageType: damageType,
                oldHp: result.oldHp,
                newHp: result.newHp,
                maxHp: target.maxHp
            });

            ui.refreshDataview(app);
            ui.notifySuccess(`${target.label || target.name} takes ${damageAmount} ${damageType} damage!`);
        }

    } catch (error) {
        core.handleActionError("applyDamage", error);
    }
}
