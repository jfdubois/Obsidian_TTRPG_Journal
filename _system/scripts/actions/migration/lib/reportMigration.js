import { PATHS, TTRPG_SCHEMA_VERSION } from '../../../lib/constants.js';
import { ensureFolder } from './helpers.js';

export async function writeMigrationReport(app, plan, result) {
    await ensureFolder(app, PATHS.MIGRATION_REPORTS_FOLDER);
    const timestamp = buildTimestamp();
    const filePath = `${PATHS.MIGRATION_REPORTS_FOLDER}/${timestamp}-${sanitize(plan.targetWorld)}.md`;
    const content = buildReportContent(plan, result);
    await app.vault.create(filePath, content);
    return filePath;
}

function buildReportContent(plan, result) {
    let content = `# Migration Report: ${plan.sourceWorld} -> ${plan.targetWorld}/${plan.targetCampaign}\n\n`;
    content += `- **Mode:** ${plan.dryRun ? "Dry Run" : "Apply"}\n`;
    content += `- **Source world:** ${plan.sourceWorld}\n`;
    content += `- **Source schema version:** ${plan.sourceSchemaVersion || "pre-versioned"}\n`;
    content += `- **Target schema version:** ${TTRPG_SCHEMA_VERSION}\n`;
    content += `- **Target world:** ${plan.targetWorld}\n`;
    content += `- **Target campaign:** ${plan.targetCampaign}\n`;
    content += `- **Role:** ${plan.role}\n\n`;

    content += "## Recreated Notes\n\n";
    content += renderList(result.recreatedNotes || plan.recreatedNotes);

    content += "\n## Transformed Notes\n\n";
    content += renderList(result.transformedNotes || plan.actions.filter(a => a.kind.startsWith("transform")).map(a => a.targetPaths[0]));

    content += "\n## Copied Resources\n\n";
    content += renderList(result.copiedResources || plan.actions.filter(a => a.kind === "copy").flatMap(a => a.targetPaths));

    content += "\n## Warnings\n\n";
    content += renderList(result.warnings || plan.warnings);

    content += "\n## Unmapped Fields\n\n";
    content += renderList(plan.unmappedFields);

    content += "\n## Manual Follow-up\n\n";
    content += renderList(plan.manualFollowUp);

    content += "\n## Validation Failures\n\n";
    content += renderList(result.validationFailures || plan.validationFailures);

    return content;
}

function renderList(items) {
    if (!items || items.length === 0) {
        return "_None_\n";
    }
    return `${items.map(item => `- ${item}`).join("\n")}\n`;
}

function buildTimestamp() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        "-",
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0")
    ].join("");
}

function sanitize(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}
