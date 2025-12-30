import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as monstersLib from '../../lib/monsters.js';
import { NOTE_TYPES } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, NOTE_TYPES.ENCOUNTER);
        core.requireNotCompleted(fm, "add monsters");

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

            const match = monsterName.match(/^(.+?)\s*\(([^)]+)\)$/);
            if (!match) {
                ui.notifyError("Invalid monster selection format");
                continue;
            }

            const monsterNameOnly = match[1];
            const sourceOnly = match[2];
            const selectedMonster = allMonsters.find(m => m.name === monsterNameOnly && m.source === sourceOnly);

            if (!selectedMonster) {
                ui.notifyError(`Monster "${monsterNameOnly}" from "${sourceOnly}" not found`);
                continue;
            }

            const qty = await ui.promptForPositiveNumber(quickAddApi, "Quantity:", 1);
            if (!qty) continue;

            const initiativeOptions = [
                { label: "Individual", value: "individual" },
                { label: "Group", value: "group" }
            ];
            const initiative = await ui.selectOption(quickAddApi, initiativeOptions, "Initiative mode:");
            if (!initiative) continue;

            const hpOptions = [
                { label: "Roll HP", value: "rolled" },
                { label: "Low HP", value: "low" },
                { label: "Average HP", value: "average" },
                { label: "Use Default", value: "default" }
            ];
            const hpMode = await ui.selectOption(quickAddApi, hpOptions, "HP mode:");
            if (!hpMode) continue;

            newMonsters.push({
                name: monsterNameOnly,
                source: selectedMonster?.source || 'Unknown',
                qty: qty,
                initiative: initiative,
                hpMode: hpMode,
                planned: fm.status !== "inCombat",
                addedToCombat: false,
                labels: [],
                addedInRound: null
            });

            building = await ui.confirm(quickAddApi, "Add another monster?", "Add another", "Finish");
        }

        if (newMonsters.length === 0) return;

        await core.updateFrontmatter(app, file, (frontmatter) => {
            frontmatter.monsters = [...(frontmatter.monsters || []), ...newMonsters];
        });

        ui.refreshDataview(app);
        ui.notifySuccess(`Added ${newMonsters.length} monster types!`);

    } catch (error) {
        core.handleActionError("addMonsters", error);
    }
}
