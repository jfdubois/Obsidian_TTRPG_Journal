module.exports = async function combatDamage(params) {
    const { app, quickAddApi } = params;

    const file = app.workspace.getActiveFile();
    const cache = app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;

    if (!fm || fm.status !== "inCombat") {
        new Notice("Not in combat!");
        return;
    }

    const initiatives = fm.initiatives || [];

    // Get target selection with descriptive labels
    const targetChoices = initiatives.map(i => {
        const name = i.name ? i.name.replace(/\[\[|\]\]/g, '') : 'Unknown';
        const hp = i.type === "monster" ? ` [${i.currentHp}/${i.maxHp} HP]` : '';
        const label = i.label ? ` (${i.label})` : '';
        return `Target: ${name}${label}${hp}`; // Added emoji and "TARGET:" prefix
    });
    const targetLabels = initiatives.map(i => i.label || i.name.replace(/\[\[|\]\]/g, ''));

    const targetLabel = await quickAddApi.suggester(targetChoices, targetLabels);
    if (!targetLabel) return;

    const target = initiatives.find(i =>
    i.label === targetLabel ||
    (i.name && i.name.replace(/\[\[|\]\]/g, '') === targetLabel)
    );

    if (!target) {
        new Notice("Target not found!");
        return;
    }

    // Get source with descriptive labels
    const combatantNames = initiatives.map(i => {
        const name = i.name ? i.name.replace(/\[\[|\]\]/g, '') : 'Unknown';
        const label = i.label ? ` (${i.label})` : '';
        return `Source:¸ ${name}${label}`; // Added emoji and "ATTACKER:" prefix
    });

    const source = await quickAddApi.suggester(combatantNames, combatantNames.map(n => n.replace('⚔️ ', '')));
    if (!source) return;

    const amount = await quickAddApi.inputPrompt("Damage amount:");
    if (!amount) return;
    const damageAmount = parseInt(amount);
    if (isNaN(damageAmount) || damageAmount < 1) {
        new Notice("Invalid amount!");
        return;
    }

    const damageTypes = [
        "🗡️ Slashing",
        "🏹 Piercing",
        "🔨 Bludgeoning",
        "🔥 Fire",
        "❄️ Cold",
        "⚡ Lightning",
        "💨 Thunder",
        "☠️ Poison",
        "🧪 Acid",
        "🧠 Psychic",
        "✨ Force",
        "☀️ Radiant",
        "💀 Necrotic"
    ];
    const damageTypeValues = [
        "Slashing", "Piercing", "Bludgeoning",
        "Fire", "Cold", "Lightning", "Thunder",
        "Poison", "Acid", "Psychic", "Force",
        "Radiant", "Necrotic"
    ];

    const damageType = await quickAddApi.suggester(damageTypes, damageTypeValues);
    if (!damageType) return;

    // Apply damage
    const oldHp = target.currentHp;
    target.currentHp = Math.max(0, target.currentHp - damageAmount);

    // Update status
    if (target.currentHp === 0) target.status = "dead";
    else if (target.currentHp <= Math.floor(target.maxHp * 0.25)) target.status = "critical";
    else if (target.currentHp <= Math.floor(target.maxHp * 0.5)) target.status = "bloodied";
    else target.status = "healthy";

    // Save to frontmatter
    await app.fileManager.processFrontMatter(file, fm => {
        fm.initiatives = initiatives;
    });

    // Append to combat log
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const logEntry = `- ${timestamp}: ${source} did ${damageAmount} ${damageType} damage to ${target.name} (${oldHp} → ${target.currentHp}/${target.maxHp})\n`;

    let content = await app.vault.read(file);
    if (content.includes("## Combat Log")) {
        content = content.replace(/(## Combat Log\n)/, `$1${logEntry}`);
    } else {
        content += `\n\n## Combat Log\n${logEntry}`;
    }
    await app.vault.modify(file, content);

    new Notice(`${target.name} took ${damageAmount} ${damageType} damage!`);
};
