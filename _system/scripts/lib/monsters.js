/**
 * Monster and SRD data utilities
 * Loading, parsing, and transforming monster data
 */

import { parseHitDice, rollHitPoints, rollInitiative, generateLabel, calculateInitiativeModifier } from './combat.js';
import { PATHS, ABILITY_SCORE_BASE, ABILITY_MOD_DIVISOR, DEFAULT_SPEED, DEFAULT_HP } from './constants.js';

const SOURCE_ENTRY_REGEX = /- \*\*([A-Za-z0-9-]+)\*\*:\s*`enabled:\s*(true|false)`\s*-\s*(.+)$/;

export function parseEnabledSources(content) {
    return [...parseConfiguredSources(content).entries()]
        .filter(([, enabled]) => enabled)
        .map(([source]) => source);
}

export function parseConfiguredSourceEntries(content) {
    const configuredSources = new Map();
    const lines = content.split('\n');

    for (const line of lines) {
        const match = line.match(SOURCE_ENTRY_REGEX);
        if (match) {
            configuredSources.set(match[1], {
                id: match[1],
                enabled: match[2] === 'true',
                name: match[3].trim()
            });
        }
    }

    return configuredSources;
}

export function parseConfiguredSources(content) {
    const configuredSources = new Map();
    for (const [sourceId, sourceEntry] of parseConfiguredSourceEntries(content)) {
        configuredSources.set(sourceId, sourceEntry.enabled);
    }

    return configuredSources;
}

function buildSourceMetadata(booksData = {}, adventuresData = {}) {
    const sourceMetadata = new Map();

    for (const book of booksData.book || []) {
        sourceMetadata.set(book.id, {
            id: book.id,
            name: book.name,
            type: 'book'
        });
    }

    for (const adventure of adventuresData.adventure || []) {
        sourceMetadata.set(adventure.id, {
            id: adventure.id,
            name: adventure.name,
            type: 'adventure'
        });
    }

    return sourceMetadata;
}

export async function loadMonsterSourceCatalog(app) {
    const indexFile = app.vault.getAbstractFileByPath(PATHS.SRD_INDEX);
    const fluffIndexFile = app.vault.getAbstractFileByPath(PATHS.SRD_FLUFF_INDEX);
    const booksFile = app.vault.getAbstractFileByPath(PATHS.SRD_BOOKS);
    const adventuresFile = app.vault.getAbstractFileByPath(PATHS.SRD_ADVENTURES);

    if (!indexFile) {
        throw new Error("Bestiary index.json not found. Run setup: git clone in _system/srd/");
    }
    if (!fluffIndexFile) {
        throw new Error("Bestiary fluff-index.json not found. Run setup: git clone in _system/srd/");
    }
    if (!booksFile) {
        throw new Error("books.json not found in _system/srd/5etools-src/data/");
    }
    if (!adventuresFile) {
        throw new Error("adventures.json not found in _system/srd/5etools-src/data/");
    }

    const [index, fluffIndex, booksData, adventuresData] = await Promise.all([
        app.vault.read(indexFile).then(JSON.parse),
        app.vault.read(fluffIndexFile).then(JSON.parse),
        app.vault.read(booksFile).then(JSON.parse),
        app.vault.read(adventuresFile).then(JSON.parse)
    ]);

    const availableSourceIds = new Set([
        ...Object.keys(index),
        ...Object.keys(fluffIndex)
    ]);

    const sourceMetadata = buildSourceMetadata(booksData, adventuresData);

    return [...availableSourceIds]
        .sort((a, b) => a.localeCompare(b))
        .map((sourceId) => {
            const metadata = sourceMetadata.get(sourceId);

            return {
                id: sourceId,
                name: metadata?.name || sourceId,
                type: metadata?.type || 'unknown',
                hasBestiary: Boolean(index[sourceId]),
                hasFluff: Boolean(fluffIndex[sourceId])
            };
        });
}

export async function loadSrdVersion(app) {
    const packageFile = app.vault.getAbstractFileByPath(PATHS.SRD_PACKAGE_JSON);
    if (!packageFile) {
        throw new Error("package.json not found in _system/srd/5etools-src/");
    }

    const packageData = JSON.parse(await app.vault.read(packageFile));
    if (!packageData.version) {
        throw new Error("No version found in _system/srd/5etools-src/package.json");
    }

    return packageData.version;
}

export function buildMonsterSourcesMarkdown({
    catalog,
    enabledSources = new Map(),
    existingEntries = new Map(),
    srdVersion = null
}) {
    const sourceLines = catalog.map((source) => {
        const enabled = enabledSources.get(source.id) ?? false;
        const displayName = existingEntries.get(source.id)?.name || source.name;
        return `- **${source.id}**: \`enabled: ${enabled}\` - ${displayName}`;
    });

    return [
        '# Monster Sources Configuration',
        '',
        'This file defines which SRD sources are enabled for monster selection in encounters.',
        '',
        '## Actions',
        '',
        '```button',
        'name Refresh Monster Sources',
        'type command',
        'action QuickAdd: refresh-monster-sources',
        '```',
        '',
        'Use this button after updating `_system/srd/5etools-src` to sync the available monster sources from the current bestiary indexes.',
        'Existing `enabled` values are preserved when a source still exists, and brand-new sources default to `false` for review.',
        '',
        `_Current srd-src version: ${srdVersion || 'unknown'}_`,
        '',
        '## Available Monster Sources',
        '',
        ...sourceLines,
        '',
        '## Usage Notes',
        '',
        '- Only monsters from enabled sources will appear in encounter monster selection',
        '- Edit the `enabled: true/false` values to control which sources are active',
        '- The system reads this file each time monsters are added to encounters',
        '- Changes take effect immediately - no restart required'
    ].join('\n');
}

export function summarizeMonsterSourceRefresh(previousEnabledSources, catalog) {
    const availableSourceIds = new Set(catalog.map(source => source.id));
    const preservedEnabledCount = [...previousEnabledSources.entries()]
        .filter(([sourceId, enabled]) => enabled && availableSourceIds.has(sourceId))
        .length;

    const newSourceCount = catalog
        .filter(source => !previousEnabledSources.has(source.id))
        .length;

    return {
        totalSources: catalog.length,
        preservedEnabledCount,
        newSourceCount
    };
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

export function buildMonsterUrl(monsterName, source) {
    const formattedName = monsterName.toLowerCase().replace(/[()'-]/g, '').replace(/\s+/g, '-');
    const formattedSource = source.toLowerCase();
    return `https://5e.tools/bestiary/${formattedName}-${formattedSource}.html`;
}
