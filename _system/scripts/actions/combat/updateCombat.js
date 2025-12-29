import * as core from '../../lib/core.js';
import * as ui from '../../lib/ui.js';
import * as combat from '../../lib/combat.js';
import * as monsters from '../../lib/monsters.js';
import { NOTE_TYPES, ENCOUNTER_STATUSES } from '../../lib/constants.js';

function parseLabelToIndex(label) {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const ALPHABET_LENGTH = 26;

    const match = label.match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;

    const letters = match[1];
    const num = parseInt(match[2]);

    if (num < 1 || num > 26) return null;

    let letterIndex;
    if (letters.length === 1) {
        letterIndex = 0;
    } else if (letters.length === 2) {
        const first = ALPHABET.indexOf(letters[0]);
        letterIndex = 1 + first;
    } else {
        return null;
    }

    return letterIndex * ALPHABET_LENGTH + (num - 1);
}

export async function run(context) {
    const { app } = context;

    try {
        const file = core.getActiveFile(app);
        const fm = core.getFrontmatter(app, file);
        core.requireNoteType(fm, NOTE_TYPES.ENCOUNTER);
        core.requireStatus(fm, [ENCOUNTER_STATUSES.IN_COMBAT]);

        const unplannedMonsters = (fm.monsters || []).filter(m => m.addedToCombat === false);
        if (unplannedMonsters.length === 0) {
            ui.notifyWarning("No unplanned monsters to add!");
            return;
        }

        const currentCreature = (fm.currentTurn >= 0 && fm.currentTurn < fm.initiatives.length)
            ? fm.initiatives[fm.currentTurn]
            : null;
        const currentCreatureLabel = currentCreature?.label || currentCreature?.name;

        let maxLabelIndex = -1;
        for (const init of fm.initiatives) {
            if (init.type === "monster" && init.label && !init.label.match(/^G\d+$/)) {
                const labelIndex = parseLabelToIndex(init.label);
                if (labelIndex !== null && labelIndex > maxLabelIndex) {
                    maxLabelIndex = labelIndex;
                }
            }
        }
        const nextLabelIndex = maxLabelIndex + 1;

        const monsterDataMap = await monsters.loadMonsterDataFromSRD(app, unplannedMonsters);

        const newInitiatives = [];
        let currentLabelIndex = nextLabelIndex;

        for (const monsterEntry of unplannedMonsters) {
            const monsterData = monsterDataMap.get(monsterEntry.name);
            if (!monsterData) {
                ui.notifyWarning(`Monster not found: ${monsterEntry.name}`);
                continue;
            }

            const entries = monsters.processMonsterToCombat(
                monsterEntry,
                monsterData,
                currentLabelIndex,
                true
            );

            newInitiatives.push(...entries);
            currentLabelIndex += monsterEntry.qty;

            monsterEntry.labels = entries.map(e => e.label);
        }

        const allInitiatives = [...fm.initiatives, ...newInitiatives];
        const sortedInitiatives = combat.sortInitiatives(allInitiatives);

        let newCurrentTurn = sortedInitiatives.findIndex(i => {
            if (i.type === 'character') {
                return i.name === currentCreatureLabel;
            } else {
                return i.label === currentCreatureLabel;
            }
        });

        if (newCurrentTurn === -1) {
            newCurrentTurn = Math.max(0, Math.min(fm.currentTurn, sortedInitiatives.length - 1));
        }

        await core.updateFrontmatter(app, file, (frontmatter) => {
            frontmatter.initiatives = sortedInitiatives;
            frontmatter.currentTurn = newCurrentTurn;

            frontmatter.monsters.forEach(m => {
                if (m.addedToCombat === false) {
                    m.addedToCombat = true;
                    m.addedInRound = fm.round;
                }
            });
        });

        for (const monsterEntry of unplannedMonsters) {
            await combat.logCombatAction(app, file, fm.round, 'reinforcement', {
                name: monsterEntry.name,
                qty: monsterEntry.qty
            });
        }

        ui.refreshDataview(app);
        ui.notifySuccess(`Added ${newInitiatives.length} creatures to combat!`);

    } catch (error) {
        core.handleActionError("updateCombat", error);
    }
}
