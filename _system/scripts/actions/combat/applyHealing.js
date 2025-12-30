import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);
        const initiatives = core.requireInitiatives(fm);

        const source = await ui.promptForSource(quickAddApi, initiatives, "healing", fm.currentTurn);
        const target = await ui.promptForTarget(quickAddApi, initiatives, "Select target to heal:", fm.currentTurn);
        if (!target) return;

        const healing = await ui.promptForPositiveNumber(quickAddApi, "Healing amount:", 1);
        if (!healing) return;

        const result = combat.applyHealingToTarget(target, healing);

        await core.updateFrontmatter(app, file, (frontmatter) => {
            if (!result.skipped) {
                const initiativeEntry = frontmatter.initiatives.find(i => i.label === target.label);
                if (initiativeEntry) {
                    initiativeEntry.currentHp = result.newHp;
                    initiativeEntry.status = result.newStatus;
                }
            }
            combat.trackHealing(
                frontmatter.combatStats,
                source,
                target.label || core.stripWikiLinks(target.name),
                healing
            );
        });

        if (result.skipped) {
            await combat.logCombatAction(app, file, fm.round || 1, 'heal', {
                source: source,
                target: target.label || core.stripWikiLinks(target.name),
                amount: healing,
                oldHp: undefined,
                newHp: undefined,
                maxHp: undefined
            });
            ui.refreshDataview(app);
            ui.notifyWarning(`${target.label || target.name} has no HP tracked - healing not applied`);
        } else {

            await combat.logCombatAction(app, file, fm.round || 1, 'heal', {
                source: source,
                target: target.label || core.stripWikiLinks(target.name),
                amount: healing,
                oldHp: result.oldHp,
                newHp: result.newHp,
                maxHp: target.maxHp
            });

            ui.refreshDataview(app);
            ui.notifySuccess(`${target.label || target.name} healed for ${healing} HP!`);
        }

    } catch (error) {
        core.handleActionError("applyHealing", error);
    }
}
