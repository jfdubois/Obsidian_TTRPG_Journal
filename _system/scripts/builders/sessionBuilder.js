import { NOTE_TYPES } from '../lib/constants.js';

export function buildSessionNote({
    worldName,
    campaignName,
    sessionNum = "",
    date = "",
    summary = "",
    location = "",
    recap = "",
    bodyLogs = ""
}) {
    let content = "---\n";
    content += `type: ${NOTE_TYPES.SESSION}\n`;
    content += `campaign: ${campaignName}\n`;
    content += `world: ${worldName}\n`;
    content += `sessionNum: ${sessionNum}\n`;
    content += `summary: ${quote(summary)}\n`;
    content += `location: ${location}\n`;
    content += `date: ${date}\n`;
    content += "---\n\n";

    content += `# Session ${sessionNum}\n\n\n`;
    content += "### Session Summary\n\n";
    if (summary) {
        content += `${summary}\n\n`;
    } else {
        content += "\n";
    }

    content += "### Recap\n\n";
    if (recap) {
        content += `${recap.trim()}\n\n`;
    } else {
        content += "\n";
    }

    content += "### Logs\n\n";
    if (bodyLogs) {
        content += `${bodyLogs.trim()}\n`;
    } else {
        content += "\n";
    }

    return content;
}

function quote(value) {
    return value ? JSON.stringify(value) : '""';
}
