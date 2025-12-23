/**
 * Players Initiatives Action
 * Add or update player character initiatives using ModalForms
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

        const world = fm.world;
        if (!world) {
            ui.notifyWarning("No world specified in encounter note!");
            return;
        }

        const result = await ui.showForm(app, 'addPlayerInitiatives', {
            values: {
                entityWorld: world
            }
        });

        if (result.status === "cancelled") return;

        const updates = new Map();

        for (let i = 1; i <= 8; i++) {
            const name = result.data[`player${i}`]?.trim();
            const initStr = result.data[`initiative${i}`]?.toString().trim();

            if (!name || !initStr || initStr === "") continue;

            const initiative = parseInt(initStr);
            if (isNaN(initiative)) {
                console.warn(`Invalid initiative for "${name}": ${initStr}`);
                continue;
            }

            updates.set(name, {
                name: `[[${name}]]`,
                type: "character",
                initiative: initiative
            });
        }

        if (updates.size === 0) {
            ui.notifyWarning("No valid initiatives entered!");
            return;
        }

        await core.updateFrontmatter(app, file, fm => {
            const currentInitiatives = fm.initiatives || [];

            const preserved = currentInitiatives.filter(p => {
                const cleanName = p.name?.replace?.(/\[\[(.*?)\]\]/g, '$1') || '';
                return !updates.has(cleanName);
            });

            fm.initiatives = combat.sortInitiatives([...preserved, ...Array.from(updates.values())]);
        });

        ui.notifySuccess(`Updated ${updates.size} initiative(s)!`);

    } catch (error) {
        console.error("playersInitiatives error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
