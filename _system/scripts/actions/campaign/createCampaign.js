import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { buildCampaignNote } from '../../builders/campaignBuilder.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const { worldName, role } = await resolveWorldSelection(app, quickAddApi);
        if (!worldName) return;

        const campaignName = await ui.promptForText(quickAddApi, "Campaign name:");
        if (!campaignName) return;

        const timelineNotes = await ui.promptForText(quickAddApi, "Timeline notes (optional):");
        const filePath = await createCampaignStructure(app, {
            worldName,
            campaignName,
            role,
            timelineNotes
        });

        await core.openFile(app, filePath, false);
        ui.notifySuccess(`Campaign "${campaignName}" created in "${worldName}"!`);
    } catch (error) {
        core.handleActionError("createCampaign", error);
    }
}

async function resolveWorldSelection(app, quickAddApi) {
    const context = tryGetWorldContext(app);
    if (context?.worldName && !context.campaignName) {
        return {
            worldName: context.worldName,
            role: getRoleForWorld(app, context.worldName)
        };
    }

    const worldName = await promptForWorld(app, quickAddApi);
    if (!worldName) {
        return { worldName: null, role: null };
    }

    return {
        worldName,
        role: getRoleForWorld(app, worldName)
    };
}

function tryGetWorldContext(app) {
    try {
        return core.getWorldContext(app);
    } catch {
        return null;
    }
}

async function promptForWorld(app, quickAddApi) {
    const worldsRoot = app.vault.getAbstractFileByPath('Worlds');
    const worldOptions = (worldsRoot?.children || [])
        .filter(child => child?.children && child.name !== "_Shared")
        .map(child => ({ label: child.name, value: child.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

    if (worldOptions.length === 0) {
        throw new Error("No worlds found. Create a world first.");
    }

    return await ui.selectOption(quickAddApi, worldOptions, "Select world:");
}

function getRoleForWorld(app, worldName) {
    try {
        const worldFile = core.getFileByPath(app, `${core.buildWorldPath(worldName)}/World.md`);
        const frontmatter = core.getFrontmatter(app, worldFile);
        return frontmatter.role || "player";
    } catch {
        return "player";
    }
}

export async function createCampaignStructure(app, options) {
    const {
        worldName,
        campaignName,
        role = "player",
        timelineNotes = ""
    } = options;

    const campaignPath = core.buildCampaignPath(worldName, campaignName);
    const filePath = `${campaignPath}/Campaign.md`;

    if (app.vault.getAbstractFileByPath(filePath)) {
        throw new Error(`Campaign "${campaignName}" already exists in "${worldName}"`);
    }

    await app.vault.createFolder(campaignPath).catch(() => {});
    await app.vault.createFolder(`${campaignPath}/Ressources`).catch(() => {});

    const content = buildCampaignNote({
        worldName,
        campaignName,
        role,
        timelineNotes,
        campaignPath
    });

    await app.vault.create(filePath, content);
    return filePath;
}
