import { NOTE_TYPES } from '../lib/constants.js';

export function buildCampaignNote({
    worldName,
    campaignName,
    role,
    timelineNotes = "",
    campaignPath,
    legacyPlayersSection = ""
}) {
    let content = buildCampaignFrontmatter(worldName, campaignName, role, timelineNotes);
    content += buildCampaignHeader(worldName, campaignName);
    content += buildPlayersSection();
    if (legacyPlayersSection?.trim()) {
        content += "### Legacy Players\n\n";
        content += `${legacyPlayersSection.trim()}\n\n`;
    }
    content += buildActionsSection(role);
    content += buildSessionsSection(campaignPath);
    content += buildCampaignKnowledgeSection(worldName, campaignName);

    if (role === "dm") {
        content += buildDmEncountersSection(campaignPath);
    }

    return content;
}

function buildCampaignFrontmatter(worldName, campaignName, role, timelineNotes) {
    let content = "---\n";
    content += `type: ${NOTE_TYPES.CAMPAIGN}\n`;
    content += `world: ${worldName}\n`;
    content += `campaign: ${campaignName}\n`;
    content += "status: active\n";
    content += `role: ${role}\n`;
    content += `timelineNotes: ${timelineNotes ? JSON.stringify(timelineNotes) : '""'}\n`;
    content += "---\n";
    return content;
}

function buildCampaignHeader(worldName, campaignName) {
    let content = `# ${campaignName}\n\n`;
    content += `**World:** [[Worlds/${worldName}/World|${worldName}]]\n\n`;
    content += "**Timeline notes:** `= this.timelineNotes`\n\n";
    content += "**Status:** `= this.status`\n\n";
    content += "## Campaign Notes\n\n";
    return content;
}

function buildPlayersSection() {
    let content = "### Players\n";
    content += "```dataviewjs\n";
    content += "(async () => {\n";
    content += "  const activeFile = app.workspace.getActiveFile();\n";
    content += "  if (!activeFile) return;\n";
    content += "  const folder = activeFile.parent.path;\n";
    content += "  const chars = dv.pages(`\"${folder}\"`)\n";
    content += "    .where(p => p.type === \"character\" && p.playerName)\n";
    content += "    .sort(p => p.playerName, \"asc\");\n\n";
    content += "  const byPlayer = {};\n";
    content += "  for (const c of chars) {\n";
    content += "    if (!byPlayer[c.playerName]) byPlayer[c.playerName] = [];\n";
    content += "    byPlayer[c.playerName].push(c);\n";
    content += "  }\n\n";
    content += "  for (const [player, list] of Object.entries(byPlayer).sort()) {\n";
    content += "    dv.paragraph(`**${player}**`);\n";
    content += "    for (const c of list) {\n";
    content += "      const info = `${c.file.link} · ${c.race ?? \"?\"} · ${c.class ?? \"?\"}`;\n";
    content += "      const line = c.alive === false\n";
    content += "        ? `- DEAD - ~~${c.file.name} · ${c.race ?? \"?\"} · ${c.class ?? \"?\"}~~`\n";
    content += "        : `- ${info}`;\n";
    content += "      dv.paragraph(line);\n";
    content += "    }\n";
    content += "  }\n";
    content += "})();\n";
    content += "```\n\n";
    return content;
}

function buildActionsSection(role) {
    let content = "### Actions\n\n";

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
    let content = "### Sessions\n\n";
    content += "```dataview\n";
    content += 'TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary", location as "Location"\n';
    content += `FROM "${campaignPath}"\n`;
    content += 'WHERE type = "session"\n';
    content += "SORT file.name ASC\n";
    content += "```\n\n";
    return content;
}

function buildCampaignKnowledgeSection(worldName, campaignName) {
    let content = "### Campaign knowledge\n\n";
    content += "```base\n";
    content += "views:\n";
    content += "  - type: table\n";
    content += "    name: CampaignView\n";
    content += "    filters:\n";
    content += "      and:\n";
    content += `        - world == "${worldName}"\n`;
    content += `        - campaign == "${campaignName}"\n`;
    content += "        - file.name != \"Campaign\"\n";
    content += "        - '!type.contains(\"session\")'\n";
    content += "        - '!type.contains(\"encounter\")'\n";
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
    let content = "\n### DM: Encounters\n\n";

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
