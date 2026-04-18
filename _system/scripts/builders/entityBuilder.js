import { NOTE_TYPES } from '../lib/constants.js';

const DEFAULT_ENTITY_FIELDS = [
    "date",
    "world",
    "campaign",
    "plane",
    "region",
    "location",
    "description",
    "introducedIn"
];

export const ENTITY_TYPES = new Set([
    NOTE_TYPES.NPC,
    NOTE_TYPES.CHARACTER,
    NOTE_TYPES.PLACE,
    NOTE_TYPES.STORE,
    NOTE_TYPES.FACTION,
    NOTE_TYPES.QUEST,
    NOTE_TYPES.PLANE,
    NOTE_TYPES.REGION
]);

export function buildEntityNote({
    type,
    name,
    frontmatter = {},
    folderPath = ""
}) {
    let content = "---\n";
    content += `type: ${type}\n`;

    for (const key of DEFAULT_ENTITY_FIELDS) {
        content += `${key}: ${serializeValue(frontmatter[key])}\n`;
    }

    for (const [key, value] of Object.entries(getTypeSpecificFrontmatter(type, frontmatter))) {
        content += `${key}: ${serializeValue(value)}\n`;
    }

    content += "---\n\n";
    content += `# ${name}\n\n`;
    content += buildEntityBody(type, name, frontmatter, folderPath);
    return content;
}

function getTypeSpecificFrontmatter(type, frontmatter) {
    switch (type) {
        case NOTE_TYPES.NPC:
            return {
                occupation: frontmatter.occupation || "",
                faction: frontmatter.faction || "",
                race: frontmatter.race || "",
                gender: frontmatter.gender || "",
                class: frontmatter.class || "",
                alive: frontmatter.alive ?? true
            };
        case NOTE_TYPES.CHARACTER:
            return {
                faction: frontmatter.faction || "",
                race: frontmatter.race || "",
                gender: frontmatter.gender || "",
                class: frontmatter.class || "",
                playerName: frontmatter.playerName || "",
                alive: frontmatter.alive ?? true
            };
        case NOTE_TYPES.PLACE:
            return { ruler: frontmatter.ruler || "" };
        case NOTE_TYPES.STORE:
            return { owner: frontmatter.owner || "" };
        case NOTE_TYPES.FACTION:
            return { leader: frontmatter.leader || "" };
        case NOTE_TYPES.QUEST:
            return {
                givenBy: frontmatter.givenBy || "",
                status: frontmatter.status || "Active"
            };
        default:
            return {};
    }
}

function buildEntityBody(type, name, frontmatter, folderPath) {
    switch (type) {
        case NOTE_TYPES.NPC:
            return "### NPC Introduction\n\n\n### Additional information\n\n\n";
        case NOTE_TYPES.CHARACTER:
            return "### PC Introduction\n\n\n### Additional information\n\n\n";
        case NOTE_TYPES.PLACE:
            return (
                "### Location details\n" +
                "**Ruler:** `= this.ruler`\n" +
                "**Size:**\n" +
                "**Population:**\n" +
                "**Party relationship:**\n\n\n" +
                "### Local knowledge\n\n" +
                "```dataview\n" +
                'TABLE file.link as "Name", type as "Type", description as "Description"\n' +
                `FROM "${folderPath}"\n` +
                `WHERE contains(string(location), "${name}") OR contains(string(place), "${name}")\n` +
                "SORT file.name ASC\n" +
                "```\n\n"
            );
        case NOTE_TYPES.STORE:
            return "### Location details\n**Owner:** `= this.owner`\n**Price point:**\n";
        case NOTE_TYPES.FACTION:
            return "### Faction summary\n\n\n### Faction details\n**Leader:** `= this.leader`\n";
        case NOTE_TYPES.QUEST:
            return "### Quest summary\n\n\n### Quest details\n";
        case NOTE_TYPES.PLANE:
            return (
                "### Plane description\n\n\n### Planar knowledge\n\n\n" +
                "```dataview\n" +
                'TABLE file.link as "Name", type as "Type", description as "Description"\n' +
                `FROM "${folderPath}"\n` +
                `WHERE contains(string(plane), "${name}")\n` +
                "SORT file.name ASC\n" +
                "```\n\n"
            );
        case NOTE_TYPES.REGION:
            return (
                "### Region description\n\n\n### Regional knowledge\n\n\n" +
                "```dataview\n" +
                'TABLE file.link as "Name", type as "Type", description as "Description"\n' +
                `FROM "${folderPath}"\n` +
                `WHERE contains(string(region), "${name}")\n` +
                "SORT file.name ASC\n" +
                "```\n\n"
            );
        default:
            return frontmatter.body || "";
    }
}

function serializeValue(value) {
    if (value === undefined || value === null || value === "") return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return String(value);
    return String(value);
}
