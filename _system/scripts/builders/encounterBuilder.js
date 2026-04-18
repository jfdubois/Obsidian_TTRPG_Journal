import { NOTE_TYPES, ENCOUNTER_STATUSES } from '../lib/constants.js';

export function buildEncounterNote({
    worldName,
    campaignName,
    encounterName,
    description = "",
    frontmatter = {}
}) {
    const status = frontmatter.status || ENCOUNTER_STATUSES.PLANNED;
    const session = frontmatter.session || "";
    const location = frontmatter.location || "";
    const monsters = stringifyArray(frontmatter.monsters || []);
    const initiatives = stringifyArray(frontmatter.initiatives || []);
    const combatLog = stringifyArray(frontmatter.combatLog || []);
    const combatStatsLine = frontmatter.combatStats
        ? `combatStats: ${JSON.stringify(frontmatter.combatStats)}\n`
        : "";

    let content = "---\n";
    content += `type: ${NOTE_TYPES.ENCOUNTER}\n`;
    content += `world: ${worldName}\n`;
    content += `campaign: ${campaignName}\n`;
    content += `status: ${status}\n`;
    content += `session: ${session}\n`;
    content += `location: ${location}\n`;
    content += `description: ${description}\n`;
    content += `monsters: ${monsters}\n`;
    content += `initiatives: ${initiatives}\n`;
    content += `combatLog: ${combatLog}\n`;
    content += combatStatsLine;
    content += "---\n\n";

    content += `# ${encounterName}\n\n`;
    content += "## Description\n\n";
    content += description ? `${description}\n\n` : "\n";
    content += "## Additional information\n\n";
    content += "## Monsters\n\n";
    content += "_See encounter controls in the canonical template for full interactive views._\n\n";
    content += "## Initiative\n\n";
    content += "_See encounter controls in the canonical template for full interactive views._\n\n";
    content += "## Combat Log\n\n";
    content += "_See encounter controls in the canonical template for full interactive views._\n\n";
    content += "## Battle Statistics\n\n";
    content += "_See encounter controls in the canonical template for full interactive views._\n";
    return content;
}

function stringifyArray(value) {
    return JSON.stringify(value ?? []);
}
