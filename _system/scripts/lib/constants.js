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
    SRD_FLUFF_INDEX: "_system/srd/5etools-src/data/bestiary/fluff-index.json",
    SRD_BESTIARY: "_system/srd/5etools-src/data/bestiary",
    SRD_SOURCES: "_system/srd/sources.md",
    SRD_PACKAGE_JSON: "_system/srd/5etools-src/package.json",
    SRD_BOOKS: "_system/srd/5etools-src/data/books.json",
    SRD_ADVENTURES: "_system/srd/5etools-src/data/adventures.json",
    WORLDS_FOLDER: "Worlds",
    TEMPLATES_FOLDER: "_system/templates",
    MIGRATIONS_ROOT_FOLDER: "_system/migrations",
    LEGACY_IMPORTS_FOLDER: "_system/migrations/_import/legacy-worlds",
    MIGRATION_REPORTS_FOLDER: "_system/migrations/reports",
    MIGRATION_SCHEMA_FILE: "_system/migrations/schema.json"
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

// Schema versioning
export const TTRPG_SCHEMA_VERSION = 2;

// UI delays
export const DELAYS = {
    DATAVIEW_REFRESH: 100,
    FILE_OPEN: 100
};
