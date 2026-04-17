import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { NOTE_TYPES } from '../../lib/constants.js';

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

    let content = buildCampaignFrontmatter(worldName, campaignName, role, timelineNotes);
    content += buildCampaignHeader(worldName, campaignName);
    content += buildPlayersSection();
    content += buildActionsSection(role);
    content += buildSessionsSection(campaignPath);
    content += buildCampaignKnowledgeSection(worldName, campaignName);

    if (role === "dm") {
        content += buildDmEncountersSection(campaignPath);
    }

    await app.vault.create(filePath, content);
    return filePath;
}

function buildCampaignFrontmatter(worldName, campaignName, role, timelineNotes) {
    let content = "---\n";
    content += `type: ${NOTE_TYPES.CAMPAIGN}\n`;
    content += `world: ${worldName}\n`;
    content += `campaign: ${campaignName}\n`;
    content += `status: active\n`;
    content += `role: ${role}\n`;
    content += `timelineNotes: ${timelineNotes ? JSON.stringify(timelineNotes) : '""'}\n`;
    content += "---\n";
    return content;
}

function buildCampaignHeader(worldName, campaignName) {
    let content = `# ${campaignName}\n\n`;
    content += `**World:** [[Worlds/${worldName}/World|${worldName}]]\n\n`;
    content += `**Timeline notes:** \`= this.timelineNotes\`\n\n`;
    content += `**Status:** \`= this.status\`\n\n`;
    content += `## Campaign Notes\n\n`;
    return content;
}

function buildPlayersSection() {
    let content = `### Players\n`;
    content += "```dataviewjs\n";
    content += `(async () => {\n`;
    content += `  const activeFile = app.workspace.getActiveFile();\n`;
    content += `  if (!activeFile) return;\n`;
    content += `  const folder = activeFile.parent.path;\n`;
    content += `  const chars = dv.pages(\`"\${folder}"\`)\n`;
    content += `    .where(p => p.type === "character" && p.playerName)\n`;
    content += `    .sort(p => p.playerName, "asc");\n\n`;
    content += `  const byPlayer = {};\n`;
    content += `  for (const c of chars) {\n`;
    content += `    if (!byPlayer[c.playerName]) byPlayer[c.playerName] = [];\n`;
    content += `    byPlayer[c.playerName].push(c);\n`;
    content += `  }\n\n`;
    content += `  for (const [player, list] of Object.entries(byPlayer).sort()) {\n`;
    content += `    dv.paragraph(\`**\${player}**\`);\n`;
    content += `    for (const c of list) {\n`;
    content += `      const info = \`\${c.file.link} · \${c.race ?? "?"} · \${c.class ?? "?"}\`;\n`;
    content += `      const line = c.alive === false\n`;
    content += `        ? \`- DEAD - ~~\${c.file.name} · \${c.race ?? "?"} · \${c.class ?? "?"}~~\`\n`;
    content += `        : \`- \${info}\`;\n`;
    content += `      dv.paragraph(line);\n`;
    content += `    }\n`;
    content += `  }\n`;
    content += `})();\n`;
    content += "```\n\n";
    return content;
}

function buildActionsSection(role) {
    let content = `### Actions\n\n`;

    content += "```button\n";
    content += "name Add Session\n";
    content += "type command\n";
    content += "action QuickAdd: create-session\n";
    content += "```\n";

    content += "```button\n";
    content += "name Add Entity\n";
    content += "type command\n";
    content += "action Templater: Create new-entity\n";
    content += "```\n";

    if (role === "dm") {
        content += "```button\n";
        content += "name Create Encounter\n";
        content += "type command\n";
        content += "action QuickAdd: create-encounter\n";
        content += "```\n";
    }

    content += "\n";
    return content;
}

function buildSessionsSection(campaignPath) {
    let content = `### Sessions\n\n`;
    content += "```dataview\n";
    content += `TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary", location as "Location"\n`;
    content += `FROM "${campaignPath}"\n`;
    content += `WHERE type = "session"\n`;
    content += `SORT file.name ASC\n`;
    content += "```\n\n";
    return content;
}

function buildCampaignKnowledgeSection(worldName, campaignName) {
    let content = `### Campaign knowledge\n\n`;
    content += "```base\n";
    content += "views:\n";
    content += "  - type: table\n";
    content += "    name: CampaignView\n";
    content += "    filters:\n";
    content += "      and:\n";
    content += `        - world == "${worldName}"\n`;
    content += `        - campaign == "${campaignName}"\n`;
    content += `        - file.name != "Campaign"\n`;
    content += `        - '!type.contains("session")'\n`;
    content += `        - '!type.contains("encounter")'\n`;
    content += "    order:\n";
    content += "      - file.name\n";
    content += "      - plane\n";
    content += "      - region\n";
    content += "      - location\n";
    content += "      - type\n";
    content += "      - description\n";
    content += "    columnSize:\n";
    content += "      note.type: 93\n";
    content += "```\n";
    return content;
}

function buildDmEncountersSection(campaignPath) {
    let content = `\n### DM: Encounters\n\n`;

    content += "#### Active Encounters\n";
    content += "```dataview\n";
    content += "TABLE\n";
    content += '  session as "Session",\n';
    content += '  location as "Location",\n';
    content += '  length(monsters) as "Types"\n';
    content += `FROM "${campaignPath}"\n`;
    content += 'WHERE type = "encounter" AND status != "completed"\n';
    content += "SORT file.ctime DESC\n";
    content += "```\n\n";

    content += "#### Recent Completed\n";
    content += "```dataview\n";
    content += "TABLE\n";
    content += '  session as "Session",\n';
    content += '  location as "Location",\n';
    content += '  date-completed as "Date"\n';
    content += `FROM "${campaignPath}"\n`;
    content += 'WHERE type = "encounter" AND status = "completed"\n';
    content += "SORT date-completed DESC\n";
    content += "LIMIT 5\n";
    content += "```\n";

    return content;
}
