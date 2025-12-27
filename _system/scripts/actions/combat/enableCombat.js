import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import * as monsters from '../../lib/monsters.js';
import { NOTE_TYPES, ENCOUNTER_STATUSES } from '../../lib/constants.js';

export async function run(context) {
    const { app } = context;

    try {
        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, NOTE_TYPES.ENCOUNTER);
        core.requireNotCompleted(fm, "start combat");

        if (fm.status === ENCOUNTER_STATUSES.IN_COMBAT) {
            ui.notifyWarning("Combat already in progress!");
            return;
        }

        core.requireStatus(fm, [ENCOUNTER_STATUSES.PLANNED]);

        const monsterDataMap = await monsters.loadMonsterDataFromSRD(app, fm.monsters || []);

        const initiativeData = [];
        let labelCounter = 0;

        for (const entry of fm.monsters || []) {
            const monsterData = monsterDataMap.get(entry.name);
            if (!monsterData) {
                ui.notifyWarning(`Monster not found: ${entry.name}`);
                continue;
            }

            const entries = monsters.processMonsterToCombat(entry, monsterData, labelCounter, true);
            initiativeData.push(...entries);
            labelCounter += entry.qty;
        }

        const existingPlayers = (fm.initiatives || []).filter(p => p.type === "character");
        initiativeData.push(...existingPlayers);

        const sortedInitiatives = combat.sortInitiatives(initiativeData);

        await core.updateFrontmatter(app, file, (frontmatter) => {
            frontmatter.status = ENCOUNTER_STATUSES.IN_COMBAT;
            frontmatter.round = frontmatter.round || 1;
            frontmatter.currentTurn = 0;
            frontmatter.initiatives = sortedInitiatives;
        });

        await combat.logCombatAction(app, file, 1, 'round', { round: 1 });

        ui.refreshDataview(app);
        ui.notifySuccess("Combat started!");

    } catch (error) {
        core.handleActionError("enableCombat", error);
    }
}
