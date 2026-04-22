import { ENCOUNTER_STATUSES, NOTE_TYPES } from '../../../lib/constants.js';

export const LEGACY_WORLD_SECTION_TITLES_TO_DROP = new Set([
    "Players",
    "Actions",
    "Sessions",
    "World's knowledge",
    "World knowledge",
    "Campaigns",
    "Campaign knowledge",
    "DM: Encounters"
]);

export const WORLD_FRONTMATTER_ORDER = [
    "type",
    "world",
    "status",
    "role",
    "system",
    "banner",
    "banner_y",
    "ttrpgSchemaVersion"
];

export const CAMPAIGN_FRONTMATTER_ORDER = [
    "type",
    "world",
    "campaign",
    "status",
    "role",
    "timelineNotes"
];

export function normalizeNewlines(content) {
    return String(content ?? "").replace(/\r\n/g, "\n");
}

export function parseMarkdownDocument(content) {
    const normalized = normalizeNewlines(content);
    const match = normalized.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
    return {
        body: match ? match[1] : normalized
    };
}

export function serializeFrontmatter(frontmatter, preferredOrder = []) {
    const values = { ...(frontmatter || {}) };
    delete values.position;
    delete values.tags;

    const keys = [
        ...preferredOrder.filter(key => key in values),
        ...Object.keys(values).filter(key => !preferredOrder.includes(key))
    ];

    let content = "---\n";
    for (const key of keys) {
        content += `${key}: ${toYamlValue(values[key])}\n`;
    }
    content += "---\n";
    return content;
}

export function toYamlValue(value) {
    if (value === undefined || value === null) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "number") return String(value);
    if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
    const stringValue = String(value);
    if (stringValue === "") return '""';
    return JSON.stringify(stringValue);
}

export function stripLeadingWorldTitle(body) {
    return normalizeNewlines(body).replace(/^#\s+The world of[^\n]*\n+/i, "");
}

export function stripLeadingWorldNotesHeading(body) {
    return normalizeNewlines(body).replace(/^##\s+World Notes\s*\n+/i, "");
}

export function removeNamedSections(markdown, sectionTitles) {
    let result = normalizeNewlines(markdown);
    for (const title of sectionTitles) {
        const pattern = new RegExp(`(^|\\n)(#{1,6})\\s*${escapeRegExp(title)}\\s*\\n[\\s\\S]*?(?=\\n#{1,6}\\s|$)`, "gi");
        result = result.replace(pattern, "\n");
    }
    return cleanMarkdownSpacing(result);
}

export function getSectionBody(markdown, sectionTitle) {
    const pattern = new RegExp(`(?:^|\\n)#{1,6}\\s*${escapeRegExp(sectionTitle)}\\s*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s|$)`, "i");
    const match = normalizeNewlines(markdown).match(pattern);
    return match ? cleanMarkdownSpacing(match[1]) : "";
}

export function cleanMarkdownSpacing(markdown) {
    return normalizeNewlines(markdown).replace(/\n{3,}/g, "\n\n").trim();
}

export function parseLegacyPlayerMap(playersSection) {
    const mapping = {};
    if (!playersSection) return mapping;

    for (const line of normalizeNewlines(playersSection).split("\n")) {
        const match = line.match(/^\s*[-*]\s*(.+?)\s+as\s+\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*$/i);
        if (match) {
            mapping[match[2].trim()] = match[1].trim();
        }
    }

    return mapping;
}

export async function walkFiles(root) {
    const results = [];
    visit(root, results);
    return results.sort((a, b) => a.path.localeCompare(b.path));
}

function visit(node, results) {
    if (!node) return;
    if (node.children) {
        for (const child of node.children) {
            visit(child, results);
        }
        return;
    }
    results.push(node);
}

export async function ensureFolder(app, folderPath) {
    const parts = folderPath.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        if (!app.vault.getAbstractFileByPath(current)) {
            await app.vault.createFolder(current).catch(() => {});
        }
    }
}

export function detectNoteType(fileName, frontmatter = {}) {
    const rawType = typeof frontmatter.type === "string" ? frontmatter.type.toLowerCase() : "";
    if (rawType) return rawType;
    if (/^\d{3}_\d{8}\.md$/i.test(fileName)) return NOTE_TYPES.SESSION;
    if (/^e\d{4}_/i.test(fileName)) return NOTE_TYPES.ENCOUNTER;
    return "";
}

export function isEntityType(type) {
    return new Set([
        NOTE_TYPES.NPC,
        NOTE_TYPES.CHARACTER,
        NOTE_TYPES.PLACE,
        NOTE_TYPES.STORE,
        NOTE_TYPES.FACTION,
        NOTE_TYPES.REGION,
        NOTE_TYPES.PLANE,
        NOTE_TYPES.QUEST
    ]).has(type);
}

export function inferSessionMetadata(fileName, frontmatter = {}) {
    const baseName = fileName.replace(/\.md$/i, "");
    const match = baseName.match(/^(\d{3})_(\d{8})$/);
    const sessionNum = frontmatter.sessionNum || (match ? match[1] : "");
    const date = frontmatter.date || (match ? `${match[2].slice(0, 4)}-${match[2].slice(4, 6)}-${match[2].slice(6, 8)}` : "");
    return { sessionNum, date };
}

export function rewriteCampaignLevelPaths(content, sourceWorld, targetWorld, targetCampaign) {
    return normalizeNewlines(content).replaceAll(
        `Worlds/${sourceWorld}`,
        `Worlds/${targetWorld}/${targetCampaign}`
    );
}

export function rewriteLegacyCampaignRootPaths(content, options = {}) {
    const {
        sourceRootPath = "",
        sourceWorld = "",
        legacyCampaignFolderName = "",
        targetWorld = "",
        targetCampaign = ""
    } = options;

    if (!legacyCampaignFolderName) {
        return normalizeNewlines(content);
    }

    let next = normalizeNewlines(content);
    const targetCampaignPath = `Worlds/${targetWorld}/${targetCampaign}`;

    if (sourceRootPath) {
        next = next.replaceAll(
            `${sourceRootPath}/${legacyCampaignFolderName}`,
            targetCampaignPath
        );
    }

    if (sourceWorld) {
        next = next.replaceAll(
            `Worlds/${sourceWorld}/${legacyCampaignFolderName}`,
            targetCampaignPath
        );
    }

    return next;
}

export function rewriteWorldLevelPaths(content, sourceWorld, targetWorld) {
    return normalizeNewlines(content).replaceAll(
        `Worlds/${sourceWorld}/Ressources`,
        `Worlds/${targetWorld}/Ressources`
    );
}

export function rewriteLinkedAssetPaths(content, replacements = {}) {
    let next = normalizeNewlines(content);
    for (const [from, to] of Object.entries(replacements)) {
        if (!from || !to || from === to) continue;
        const pattern = new RegExp(`\\[\\[${escapeRegExp(from)}(?=([#|\\]]))`, "g");
        next = next.replace(pattern, `[[${to}`);
    }
    return next;
}

export function extractLinkedFileTargets(content) {
    const targets = new Set();
    const matches = normalizeNewlines(content).matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g);
    for (const match of matches) {
        const target = match[1].trim();
        if (target) {
            targets.add(target);
        }
    }
    return [...targets].sort();
}

export function isMarkdownLinkTarget(target) {
    return /\.md$/i.test(String(target || "").trim());
}

export function isLikelyAssetLinkTarget(target) {
    const clean = String(target || "").trim();
    if (!clean || clean.endsWith("/")) return false;
    if (isMarkdownLinkTarget(clean)) return false;
    return /\.[A-Za-z0-9]{2,8}$/.test(clean.split("/").pop() || "");
}

export function getLinkBasename(target) {
    return String(target || "").split("/").pop()?.trim() || "";
}

export function resolveLinkedAssetSourcePath(app, sourceRootPath, attachmentFolderPath, target, extraSearchRoots = []) {
    const baseName = getLinkBasename(target);
    const candidates = [
        target,
        `${sourceRootPath}/${target}`,
        `${sourceRootPath}/Ressources/${target}`,
        attachmentFolderPath ? `${attachmentFolderPath}/${baseName}` : "",
        `${sourceRootPath}/${baseName}`,
        `${sourceRootPath}/Ressources/${baseName}`,
        ...extraSearchRoots.flatMap(root => [
            `${root}/${target}`,
            baseName ? `${root}/${baseName}` : ""
        ])
    ].filter(Boolean);

    for (const candidate of candidates) {
        const file = app.vault.getAbstractFileByPath(candidate);
        if (file && !file.children) {
            return candidate;
        }
    }

    return "";
}

export function defaultEncounterFrontmatter(frontmatter = {}) {
    const next = { ...frontmatter };
    next.status = next.status || ENCOUNTER_STATUSES.PLANNED;
    next.session = next.session || "";
    next.location = next.location || "";
    next.description = next.description || "";
    next.monsters = Array.isArray(next.monsters) ? next.monsters : [];
    next.initiatives = Array.isArray(next.initiatives) ? next.initiatives : [];
    next.combatLog = Array.isArray(next.combatLog) ? next.combatLog : [];

    if (Array.isArray(next.monsters)) {
        next.monsters = next.monsters.map(monster => ({
            ...monster,
            addedToCombat: monster?.addedToCombat ?? true,
            addedInRound: monster?.addedInRound ?? null
        }));
    }

    if (!next.combatStats && next.status === ENCOUNTER_STATUSES.IN_COMBAT) {
        next.combatStats = {
            damageDealt: {},
            damageTaken: {},
            healingProvided: {},
            kills: {}
        };
    }

    return next;
}

export function getUnknownFields(frontmatter, knownFields) {
    return Object.keys(frontmatter || {})
        .filter(key => key !== "position" && !knownFields.has(key))
        .sort();
}

export function buildEntityKnownFields(type) {
    const base = new Set([
        "type",
        "date",
        "world",
        "campaign",
        "plane",
        "region",
        "location",
        "description",
        "introducedIn"
    ]);

    if (type === NOTE_TYPES.NPC) {
        ["occupation", "faction", "race", "gender", "class", "alive"].forEach(v => base.add(v));
    } else if (type === NOTE_TYPES.CHARACTER) {
        ["faction", "race", "gender", "class", "playerName", "alive"].forEach(v => base.add(v));
    } else if (type === NOTE_TYPES.PLACE) {
        base.add("ruler");
    } else if (type === NOTE_TYPES.STORE) {
        base.add("owner");
    } else if (type === NOTE_TYPES.FACTION) {
        base.add("leader");
    } else if (type === NOTE_TYPES.QUEST) {
        ["givenBy", "status"].forEach(v => base.add(v));
    }

    return base;
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
