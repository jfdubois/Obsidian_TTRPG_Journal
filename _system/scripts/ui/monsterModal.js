const CR_TO_XP = {
    '0': 0, '10': 0,
    '1/8': 25,
    '1/4': 50,
    '1/2': 100,
    '1': 200,
    '2': 450,
    '3': 700,
    '4': 1100,
    '5': 1800,
    '6': 2300,
    '7': 2900,
    '8': 3900,
    '9': 5000,
    '10': 5900,
    '11': 7200,
    '12': 8400,
    '13': 10000,
    '14': 11500,
    '15': 13000,
    '16': 15000,
    '17': 18000,
    '18': 20000,
    '19': 22000,
    '20': 25000,
    '21': 33000,
    '22': 41000,
    '23': 50000,
    '24': 62000,
    '25': 75000,
    '26': 90000,
    '27': 105000,
    '28': 120000,
    '29': 135000,
    '30': 155000
};

function parseCR(cr) {
    if (typeof cr === 'number') return cr;
    if (cr === '0') return 0;
    if (cr.includes('/')) {
        const [num, denom] = cr.split('/').map(Number);
        return num / denom;
    }
    return parseFloat(cr) || 0;
}

function calculateXP(cr) {
    let crValue = cr;
    if (typeof cr === 'object' && cr !== null && cr.cr) {
        crValue = cr.cr;
    }
    const crStr = String(crValue);
    return CR_TO_XP[crStr] || 0;
}

function calculateProficiencyBonus(cr) {
    let crValue = cr;
    if (typeof cr === 'object' && cr !== null && cr.cr) {
        crValue = cr.cr;
    }

    const crStr = String(crValue);
    let crNum;

    if (crStr === '0') {
        crNum = 0;
    } else if (crStr.includes('/')) {
        const [num, denom] = crStr.split('/').map(Number);
        crNum = num / denom;
    } else {
        crNum = parseFloat(crStr) || 0;
    }

    if (crNum <= 4) return 2;
    if (crNum <= 8) return 3;
    if (crNum <= 12) return 4;
    if (crNum <= 16) return 5;
    if (crNum <= 20) return 6;
    if (crNum <= 24) return 7;
    if (crNum <= 28) return 8;
    return 9;
}

function formatModifier(score) {
    if (!score) return '+0';
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : String(mod);
}

function parseACValue(ac) {
    if (!ac) return 'Unknown';
    if (typeof ac === 'number') return String(ac);
    if (Array.isArray(ac) && ac.length > 0) {
        const acObj = ac[0];
        if (typeof acObj === 'number') return String(acObj);
        if (acObj.ac) {
            let display = String(acObj.ac);
            if (acObj.from && acObj.from.length > 0) {
                display += ` (${acObj.from.join(', ')})`;
            }
            return display;
        }
    }
    return 'Unknown';
}

function parseSpeedValue(speed) {
    if (!speed) return 'Unknown';
    if (typeof speed === 'string') return speed;
    if (typeof speed === 'object') {
        return Object.entries(speed)
            .map(([type, value]) => {
                if (typeof value === 'number') return `${type} ${value} ft.`;
                if (typeof value === 'object' && value.number) {
                    return `${type} ${value.number} ft.${value.condition ? ` (${value.condition})` : ''}`;
                }
                return `${type} ${value}`;
            })
            .join(', ');
    }
    return 'Unknown';
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatResistances(resistArray) {
    if (!resistArray || !Array.isArray(resistArray)) return '';

    const parts = resistArray.map(item => {
        if (typeof item === 'string') return item;
        if (typeof item === 'object') {
            if (item.resist) {
                const base = Array.isArray(item.resist) ? item.resist.join(', ') : item.resist;
                if (item.note) return `${base} (${item.note})`;
                if (item.preNote) return `${item.preNote} ${base}`;
                return base;
            }
            if (item.special) return item.special;
        }
        return String(item);
    });

    return parts.join('; ');
}

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

async function loadBestiaryData(app, monsterName, preferredSource = null) {
    const sourcesFile = app.vault.getAbstractFileByPath("_system/srd/sources.md");
    if (!sourcesFile) {
        throw new Error("sources.md not found");
    }

    const sourcesContent = await app.vault.read(sourcesFile);
    const enabledSources = parseEnabledSources(sourcesContent);

    const indexFile = app.vault.getAbstractFileByPath("_system/srd/5etools-src/data/bestiary/index.json");
    if (!indexFile) {
        throw new Error("bestiary index.json not found");
    }

    const index = JSON.parse(await app.vault.read(indexFile));

    if (preferredSource) {
        const bestiaryFile = index[preferredSource];
        if (bestiaryFile) {
            const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;
            const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

            if (bestiaryFileObj) {
                try {
                    const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
                    if (bestiaryData.monster) {
                        const monsterData = bestiaryData.monster.find(m => m.name === monsterName && m.source === preferredSource);
                        if (monsterData) return monsterData;
                    }
                } catch (error) {
                    console.error(`Error loading ${bestiaryPath}:`, error);
                }
            }
        }
    }

    for (const source of enabledSources) {
        const bestiaryFile = index[source];
        if (!bestiaryFile) continue;

        const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;
        const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);

        if (bestiaryFileObj) {
            try {
                const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));
                if (bestiaryData.monster) {
                    const monsterData = bestiaryData.monster.find(m => m.name === monsterName);
                    if (monsterData) return monsterData;
                }
            } catch (error) {
                console.error(`Error loading ${bestiaryPath}:`, error);
            }
        }
    }

    return null;
}

const fluffCache = {};

async function loadFluffData(app, monsterName, source) {
    try {
        const fluffIndexPath = "_system/srd/5etools-src/data/bestiary/fluff-index.json";
        const fluffIndexFile = app.vault.getAbstractFileByPath(fluffIndexPath);

        if (!fluffIndexFile) {
            console.warn("Fluff index not found");
            return null;
        }

        const fluffIndex = JSON.parse(await app.vault.read(fluffIndexFile));
        const fluffFile = fluffIndex[source];

        if (!fluffFile) {
            console.warn(`No fluff file for source: ${source}`);
            return null;
        }

        if (!fluffCache[fluffFile]) {
            const fluffPath = `_system/srd/5etools-src/data/bestiary/${fluffFile}`;
            const fluffFileObj = app.vault.getAbstractFileByPath(fluffPath);

            if (!fluffFileObj) {
                console.warn(`Fluff file not found: ${fluffPath}`);
                return null;
            }

            const fluffData = JSON.parse(await app.vault.read(fluffFileObj));
            fluffCache[fluffFile] = fluffData;
        }

        const fluffData = fluffCache[fluffFile];
        if (fluffData.monster) {
            return fluffData.monster.find(m => m.name === monsterName && m.source === source);
        }

        return null;
    } catch (error) {
        console.warn('Failed to load fluff data:', error);
        return null;
    }
}

async function loadMonsterData(app, monsterName, preferredSource = null) {
    const monsterData = await loadBestiaryData(app, monsterName, preferredSource);
    if (!monsterData) return null;

    const fluffData = await loadFluffData(app, monsterName, monsterData.source);

    return {
        ...monsterData,
        fluff: fluffData,
        environment: monsterData.environment || fluffData?.environment
    };
}

function createModalStructure(monsterData) {
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
    modalContent.style.width = '700px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'hidden';
    modalContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'column';
    modalContent.style.fontFamily = 'var(--font-interface)';
    modalContent.style.fontSize = '14px';

    const header = createHeader(monsterData);
    const tabContainer = createTabContainer();
    const contentContainer = document.createElement('div');
    contentContainer.style.flex = '1';
    contentContainer.style.overflow = 'auto';
    contentContainer.style.padding = '20px';

    const statsContent = renderStatsTab(monsterData);
    const actionsContent = renderActionsTab(monsterData);
    const infoContent = renderInfoTab(monsterData);

    statsContent.style.display = 'block';
    actionsContent.style.display = 'none';
    infoContent.style.display = 'none';

    contentContainer.appendChild(statsContent);
    contentContainer.appendChild(actionsContent);
    contentContainer.appendChild(infoContent);

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
    closeButton.style.zIndex = '10';
    closeButton.onclick = () => document.body.removeChild(modal);

    setupTabNavigation(tabContainer, [statsContent, actionsContent, infoContent]);

    header.style.position = 'relative';
    header.appendChild(closeButton);
    modalContent.appendChild(header);
    modalContent.appendChild(tabContainer);
    modalContent.appendChild(contentContainer);
    modal.appendChild(modalContent);

    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };

    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', closeOnEsc);
        }
    });

    return modal;
}

function createHeader(monsterData) {
    const header = document.createElement('div');
    header.style.padding = '20px 20px 10px 20px';
    header.style.borderBottom = `2px solid var(--background-modifier-border)`;

    const nameH1 = document.createElement('h1');
    nameH1.textContent = monsterData.name;
    nameH1.style.margin = '0 0 5px 0';
    nameH1.style.fontSize = '1.5em';
    nameH1.style.fontWeight = 'bold';
    nameH1.style.color = 'var(--text-normal)';

    const typeDiv = document.createElement('div');
    typeDiv.style.fontStyle = 'italic';
    typeDiv.style.color = 'var(--text-muted)';
    typeDiv.style.fontSize = '0.95em';

    const size = monsterData.size?.[0] || 'Unknown';
    const type = monsterData.type?.type || monsterData.type || 'Unknown';
    const alignment = Array.isArray(monsterData.alignment)
        ? monsterData.alignment.map(a => a.special || a).join(', ')
        : monsterData.alignment || 'Unknown';

    typeDiv.textContent = `${size} ${type}, ${alignment}`;

    const sourceDiv = document.createElement('div');
    sourceDiv.textContent = monsterData.source;
    sourceDiv.style.fontSize = '0.8em';
    sourceDiv.style.color = 'var(--text-muted)';
    sourceDiv.style.marginTop = '5px';

    header.appendChild(nameH1);
    header.appendChild(typeDiv);
    header.appendChild(sourceDiv);

    return header;
}

function createTabContainer() {
    const tabContainer = document.createElement('div');
    tabContainer.style.display = 'flex';
    tabContainer.style.borderBottom = `1px solid var(--background-modifier-border)`;
    tabContainer.style.backgroundColor = 'var(--background-secondary)';

    const tabNames = ['Stats', 'Actions', 'Info'];
    const tabs = [];

    tabNames.forEach((name, index) => {
        const tab = document.createElement('button');
        tab.textContent = name;
        tab.style.flex = '1';
        tab.style.padding = '10px 20px';
        tab.style.border = 'none';
        tab.style.backgroundColor = index === 0 ? 'var(--background-primary)' : 'var(--background-secondary)';
        tab.style.color = 'var(--text-normal)';
        tab.style.cursor = 'pointer';
        tab.style.fontSize = '14px';
        tab.style.fontFamily = 'var(--font-interface)';
        tab.style.borderBottom = index === 0 ? `2px solid var(--interactive-accent)` : 'none';
        tab.style.transition = 'background-color 0.2s ease';
        tab.dataset.tabIndex = index;

        if (index === 0) {
            tab.classList.add('active');
        }

        tabContainer.appendChild(tab);
        tabs.push(tab);
    });

    tabContainer.tabs = tabs;
    return tabContainer;
}

function setupTabNavigation(tabContainer, contentPanels) {
    tabContainer.tabs.forEach((tab, index) => {
        tab.onmouseover = () => {
            if (!tab.classList.contains('active')) {
                tab.style.backgroundColor = 'var(--background-modifier-hover)';
            }
        };
        tab.onmouseout = () => {
            if (!tab.classList.contains('active')) {
                tab.style.backgroundColor = 'var(--background-secondary)';
            }
        };
        tab.onclick = () => {
            tabContainer.tabs.forEach((t, i) => {
                t.classList.remove('active');
                t.style.backgroundColor = 'var(--background-secondary)';
                t.style.borderBottom = 'none';
                contentPanels[i].style.display = 'none';
            });

            tab.classList.add('active');
            tab.style.backgroundColor = 'var(--background-primary)';
            tab.style.borderBottom = `2px solid var(--interactive-accent)`;
            contentPanels[index].style.display = 'block';
        };
    });
}

function renderStatsTab(monsterData) {
    const container = document.createElement('div');
    container.className = 'monster-modal-tab-content';

    const acInit = document.createElement('div');
    acInit.style.display = 'flex';
    acInit.style.justifyContent = 'space-between';
    acInit.style.marginBottom = '10px';

    const ac = document.createElement('div');
    ac.innerHTML = `<strong>AC</strong> ${parseACValue(monsterData.ac)}`;

    const init = document.createElement('div');
    const dexMod = monsterData.dex ? Math.floor((monsterData.dex - 10) / 2) : 0;
    let initBonus = dexMod;

    if (monsterData.initiative && monsterData.initiative.proficiency) {
        const pb = calculateProficiencyBonus(monsterData.cr);
        const profMult = monsterData.initiative.proficiency;
        initBonus += pb * profMult;
    }

    const initMod = initBonus >= 0 ? `+${initBonus}` : String(initBonus);
    init.innerHTML = `<strong>Initiative</strong> ${initMod}`;

    acInit.appendChild(ac);
    acInit.appendChild(init);

    const hp = document.createElement('div');
    hp.style.marginBottom = '10px';
    hp.innerHTML = `<strong>HP</strong> ${monsterData.hp ? `${monsterData.hp.average} (${monsterData.hp.formula})` : 'Unknown'}`;

    const speed = document.createElement('div');
    speed.style.marginBottom = '15px';
    speed.innerHTML = `<strong>Speed</strong> ${parseSpeedValue(monsterData.speed)}`;

    const abilityGrid = createAbilityGrid(monsterData);

    container.appendChild(acInit);
    container.appendChild(hp);
    container.appendChild(speed);
    container.appendChild(abilityGrid);

    if (monsterData.skill && Object.keys(monsterData.skill).length > 0) {
        const skills = document.createElement('div');
        skills.style.marginTop = '15px';
        skills.style.marginBottom = '10px';
        const skillStr = Object.entries(monsterData.skill)
            .map(([skill, bonus]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} ${bonus}`)
            .join(', ');
        skills.innerHTML = `<strong>Skills</strong> ${skillStr}`;
        container.appendChild(skills);
    }

    const resistInfo = [
        { key: 'immune', label: 'Damage Immunities' },
        { key: 'resist', label: 'Damage Resistances' },
        { key: 'vulnerable', label: 'Damage Vulnerabilities' },
        { key: 'conditionImmune', label: 'Condition Immunities' }
    ];

    resistInfo.forEach(({ key, label }) => {
        if (monsterData[key]) {
            const elem = document.createElement('div');
            elem.style.marginBottom = '10px';
            const value = Array.isArray(monsterData[key])
                ? formatResistances(monsterData[key])
                : String(monsterData[key]);
            elem.innerHTML = `<strong>${label}</strong> ${value}`;
            container.appendChild(elem);
        }
    });

    if (monsterData.senses) {
        const senses = document.createElement('div');
        senses.style.marginBottom = '10px';
        const senseStr = Array.isArray(monsterData.senses) ? monsterData.senses.join(', ') : monsterData.senses;
        senses.innerHTML = `<strong>Senses</strong> ${parseSRDPlaceholders(senseStr)}`;
        container.appendChild(senses);
    }

    if (monsterData.languages) {
        const languages = document.createElement('div');
        languages.style.marginBottom = '10px';
        const langStr = Array.isArray(monsterData.languages) ? monsterData.languages.join(', ') : monsterData.languages;
        languages.innerHTML = `<strong>Languages</strong> ${langStr || '—'}`;
        container.appendChild(languages);
    }

    const cr = document.createElement('div');
    cr.style.marginTop = '15px';
    cr.style.marginBottom = '10px';
    let crValue = monsterData.cr || 'Unknown';
    if (typeof crValue === 'object' && crValue !== null && crValue.cr) {
        crValue = crValue.cr;
    }
    const xp = calculateXP(monsterData.cr);
    const pb = calculateProficiencyBonus(monsterData.cr);
    const xpFormatted = xp.toLocaleString();
    cr.innerHTML = `<strong>CR</strong> ${crValue} (XP ${xpFormatted}, PB +${pb})`;
    container.appendChild(cr);

    return container;
}

function createAbilityGrid(monsterData) {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '15px';
    table.style.marginBottom = '15px';

    const tbody = document.createElement('tbody');

    const headerRow = tbody.insertRow();
    const abilityGroups = [
        ['str', 'Str'],
        ['dex', 'Dex'],
        ['con', 'Con']
    ];

    abilityGroups.forEach((group, idx) => {
        const [key, label] = group;

        const lblCell = headerRow.insertCell();
        lblCell.style.textAlign = 'right';
        lblCell.style.padding = '2px 4px';

        const scoreCell = headerRow.insertCell();
        scoreCell.style.textAlign = 'center';
        scoreCell.style.padding = '2px 4px';

        const modCell = headerRow.insertCell();
        modCell.style.textAlign = 'center';
        modCell.style.padding = '2px 4px';
        const modDiv = document.createElement('div');
        modDiv.textContent = 'mod';
        modDiv.style.color = 'var(--text-muted)';
        modDiv.style.fontSize = '0.7em';
        modDiv.style.textTransform = 'uppercase';
        modCell.appendChild(modDiv);

        const saveCell = headerRow.insertCell();
        saveCell.style.textAlign = 'center';
        saveCell.style.padding = '2px 4px';
        const saveDiv = document.createElement('div');
        saveDiv.textContent = 'save';
        saveDiv.style.color = 'var(--text-muted)';
        saveDiv.style.fontSize = '0.7em';
        saveDiv.style.textTransform = 'uppercase';
        saveCell.appendChild(saveDiv);

        if (idx < abilityGroups.length - 1) {
            const spacerCell = headerRow.insertCell();
            spacerCell.style.width = '10px';
        }
    });

    const dataRow = tbody.insertRow();
    abilityGroups.forEach((group, idx) => {
        const [key, label] = group;
        const score = monsterData[key];

        const lblCell = dataRow.insertCell();
        const lblDiv = document.createElement('div');
        lblDiv.textContent = label;
        lblDiv.style.fontWeight = 'bold';
        lblDiv.style.fontSize = '0.75em';
        lblDiv.style.textTransform = 'uppercase';
        lblDiv.style.textAlign = 'right';
        lblDiv.style.paddingRight = '4px';
        lblCell.appendChild(lblDiv);

        const scoreCell = dataRow.insertCell();
        scoreCell.style.textAlign = 'center';
        scoreCell.style.padding = '2px 4px';
        const scoreDiv = document.createElement('div');
        scoreDiv.textContent = score || '—';
        scoreDiv.style.fontWeight = 'bold';
        scoreCell.appendChild(scoreDiv);

        const modCell = dataRow.insertCell();
        modCell.style.textAlign = 'center';
        modCell.style.padding = '2px 4px';
        const modDiv = document.createElement('div');
        if (score) {
            const mod = Math.floor((score - 10) / 2);
            modDiv.textContent = mod >= 0 ? `+${mod}` : String(mod);
        } else {
            modDiv.textContent = '—';
        }
        modCell.appendChild(modDiv);

        const saveCell = dataRow.insertCell();
        saveCell.style.textAlign = 'center';
        saveCell.style.padding = '2px 4px';
        const saveDiv = document.createElement('div');
        const save = monsterData.save && monsterData.save[key];
        if (save) {
            saveDiv.textContent = save;
            saveDiv.style.fontWeight = 'bold';
        } else {
            saveDiv.textContent = '—';
            saveDiv.style.opacity = '0.5';
        }
        saveCell.appendChild(saveDiv);

        if (idx < abilityGroups.length - 1) {
            const spacerCell = dataRow.insertCell();
        }
    });

    const dataRow2 = tbody.insertRow();
    const abilityGroups2 = [
        ['int', 'Int'],
        ['wis', 'Wis'],
        ['cha', 'Cha']
    ];

    abilityGroups2.forEach((group, idx) => {
        const [key, label] = group;
        const score = monsterData[key];

        const lblCell = dataRow2.insertCell();
        const lblDiv = document.createElement('div');
        lblDiv.textContent = label;
        lblDiv.style.fontWeight = 'bold';
        lblDiv.style.fontSize = '0.75em';
        lblDiv.style.textTransform = 'uppercase';
        lblDiv.style.textAlign = 'right';
        lblDiv.style.paddingRight = '4px';
        lblCell.appendChild(lblDiv);

        const scoreCell = dataRow2.insertCell();
        scoreCell.style.textAlign = 'center';
        scoreCell.style.padding = '2px 4px';
        const scoreDiv = document.createElement('div');
        scoreDiv.textContent = score || '—';
        scoreDiv.style.fontWeight = 'bold';
        scoreCell.appendChild(scoreDiv);

        const modCell = dataRow2.insertCell();
        modCell.style.textAlign = 'center';
        modCell.style.padding = '2px 4px';
        const modDiv = document.createElement('div');
        if (score) {
            const mod = Math.floor((score - 10) / 2);
            modDiv.textContent = mod >= 0 ? `+${mod}` : String(mod);
        } else {
            modDiv.textContent = '—';
        }
        modCell.appendChild(modDiv);

        const saveCell = dataRow2.insertCell();
        saveCell.style.textAlign = 'center';
        saveCell.style.padding = '2px 4px';
        const saveDiv = document.createElement('div');
        const save = monsterData.save && monsterData.save[key];
        if (save) {
            saveDiv.textContent = save;
            saveDiv.style.fontWeight = 'bold';
        } else {
            saveDiv.textContent = '—';
            saveDiv.style.opacity = '0.5';
        }
        saveCell.appendChild(saveDiv);

        if (idx < abilityGroups2.length - 1) {
            const spacerCell = dataRow2.insertCell();
        }
    });

    table.appendChild(tbody);
    return table;
}

function parseSRDPlaceholders(text) {
    if (!text) return '';

    text = text.replace(/{@b ([^}]+)}/g, '<strong>$1</strong>');
    text = text.replace(/{@i ([^}]+)}/g, '<em>$1</em>');

    text = text.replace(/{@atk mw}/g, 'Melee Weapon Attack:');
    text = text.replace(/{@atk rw}/g, 'Ranged Weapon Attack:');
    text = text.replace(/{@atk ms}/g, 'Melee Spell Attack:');
    text = text.replace(/{@atkr m}/g, 'Melee Attack Roll:');

    text = text.replace(/{@hit ([^}]+)}/g, '<span style="color: var(--text-accent);">$1</span>');
    text = text.replace(/{@damage ([^}]+)}/g, '<span style="color: var(--text-accent);">$1</span>');
    text = text.replace(/{@dice ([^}]+)}/g, '<span style="color: var(--text-accent);">$1</span>');
    text = text.replace(/{@dc ([^}]+)}/g, 'DC $1');

    text = text.replace(/{@variantrule ([^|}]+)(?:\|[^}]+)?}/g, '$1');
    text = text.replace(/{@(?:creature|spell|item|skill|condition|status|book) ([^|}]+)(?:\|[^}]+)?}/g, '<em>$1</em>');

    text = text.replace(/{@h}/g, '');

    return text;
}

function parseActionEntry(entries) {
    if (!entries) return 'No description available';

    let text = Array.isArray(entries) ? entries.join(' ') : String(entries);

    text = parseSRDPlaceholders(text);

    text = text.replace(/(\d+d\d+(?:\s*[+\-]\s*\d+)?)/gi, (match) =>
        `<span style="color: var(--text-accent);">${match}</span>`
    );
    text = text.replace(/\+(\d+) to hit/gi, (match, bonus) =>
        `<span style="color: var(--interactive-accent); font-weight: bold;">+${bonus}</span> to hit`
    );
    text = text.replace(/DC (\d+)/gi, (match, dc) =>
        `<span style="color: var(--interactive-accent); font-weight: bold;">DC ${dc}</span>`
    );
    text = text.replace(/\(Recharge ([^)]+)\)/gi, (match) =>
        `<span style="font-size: 0.9em; color: var(--text-muted);">${match}</span>`
    );

    return text;
}

function renderActionsTab(monsterData) {
    const container = document.createElement('div');
    container.className = 'monster-modal-tab-content';

    const sections = [
        { key: 'trait', title: 'Traits' },
        { key: 'action', title: 'Actions' },
        { key: 'bonus', title: 'Bonus Actions' },
        { key: 'reaction', title: 'Reactions' },
        { key: 'legendary', title: 'Legendary Actions' },
        { key: 'mythic', title: 'Mythic Actions' }
    ];

    sections.forEach(({ key, title }) => {
        if (monsterData[key] && monsterData[key].length > 0) {
            const section = document.createElement('div');
            section.style.marginBottom = '20px';

            const header = document.createElement('h3');
            header.textContent = title;
            header.style.margin = '0 0 10px 0';
            header.style.fontSize = '1.2em';
            header.style.color = 'var(--text-normal)';
            header.style.borderBottom = `1px solid var(--background-modifier-border)`;
            header.style.paddingBottom = '5px';
            section.appendChild(header);

            if (key === 'legendary' && monsterData.legendaryHeader) {
                const preamble = document.createElement('div');
                preamble.style.marginBottom = '10px';
                preamble.style.fontStyle = 'italic';
                preamble.innerHTML = parseActionEntry(monsterData.legendaryHeader);
                section.appendChild(preamble);
            }

            monsterData[key].forEach(item => {
                const actionDiv = document.createElement('div');
                actionDiv.style.marginBottom = '10px';
                actionDiv.style.lineHeight = '1.5';

                const name = document.createElement('strong');
                name.textContent = `${item.name}.`;
                actionDiv.appendChild(name);

                const description = document.createElement('span');
                description.innerHTML = ' ' + parseActionEntry(item.entries);
                actionDiv.appendChild(description);

                section.appendChild(actionDiv);
            });

            container.appendChild(section);
        }
    });

    if (container.children.length === 0) {
        const noActions = document.createElement('div');
        noActions.textContent = 'No actions available';
        noActions.style.fontStyle = 'italic';
        noActions.style.color = 'var(--text-muted)';
        container.appendChild(noActions);
    }

    return container;
}

function renderInfoTab(monsterData) {
    const container = document.createElement('div');
    container.className = 'monster-modal-tab-content';

    if (monsterData.fluff && monsterData.fluff.entries) {
        const description = document.createElement('div');
        description.style.marginBottom = '20px';
        description.style.lineHeight = '1.6';

        const renderEntries = (entries) => {
            entries.forEach(entry => {
                if (typeof entry === 'string') {
                    const p = document.createElement('p');
                    p.textContent = entry;
                    p.style.marginBottom = '10px';
                    description.appendChild(p);
                } else if (typeof entry === 'object') {
                    if (entry.type === 'entries' && entry.entries) {
                        if (entry.name) {
                            const h4 = document.createElement('h4');
                            h4.textContent = entry.name;
                            h4.style.marginTop = '15px';
                            h4.style.marginBottom = '5px';
                            description.appendChild(h4);
                        }
                        renderEntries(entry.entries);
                    } else if (entry.entries) {
                        renderEntries(entry.entries);
                    }
                }
            });
        };

        renderEntries(monsterData.fluff.entries);
        container.appendChild(description);
    }

    if (monsterData.environment && monsterData.environment.length > 0) {
        const env = document.createElement('div');
        env.style.marginBottom = '15px';
        const envStr = Array.isArray(monsterData.environment)
            ? monsterData.environment.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ')
            : String(monsterData.environment);
        env.innerHTML = `<strong>Environment:</strong> ${envStr}`;
        container.appendChild(env);
    }

    if (container.children.length === 0) {
        const noInfo = document.createElement('div');
        noInfo.textContent = 'No additional lore available for this creature';
        noInfo.style.fontStyle = 'italic';
        noInfo.style.color = 'var(--text-muted)';
        container.appendChild(noInfo);
    }

    return container;
}

export async function showMonsterModal(app, monsterName, source = null) {
    try {
        const monsterData = await loadMonsterData(app, monsterName, source);

        if (!monsterData) {
            alert(`Monster "${monsterName}" not found in enabled sources!`);
            return;
        }

        const modal = createModalStructure(monsterData);
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error showing monster modal:', error);
        alert(`Failed to load monster data: ${error.message}`);
    }
}

if (typeof window !== 'undefined') {
    window.showMonsterModal = showMonsterModal;
}
