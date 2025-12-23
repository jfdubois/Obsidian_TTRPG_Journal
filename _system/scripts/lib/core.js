/**
 * Core utilities for Obsidian scripts
 * Cross-cutting concerns: frontmatter, validation, file access
 */

export function getActiveFile(app) {
    const file = app.workspace.getActiveFile();
    if (!file) {
        throw new Error("No active file");
    }
    return file;
}

export function getFrontmatter(app, file) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) {
        throw new Error("No frontmatter found");
    }
    return cache.frontmatter;
}

export async function updateFrontmatter(app, file, updateFn) {
    await app.fileManager.processFrontMatter(file, updateFn);
}

export function requireNoteType(fm, expectedType) {
    if (fm.type !== expectedType) {
        throw new Error(`Note type is '${fm.type}', expected '${expectedType}'`);
    }
}

export function requireStatus(fm, allowedStatuses) {
    if (!allowedStatuses.includes(fm.status)) {
        throw new Error(`Status '${fm.status}' not allowed. Expected: ${allowedStatuses.join(', ')}`);
    }
}

export function getFileByPath(app, path) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) {
        throw new Error(`File not found: ${path}`);
    }
    return file;
}

export async function readFile(app, file) {
    return await app.vault.read(file);
}

export async function writeFile(app, file, content) {
    await app.vault.modify(file, content);
}
