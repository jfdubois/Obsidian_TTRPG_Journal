import { NOTE_TYPES, TTRPG_SCHEMA_VERSION } from '../lib/constants.js';

export function buildWorldNote({ worldName, role, folderPath, worldNotesBody = "" }) {
    let content = buildWorldFrontmatter(worldName, role);
    content += buildWorldHeader(worldName);
    if (worldNotesBody?.trim()) {
        content += `${worldNotesBody.trim()}\n\n`;
    }
    content += buildActionsSection();
    content += buildCampaignsSection(folderPath);
    content += buildWorldKnowledgeSection(folderPath);
    return content;
}

function buildWorldFrontmatter(worldName, role) {
    let content = "---\n";
    content += `type: ${NOTE_TYPES.WORLD}\n`;
    content += `world: ${worldName}\n`;
    content += "status: active\n";
    content += `role: ${role}\n`;
    content += "system: \n";
    content += 'banner: "![[world-banner.jpg]]"\n';
    content += `ttrpgSchemaVersion: ${TTRPG_SCHEMA_VERSION}\n`;
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
    content += 'TABLE WITHOUT ID link(file.path, entity) as "Entity", type as "Type", description as "Description"\n';
    content += `FROM "${folderPath}"\n`;
    content += "WHERE \n";
    content += "  file.path != this.file.path AND\n";
    content += '  type != "session" AND\n';
    content += '  type != "campaign"\n';
    content += "SORT file.name ASC\n";
    content += "```\n";
    return content;
}
