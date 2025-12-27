import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { PATHS } from '../../lib/constants.js';

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

        const folderPath = `${PATHS.WORLDS_FOLDER}/${worldName}`;
        await app.vault.createFolder(folderPath).catch(() => {});
        await app.vault.createFolder(`${folderPath}/Ressources`).catch(() => {});

        let fileContent = buildWorldFrontmatter(worldName, role);
        fileContent += buildWorldHeader(worldName);
        fileContent += buildPlayersSection();
        fileContent += buildActionsSection(role);
        fileContent += buildSessionsSection(folderPath);
        fileContent += buildWorldKnowledgeSection(worldName);

        if (role === "dm") {
            fileContent += buildDmEncountersSection(folderPath);
        }

        const filePath = `${folderPath}/World.md`;
        await app.vault.create(filePath, fileContent);

        await core.openFile(app, filePath, false);

        ui.notifySuccess(`World "${worldName}" created successfully!`);

    } catch (error) {
        core.handleActionError("createWorld", error);
    }
}

function buildWorldFrontmatter(worldName, role) {
    let content = "---\n";
    content += `world: ${worldName}\n`;
    content += `campaign: ${worldName}\n`;
    content += `status: active\n`;
    content += `role: ${role}\n`;
    content += `type: world\n`;
    content += `system: \n`;
    content += `banner: "![[world-banner.jpg]]"\n`;
    content += "---\n";
    return content;
}

function buildWorldHeader(worldName) {
    return `# The world of ${worldName}\n\n`;
}

function buildPlayersSection() {
    let content = `### Players\n\n`;
    content += `- Player name as Character name\n\n`;
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
        content += "```\n\n";
    }

    return content;
}

function buildSessionsSection(folderPath) {
    let content = `### Sessions\n\n`;
    content += "```dataview\n";
    content += `TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary"\n`;
    content += `FROM "${folderPath}"\n`;
    content += `WHERE contains(type, "session")\n`;
    content += `SORT file.name ASC\n`;
    content += "```\n\n";
    return content;
}

function buildWorldKnowledgeSection(worldName) {
    let content = `### World knowledge\n\n`;
    content += "```base\n";
    content += `views:\n`;
    content += `  - type: table\n`;
    content += `    name: WorldView\n`;
    content += `    filters:\n`;
    content += `      and:\n`;
    content += `        - world == "${worldName}"\n`;
    content += `        - file.name != "World"\n`;
    content += `        - '!type.contains("session")'\n`;
    content += `    order:\n`;
    content += `      - file.name\n`;
    content += `      - plane\n`;
    content += `      - region\n`;
    content += `      - location\n`;
    content += `      - type\n`;
    content += `      - description\n`;
    content += `    columnSize:\n`;
    content += `      note.type: 93\n`;
    content += "```\n";
    return content;
}

function buildDmEncountersSection(folderPath) {
    let content = `\n### DM: Encounters\n\n`;

    content += `#### Active Encounters\n`;
    content += "```dataview\n";
    content += `TABLE \n`;
    content += `  session as "Session",\n`;
    content += `  location as "Location",\n`;
    content += `  length(monsters) as "Types"\n`;
    content += `FROM "${folderPath}"\n`;
    content += `WHERE type = "encounter" AND status = "active"\n`;
    content += `SORT file.ctime DESC\n`;
    content += "```\n\n";

    content += `#### Recent Completed\n`;
    content += "```dataview\n";
    content += `TABLE \n`;
    content += `  session as "Session",\n`;
    content += `  location as "Location",\n`;
    content += `  date-completed as "Date"\n`;
    content += `FROM "${folderPath}"\n`;
    content += `WHERE type = "encounter" AND status = "completed"\n`;
    content += `SORT date-completed DESC\n`;
    content += `LIMIT 5\n`;
    content += "```\n";

    return content;
}
