import { PATHS } from '../../../lib/constants.js';
import {
    cleanMarkdownSpacing,
    detectNoteType,
    getSectionBody,
    isEntityType,
    LEGACY_WORLD_SECTION_TITLES_TO_DROP,
    parseLegacyPlayerMap,
    parseMarkdownDocument,
    removeNamedSections,
    stripLeadingWorldTitle,
    stripLeadingWorldNotesHeading,
    walkFiles
} from './helpers.js';

export async function detectLegacyWorld(app, sourceWorldName) {
    const sourceRootPath = `${PATHS.LEGACY_IMPORTS_FOLDER}/${sourceWorldName}`;
    const sourceRoot = app.vault.getAbstractFileByPath(sourceRootPath);
    if (!sourceRoot) {
        throw new Error(`Legacy world folder not found: ${sourceRootPath}`);
    }

    const worldFile = app.vault.getAbstractFileByPath(`${sourceRootPath}/World.md`);
    if (!worldFile) {
        throw new Error(`Legacy World.md not found in ${sourceRootPath}`);
    }

    const worldContent = await app.vault.read(worldFile);
    const worldFrontmatter = getFrontmatter(app, worldFile);
    const worldDocument = parseMarkdownDocument(worldContent);
    const legacyPlayersSection = getSectionBody(worldDocument.body, "Players");
    const legacyPlayerMap = parseLegacyPlayerMap(legacyPlayersSection);
    const worldNotesBody = buildMigratedWorldNotesBody(worldDocument.body, sourceWorldName);
    const attachmentFolderPath = app.vault.getConfig?.("attachmentFolderPath") || "";
    const legacyCampaignFolderName = detectLegacyCampaignFolderName(sourceRoot);
    const legacyAssetSearchRoots = buildLegacyAssetSearchRoots(sourceRootPath, legacyCampaignFolderName);

    const files = await walkFiles(sourceRoot);
    const entries = [];
    let flatMarkdownNotes = 0;

    for (const file of files) {
        const relativePath = file.path.slice(`${sourceRootPath}/`.length);
        if (relativePath === "World.md") {
            continue;
        }

        const normalizedRelativePath = normalizeLegacyRelativePath(relativePath, legacyCampaignFolderName);
        const isMarkdown = file.extension === "md";
        const frontmatter = isMarkdown ? getFrontmatter(app, file) : {};
        const content = isMarkdown ? await app.vault.read(file) : "";
        const noteType = isMarkdown ? detectNoteType(file.name, frontmatter) : "";
        const isInLegacyCampaignFolder = Boolean(
            legacyCampaignFolderName &&
            relativePath.startsWith(`${legacyCampaignFolderName}/`)
        );
        const isLegacyCampaignNote = Boolean(
            legacyCampaignFolderName &&
            relativePath === `${legacyCampaignFolderName}/Campaign.md`
        );

        if (isMarkdown && isTopLevelLegacyNote(relativePath, normalizedRelativePath, legacyCampaignFolderName)) {
            flatMarkdownNotes += 1;
        }

        entries.push({
            file,
            relativePath,
            normalizedRelativePath,
            isMarkdown,
            noteType,
            content,
            frontmatter,
            isInLegacyCampaignFolder,
            isLegacyCampaignNote,
            needsManualReview: Boolean(isMarkdown && frontmatter.type && !noteType && !isEntityType(String(frontmatter.type).toLowerCase()))
        });
    }

    return {
        sourceWorldName,
        sourceRootPath,
        sourceRoot,
        sourceSchemaVersion: worldFrontmatter.ttrpgSchemaVersion || null,
        worldFile,
        worldFrontmatter,
        worldDocument,
        worldContent,
        worldNotesBody,
        attachmentFolderPath,
        legacyCampaignFolderName,
        legacyAssetSearchRoots,
        legacyPlayersSection,
        legacyPlayerMap,
        entries,
        isFlatLegacyWorld: flatMarkdownNotes > 0 || Boolean(legacyCampaignFolderName)
    };
}

function buildMigratedWorldNotesBody(body, sourceWorldName) {
    let worldNotes = stripLeadingWorldTitle(body);
    worldNotes = stripLeadingWorldNotesHeading(worldNotes);
    worldNotes = removeNamedSections(worldNotes, LEGACY_WORLD_SECTION_TITLES_TO_DROP);
    return cleanMarkdownSpacing(worldNotes);
}

function getFrontmatter(app, file) {
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter || {};
    return frontmatter;
}

function detectLegacyCampaignFolderName(sourceRoot) {
    const candidates = (sourceRoot?.children || [])
        .filter(child => child?.children && child.name !== "Ressources")
        .filter(child => child.children.some(grandChild => !grandChild?.children && grandChild.name === "Campaign.md"));

    return candidates.length === 1 ? candidates[0].name : "";
}

function buildLegacyAssetSearchRoots(sourceRootPath, legacyCampaignFolderName) {
    if (!legacyCampaignFolderName) {
        return [];
    }

    return [
        `${sourceRootPath}/${legacyCampaignFolderName}/Ressources`,
        `${sourceRootPath}/${legacyCampaignFolderName}`
    ];
}

function normalizeLegacyRelativePath(relativePath, legacyCampaignFolderName) {
    if (!legacyCampaignFolderName) {
        return relativePath;
    }

    const prefix = `${legacyCampaignFolderName}/`;
    return relativePath.startsWith(prefix)
        ? relativePath.slice(prefix.length)
        : relativePath;
}

function isTopLevelLegacyNote(relativePath, normalizedRelativePath, legacyCampaignFolderName) {
    if (relativePath.startsWith("Ressources/")) {
        return false;
    }

    if (!relativePath.includes("/")) {
        return true;
    }

    if (!legacyCampaignFolderName || !relativePath.startsWith(`${legacyCampaignFolderName}/`)) {
        return false;
    }

    return !normalizedRelativePath.includes("/") && normalizedRelativePath !== "Campaign.md";
}
