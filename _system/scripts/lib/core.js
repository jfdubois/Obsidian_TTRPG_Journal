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

import { NOTE_TYPES, ENCOUNTER_STATUSES } from './constants.js';

/**
 * Validate and get encounter context
 * Eliminates 7 duplications across action scripts
 */
export function validateEncounterContext(app, requiredStatuses = null) {
    const file = getActiveFile(app);
    const fm = getFrontmatter(app, file);
    requireNoteType(fm, NOTE_TYPES.ENCOUNTER);

    if (requiredStatuses) {
        if (Array.isArray(requiredStatuses)) {
            if (!requiredStatuses.includes(fm.status)) {
                throw new Error(`Encounter must be in status: ${requiredStatuses.join(' or ')}`);
            }
        } else {
            requireStatus(fm, requiredStatuses);
        }
    }

    return { file, fm };
}

/**
 * Require non-completed encounter
 * Eliminates 2 duplications
 */
export function requireNotCompleted(fm, actionName = "this action") {
    if (fm.status === ENCOUNTER_STATUSES.COMPLETED) {
        throw new Error(`Cannot ${actionName} on completed encounter`);
    }
}

/**
 * Get and validate initiatives array
 * Eliminates 3 duplications
 */
export function requireInitiatives(fm) {
    const initiatives = fm.initiatives || [];
    if (initiatives.length === 0) {
        throw new Error("No combatants in initiative");
    }
    return initiatives;
}

/**
 * Standardized error handler for actions
 * Eliminates 8 duplications across all action scripts
 */
export function handleActionError(actionName, error) {
    console.error(`${actionName} error:`, error);
    new Notice(`Error: ${error.message}`);
}

/**
 * Open file in workspace
 * Eliminates 2 duplications
 */
export async function openFile(app, filePath, newTab = false) {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!file) {
        throw new Error(`File not found: ${filePath}`);
    }
    const leafType = newTab ? 'tab' : undefined;
    await app.workspace.getLeaf(leafType).openFile(file);
}

/**
 * Strip WikiLink brackets from text
 * Eliminates 7+ duplications
 */
export function stripWikiLinks(text) {
    if (!text) return '';
    return text.replace(/\[\[|\]\]/g, '');
}
