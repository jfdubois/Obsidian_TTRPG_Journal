/**
 * Add Monsters Action
 * Add monsters to a planned encounter from SRD
 */

import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as monstersLib from '../../lib/monsters.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');

        if (fm.status === "completed") {
            ui.notifyWarning("Cannot add monsters to completed encounter!");
            return;
        }

        const allMonsters = await monstersLib.loadAllMonsters(app);

        if (allMonsters.length === 0) {
            ui.notifyWarning("No monsters found in enabled sources!");
            return;
        }

        let building = true;
        const newMonsters = [];

        while (building) {
            const monsterChoices = allMonsters.map(m => `${m.name} (${m.source})`).sort();
            const monsterName = await ui.selectFromList(
                quickAddApi,
                monsterChoices,
                monsterChoices,
                "Select monster (ESC to finish):"
            );

            if (!monsterName) break;

            const monsterNameOnly = monsterName.replace(/\s*\([^)]*\)$/, '');
            const selectedMonster = allMonsters.find(m => m.name === monsterNameOnly);

            const qty = await ui.promptForNumber(quickAddApi, "Quantity:", 1) || 1;

            const initiativeOptions = [
                { label: "Individual", value: "individual" },
                { label: "Group", value: "group" }
            ];
            const initiativeType = await ui.selectFromList(
                quickAddApi,
                initiativeOptions.map(o => o.label),
                initiativeOptions,
                "Initiative mode:"
            );
            const initiative = initiativeType?.value ?? "individual";

            const hpOptions = [
                { label: "Roll HP", value: "rolled" },
                { label: "Low HP", value: "low" },
                { label: "Average HP", value: "average" },
                { label: "Use Default", value: "default" }
            ];
            const hpModeType = await ui.selectFromList(
                quickAddApi,
                hpOptions.map(o => o.label),
                hpOptions,
                "HP mode:"
            );
            const hpMode = hpModeType?.value ?? "default";

            newMonsters.push({
                name: monsterNameOnly,
                source: selectedMonster?.source || 'Unknown',
                qty: qty,
                initiative: initiative,
                hpMode: hpMode,
                planned: fm.status !== "inCombat",
                labels: []
            });

            const continueOptions = [
                { label: "Add another", value: true },
                { label: "Finish", value: false }
            ];
            const cont = await ui.selectFromList(
                quickAddApi,
                continueOptions.map(o => o.label),
                continueOptions,
                "Continue?"
            );

            building = cont?.value ?? false;
        }

        if (newMonsters.length === 0) return;

        await core.updateFrontmatter(app, file, fm => {
            fm.monsters = [...(fm.monsters || []), ...newMonsters];
        });

        ui.notifySuccess(`Added ${newMonsters.length} monster types!`);

    } catch (error) {
        console.error("addMonsters error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
