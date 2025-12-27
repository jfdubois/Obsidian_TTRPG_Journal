import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app } = context;

    try {
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);
        const initiatives = core.requireInitiatives(fm);

        const { nextTurn, nextRound, isNewRound } = combat.advanceTurn(fm);

        await core.updateFrontmatter(app, file, (frontmatter) => {
            frontmatter.currentTurn = nextTurn;
            frontmatter.round = nextRound;
        });

        if (isNewRound) {
            await combat.logCombatAction(app, file, nextRound, 'round', { round: nextRound });
        }

        const currentCombatant = initiatives[nextTurn];
        const combatantName = currentCombatant.label
            ? `${currentCombatant.name} (${currentCombatant.label})`
            : currentCombatant.name;

        ui.refreshDataview(app);
        ui.notifySuccess(`${combatantName}'s turn! (Round ${nextRound})`);

    } catch (error) {
        core.handleActionError("nextTurn", error);
    }
}
