import { NOTE_TYPES, ENCOUNTER_STATUSES } from './constants.js';

/**
 * Get the currently active file in Obsidian
 *
 * @param {Object} app - Obsidian app instance
 * @returns {Object} The active file
 * @throws {Error} If no file is currently active
 *
 * @example
 * const file = getActiveFile(app);
 */
export function getActiveFile(app) {
    const file = app.workspace.getActiveFile();
    if (!file) {
        throw new Error("No active file");
    }
    return file;
}

/**
 * Get frontmatter from a file
 *
 * @param {Object} app - Obsidian app instance
 * @param {Object} file - File object to read frontmatter from
 * @returns {Object} Frontmatter object
 * @throws {Error} If file has no frontmatter
 *
 * @example
 * const fm = getFrontmatter(app, file);
 */
export function getFrontmatter(app, file) {
    const cache = app.metadataCache.getFileCache(file);
    if (!cache?.frontmatter) {
        throw new Error("No frontmatter found");
    }
    return cache.frontmatter;
}

/**
 * Update frontmatter using a processor function
 *
 * @param {Object} app - Obsidian app instance
 * @param {Object} file - File to update
 * @param {Function} updateFn - Function that receives and modifies frontmatter
 * @returns {Promise<void>}
 *
 * @example
 * await updateFrontmatter(app, file, (fm) => { fm.status = 'active'; });
 */
export async function updateFrontmatter(app, file, updateFn) {
    await app.fileManager.processFrontMatter(file, updateFn);
}

/**
 * Validate note type matches expected type
 *
 * @param {Object} fm - Frontmatter object
 * @param {string} expectedType - Expected note type value
 * @throws {Error} If type doesn't match
 *
 * @example
 * requireNoteType(fm, NOTE_TYPES.ENCOUNTER);
 */
export function requireNoteType(fm, expectedType) {
    if (fm.type !== expectedType) {
        throw new Error(`Note type is '${fm.type}', expected '${expectedType}'`);
    }
}

/**
 * Validate status is in allowed list
 *
 * @param {Object} fm - Frontmatter object
 * @param {Array<string>} allowedStatuses - List of allowed status values
 * @throws {Error} If status not in allowed list
 *
 * @example
 * requireStatus(fm, ['planned', 'inCombat']);
 */
export function requireStatus(fm, allowedStatuses) {
    if (!allowedStatuses.includes(fm.status)) {
        throw new Error(`Status '${fm.status}' not allowed. Expected: ${allowedStatuses.join(', ')}`);
    }
}

/**
 * Get file by path
 *
 * @param {Object} app - Obsidian app instance
 * @param {string} path - File path relative to vault root
 * @returns {Object} File object
 * @throws {Error} If file not found
 *
 * @example
 * const file = getFileByPath(app, 'Worlds/MyWorld/World.md');
 */
export function getFileByPath(app, path) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) {
        throw new Error(`File not found: ${path}`);
    }
    return file;
}

/**
 * Read file contents
 *
 * @param {Object} app - Obsidian app instance
 * @param {Object} file - File to read
 * @returns {Promise<string>} File contents
 *
 * @example
 * const content = await readFile(app, file);
 */
export async function readFile(app, file) {
    return await app.vault.read(file);
}

/**
 * Write content to file
 *
 * @param {Object} app - Obsidian app instance
 * @param {Object} file - File to write to
 * @param {string} content - Content to write
 * @returns {Promise<void>}
 *
 * @example
 * await writeFile(app, file, 'New content');
 */
export async function writeFile(app, file, content) {
    await app.vault.modify(file, content);
}

/**
 * Validate and get encounter context
 * Combines validation and context retrieval to eliminate duplication
 *
 * @param {Object} app - Obsidian app instance
 * @param {Array<string>|null} requiredStatuses - Required status values (optional)
 * @returns {{file: Object, fm: Object}} File and frontmatter objects
 * @throws {Error} If validation fails
 *
 * @example
 * const { file, fm } = validateEncounterContext(app, [ENCOUNTER_STATUSES.IN_COMBAT]);
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
 * Require encounter is not completed
 *
 * @param {Object} fm - Frontmatter object
 * @param {string} actionName - Name of action being performed (for error message)
 * @throws {Error} If encounter is completed
 *
 * @example
 * requireNotCompleted(fm, 'add monsters');
 */
export function requireNotCompleted(fm, actionName = "this action") {
    if (fm.status === ENCOUNTER_STATUSES.COMPLETED) {
        throw new Error(`Cannot ${actionName} on completed encounter`);
    }
}

/**
 * Get and validate initiatives array
 *
 * @param {Object} fm - Frontmatter object
 * @returns {Array} Initiatives array
 * @throws {Error} If no initiatives exist
 *
 * @example
 * const initiatives = requireInitiatives(fm);
 */
export function requireInitiatives(fm) {
    const initiatives = fm.initiatives || [];
    if (initiatives.length === 0) {
        throw new Error("No combatants in initiative");
    }
    return initiatives;
}

/**
 * Standardized error handler for action scripts
 *
 * @param {string} actionName - Name of the action that errored
 * @param {Error} error - Error object
 *
 * @example
 * catch (error) { handleActionError("applyDamage", error); }
 */
export function handleActionError(actionName, error) {
    console.error(`${actionName} error:`, error);
    new Notice(`Error: ${error.message}`);
}

/**
 * Open file in workspace
 *
 * @param {Object} app - Obsidian app instance
 * @param {string} filePath - Path to file to open
 * @param {boolean} newTab - Whether to open in new tab (default: false)
 * @returns {Promise<void>}
 * @throws {Error} If file not found
 *
 * @example
 * await openFile(app, 'Worlds/MyWorld/E0001.md', true);
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
 *
 * @param {string} text - Text containing WikiLinks
 * @returns {string} Text with brackets removed
 *
 * @example
 * stripWikiLinks('[[Monster]]') // Returns 'Monster'
 */
export function stripWikiLinks(text) {
    if (!text) return '';
    return text.replace(/\[\[|\]\]/g, '');
}

/**
 * Migrate frontmatter to support new combat tracking fields
 * Ensures backward compatibility with existing encounter notes by adding:
 * - addedToCombat field to monsters (defaults to true for existing monsters)
 * - addedInRound field to monsters (defaults to null)
 * - combatStats object for encounters in combat status
 *
 * @param {Object} frontmatter - Frontmatter object to migrate
 * @returns {boolean} True if migration was performed, false otherwise
 *
 * @example
 * const migrated = migrateFrontmatterIfNeeded(fm);
 */
export function migrateFrontmatterIfNeeded(frontmatter) {
    if (!frontmatter) {
        return false;
    }

    let migrated = false;

    if (Array.isArray(frontmatter.monsters)) {
        frontmatter.monsters.forEach(m => {
            if (m.addedToCombat === undefined) {
                m.addedToCombat = true;
                migrated = true;
            }
            if (m.addedInRound === undefined) {
                m.addedInRound = null;
                migrated = true;
            }
        });
    }

    if (!frontmatter.combatStats && frontmatter.status === ENCOUNTER_STATUSES.IN_COMBAT) {
        frontmatter.combatStats = {
            damageDealt: {},
            damageTaken: {},
            healingProvided: {},
            kills: {}
        };
        migrated = true;
    }

    return migrated;
}
