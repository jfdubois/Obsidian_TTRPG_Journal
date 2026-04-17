import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { NOTE_TYPES } from '../../lib/constants.js';
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

        let fileContent = buildWorldFrontmatter(worldName, role);
        fileContent += buildWorldHeader(worldName);
        fileContent += buildActionsSection();
        fileContent += buildCampaignsSection(folderPath);
        fileContent += buildWorldKnowledgeSection(folderPath);

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

function buildWorldFrontmatter(worldName, role) {
    let content = "---\n";
    content += `type: ${NOTE_TYPES.WORLD}\n`;
    content += `world: ${worldName}\n`;
    content += `status: active\n`;
    content += `role: ${role}\n`;
    content += "system: \n";
    content += 'banner: "![[world-banner.jpg]]"\n';
    content += "---\n";
    return content;
}

function buildWorldHeader(worldName) {
    let content = `# The world of ${worldName}\n\n`;
    content += "## World Notes\n\n";
    return content;
}

function buildActionsSection() {
    let content = "### Actions\n\n";
    content += "```button\n";
    content += "name Add Campaign\n";
    content += "type command\n";
    content += "action QuickAdd: create-campaign\n";
    content += "```\n\n";
    return content;
}

function buildCampaignsSection(folderPath) {
    let content = "### Campaigns\n\n";
    content += "```dataview\n";
    content += 'TABLE WITHOUT ID link(file.path, campaign) as "Campaign", timelineNotes as "Timeline", status as "Status"\n';
    content += `FROM "${folderPath}"\n`;
    content += 'WHERE type = "campaign"\n';
    content += "SORT campaign ASC\n";
    content += "```\n\n";
    return content;
}

function buildWorldKnowledgeSection(folderPath) {
    let content = "### World knowledge\n\n";
    content += "```dataview\n";
    content += 'TABLE file.link as "Note", type as "Type", description as "Description"\n';
    content += `FROM "${folderPath}"\n`;
    content += `WHERE file.folder = "${folderPath}" AND file.name != "World"\n`;
    content += "SORT file.name ASC\n";
    content += "```\n";
    return content;
}
