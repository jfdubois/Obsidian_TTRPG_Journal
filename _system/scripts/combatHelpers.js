// _system/scripts/combatHelpers.js
// Reusable combat utility functions

/**
 * Roll a d20 + modifier for initiative
 */
function rollInitiative(dexModString) {
    const mod = dexModString?.match(/([+-]?\d+)/);
    return Math.floor(Math.random() * 20) + 1 + (mod ? parseInt(mod[1]) : 0);
}

/**
 * Parse hit dice string like "45 (7d8 + 14)"
 * Returns: { num: 7, size: 8, op: '+', mod: 14 }
 */
function parseHitDice(hpString) {
    const match = hpString?.match(/\((\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\)/);
    return match ? {
        num: parseInt(match[1]),
        size: parseInt(match[2]),
        op: match[3] || '+',
        mod: parseInt(match[4] || 0)
    } : null;
}

/**
 * Roll HP based on mode: 'default', 'rolled', 'low', 'average'
 */
function rollHitPoints(dice, mode) {
    if (!dice) return 0;
    let total = 0;

    if (mode === "low") {
        total = dice.num + (dice.op === '+' ? dice.mod : -dice.mod);
    } else if (mode === "average") {
        total = Math.floor(dice.num * (dice.size + 1) / 2) + (dice.op === '+' ? dice.mod : -dice.mod);
    } else {
        // rolled mode
        for (let i = 0; i < dice.num; i++) {
            total += Math.floor(Math.random() * dice.size) + 1;
        }
        total += dice.op === '+' ? dice.mod : -dice.mod;
    }

    return Math.max(1, total);
}

/**
 * Generate unique labels for monster instances
 * Group mode: G1, G2, G3...
 * Individual mode: A1, A2... Z1, Z2... AA1, AA2...
 */
function generateLabel(index, isGroup) {
    if (isGroup) {
        return `G${index + 1}`;
    }
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letterIndex = Math.floor(index / 26);
    const numIndex = (index % 26) + 1;
    const letter = letterIndex === 0 ? alphabet[index % 26] : alphabet[letterIndex - 1] + alphabet[index % 26];
    return `${letter}${numIndex}`;
}

/**
 * Calculate HP status based on current/max ratio
 */
function getHealthStatus(currentHp, maxHp) {
    if (currentHp <= 0) return "💀 dead";
    const ratio = currentHp / maxHp;
    if (ratio >= 1) return "healthy";
    if (ratio >= 0.75) return "scratched";
    if (ratio >= 0.5) return "⚠️ bloodied";
    if (ratio >= 0.25) return "🔴 critical";
    return "💀 dying";
}

/**
 * Process a single monster entry into combat initiative entries
 * Returns array of initiative objects
 */
async function processMonsterToCombat(monsterEntry, monsterData, startingLabelIndex, inCombat = false) {
    const initiativeEntries = [];
    const isGroupInit = monsterEntry.initiative === "group";
    const groupInit = isGroupInit && inCombat ? rollInitiative(monsterData["DEX_mod"]) : null;

    for (let i = 0; i < monsterEntry.qty; i++) {
        const label = generateLabel(startingLabelIndex + i, isGroupInit);

        // Calculate HP
        let maxHp;
        if (monsterEntry.hpMode === "default") {
            maxHp = parseInt(monsterData["Hit Points"].match(/^(\d+)/)[1]);
        } else {
            const dice = parseHitDice(monsterData["Hit Points"]);
            maxHp = rollHitPoints(dice, monsterEntry.hpMode);
        }

        // Roll or use group initiative
        const initiative = inCombat
        ? (groupInit !== null ? groupInit : rollInitiative(monsterData["DEX_mod"]))
        : 0; // Will be rolled when combat starts

        initiativeEntries.push({
            name: monsterData.name,
            label: label,
            type: "monster",
            initiative: initiative,
            maxHp: maxHp,
            currentHp: maxHp,
            ac: monsterData["Armor Class"],
            speed: monsterData["Speed"] || "30 ft.",
            status: "healthy"
        });
    }

    return initiativeEntries;
}

/**
 * Sort initiatives array by initiative value (descending)
 * Preserves turn marker if present
 */
function sortInitiatives(initiatives) {
    return initiatives.sort((a, b) => {
        // Always keep turn marker considerations
        const aInit = a.initiative || 0;
        const bInit = b.initiative || 0;
        return bInit - aInit;
    });
}

/**
 * Format combat log entry
 */
function formatLogEntry(round, source, action, target, amount, damageType = null) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (action === "damage") {
        const typeStr = damageType ? ` ${damageType}` : "";
        return `- **Round ${round}** [${timestamp}] - ${source} dealt **${amount}${typeStr} damage** to ${target}`;
    } else if (action === "heal") {
        return `- **Round ${round}** [${timestamp}] - ${source} healed ${target} for **${amount} HP**`;
    } else if (action === "killed") {
        return `- **Round ${round}** [${timestamp}] - 💀 ${source} killed ${target}`;
    } else if (action === "joined") {
        return `- **Round ${round}** [${timestamp}] - ⚔️ ${source} joined combat (Initiative: ${amount})`;
    }

    return `- **Round ${round}** [${timestamp}] - ${source}: ${action}`;
}

// Export all functions
module.exports = {
    rollInitiative,
    parseHitDice,
    rollHitPoints,
    generateLabel,
    getHealthStatus,
    processMonsterToCombat,
    sortInitiatives,
    formatLogEntry
};
