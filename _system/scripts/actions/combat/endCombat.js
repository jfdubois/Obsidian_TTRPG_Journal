/**
 * End Combat Action
 * Ends an active combat encounter and logs final state
 */

import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {

        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, 'encounter');
        core.requireStatus(fm, ['inCombat']);

        const confirmOptions = [
            { label: "Yes, end combat", value: true },
            { label: "Continue fighting", value: false }
        ];
        const confirm = await ui.selectFromList(
            quickAddApi,
            confirmOptions.map(o => o.label),
            confirmOptions,
            "End this combat?"
        );

        if (!confirm || !confirm.value) return;

        await core.updateFrontmatter(app, file, fm => {
            fm.status = "completed";
            fm.completedDate = new Date().toISOString();
        });

        let content = await core.readFile(app, file);
        const logEntry = combat.formatLogEntry(fm.round || 1, 'end', {});
        content = combat.appendToLog(content, logEntry);
        await core.writeFile(app, file, content);

        ui.notifySuccess("Combat ended!");

    } catch (error) {
        console.error("endCombat error:", error);
        new Notice(`Error: ${error.message}`);
    }
}
