import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { buildWorldNote } from '../../builders/worldBuilder.js';
import { createCampaignStructure } from '../campaign/createCampaign.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const worldName = await ui.promptForText(quickAddApi, "Enter World name:");
        if (!worldName) return;

        const roleOptions = [
            { label: "Player", value: "player" },
            { label: "Dungeon Master", value: "dm" }
        ];
        const role = await ui.selectOption(quickAddApi, roleOptions, "Select your role in this world:");
        if (!role) return;

        const initialCampaignName = await ui.promptForText(quickAddApi, "Initial campaign name:", worldName);
        if (!initialCampaignName) return;

        const folderPath = core.buildWorldPath(worldName);
        const worldFilePath = `${folderPath}/World.md`;

        if (app.vault.getAbstractFileByPath(worldFilePath)) {
            throw new Error(`World "${worldName}" already exists`);
        }

        await app.vault.createFolder(folderPath).catch(() => {});
        await app.vault.createFolder(`${folderPath}/Ressources`).catch(() => {});

        const fileContent = buildWorldNote({
            worldName,
            role,
            folderPath
        });

        await app.vault.create(worldFilePath, fileContent);

        const campaignFilePath = await createCampaignStructure(app, {
            worldName,
            campaignName: initialCampaignName,
            role
        });

        await core.openFile(app, campaignFilePath, false);
        ui.notifySuccess(`World "${worldName}" created with campaign "${initialCampaignName}"!`);
    } catch (error) {
        core.handleActionError("createWorld", error);
    }
}
