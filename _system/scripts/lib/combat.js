/**
 * Combat utilities for D&D 5e encounters
 * Initiative, HP, damage, healing, combat log
 */

import { D20_SIDES, ALPHABET_LENGTH } from './constants.js';
import { stripWikiLinks } from './core.js';
import * as core from './core.js';

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
    if (currentHp === undefined || maxHp === undefined) {
        return "unknown";
    }
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

    if (target.currentHp === undefined || target.maxHp === undefined) {
        return { skipped: true, reason: "no-hp", oldHp: undefined, newHp: undefined, newStatus: "unknown" };
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

    if (target.currentHp === undefined || target.maxHp === undefined) {
        return { skipped: true, reason: "no-hp", oldHp: undefined, newHp: undefined, newStatus: "unknown" };
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

function formatCombatLogEntry(round, actionType, data) {
    switch (actionType) {
        case 'reinforcement':
            return `Round ${round}: ${data.name} x${data.qty} joined the fight!`;
        case 'round':
            return `Round ${round} begins`;
        case 'damage':
            return `Round ${round}: ${data.target} takes ${data.amount} ${data.damageType} damage from ${data.source}`;
        case 'heal':
            return `Round ${round}: ${data.target} healed ${data.amount} HP from ${data.source}`;
        case 'turn':
            return `Round ${round}: ${data.name}'s turn`;
        default:
            return `Round ${round}: ${actionType}`;
    }
}

export async function logCombatAction(app, file, round, actionType, data) {
    const logEntry = formatCombatLogEntry(round, actionType, data);

    await core.updateFrontmatter(app, file, (frontmatter) => {
        if (!frontmatter.combatLog) {
            frontmatter.combatLog = [];
        }
        frontmatter.combatLog.push(logEntry);
    });
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

/**
 * Initialize combat statistics tracking structure
 *
 * @param {Object} frontmatter - Encounter frontmatter object
 *
 * @example
 * initializeCombatStats(frontmatter)
 */
export function initializeCombatStats(frontmatter) {
    if (!frontmatter || typeof frontmatter !== 'object') {
        throw new Error("Invalid frontmatter: must be an object");
    }
    if (!frontmatter.combatStats) {
        frontmatter.combatStats = {
            damageDealt: {},
            damageTaken: {},
            healingProvided: {},
            kills: {}
        };
    }
}

/**
 * Track damage dealt and taken in combat statistics
 *
 * @param {Object} stats - Combat stats object from frontmatter
 * @param {string} source - Label of damage source combatant
 * @param {string} target - Label of damage target combatant
 * @param {number} amount - Damage amount
 * @param {boolean} killed - Whether target was killed
 *
 * @example
 * trackDamage(stats, "P1", "G1", 15, false)
 */
export function trackDamage(stats, source, target, amount, killed = false) {
    if (!stats || typeof stats !== 'object') {
        throw new Error("Invalid stats: must be an object");
    }
    if (typeof target !== 'string' || !target) {
        throw new Error("Invalid target: must be a non-empty string");
    }
    if (typeof amount !== 'number' || amount < 0) {
        throw new Error("Damage amount must be a non-negative number");
    }
    if (typeof killed !== 'boolean') {
        throw new Error("Invalid killed: must be a boolean");
    }

    if (source && source !== '?') {
        stats.damageDealt[source] = (stats.damageDealt[source] || 0) + amount;
    }
    stats.damageTaken[target] = (stats.damageTaken[target] || 0) + amount;
    if (killed && source && source !== '?') {
        if (!stats.kills[source]) stats.kills[source] = [];
        stats.kills[source].push(target);
    }
}

/**
 * Track healing provided in combat statistics
 *
 * @param {Object} stats - Combat stats object from frontmatter
 * @param {string} source - Label of healing source combatant
 * @param {string} target - Label of healing target combatant
 * @param {number} amount - Healing amount
 *
 * @example
 * trackHealing(stats, "P2", "P1", 8)
 */
export function trackHealing(stats, source, target, amount) {
    if (!stats || typeof stats !== 'object') {
        throw new Error("Invalid stats: must be an object");
    }
    if (typeof target !== 'string' || !target) {
        throw new Error("Invalid target: must be a non-empty string");
    }
    if (typeof amount !== 'number' || amount < 0) {
        throw new Error("Healing amount must be a non-negative number");
    }

    if (source && source !== '?') {
        stats.healingProvided[source] = (stats.healingProvided[source] || 0) + amount;
    }
}
