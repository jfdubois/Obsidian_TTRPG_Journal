function parseEnabledSources(content) {
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

export async function showMonsterModal(app, monsterName) {
    const sourcesFile = app.vault.getAbstractFileByPath("_system/srd/sources.md");
    if (!sourcesFile) {
        alert("Error: sources.md not found!");
        return;
    }

    const sourcesContent = await app.vault.read(sourcesFile);
    const enabledSources = parseEnabledSources(sourcesContent);

    const indexFile = app.vault.getAbstractFileByPath("_system/srd/5etools-src/data/bestiary/index.json");
    if (!indexFile) {
        alert("Error: bestiary index.json not found!");
        return;
    }

    const index = JSON.parse(await app.vault.read(indexFile));

    let monsterData = null;
    for (const source of enabledSources) {
        const bestiaryFile = index[source];
        if (!bestiaryFile) continue;

        const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;
        const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

        if (bestiaryFileObj) {
            try {
                const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
                if (bestiaryData.monster) {
                    monsterData = bestiaryData.monster.find(m => m.name === monsterName);
                    if (monsterData) break;
                }
            } catch (error) {
                console.error(`Error loading ${bestiaryPath}:`, error);
            }
        }
    }

    if (!monsterData) {
        alert(`Monster ${monsterName} not found in enabled sources!`);
        return;
    }

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.style.padding = '20px';
    modal.style.boxSizing = 'border-box';

    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'var(--background-primary)';
    modalContent.style.borderRadius = '8px';
    modalContent.style.padding = '20px';
    modalContent.style.maxWidth = '600px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';
    modalContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    modalContent.style.position = 'relative';

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.color = 'var(--text-muted)';
    closeButton.onclick = () => document.body.removeChild(modal);

    const statTable = document.createElement('table');
    statTable.style.width = '100%';
    statTable.style.borderCollapse = 'collapse';
    statTable.style.fontSize = '0.9em';
    statTable.style.lineHeight = '1.4';

    const headerRow = statTable.insertRow();
    headerRow.style.borderBottom = '2px solid var(--text-muted)';
    const headerCell = headerRow.insertCell();
    headerCell.colSpan = 6;
    headerCell.style.textAlign = 'left';
    headerCell.style.padding = '10px 0';

    const nameDiv = document.createElement('div');
    nameDiv.style.display = 'flex';
    nameDiv.style.justifyContent = 'space-between';
    nameDiv.style.alignItems = 'center';

    const nameH1 = document.createElement('h1');
    nameH1.textContent = monsterData.name;
    nameH1.style.margin = '0';
    nameH1.style.fontSize = '1.5em';
    nameH1.style.fontWeight = 'bold';

    const sourceDiv = document.createElement('div');
    sourceDiv.textContent = monsterData.source;
    sourceDiv.style.fontSize = '0.8em';
    sourceDiv.style.color = 'var(--text-muted)';

    nameDiv.appendChild(nameH1);
    nameDiv.appendChild(sourceDiv);
    headerCell.appendChild(nameDiv);

    const typeRow = statTable.insertRow();
    const typeCell = typeRow.insertCell();
    typeCell.colSpan = 6;
    typeCell.style.padding = '5px 0';
    typeCell.style.fontStyle = 'italic';
    typeCell.textContent = `${monsterData.size?.[0] || 'Unknown'} ${monsterData.type || 'Unknown'}, ${monsterData.alignment?.join(', ') || 'Unknown'}`;

    const acRow = statTable.insertRow();
    const acCell = acRow.insertCell();
    acCell.colSpan = 3;
    acCell.style.padding = '5px 0';
    let acDisplay = 'Unknown';
    if (monsterData.ac) {
        if (Array.isArray(monsterData.ac) && monsterData.ac.length > 0) {
            const acObj = monsterData.ac[0];
            if (acObj.ac) {
                acDisplay = acObj.ac;
                if (acObj.from && acObj.from.length > 0) {
                    acDisplay += ` (${acObj.from.join(', ')})`;
                }
            }
        } else if (typeof monsterData.ac === 'number') {
            acDisplay = monsterData.ac;
        }
    }
    acCell.innerHTML = `<strong>AC</strong> ${acDisplay}`;

    const initCell = acRow.insertCell();
    initCell.colSpan = 3;
    initCell.style.padding = '5px 0';
    initCell.innerHTML = `<strong>Initiative</strong> ${monsterData.dex ? Math.floor((monsterData.dex - 10) / 2) >= 0 ? '+' + Math.floor((monsterData.dex - 10) / 2) : Math.floor((monsterData.dex - 10) / 2) : 'Unknown'} (${monsterData.dex || 'Unknown'})`;

    const hpRow = statTable.insertRow();
    const hpCell = hpRow.insertCell();
    hpCell.colSpan = 6;
    hpCell.style.padding = '5px 0';
    hpCell.innerHTML = `<strong>HP</strong> ${monsterData.hp ? `${monsterData.hp.average} (${monsterData.hp.formula})` : 'Unknown'}`;

    const speedRow = statTable.insertRow();
    const speedCell = speedRow.insertCell();
    speedCell.colSpan = 6;
    speedCell.style.padding = '5px 0';
    speedCell.innerHTML = `<strong>Speed</strong> ${monsterData.speed ? Object.entries(monsterData.speed).map(([k, v]) => `${k} ${v}`).join(', ') : 'Unknown'}`;

    if (monsterData.str || monsterData.dex || monsterData.con || monsterData.int || monsterData.wis || monsterData.cha) {
        const abilityRow = statTable.insertRow();
        const abilityCell = abilityRow.insertCell();
        abilityCell.colSpan = 6;
        abilityCell.style.padding = '10px 0';

        const abilityTable = document.createElement('table');
        abilityTable.style.width = '100%';
        abilityTable.style.borderCollapse = 'collapse';

        const abilityHeaderRow = abilityTable.insertRow();
        ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.padding = '5px';
            th.style.fontSize = '0.8em';
            th.style.fontWeight = 'bold';
            th.style.textAlign = 'center';
            th.style.borderBottom = '1px solid var(--text-muted)';
            abilityHeaderRow.appendChild(th);
        });

        const scoreRow = abilityTable.insertRow();
        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
            const td = scoreRow.insertCell();
            const score = monsterData[ability];
            if (score) {
                const mod = Math.floor((score - 10) / 2);
                const modStr = mod >= 0 ? `+${mod}` : mod;
                td.textContent = `${score} (${modStr})`;
            } else {
                td.textContent = '';
            }
            td.style.padding = '5px';
            td.style.textAlign = 'center';
            td.style.fontWeight = 'bold';
        });

        const saveRow = abilityTable.insertRow();
        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {
            const td = saveRow.insertCell();
            const saveValue = monsterData.save && monsterData.save[ability];
            if (saveValue) {
                td.textContent = saveValue;
                td.style.fontWeight = 'bold';
                td.style.opacity = '0.7';
            } else {
                td.textContent = '--';
                td.style.opacity = '0.5';
            }
            td.style.padding = '5px';
            td.style.textAlign = 'center';
            td.style.fontSize = '0.9em';
        });

        abilityCell.appendChild(abilityTable);
    }

    if (monsterData.skill) {
        const skillRow = statTable.insertRow();
        const skillCell = skillRow.insertCell();
        skillCell.colSpan = 6;
        skillCell.style.padding = '5px 0';
        const skills = Object.entries(monsterData.skill).map(([skill, bonus]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} ${bonus}`).join(', ');
        skillCell.innerHTML = `<strong>Skills</strong> ${skills}`;
    }

    if (monsterData.immune || monsterData.resist || monsterData.vulnerable) {
        if (monsterData.immune) {
            const immuneRow = statTable.insertRow();
            const immuneCell = immuneRow.insertCell();
            immuneCell.colSpan = 6;
            immuneCell.style.padding = '5px 0';
            immuneCell.innerHTML = `<strong>Immunities</strong> ${monsterData.immune.join(', ')}`;
        }
        if (monsterData.resist) {
            const resistRow = statTable.insertRow();
            const resistCell = resistRow.insertCell();
            resistCell.colSpan = 6;
            resistCell.style.padding = '5px 0';
            resistCell.innerHTML = `<strong>Resistances</strong> ${monsterData.resist.join(', ')}`;
        }
        if (monsterData.vulnerable) {
            const vulnRow = statTable.insertRow();
            const vulnCell = vulnRow.insertCell();
            vulnCell.colSpan = 6;
            vulnCell.style.padding = '5px 0';
            vulnCell.innerHTML = `<strong>Vulnerabilities</strong> ${monsterData.vulnerable.join(', ')}`;
        }
    }

    if (monsterData.senses) {
        const sensesRow = statTable.insertRow();
        const sensesCell = sensesRow.insertCell();
        sensesCell.colSpan = 6;
        sensesCell.style.padding = '5px 0';
        sensesCell.innerHTML = `<strong>Senses</strong> ${monsterData.senses.join(', ')}`;
    }

    if (monsterData.languages) {
        const langRow = statTable.insertRow();
        const langCell = langRow.insertCell();
        langCell.colSpan = 6;
        langCell.style.padding = '5px 0';
        langCell.innerHTML = `<strong>Languages</strong> ${monsterData.languages.join(', ')}`;
    }

    const crRow = statTable.insertRow();
    const crCell = crRow.insertCell();
    crCell.colSpan = 6;
    crCell.style.padding = '10px 0';
    crCell.innerHTML = `<strong>CR</strong> ${monsterData.cr || 'Unknown'}`;

    if (monsterData.action || monsterData.trait) {
        const actionsRow = statTable.insertRow();
        const actionsCell = actionsRow.insertCell();
        actionsCell.colSpan = 6;
        actionsCell.style.padding = '15px 0 5px 0';

        const actionsTitle = document.createElement('h3');
        actionsTitle.textContent = 'Actions';
        actionsTitle.style.margin = '0 0 10px 0';
        actionsTitle.style.fontSize = '1.1em';
        actionsCell.appendChild(actionsTitle);

        if (monsterData.trait) {
            monsterData.trait.forEach(trait => {
                const traitDiv = document.createElement('div');
                traitDiv.style.marginBottom = '10px';
                traitDiv.innerHTML = `<strong>${trait.name}.</strong> ${trait.entries?.join(' ') || 'No description'}`;
                actionsCell.appendChild(traitDiv);
            });
        }

        if (monsterData.action) {
            monsterData.action.forEach(action => {
                const actionDiv = document.createElement('div');
                actionDiv.style.marginBottom = '10px';
                actionDiv.innerHTML = `<strong>${action.name}.</strong> ${action.entries?.join(' ') || 'No description'}`;
                actionsCell.appendChild(actionDiv);
            });
        }
    }

    modalContent.appendChild(closeButton);
    modalContent.appendChild(statTable);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
}

if (typeof window !== 'undefined') {
    window.showMonsterModal = showMonsterModal;
}
