import { NOTE_TYPES } from '../../../lib/constants.js';
import {
    buildEntityKnownFields,
    extractLinkedFileTargets,
    getLinkBasename,
    getUnknownFields,
    isEntityType,
    isLikelyAssetLinkTarget,
    resolveLinkedAssetSourcePath
} from './helpers.js';

export function planMigration(app, detection, options) {
    const {
        targetWorld,
        targetCampaign,
        role,
        timelineNotes,
        dryRun
    } = options;

    const targetWorldPath = `Worlds/${targetWorld}`;
    const targetCampaignPath = `${targetWorldPath}/${targetCampaign}`;
    const recreatedNotes = [
        `${targetWorldPath}/World.md`,
        `${targetCampaignPath}/Campaign.md`
    ];

    const actions = [];
    const warnings = [];
    const validationFailures = [];
    const unmappedFields = [];
    const manualFollowUp = [];
    const targetPaths = new Set(recreatedNotes);
    const plannedCopySources = new Map();
    const worldAssetLinkMap = {};
    const assetWarnings = new Set();

    if (app.vault.getAbstractFileByPath(`${targetWorldPath}/World.md`)) {
        validationFailures.push(`Target World.md already exists: ${targetWorldPath}/World.md`);
    }
    if (app.vault.getAbstractFileByPath(`${targetCampaignPath}/Campaign.md`)) {
        validationFailures.push(`Target Campaign.md already exists: ${targetCampaignPath}/Campaign.md`);
    }

    for (const entry of detection.entries) {
        const normalizedRelativePath = entry.normalizedRelativePath || entry.relativePath;

        if (entry.isMarkdown) {
            if (entry.isLegacyCampaignNote) {
                continue;
            }

            const targetPath = `${targetCampaignPath}/${normalizedRelativePath}`;
            const actionType = classifyMarkdownAction(entry.noteType);
            const assetLinkMap = buildAssetLinkMap(
                app,
                detection,
                entry.content,
                `${targetCampaignPath}/Ressources`,
                normalizedRelativePath,
                warnings,
                assetWarnings,
                validationFailures,
                targetPaths,
                plannedCopySources,
                actions
            );

            if (targetPaths.has(targetPath)) {
                validationFailures.push(`Duplicate target path detected: ${targetPath}`);
            }
            targetPaths.add(targetPath);

            if (entry.needsManualReview) {
                manualFollowUp.push(`${entry.relativePath}: unsupported note type "${entry.frontmatter.type}"`);
            }

            if (isEntityType(entry.noteType)) {
                const unknown = getUnknownFields(entry.frontmatter, buildEntityKnownFields(entry.noteType));
                if (unknown.length > 0) {
                    unmappedFields.push(`${entry.relativePath}: ${unknown.join(", ")}`);
                }
            }

            actions.push({
                kind: actionType,
                noteType: entry.noteType,
                sourcePath: entry.file.path,
                relativePath: normalizedRelativePath,
                assetLinkMap,
                targetPaths: [targetPath]
            });
            continue;
        }

        if (
            entry.isInLegacyCampaignFolder &&
            normalizedRelativePath.startsWith("Ressources/") &&
            app.vault.getAbstractFileByPath(`${detection.sourceRootPath}/${normalizedRelativePath}`)
        ) {
            continue;
        }

        const candidateTargetPaths = normalizedRelativePath.startsWith("Ressources/")
            ? entry.isInLegacyCampaignFolder
                ? [`${targetCampaignPath}/${normalizedRelativePath}`]
                : [
                    `${targetCampaignPath}/${normalizedRelativePath}`,
                    `${targetWorldPath}/${normalizedRelativePath}`
                ]
            : [`${targetCampaignPath}/${normalizedRelativePath}`];

        const targetPathsForFile = [];
        for (const targetPath of candidateTargetPaths) {
            const existingSource = plannedCopySources.get(targetPath);
            if (existingSource) {
                continue;
            }
            plannedCopySources.set(targetPath, entry.file.path);
            targetPathsForFile.push(targetPath);
        }

        if (targetPathsForFile.length === 0) {
            continue;
        }

        for (const targetPath of targetPathsForFile) {
            if (targetPaths.has(targetPath)) {
                validationFailures.push(`Duplicate target path detected: ${targetPath}`);
            }
            targetPaths.add(targetPath);
        }

        actions.push({
            kind: "copy",
            noteType: "",
            sourcePath: entry.file.path,
            relativePath: normalizedRelativePath,
            targetPaths: targetPathsForFile
        });
    }

    if (!detection.isFlatLegacyWorld) {
        warnings.push("Source world does not look like a flat pre-separation world. Migration may still work, but review the dry run carefully.");
    }

    Object.assign(
        worldAssetLinkMap,
        buildAssetLinkMap(
            app,
            detection,
            detection.worldContent,
            `${targetWorldPath}/Ressources`,
            "World.md",
            warnings,
            assetWarnings,
            validationFailures,
            targetPaths,
            plannedCopySources,
            actions
        )
    );

    return {
        dryRun,
        sourceWorld: detection.sourceWorldName,
        sourceSchemaVersion: detection.sourceSchemaVersion,
        targetWorld,
        targetCampaign,
        targetWorldPath,
        targetCampaignPath,
        worldAssetLinkMap,
        role,
        timelineNotes,
        recreatedNotes,
        actions,
        warnings,
        validationFailures,
        unmappedFields,
        manualFollowUp
    };
}

function buildAssetLinkMap(app, detection, content, targetResourcesPath, noteLabel, warnings, assetWarnings, validationFailures, targetPaths, plannedCopySources, actions) {
    const assetLinkMap = {};

    for (const target of extractLinkedFileTargets(content)) {
        if (!isLikelyAssetLinkTarget(target)) {
            continue;
        }

        const sourcePath = resolveAssetSourcePath(app, detection, target);
        if (!sourcePath) {
            const warning = `${noteLabel}: linked asset not found in staging or attachment folder -> ${target}`;
            if (!assetWarnings.has(warning)) {
                assetWarnings.add(warning);
                warnings.push(warning);
            }
            continue;
        }

        const baseName = getLinkBasename(target);
        if (!baseName) {
            continue;
        }

        const targetPath = `${targetResourcesPath}/${baseName}`;
        const existingSource = plannedCopySources.get(targetPath);
        if (existingSource && existingSource !== sourcePath) {
            validationFailures.push(`Attachment target path conflict: ${targetPath} from ${existingSource} and ${sourcePath}`);
            continue;
        }

        if (!existingSource) {
            if (targetPaths.has(targetPath)) {
                validationFailures.push(`Duplicate target path detected: ${targetPath}`);
                continue;
            }

            targetPaths.add(targetPath);
            plannedCopySources.set(targetPath, sourcePath);
            actions.push({
                kind: "copy",
                noteType: "",
                sourcePath,
                relativePath: sourcePath,
                targetPaths: [targetPath]
            });
        }

        assetLinkMap[target] = `Ressources/${baseName}`;
    }

    return assetLinkMap;
}

function resolveAssetSourcePath(app, detection, target) {
    return resolveLinkedAssetSourcePath(
        app,
        detection.sourceRootPath,
        detection.attachmentFolderPath,
        target,
        detection.legacyAssetSearchRoots
    );
}

function classifyMarkdownAction(noteType) {
    if (!noteType) return "transform-markdown";
    if (noteType === NOTE_TYPES.SESSION) return "transform-session";
    if (noteType === NOTE_TYPES.ENCOUNTER) return "transform-encounter";
    if (isEntityType(noteType)) return "transform-entity";
    return "transform-markdown";
}
