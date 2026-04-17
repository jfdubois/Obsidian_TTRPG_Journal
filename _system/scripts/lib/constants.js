// Dice and D&D mechanics
export const D20_SIDES = 20;
export const ABILITY_SCORE_BASE = 10;
export const ABILITY_MOD_DIVISOR = 2;
export const ALPHABET_LENGTH = 26;
export const MAX_PLAYERS = 8;
export const DEFAULT_HP = 10;
export const DEFAULT_SPEED = "30 ft.";

// File paths
export const PATHS = {
    SRD_INDEX: "_system/srd/5etools-src/data/bestiary/index.json",
    SRD_BESTIARY: "_system/srd/5etools-src/data/bestiary",
    SRD_SOURCES: "_system/srd/sources.md",
    WORLDS_FOLDER: "Worlds",
    TEMPLATES_FOLDER: "_system/templates"
};

// Note types and statuses
export const NOTE_TYPES = {
    ENCOUNTER: 'encounter',
    WORLD: 'world',
    CAMPAIGN: 'campaign',
    SESSION: 'session',
    CHARACTER: 'character',
    NPC: 'npc',
    PLACE: 'place',
    STORE: 'store',
    FACTION: 'faction',
    REGION: 'region',
    PLANE: 'plane',
    QUEST: 'quest'
};

export const ENCOUNTER_STATUSES = {
    PLANNED: 'planned',
    IN_COMBAT: 'inCombat',
    COMPLETED: 'completed'
};

// UI delays
export const DELAYS = {
    DATAVIEW_REFRESH: 100,
    FILE_OPEN: 100
};
