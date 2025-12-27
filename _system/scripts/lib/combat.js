/**
 * Combat utilities for D&D 5e encounters
 * Initiative, HP, damage, healing, combat log
 */

import { D20_SIDES, ALPHABET_LENGTH } from './constants.js';
import { stripWikiLinks } from './core.js';

/**
 * Roll initiative with DEX modifier
 *
 * @param {string} dexModString - DEX modifier as string (e.g., "+3", "-1")
 * @returns {number} Initiative roll result
 *
 * @example
 * rollInitiative("+3") // Returns 1d20+3
 */
export function rollInitiative(dexModString) {
    const mod = dexModString?.match(/([+-]?\d+)/);
    return Math.floor(Math.random() * D20_SIDES) + 1 + (mod ? parseInt(mod[1]) : 0);
}

/**
 * Parse hit dice string into components
 *
 * @param {string} hpString - HP formula string (e.g., "(2d8+4)")
 * @returns {{num: number, size: number, op: string, mod: number}|null} Parsed dice formula or null
 *
 * @example
 * parseHitDice("(2d8+4)") // Returns {num: 2, size: 8, op: '+', mod: 4}
 */
export function parseHitDice(hpString) {
    const match = hpString?.match(/\((\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\)/);
    return match ? {
        num: parseInt(match[1]),
        size: parseInt(match[2]),
        op: match[3] || '+',
        mod: parseInt(match[4] || 0)
    } : null;
}

export function rollHitPoints(dice, mode) {
    if (!dice) return 0;
    if (typeof dice.num !== 'number' || typeof dice.size !== 'number') {
        throw new Error("Invalid dice formula: num and size must be numbers");
    }
    if (dice.num < 0 || dice.size < 1) {
        throw new Error("Invalid dice formula: num must be >= 0, size must be >= 1");
    }

    let total = 0;

    if (mode === "low") {
        total = dice.num + (dice.op === '+' ? dice.mod : -dice.mod);
    } else if (mode === "average") {
        total = Math.floor(dice.num * (dice.size + 1) / 2) + (dice.op === '+' ? dice.mod : -dice.mod);
    } else {
        for (let i = 0; i < dice.num; i++) {
            total += Math.floor(Math.random() * dice.size) + 1;
        }
        total += dice.op === '+' ? dice.mod : -dice.mod;
    }

    return Math.max(1, total);
}

export function generateLabel(index, isGroup) {
    if (isGroup) {
        return `G${index + 1}`;
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterIndex = Math.floor(index / ALPHABET_LENGTH);
    const numIndex = (index % ALPHABET_LENGTH) + 1;
    const letter = letterIndex === 0 ? alphabet[index % ALPHABET_LENGTH] : alphabet[letterIndex - 1] + alphabet[index % ALPHABET_LENGTH];
    return `${letter}${numIndex}`;
}

export function getHealthStatus(currentHp, maxHp) {
    if (typeof currentHp !== 'number' || typeof maxHp !== 'number') {
        throw new Error("Invalid HP values: must be numbers");
    }
    if (maxHp <= 0) {
        throw new Error("Max HP must be positive");
    }
    if (currentHp < 0) currentHp = 0;

    if (currentHp <= 0) return "dead";
    const ratio = currentHp / maxHp;
    if (ratio >= 1) return "healthy";
    if (ratio >= 0.75) return "scratched";
    if (ratio >= 0.5) return "bloodied";
    if (ratio >= 0.25) return "critical";
    return "dying";
}

export function applyDamageToTarget(target, amount) {
    if (!target || typeof target !== 'object') {
        throw new Error("Invalid target: must be an object");
    }
    if (typeof amount !== 'number' || amount < 0) {
        throw new Error("Damage amount must be a non-negative number");
    }

    const oldHp = target.currentHp;
    const newHp = Math.max(0, target.currentHp - amount);
    target.currentHp = newHp;
    target.status = getHealthStatus(newHp, target.maxHp);
    return { oldHp, newHp, newStatus: target.status };
}

export function applyHealingToTarget(target, amount) {
    if (!target || typeof target !== 'object') {
        throw new Error("Invalid target: must be an object");
    }
    if (typeof amount !== 'number' || amount < 0) {
        throw new Error("Healing amount must be a non-negative number");
    }

    const oldHp = target.currentHp;
    const newHp = Math.min(target.maxHp, target.currentHp + amount);
    target.currentHp = newHp;
    target.status = getHealthStatus(newHp, target.maxHp);
    return { oldHp, newHp, newStatus: target.status };
}

export function sortInitiatives(initiatives) {
    if (!Array.isArray(initiatives)) {
        throw new Error("Initiatives must be an array");
    }
    return [...initiatives].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));
}

export function findTargetByLabel(initiatives, identifier) {
    return initiatives.find(i =>
        i.label === identifier ||
        stripWikiLinks(i.name) === identifier
    );
}

export function advanceTurn(fm) {
    const currentTurn = fm.currentTurn || 0;
    const currentRound = fm.round || 1;
    const initiativeCount = (fm.initiatives || []).length;

    let nextTurn = currentTurn + 1;
    let nextRound = currentRound;
    let isNewRound = false;

    if (nextTurn >= initiativeCount) {
        nextTurn = 0;
        nextRound = currentRound + 1;
        isNewRound = true;
    }

    return { nextTurn, nextRound, isNewRound };
}

export function formatLogEntry(round, action, data) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    switch (action) {
        case 'damage':
            return `- ${timestamp}: ${data.source} dealt ${data.amount} ${data.damageType} damage to ${data.target} (${data.oldHp} -> ${data.newHp}/${data.maxHp})`;
        case 'heal':
            return `- ${timestamp}: ${data.source} healed ${data.target} for ${data.amount} HP (${data.oldHp} -> ${data.newHp}/${data.maxHp})`;
        case 'round':
            return `- **Round ${data.round} begins!**`;
        case 'end':
            return `- === COMBAT ENDED === (${timestamp})`;
        default:
            return `- ${timestamp}: ${data.message || action}`;
    }
}

export function appendToLog(content, entry) {
    if (content.includes("## Combat Log")) {
        return content.replace(/(## Combat Log\n)/, `$1${entry}\n`);
    } else {
        return content + `\n\n## Combat Log\n${entry}\n`;
    }
}

/**
 * Log combat action with automatic file read/write
 * Eliminates 4 duplications
 */
export async function logCombatAction(app, file, round, actionType, data) {
    let content = await app.vault.read(file);
    const logEntry = formatLogEntry(round, actionType, data);
    content = appendToLog(content, logEntry);
    await app.vault.cachedRead(file);
    await app.vault.modify(file, content);
}

/**
 * Consolidated HP modification
 * Eliminates duplication between applyDamage and applyHealing
 */
export function modifyHP(target, delta, operation = 'damage') {
    const oldHp = target.currentHp;

    let newHp;
    if (operation === 'damage') {
        newHp = Math.max(0, target.currentHp - delta);
    } else if (operation === 'heal') {
        newHp = Math.min(target.maxHp, target.currentHp + delta);
    } else {
        throw new Error(`Invalid operation: ${operation}`);
    }

    target.currentHp = newHp;
    target.status = getHealthStatus(newHp, target.maxHp);

    return { oldHp, newHp, newStatus: target.status };
}
