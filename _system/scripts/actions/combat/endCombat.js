import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import { ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const { file, fm } = core.validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);

        const confirmed = await ui.confirm(quickAddApi, "End this combat?", "Yes, end combat", "Continue fighting");
        if (!confirmed) return;

        await core.updateFrontmatter(app, file, (frontmatter) => {
            frontmatter.status = ENCOUNTER_STATUSES.COMPLETED;
            frontmatter.completedDate = new Date().toISOString();
        });

        await combat.logCombatAction(app, file, fm.round || 1, 'end', {});

        ui.refreshDataview(app);
        ui.notifySuccess("Combat ended!");

    } catch (error) {
        core.handleActionError("endCombat", error);
    }
}
