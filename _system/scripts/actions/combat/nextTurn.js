/**
 * Next Turn Action
 * Advances to the next combatant's turn
 */

import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';

export async function run(context) {
    const { app } = context;

    try {

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        const initiatives = fm.initiatives || [];
        if (initiatives.length === 0) {
            ui.notifyWarning("No combatants in initiative!");
            return;
        }

        const { nextTurn, nextRound, isNewRound } = combat.advanceTurn(fm);

        await core.updateFrontmatter(app, file, fm => {
            fm.currentTurn = nextTurn;
            fm.round = nextRound;
        });

        if (isNewRound) {
            let content = await core.readFile(app, file);
            const logEntry = combat.formatLogEntry(nextRound, 'round', { round: nextRound });
            content = combat.appendToLog(content, logEntry);
            await core.writeFile(app, file, content);
        }

        const currentCombatant = initiatives[nextTurn];
        const combatantName = currentCombatant.label
            ? `${currentCombatant.name} (${currentCombatant.label})`
            : currentCombatant.name;

        setTimeout(() => {
            app.workspace.trigger('dataview:refresh-views');
        }, 100);

        ui.notifySuccess(`${combatantName}'s turn! (Round ${nextRound})`);

    } catch (error) {
        console.error("nextTurn error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
