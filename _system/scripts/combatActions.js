// Define global trigger function OUTSIDE the module
window.triggerCombatAction = async function(label, action) {
    console.log("Button clicked! Label:", label, "Action:", action);

    const app = window.app;
    const params = {
        app: app,
        variables: {
            label: label,
            action: action
        }
    };

    // Call the main function
    await combatActions(params);
};

// Main module function
async function combatActions(params) {
    const { app } = params;

    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("No active file found!");
        return;
    }

    const fileCache = app.metadataCache.getFileCache(file);
    if (!fileCache?.frontmatter) {
        new Notice("No frontmatter found!");
        return;
    }

    const fm = fileCache.frontmatter;
    if (fm.status !== "inCombat") {
        new Notice("Encounter is not in combat!");
        return;
    }

    // Get parameters from either variables (button click) or URL params (legacy)
    let label, action;

    if (params.variables) {
        // Called from button click
        label = params.variables.label;
        action = params.variables.action;
    } else {
        // Called from URL (legacy)
        const url = new URL(params.url || window.location.href);
        label = url.searchParams.get('label');
        action = url.searchParams.get('action');
    }

    if (!label || !action) {
        new Notice("Missing required parameters!");
        console.log("Params received:", params);
        return;
    }

    const initiatives = fm.initiatives || [];

    // Find target by label or name
    const target = initiatives.find(i =>
    i.label === label ||
    i.name.replace(/\[\[|\]\]/g, '') === label
    );

    if (!target) {
        new Notice(`Combatant with label "${label}" not found!`);
        console.log("Available combatants:", initiatives.map(i => ({name: i.name, label: i.label})));
        return;
    }

    let logEntry = "";
    let amount = 0;
    let source = "";
    let damageType = "";

    switch(action) {
        case 'damage':
            // Get list of combatant names for source reference
            const sourceNames = initiatives.map(i => i.name.replace(/\[\[|\]\]/g, '')).join(", ");

            // Prompt for source (who dealt the damage)
            source = prompt(`Enter damage source:\n\nOptions: ${sourceNames}\n\nOr type a custom name (e.g., Spell, Trap):`);
            if (!source) {
                new Notice("Action cancelled.");
                return;
            }

            // Prompt for amount
            const amountStr = prompt("Enter damage amount:", "0");
            amount = parseInt(amountStr);
            if (isNaN(amount) || amount < 1) {
                new Notice("Invalid damage amount. Must be a positive number.");
                return;
            }

            // Prompt for damage type
            const damageTypes = "Bludgeoning, Piercing, Slashing, Fire, Cold, Lightning, Thunder, Poison, Acid, Psychic, Force, Radiant, Necrotic";
            damageType = prompt(`Enter damage type:\n\nCommon options: ${damageTypes}\n\nOr type a custom type:`);
            if (!damageType) {
                new Notice("Action cancelled.");
                return;
            }

            // Apply damage
            const oldHp = target.currentHp;
            target.currentHp = Math.max(0, target.currentHp - amount);
            updateStatus(target);

            // Create detailed log entry
            const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            logEntry = `${timestamp}: ${source} did ${amount} ${damageType} damage to ${target.name} (${oldHp} → ${target.currentHp}/${target.maxHp})`;

            // Show confirmation notice
            new Notice(`${target.name} took ${amount} ${damageType} damage from ${source}`);
            break;

        case 'heal':
            source = prompt("Enter healer name (or source of healing):", "");
            if (source === null) {
                new Notice("Action cancelled.");
                return;
            }

            const healAmountStr = prompt("Enter heal amount:", "0");
            amount = parseInt(healAmountStr);
            if (isNaN(amount) || amount < 1) {
                new Notice("Invalid heal amount. Must be a positive number.");
                return;
            }

            const healType = prompt("Enter heal type:", "Healing");
            if (healType === null) {
                new Notice("Action cancelled.");
                return;
            }

            const oldHpHeal = target.currentHp;
            target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
            updateStatus(target);

            const timestampHeal = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            logEntry = `${timestampHeal}: ${source || 'Unknown'} restored ${amount} HP to ${target.name} via ${healType} (${oldHpHeal} → ${target.currentHp}/${target.maxHp})`;
            new Notice(`${target.name} healed ${amount} HP from ${source || 'Unknown'}`);
            break;

        case 'kill':
            target.currentHp = 0;
            target.status = "dead";
            const timestampKill = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            logEntry = `${timestampKill}: ${target.name} was killed instantly`;
            new Notice(`${target.name} has been killed!`);
            break;

        case 'stun':
            const wasStunned = target.status === "stunned";
            target.status = wasStunned ? "healthy" : "stunned";
            const timestampStun = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            logEntry = `${timestampStun}: ${target.name} is ${wasStunned ? 'no longer stunned' : 'stunned'}`;
            new Notice(`${target.name} is now ${target.status}`);
            break;

        default:
            new Notice(`Unknown action: ${action}`);
            return;
    }

    // Save updated initiatives to frontmatter
    await app.fileManager.processFrontMatter(file, fm => {
        fm.initiatives = initiatives;
    });

    // Add to combat log
    await appendCombatLog(app, file, logEntry);

    // Rebuild combat section to reflect changes
    await regenerateEncounterNote(app, file, fm, initiatives);

    new Notice(`✅ Action completed: ${action} on ${target.name}`);
}

function updateStatus(target) {
    if (target.currentHp === 0) target.status = "dead";
    else if (target.currentHp <= Math.floor(target.maxHp * 0.25)) target.status = "critical";
    else if (target.currentHp <= Math.floor(target.maxHp * 0.5)) target.status = "bloodied";
    else target.status = "healthy";
}

async function appendCombatLog(app, file, logEntry) {
    let content = await app.vault.read(file);

    if (content.includes("## Combat Log")) {
        content = content.replace(/(## Combat Log\n)/, `$1- ${logEntry}\n`);
    } else {
        content += `\n\n## Combat Log\n- ${logEntry}\n`;
    }

    await app.vault.modify(file, content);
}

async function regenerateEncounterNote(app, file, fm, initiativesArray) {
    const initiatives = initiativesArray || fm.initiatives || [];
    let content = await app.vault.read(file);

    // Remove old status block
    content = content.replace(/## Combat Status:[\s\S]*?(?=## Combat Log|$)/, '');

    // Build new table
    let tracker = `\n---\n\n## Combat Status: ⚔️ In Combat (Round ${fm.round || 1})\n\n`;
    tracker += "| Combatant | Initiative | HP | AC | Speed | Status | Actions |\n";
    tracker += "|-----------|------------|----|----|-------|--------|---------|\n";

    for (const entry of initiatives) {
        const name = entry.name || entry.label || "Unknown";
        const initiative = entry.initiative || 0;
        const hp = entry.type === "monster" ? `${entry.currentHp}/${entry.maxHp}` : "--";
        const ac = entry.type === "monster" ? entry.ac || "--" : "--";
        const speed = entry.type === "monster" ? entry.speed || "--" : "--";
        const status = entry.status || "healthy";

        // Use label for monsters, clean name for characters
        const label = entry.label || name.replace(/\[\[|\]\]/g, '');

        // HTML button with onclick
        const button = `<button onclick="window.triggerCombatAction('${label}', 'damage')" style="padding: 2px 8px; cursor: pointer;">DMG</button>`;

        tracker += `| ${name} | ${initiative} | ${hp} | ${ac} | ${speed} | ${status} | ${button} |\n`;
    }

    content += tracker + "\n";
    await app.vault.modify(file, content);
}

module.exports = combatActions;
