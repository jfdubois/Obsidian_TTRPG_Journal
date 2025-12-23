/**
 * Enable Combat Action
 * Transitions a planned encounter to active combat
 */

import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import * as monsters from '../../lib/monsters.js';

export async function run(context) {
    const { app } = context;

    try {

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');

        if (fm.status === "completed") {
            throw new Error("Cannot start encounter when status is completed");
        }

        if (fm.status === "inCombat") {
            ui.notifyWarning("Combat already in progress!");
            return;
        }

        core.requireStatus(fm, ['planned']);

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

        await core.updateFrontmatter(app, file, fm => {
            fm.status = "inCombat";
            fm.round = fm.round || 1;
            fm.currentTurn = 0;
            fm.initiatives = sortedInitiatives;
        });

        setTimeout(() => {
            app.workspace.trigger('dataview:refresh-views');
        }, 200);

        ui.notifySuccess("Combat started!");

    } catch (error) {
        console.error("enableCombat error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
