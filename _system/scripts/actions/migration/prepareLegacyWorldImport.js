import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import { PATHS } from '../../lib/constants.js';
import { detectLegacyWorld } from './lib/detectLegacyWorld.js';
import {
    ensureFolder,
    extractLinkedFileTargets,
    getLinkBasename,
    isLikelyAssetLinkTarget,
    normalizeNewlines,
    resolveLinkedAssetSourcePath,
    rewriteLinkedAssetPaths
} from './lib/helpers.js';

export async function run(context) {
    const { app, quickAddApi } = context;

    try {
        const sourceWorldName = await promptForLegacyWorld(app, quickAddApi);
        if (!sourceWorldName) return;

        const detection = await detectLegacyWorld(app, sourceWorldName);
        const result = await prepareLegacyWorldImport(app, detection);
        const reportPath = await writePreparationReport(app, detection, result);
        await core.openFile(app, reportPath, true);

        ui.notifySuccess(`Legacy import prepared: ${result.rewrittenNotes.length} notes updated, ${result.copiedResources.length} resources staged.`);
    } catch (error) {
        core.handleActionError("prepareLegacyWorldImport", error);
    }
}

async function promptForLegacyWorld(app, quickAddApi) {
    const importsRoot = app.vault.getAbstractFileByPath(PATHS.LEGACY_IMPORTS_FOLDER);
    const options = (importsRoot?.children || [])
        .filter(child => child?.children)
        .map(child => ({ label: child.name, value: child.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

    if (options.length === 0) {
        throw new Error(`No legacy worlds found in ${PATHS.LEGACY_IMPORTS_FOLDER}`);
    }

    return ui.selectOption(quickAddApi, options, "Select staged legacy world to prepare:");
}

async function prepareLegacyWorldImport(app, detection) {
    const stagedResourcesPath = `${detection.sourceRootPath}/Ressources`;
    await ensureFolder(app, stagedResourcesPath);

    const result = {
        rewrittenNotes: [],
        copiedResources: [],
        warnings: []
    };

    const stagedSources = new Map();
    const notes = [
        {
            file: detection.worldFile,
            path: detection.worldFile.path,
            content: detection.worldContent
        },
        ...detection.entries
            .filter(entry => entry.isMarkdown)
            .map(entry => ({
                file: entry.file,
                path: entry.file.path,
                content: entry.content
            }))
    ];

    for (const note of notes) {
        const replacements = {};

        for (const target of extractLinkedFileTargets(note.content)) {
            if (!isLikelyAssetLinkTarget(target)) {
                continue;
            }

            const sourcePath = resolveLinkedAssetSourcePath(
                app,
                detection.sourceRootPath,
                detection.attachmentFolderPath,
                target
            );

            if (!sourcePath) {
                result.warnings.push(`${note.path}: linked asset not found -> ${target}`);
                continue;
            }

            const baseName = getLinkBasename(target);
            if (!baseName) {
                continue;
            }

            const targetPath = `${stagedResourcesPath}/${baseName}`;
            const existingSource = stagedSources.get(targetPath);
            if (existingSource && existingSource !== sourcePath) {
                result.warnings.push(`${note.path}: staged asset conflict for ${baseName} between ${existingSource} and ${sourcePath}`);
                continue;
            }

            if (!existingSource) {
                stagedSources.set(targetPath, sourcePath);
                if (sourcePath !== targetPath) {
                    const targetFile = app.vault.getAbstractFileByPath(targetPath);
                    if (!targetFile) {
                        const binary = await app.vault.readBinary(app.vault.getAbstractFileByPath(sourcePath));
                        await app.vault.createBinary(targetPath, binary);
                        result.copiedResources.push(targetPath);
                    }
                }
            }

            replacements[target] = `Ressources/${baseName}`;
        }

        const rewritten = rewriteLinkedAssetPaths(note.content, replacements);
        if (rewritten !== note.content) {
            await app.vault.modify(note.file, normalizeNewlines(rewritten));
            result.rewrittenNotes.push(note.path);
        }
    }

    result.warnings = [...new Set(result.warnings)].sort();
    result.rewrittenNotes.sort();
    result.copiedResources.sort();
    return result;
}

async function writePreparationReport(app, detection, result) {
    await ensureFolder(app, PATHS.MIGRATION_REPORTS_FOLDER);
    const filePath = `${PATHS.MIGRATION_REPORTS_FOLDER}/${buildTimestamp()}-prep-${sanitize(detection.sourceWorldName)}.md`;
    const content = buildPreparationReport(detection, result);
    await app.vault.create(filePath, content);
    return filePath;
}

function buildPreparationReport(detection, result) {
    let content = `# Legacy Import Prep Report: ${detection.sourceWorldName}\n\n`;
    content += `- **Source world:** ${detection.sourceWorldName}\n`;
    content += `- **Staged import folder:** ${detection.sourceRootPath}\n`;
    content += `- **Vault attachment folder:** ${detection.attachmentFolderPath || "_Not configured_"}\n\n`;

    content += "## Rewritten Notes\n\n";
    content += renderList(result.rewrittenNotes);

    content += "\n## Copied Resources\n\n";
    content += renderList(result.copiedResources);

    content += "\n## Warnings\n\n";
    content += renderList(result.warnings);
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
