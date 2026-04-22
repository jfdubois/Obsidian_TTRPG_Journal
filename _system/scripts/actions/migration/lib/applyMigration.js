import { buildCampaignNote } from '../../../builders/campaignBuilder.js';
import { buildEncounterNote } from '../../../builders/encounterBuilder.js';
import { buildEntityNote } from '../../../builders/entityBuilder.js';
import { buildSessionNote } from '../../../builders/sessionBuilder.js';
import { buildWorldNote } from '../../../builders/worldBuilder.js';
import { NOTE_TYPES } from '../../../lib/constants.js';
import {
    cleanMarkdownSpacing,
    defaultEncounterFrontmatter,
    detectNoteType,
    ensureFolder,
    extractLinkedFileTargets,
    getLinkBasename,
    inferSessionMetadata,
    isEntityType,
    isLikelyAssetLinkTarget,
    normalizeNewlines,
    parseMarkdownDocument,
    rewriteCampaignLevelPaths,
    rewriteLegacyCampaignRootPaths,
    rewriteLinkedAssetPaths,
    rewriteWorldLevelPaths,
    serializeFrontmatter
} from './helpers.js';

const SESSION_FRONTMATTER_ORDER = [
    "type",
    "campaign",
    "world",
    "sessionNum",
    "summary",
    "location",
    "date"
];

const ENCOUNTER_FRONTMATTER_ORDER = [
    "type",
    "world",
    "campaign",
    "status",
    "session",
    "location",
    "description",
    "monsters",
    "initiatives",
    "combatLog",
    "combatStats"
];

export async function applyMigration(app, detection, plan) {
    const result = {
        recreatedNotes: [...plan.recreatedNotes],
        transformedNotes: [],
        copiedResources: [],
        warnings: [...plan.warnings],
        validationFailures: [...plan.validationFailures]
    };

    await ensureFolder(app, plan.targetWorldPath);
    await ensureFolder(app, `${plan.targetWorldPath}/Ressources`);
    await ensureFolder(app, plan.targetCampaignPath);
    await ensureFolder(app, `${plan.targetCampaignPath}/Ressources`);

    const migratedWorldBody = rewriteWorldLevelPaths(
        detection.worldNotesBody,
        detection.sourceWorldName,
        plan.targetWorld
    );
    const migratedWorldBodyWithAssets = rewriteLinkedAssetPaths(migratedWorldBody, plan.worldAssetLinkMap);
    const worldContent = buildWorldNote({
        worldName: plan.targetWorld,
        role: plan.role,
        folderPath: plan.targetWorldPath,
        worldNotesBody: migratedWorldBodyWithAssets
    });
    await app.vault.create(`${plan.targetWorldPath}/World.md`, worldContent);

    const campaignContent = buildCampaignNote({
        worldName: plan.targetWorld,
        campaignName: plan.targetCampaign,
        role: plan.role,
        timelineNotes: plan.timelineNotes,
        campaignPath: plan.targetCampaignPath,
        legacyPlayersSection: detection.legacyPlayersSection
    });
    await app.vault.create(`${plan.targetCampaignPath}/Campaign.md`, campaignContent);

    for (const action of plan.actions) {
        if (action.kind === "copy") {
            const sourceFile = app.vault.getAbstractFileByPath(action.sourcePath);
            if (!sourceFile) {
                result.warnings.push(`Source file missing during copy: ${action.sourcePath}`);
                continue;
            }
            const binary = await app.vault.readBinary(sourceFile);
            for (const targetPath of action.targetPaths) {
                await ensureFolder(app, targetPath.split("/").slice(0, -1).join("/"));
                await app.vault.createBinary(targetPath, binary);
                result.copiedResources.push(targetPath);
            }
            continue;
        }

        const sourceFile = app.vault.getAbstractFileByPath(action.sourcePath);
        if (!sourceFile) {
            result.warnings.push(`Source note missing during migration: ${action.sourcePath}`);
            continue;
        }

        const content = await app.vault.read(sourceFile);
        const frontmatter = getFrontmatter(app, sourceFile);
        const migrated = migrateMarkdownNote({
            fileName: sourceFile.name,
            content,
            frontmatter,
            sourceWorld: detection.sourceWorldName,
            sourceRootPath: detection.sourceRootPath,
            legacyCampaignFolderName: detection.legacyCampaignFolderName,
            targetWorld: plan.targetWorld,
            targetCampaign: plan.targetCampaign,
            legacyPlayerMap: detection.legacyPlayerMap,
            targetFolderPath: plan.targetCampaignPath,
            assetLinkMap: action.assetLinkMap || {}
        });

        const targetPath = action.targetPaths[0];
        await ensureFolder(app, targetPath.split("/").slice(0, -1).join("/"));
        await app.vault.create(targetPath, migrated);
        result.transformedNotes.push(targetPath);
    }

    const validation = await validateMigratedWorld(app, plan);
    result.validationFailures.push(...validation.validationFailures);
    result.warnings.push(...validation.warnings);
    return result;
}

function migrateMarkdownNote({
    fileName,
    content,
    frontmatter,
    sourceWorld,
    sourceRootPath,
    legacyCampaignFolderName,
    targetWorld,
    targetCampaign,
    legacyPlayerMap,
    targetFolderPath,
    assetLinkMap
}) {
    const document = parseMarkdownDocument(content);
    const noteType = detectNoteType(fileName, frontmatter);
    const rewrittenBody = rewriteLinkedAssetPaths(
        rewriteCampaignLevelPaths(
            rewriteLegacyCampaignRootPaths(document.body, {
                sourceRootPath,
                sourceWorld,
                legacyCampaignFolderName,
                targetWorld,
                targetCampaign
            }),
            sourceWorld,
            targetWorld,
            targetCampaign
        ),
        assetLinkMap
    );

    if (noteType === NOTE_TYPES.SESSION) {
        return migrateSessionNote(fileName, frontmatter, rewrittenBody, targetWorld, targetCampaign);
    }

    if (isEntityType(noteType)) {
        return migrateEntityNote(fileName, noteType, frontmatter, rewrittenBody, targetWorld, targetCampaign, legacyPlayerMap, targetFolderPath);
    }

    if (noteType === NOTE_TYPES.ENCOUNTER) {
        return migrateEncounterNote(fileName, frontmatter, rewrittenBody, targetWorld, targetCampaign);
    }

    if (noteType) {
        const next = { ...frontmatter, type: noteType, world: targetWorld, campaign: targetCampaign };
        return `${serializeFrontmatter(next)}${normalizeBody(rewrittenBody)}\n`;
    }

    return `${normalizeBody(rewrittenBody)}\n`;
}

function migrateSessionNote(fileName, frontmatter, body, targetWorld, targetCampaign) {
    const next = { ...frontmatter };
    const inferred = inferSessionMetadata(fileName, next);
    next.type = NOTE_TYPES.SESSION;
    next.world = targetWorld;
    next.campaign = targetCampaign;
    next.sessionNum = next.sessionNum || inferred.sessionNum;
    next.summary = next.summary || "";
    next.location = next.location || "";
    next.date = next.date || inferred.date;

    const normalizedBody = normalizeBody(body);
    if (!normalizedBody.trim()) {
        const generated = buildSessionNote({
            worldName: targetWorld,
            campaignName: targetCampaign,
            sessionNum: next.sessionNum,
            date: next.date,
            summary: next.summary,
            location: next.location
        });
        return generated;
    }

    return `${serializeFrontmatter(next, SESSION_FRONTMATTER_ORDER)}${normalizedBody}\n`;
}

function migrateEntityNote(fileName, noteType, frontmatter, body, targetWorld, targetCampaign, legacyPlayerMap, targetFolderPath) {
    const next = { ...frontmatter };
    next.type = noteType;
    next.world = targetWorld;
    next.campaign = targetCampaign;
    next.date = next.date || "";
    next.plane = next.plane || "";
    next.region = next.region || "";
    next.location = next.location || "";
    next.description = next.description || "";
    next.introducedIn = next.introducedIn || "";

    if ((noteType === NOTE_TYPES.NPC || noteType === NOTE_TYPES.CHARACTER) && next.alive === undefined) {
        next.alive = true;
    }

    if (noteType === NOTE_TYPES.CHARACTER && !next.playerName) {
        const noteName = fileName.replace(/\.md$/i, "");
        next.playerName = legacyPlayerMap[noteName] || "";
    }

    const normalizedBody = normalizeBody(body);
    if (!normalizedBody.trim()) {
        return buildEntityNote({
            type: noteType,
            name: fileName.replace(/\.md$/i, ""),
            frontmatter: next,
            folderPath: targetFolderPath
        });
    }

    return `${serializeFrontmatter(next)}${normalizedBody}\n`;
}

function migrateEncounterNote(fileName, frontmatter, body, targetWorld, targetCampaign) {
    const next = defaultEncounterFrontmatter({
        ...frontmatter,
        type: NOTE_TYPES.ENCOUNTER,
        world: targetWorld,
        campaign: targetCampaign
    });

    const normalizedBody = normalizeBody(body);
    if (!normalizedBody.trim()) {
        return buildEncounterNote({
            worldName: targetWorld,
            campaignName: targetCampaign,
            encounterName: fileName.replace(/\.md$/i, ""),
            description: next.description || "",
            frontmatter: next
        });
    }

    return `${serializeFrontmatter(next, ENCOUNTER_FRONTMATTER_ORDER)}${normalizedBody}\n`;
}

function normalizeBody(body) {
    return cleanMarkdownSpacing(normalizeNewlines(body));
}

async function validateMigratedWorld(app, plan) {
    const validationFailures = [];
    const warnings = [];
    const targetWorldFolder = app.vault.getAbstractFileByPath(plan.targetWorldPath);
    if (!targetWorldFolder) {
        validationFailures.push(`Target world folder missing after migration: ${plan.targetWorldPath}`);
        return { validationFailures, warnings };
    }

    const files = await getMarkdownFiles(targetWorldFolder);
    const basenames = new Set(files.map(file => file.basename));
    const assetBasenames = await getNonMarkdownBasenames(targetWorldFolder);

    for (const file of files) {
        const frontmatter = getFrontmatter(app, file);
        const type = detectNoteType(file.name, frontmatter);
        const required = getRequiredFieldsForType(type);
        for (const field of required) {
            if (!(field in frontmatter)) {
                validationFailures.push(`${file.path}: missing required field "${field}"`);
            }
        }

        const content = await app.vault.read(file);
        const unresolved = findUnresolvedLinks(content, basenames, assetBasenames);
        if (unresolved.length > 0) {
            warnings.push(`${file.path}: unresolved links -> ${unresolved.join(", ")}`);
        }
    }

    return { validationFailures, warnings };
}

async function getMarkdownFiles(root) {
    const results = [];
    collect(root, results);
    return results.filter(file => file.extension === "md");
}

async function getNonMarkdownBasenames(root) {
    const results = [];
    collect(root, results);
    return new Set(
        results
            .filter(file => file.extension && file.extension !== "md")
            .map(file => file.basename)
    );
}

function collect(node, results) {
    if (!node) return;
    if (node.children) {
        for (const child of node.children) collect(child, results);
        return;
    }
    results.push(node);
}

function findUnresolvedLinks(content, noteBasenames, assetBasenames) {
    const unresolved = new Set();
    for (const target of extractLinkedFileTargets(content)) {
        const baseName = getLinkBasename(target);
        if (!baseName) continue;

        if (isLikelyAssetLinkTarget(target)) {
            const assetName = baseName.replace(/\.[^.]+$/, "");
            if (!assetBasenames.has(assetName)) {
                unresolved.add(baseName);
            }
            continue;
        }

        if (!noteBasenames.has(baseName) && baseName !== "World" && baseName !== "Campaign") {
            unresolved.add(baseName);
        }
    }
    return [...unresolved].sort();
}

function getRequiredFieldsForType(type) {
    switch (type) {
        case NOTE_TYPES.WORLD:
            return ["type", "world", "status", "role", "ttrpgSchemaVersion"];
        case NOTE_TYPES.CAMPAIGN:
            return ["type", "world", "campaign", "status", "role"];
        case NOTE_TYPES.SESSION:
            return ["type", "world", "campaign", "sessionNum", "summary", "location", "date"];
        case NOTE_TYPES.ENCOUNTER:
            return ["type", "world", "campaign", "status", "session", "location", "description"];
        default:
            return type && isEntityType(type)
                ? ["type", "world", "campaign", "date", "plane", "region", "location", "description", "introducedIn"]
                : [];
    }
}

function getFrontmatter(app, file) {
    return app.metadataCache.getFileCache(file)?.frontmatter || {};
}
