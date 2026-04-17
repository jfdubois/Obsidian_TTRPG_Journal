import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { PATHS } from '../../lib/constants.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const { worldName, campaignName, folderPath } = core.requireCampaignContext(app);

        const encounterName = await ui.promptForText(quickAddApi, "Encounter Name:");
        if (!encounterName) return;

        const existingEncounters = app.vault.getFiles()
            .filter(f => f.parent?.path === folderPath && f.basename.match(/^E\d{4}_/))
            .sort();
        const lastNum = existingEncounters.length > 0
            ? parseInt(existingEncounters.at(-1).basename.match(/E(\d{4})/)[1])
            : 0;
        const nextNum = String(lastNum + 1).padStart(4, '0');
        const fileName = `E${nextNum}_${encounterName.replace(/\s+/g, '_')}.md`;

        const description = await ui.promptForText(quickAddApi, "Brief description:");

        const templatePath = `${PATHS.TEMPLATES_FOLDER}/encounter-template.md`;
        const templateFile = app.vault.getAbstractFileByPath(templatePath);
        if (!templateFile) {
            throw new Error("Encounter template not found at " + templatePath);
        }

        let content = await app.vault.read(templateFile);

        content = content.replace(/{{worldName}}/g, worldName);
        content = content.replace(/{{campaignName}}/g, campaignName);
        content = content.replace(/{{encounterName}}/g, encounterName);
        content = content.replace(/{{description}}/g, description || '');

        const filePath = `${folderPath}/${fileName}`;
        await app.vault.create(filePath, content);

        await core.openFile(app, filePath, true);

        ui.notifySuccess(`Created ${fileName}`);

    } catch (error) {
        core.handleActionError("createEncounter", error);
    }
}
