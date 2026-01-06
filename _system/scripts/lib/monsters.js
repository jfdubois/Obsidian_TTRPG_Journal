/**
 * Monster and SRD data utilities
 * Loading, parsing, and transforming monster data
 */

import { parseHitDice, rollHitPoints, rollInitiative, generateLabel, calculateInitiativeModifier } from './combat.js';
import { PATHS, ABILITY_SCORE_BASE, ABILITY_MOD_DIVISOR, DEFAULT_SPEED, DEFAULT_HP } from './constants.js';

export function parseEnabledSources(content) {
    const enabledSources = [];
    const lines = content.split('\n');

    for (const line of lines) {
        const match = line.match(/- \*\*([A-Z0-9-]+)\*\*.*:\s*`enabled:\s*(true|false)`/);
        if (match) {
            const source = match[1];
            const enabled = match[2] === 'true';
            if (enabled) {
                enabledSources.push(source);
            }
        }
    }

    return enabledSources;
}

export async function loadBestiaryIndex(app) {
    const indexFile = app.vault.getAbstractFileByPath(PATHS.SRD_INDEX);
    if (!indexFile) {
        throw new Error("Bestiary index.json not found. Run setup: git clone in _system/srd/");
    }
    return JSON.parse(await app.vault.read(indexFile));
}

export async function loadMonstersBySource(app, index, source) {
    const bestiaryFile = index[source];
    if (!bestiaryFile) return [];

    const bestiaryPath = `${PATHS.SRD_BESTIARY}/${bestiaryFile}`;
    const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

    if (!bestiaryFileObj) return [];

    try {
        const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
        return bestiaryData.monster || [];
    } catch (error) {
        console.error(`Error loading ${bestiaryPath}:`, error);
        return [];
    }
}

export async function loadAllMonsters(app) {
    const sourcesFile = app.vault.getAbstractFileByPath(PATHS.SRD_SOURCES);
    if (!sourcesFile) {
        throw new Error("sources.md not found in _system/srd/");
    }

    const sourcesContent = await app.vault.read(sourcesFile);
    const enabledSources = parseEnabledSources(sourcesContent);

    if (enabledSources.length === 0) {
        throw new Error("No monster sources enabled in sources.md");
    }

    const index = await loadBestiaryIndex(app);
    const allMonsters = [];

    for (const source of enabledSources) {
        const monsters = await loadMonstersBySource(app, index, source);
        allMonsters.push(...monsters);
    }

    return allMonsters;
}

export async function loadMonsterDataFromSRD(app, encounterMonsters) {
    const monsterDataMap = new Map();
    const index = await loadBestiaryIndex(app);

    const monstersBySource = new Map();
    for (const monster of encounterMonsters) {
        if (!monster.source) continue;
        if (!monstersBySource.has(monster.source)) {
            monstersBySource.set(monster.source, []);
        }
        monstersBySource.get(monster.source).push(monster.name);
    }

    for (const [source, monsterNames] of monstersBySource) {
        const monsters = await loadMonstersBySource(app, index, source);
        for (const monster of monsters) {
            if (monsterNames.includes(monster.name)) {
                const combatMonster = transformSRDToCombatFormat(monster);
                monsterDataMap.set(monster.name, combatMonster);
            }
        }
    }

    return monsterDataMap;
}

export function transformSRDToCombatFormat(srdMonster) {
    const dexModString = calculateDexMod(srdMonster.dex || 10);

    const hpString = srdMonster.hp
        ? `${srdMonster.hp.average} (${srdMonster.hp.formula})`
        : "0";

    let acValue;
    if (Array.isArray(srdMonster.ac)) {
        acValue = srdMonster.ac[0]?.ac || srdMonster.ac[0];
    } else {
        acValue = srdMonster.ac;
    }

    let speedString = DEFAULT_SPEED;
    if (srdMonster.speed) {
        const speeds = [];
        if (srdMonster.speed.walk) speeds.push(`${srdMonster.speed.walk} ft.`);
        if (srdMonster.speed.fly) speeds.push(`fly ${srdMonster.speed.fly} ft.`);
        if (srdMonster.speed.swim) speeds.push(`swim ${srdMonster.speed.swim} ft.`);
        if (srdMonster.speed.climb) speeds.push(`climb ${srdMonster.speed.climb} ft.`);
        if (srdMonster.speed.burrow) speeds.push(`burrow ${srdMonster.speed.burrow} ft.`);
        if (speeds.length > 0) {
            speedString = speeds.join(", ");
        }
    }

    return {
        name: srdMonster.name,
        "DEX_mod": dexModString,
        "Hit Points": hpString,
        "Armor Class": acValue,
        "Speed": speedString,
        "Initiative_Proficiency": srdMonster.initiative?.proficiency || 0,
        "CR": srdMonster.cr || "0"
    };
}

export function calculateDexMod(dexScore) {
    const mod = Math.floor((dexScore - ABILITY_SCORE_BASE) / ABILITY_MOD_DIVISOR);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function processMonsterToCombat(monsterEntry, monsterData, startingLabelIndex, inCombat = false) {
    const initiativeEntries = [];
    const isGroupInit = monsterEntry.initiative === "group";

    const initiativeMod = calculateInitiativeModifier(
        monsterData["DEX_mod"],
        monsterData["CR"],
        monsterData["Initiative_Proficiency"]
    );

    const groupInit = isGroupInit && inCombat ? rollInitiative(initiativeMod) : null;

    for (let i = 0; i < monsterEntry.qty; i++) {
        const label = generateLabel(startingLabelIndex + i, isGroupInit);

        let maxHp;
        if (monsterEntry.hpMode === "default") {
            const hpMatch = monsterData["Hit Points"].match(/^(\d+)/);
            maxHp = hpMatch ? parseInt(hpMatch[1]) : DEFAULT_HP;
        } else {
            const dice = parseHitDice(monsterData["Hit Points"]);
            maxHp = rollHitPoints(dice, monsterEntry.hpMode);
        }

        const initiative = inCombat
            ? (groupInit !== null ? groupInit : rollInitiative(initiativeMod))
            : 0;

        initiativeEntries.push({
            name: monsterData.name,
            label: label,
            type: "monster",
            initiative: initiative,
            maxHp: maxHp,
            currentHp: maxHp,
            ac: monsterData["Armor Class"],
            speed: monsterData["Speed"] || DEFAULT_SPEED,
            status: "healthy"
        });
    }

    return initiativeEntries;
}
