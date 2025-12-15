module.exports = async (params) => {
    const { quickAddApi: { inputPrompt, suggester } } = params;

    const activeFile = app.workspace.getActiveFile();
    const worldName = activeFile.path.match(/Worlds\/([^\/]+)/)[1];
    const worldFolder = `Worlds/${worldName}`;

    // Encounter Name
    const encounterName = await inputPrompt("Encounter Name:");
    if (!encounterName) return;

    // Auto-number (E0001 pattern)
    const existingEncounters = app.vault.getFiles()
    .filter(f => f.path.includes(worldFolder) && f.basename.match(/^E\d{4}_/))
    .sort();
    const lastNum = existingEncounters.length > 0
    ? parseInt(existingEncounters.last().basename.match(/E(\d{4})/)[1])
    : 0;
    const nextNum = String(lastNum + 1).padStart(4, '0');
    const fileName = `E${nextNum}_${encounterName.replace(/\s+/g, '_')}.md`;

    // Description
    const description = await inputPrompt("Brief description:");

    // Create file with frontmatter
    const filePath = `${worldFolder}/${fileName}`;
    let content = `---\n`;
    content += `type: encounter\n`;
    content += `world: ${worldName}\n`;
    content += `status: planned\n`;
    content += `session: \n`;
    content += `location: \n`;
    content += `description: ${description}\n`;
    content += `monsters: []\n`;
    content += `initiatives: []\n`;
    content += `combatLog: []\n`;
    content += `---\n\n`;

    content += `# ${encounterName}\n\n`;

    content += `## Description\n\n`;

    content += `## Additional information\n\n`;

    // Planned monsters section
    content += "## Planification\n";
    content += "\n```dataviewjs\n";
    content += "const monsters = dv.current().monsters || [];\n";
    content += "const file = app.workspace.getActiveFile();\n\n";

    content += "async function showMonsterModal(monsterName) {\n";
    content += "    const sourcesFile = app.vault.getAbstractFileByPath(\"_system/srd/sources.md\");\n";
    content += "    if (!sourcesFile) {\n";
    content += "        alert(\"Error: sources.md not found!\");\n";
    content += "        return;\n";
    content += "    }\n\n";

    content += "    const sourcesContent = await app.vault.read(sourcesFile);\n";
    content += "    const enabledSources = parseEnabledSources(sourcesContent);\n\n";

    content += "    const indexFile = app.vault.getAbstractFileByPath(\"_system/srd/5etools-src/data/bestiary/index.json\");\n";
    content += "    if (!indexFile) {\n";
    content += "        alert(\"Error: bestiary index.json not found!\");\n";
    content += "        return;\n";
    content += "    }\n\n";

    content += "    const index = JSON.parse(await app.vault.read(indexFile));\n\n";

    content += "    let monsterData = null;\n";
    content += "    for (const source of enabledSources) {\n";
    content += "        const bestiaryFile = index[source];\n";
    content += "        if (!bestiaryFile) continue;\n\n";

    content += "        const bestiaryPath = `_system/srd/5etools-src/data/bestiary/${bestiaryFile}`;\n";
    content += "        const bestiaryFileObj = app.vault.getAbstractFileByPath(bestiaryPath);\n\n";

    content += "        if (bestiaryFileObj) {\n";
    content += "            try {\n";
    content += "                const bestiaryData = JSON.parse(await app.vault.read(bestiaryFileObj));\n";
    content += "                if (bestiaryData.monster) {\n";
    content += "                    monsterData = bestiaryData.monster.find(m => m.name === monsterName);\n";
    content += "                    if (monsterData) break;\n";
    content += "                }\n";
    content += "            } catch (error) {\n";
    content += "                console.error(`Error loading ${bestiaryPath}:`, error);\n";
    content += "            }\n";
    content += "        }\n";
    content += "    }\n\n";

    content += "    if (!monsterData) {\n";
    content += "        alert(`Monster ${monsterName} not found in enabled sources!`);\n";
    content += "        return;\n";
    content += "    }\n\n";

    content += "    const modal = document.createElement('div');\n";
    content += "    modal.style.position = 'fixed';\n";
    content += "    modal.style.top = '0';\n";
    content += "    modal.style.left = '0';\n";
    content += "    modal.style.width = '100%';\n";
    content += "    modal.style.height = '100%';\n";
    content += "    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';\n";
    content += "    modal.style.display = 'flex';\n";
    content += "    modal.style.justifyContent = 'center';\n";
    content += "    modal.style.alignItems = 'center';\n";
    content += "    modal.style.zIndex = '1000';\n";
    content += "    modal.style.padding = '20px';\n";
    content += "    modal.style.boxSizing = 'border-box';\n\n";

    content += "    const modalContent = document.createElement('div');\n";
    content += "    modalContent.style.backgroundColor = 'var(--background-primary)';\n";
    content += "    modalContent.style.borderRadius = '8px';\n";
    content += "    modalContent.style.padding = '20px';\n";
    content += "    modalContent.style.maxWidth = '600px';\n";
    content += "    modalContent.style.maxHeight = '80vh';\n";
    content += "    modalContent.style.overflow = 'auto';\n";
    content += "    modalContent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';\n";
    content += "    modalContent.style.position = 'relative';\n\n";

    content += "    const closeButton = document.createElement('button');\n";
    content += "    closeButton.textContent = '×';\n";
    content += "    closeButton.style.position = 'absolute';\n";
    content += "    closeButton.style.top = '10px';\n";
    content += "    closeButton.style.right = '10px';\n";
    content += "    closeButton.style.background = 'none';\n";
    content += "    closeButton.style.border = 'none';\n";
    content += "    closeButton.style.fontSize = '24px';\n";
    content += "    closeButton.style.cursor = 'pointer';\n";
    content += "    closeButton.style.color = 'var(--text-muted)';\n";
    content += "    closeButton.onclick = () => document.body.removeChild(modal);\n\n";

    content += "    // Create stat block table\n";
    content += "    const statTable = document.createElement('table');\n";
    content += "    statTable.style.width = '100%';\n";
    content += "    statTable.style.borderCollapse = 'collapse';\n";
    content += "    statTable.style.fontSize = '0.9em';\n";
    content += "    statTable.style.lineHeight = '1.4';\n\n";

    content += "    // Header row\n";
    content += "    const headerRow = statTable.insertRow();\n";
    content += "    headerRow.style.borderBottom = '2px solid var(--text-muted)';\n";
    content += "    const headerCell = headerRow.insertCell();\n";
    content += "    headerCell.colSpan = 6;\n";
    content += "    headerCell.style.textAlign = 'left';\n";
    content += "    headerCell.style.padding = '10px 0';\n\n";

    content += "    const nameDiv = document.createElement('div');\n";
    content += "    nameDiv.style.display = 'flex';\n";
    content += "    nameDiv.style.justifyContent = 'space-between';\n";
    content += "    nameDiv.style.alignItems = 'center';\n\n";

    content += "    const nameH1 = document.createElement('h1');\n";
    content += "    nameH1.textContent = monsterData.name;\n";
    content += "    nameH1.style.margin = '0';\n";
    content += "    nameH1.style.fontSize = '1.5em';\n";
    content += "    nameH1.style.fontWeight = 'bold';\n\n";

    content += "    const sourceDiv = document.createElement('div');\n";
    content += "    sourceDiv.textContent = monsterData.source;\n";
    content += "    sourceDiv.style.fontSize = '0.8em';\n";
    content += "    sourceDiv.style.color = 'var(--text-muted)';\n\n";

    content += "    nameDiv.appendChild(nameH1);\n";
    content += "    nameDiv.appendChild(sourceDiv);\n";
    content += "    headerCell.appendChild(nameDiv);\n\n";

    content += "    // Size/Type/Alignment row\n";
    content += "    const typeRow = statTable.insertRow();\n";
    content += "    const typeCell = typeRow.insertCell();\n";
    content += "    typeCell.colSpan = 6;\n";
    content += "    typeCell.style.padding = '5px 0';\n";
    content += "    typeCell.style.fontStyle = 'italic';\n";
    content += "    typeCell.textContent = `${monsterData.size?.[0] || 'Unknown'} ${monsterData.type || 'Unknown'}, ${monsterData.alignment?.join(', ') || 'Unknown'}`;\n\n";

    content += "    // AC and Initiative row\n";
    content += "    const acRow = statTable.insertRow();\n";
    content += "    const acCell = acRow.insertCell();\n";
    content += "    acCell.colSpan = 3;\n";
    content += "    acCell.style.padding = '5px 0';\n";
    content += "    // Handle AC display - can be number or array with from info\n";
    content += "    let acDisplay = 'Unknown';\n";
    content += "    if (monsterData.ac) {\n";
    content += "        if (Array.isArray(monsterData.ac) && monsterData.ac.length > 0) {\n";
    content += "            const acObj = monsterData.ac[0];\n";
    content += "            if (acObj.ac) {\n";
    content += "                acDisplay = acObj.ac;\n";
    content += "                if (acObj.from && acObj.from.length > 0) {\n";
    content += "                    acDisplay += ` (${acObj.from.join(', ')})`;\n";
    content += "                }\n";
    content += "            }\n";
    content += "        } else if (typeof monsterData.ac === 'number') {\n";
    content += "            acDisplay = monsterData.ac;\n";
    content += "        }\n";
    content += "    }\n";
    content += "    acCell.innerHTML = `<strong>AC</strong> ${acDisplay}`;\n\n";

    content += "    const initCell = acRow.insertCell();\n";
    content += "    initCell.colSpan = 3;\n";
    content += "    initCell.style.padding = '5px 0';\n";
    content += "    initCell.innerHTML = `<strong>Initiative</strong> ${monsterData.dex ? Math.floor((monsterData.dex - 10) / 2) >= 0 ? '+' + Math.floor((monsterData.dex - 10) / 2) : Math.floor((monsterData.dex - 10) / 2) : 'Unknown'} (${monsterData.dex || 'Unknown'})`;\n\n";

    content += "    // HP row\n";
    content += "    const hpRow = statTable.insertRow();\n";
    content += "    const hpCell = hpRow.insertCell();\n";
    content += "    hpCell.colSpan = 6;\n";
    content += "    hpCell.style.padding = '5px 0';\n";
    content += "    hpCell.innerHTML = `<strong>HP</strong> ${monsterData.hp ? `${monsterData.hp.average} (${monsterData.hp.formula})` : 'Unknown'}`;\n\n";

    content += "    // Speed row\n";
    content += "    const speedRow = statTable.insertRow();\n";
    content += "    const speedCell = speedRow.insertCell();\n";
    content += "    speedCell.colSpan = 6;\n";
    content += "    speedCell.style.padding = '5px 0';\n";
    content += "    speedCell.innerHTML = `<strong>Speed</strong> ${monsterData.speed ? Object.entries(monsterData.speed).map(([k, v]) => `${k} ${v}`).join(', ') : 'Unknown'}`;\n\n";

    content += "    // Ability scores table\n";
    content += "    if (monsterData.str || monsterData.dex || monsterData.con || monsterData.int || monsterData.wis || monsterData.cha) {\n";
    content += "        const abilityRow = statTable.insertRow();\n";
    content += "        const abilityCell = abilityRow.insertCell();\n";
    content += "        abilityCell.colSpan = 6;\n";
    content += "        abilityCell.style.padding = '10px 0';\n\n";

    content += "        const abilityTable = document.createElement('table');\n";
    content += "        abilityTable.style.width = '100%';\n";
    content += "        abilityTable.style.borderCollapse = 'collapse';\n\n";

    content += "        // Header row for abilities\n";
    content += "        const abilityHeaderRow = abilityTable.insertRow();\n";
    content += "        ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach(header => {\n";
    content += "            const th = document.createElement('th');\n";
    content += "            th.textContent = header;\n";
    content += "            th.style.padding = '5px';\n";
    content += "            th.style.fontSize = '0.8em';\n";
    content += "            th.style.fontWeight = 'bold';\n";
    content += "            th.style.textAlign = 'center';\n";
    content += "            th.style.borderBottom = '1px solid var(--text-muted)';\n";
    content += "            abilityHeaderRow.appendChild(th);\n";
    content += "        });\n\n";

    content += "        // Score row (now shows score + modifier)\n";
    content += "        const scoreRow = abilityTable.insertRow();\n";
    content += "        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {\n";
    content += "            const td = scoreRow.insertCell();\n";
    content += "            const score = monsterData[ability];\n";
    content += "            if (score) {\n";
    content += "                const mod = Math.floor((score - 10) / 2);\n";
    content += "                const modStr = mod >= 0 ? `+${mod}` : mod;\n";
    content += "                td.textContent = `${score} (${modStr})`;\n";
    content += "            } else {\n";
    content += "                td.textContent = '';\n";
    content += "            }\n";
    content += "            td.style.padding = '5px';\n";
    content += "            td.style.textAlign = 'center';\n";
    content += "            td.style.fontWeight = 'bold';\n";
    content += "        });\n\n";

    content += "        // SAVE row (actual save values from monsterData.save)\n";
    content += "        const saveRow = abilityTable.insertRow();\n";
    content += "        ['str', 'dex', 'con', 'int', 'wis', 'cha'].forEach(ability => {\n";
    content += "            const td = saveRow.insertCell();\n";
    content += "            const saveValue = monsterData.save && monsterData.save[ability];\n";
    content += "            if (saveValue) {\n";
    content += "                td.textContent = saveValue;\n";
    content += "                td.style.fontWeight = 'bold';\n";
    content += "                td.style.opacity = '0.7';\n";
    content += "            } else {\n";
    content += "                td.textContent = '--';\n";
    content += "                td.style.opacity = '0.5';\n";
    content += "            }\n";
    content += "            td.style.padding = '5px';\n";
    content += "            td.style.textAlign = 'center';\n";
    content += "            td.style.fontSize = '0.9em';\n";
    content += "        });\n\n";

    content += "        abilityCell.appendChild(abilityTable);\n";
    content += "    }\n\n";

    content += "    // Skills row\n";
    content += "    if (monsterData.skill) {\n";
    content += "        const skillRow = statTable.insertRow();\n";
    content += "        const skillCell = skillRow.insertCell();\n";
    content += "        skillCell.colSpan = 6;\n";
    content += "        skillCell.style.padding = '5px 0';\n";
    content += "        const skills = Object.entries(monsterData.skill).map(([skill, bonus]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)} ${bonus}`).join(', ');\n";
    content += "        skillCell.innerHTML = `<strong>Skills</strong> ${skills}`;\n";
    content += "    }\n\n";

    content += "    // Immunities/Resistances/Vulnerabilities\n";
    content += "    if (monsterData.immune || monsterData.resist || monsterData.vulnerable) {\n";
    content += "        if (monsterData.immune) {\n";
    content += "            const immuneRow = statTable.insertRow();\n";
    content += "            const immuneCell = immuneRow.insertCell();\n";
    content += "            immuneCell.colSpan = 6;\n";
    content += "            immuneCell.style.padding = '5px 0';\n";
    content += "            immuneCell.innerHTML = `<strong>Immunities</strong> ${monsterData.immune.join(', ')}`;\n";
    content += "        }\n";
    content += "        if (monsterData.resist) {\n";
    content += "            const resistRow = statTable.insertRow();\n";
    content += "            const resistCell = resistRow.insertCell();\n";
    content += "            resistCell.colSpan = 6;\n";
    content += "            resistCell.style.padding = '5px 0';\n";
    content += "            resistCell.innerHTML = `<strong>Resistances</strong> ${monsterData.resist.join(', ')}`;\n";
    content += "        }\n";
    content += "        if (monsterData.vulnerable) {\n";
    content += "            const vulnRow = statTable.insertRow();\n";
    content += "            const vulnCell = vulnRow.insertCell();\n";
    content += "            vulnCell.colSpan = 6;\n";
    content += "            vulnCell.style.padding = '5px 0';\n";
    content += "            vulnCell.innerHTML = `<strong>Vulnerabilities</strong> ${monsterData.vulnerable.join(', ')}`;\n";
    content += "        }\n";
    content += "    }\n\n";

    content += "    // Senses row\n";
    content += "    if (monsterData.senses) {\n";
    content += "        const sensesRow = statTable.insertRow();\n";
    content += "        const sensesCell = sensesRow.insertCell();\n";
    content += "        sensesCell.colSpan = 6;\n";
    content += "        sensesCell.style.padding = '5px 0';\n";
    content += "        sensesCell.innerHTML = `<strong>Senses</strong> ${monsterData.senses.join(', ')}`;\n";
    content += "    }\n\n";

    content += "    // Languages row\n";
    content += "    if (monsterData.languages) {\n";
    content += "        const langRow = statTable.insertRow();\n";
    content += "        const langCell = langRow.insertCell();\n";
    content += "        langCell.colSpan = 6;\n";
    content += "        langCell.style.padding = '5px 0';\n";
    content += "        langCell.innerHTML = `<strong>Languages</strong> ${monsterData.languages.join(', ')}`;\n";
    content += "    }\n\n";

    content += "    // CR row\n";
    content += "    const crRow = statTable.insertRow();\n";
    content += "    const crCell = crRow.insertCell();\n";
    content += "    crCell.colSpan = 6;\n";
    content += "    crCell.style.padding = '10px 0';\n";
    content += "    crCell.innerHTML = `<strong>CR</strong> ${monsterData.cr || 'Unknown'}`;\n\n";

    content += "    // Actions section\n";
    content += "    if (monsterData.action || monsterData.trait) {\n";
    content += "        const actionsRow = statTable.insertRow();\n";
    content += "        const actionsCell = actionsRow.insertCell();\n";
    content += "        actionsCell.colSpan = 6;\n";
    content += "        actionsCell.style.padding = '15px 0 5px 0';\n\n";

    content += "        const actionsTitle = document.createElement('h3');\n";
    content += "        actionsTitle.textContent = 'Actions';\n";
    content += "        actionsTitle.style.margin = '0 0 10px 0';\n";
    content += "        actionsTitle.style.fontSize = '1.1em';\n";
    content += "        actionsCell.appendChild(actionsTitle);\n\n";

    content += "        if (monsterData.trait) {\n";
    content += "            monsterData.trait.forEach(trait => {\n";
    content += "                const traitDiv = document.createElement('div');\n";
    content += "                traitDiv.style.marginBottom = '10px';\n";
    content += "                traitDiv.innerHTML = `<strong>${trait.name}.</strong> ${trait.entries?.join(' ') || 'No description'}`;\n";
    content += "                actionsCell.appendChild(traitDiv);\n";
    content += "            });\n";
    content += "        }\n\n";

    content += "        if (monsterData.action) {\n";
    content += "            monsterData.action.forEach(action => {\n";
    content += "                const actionDiv = document.createElement('div');\n";
    content += "                actionDiv.style.marginBottom = '10px';\n";
    content += "                actionDiv.innerHTML = `<strong>${action.name}.</strong> ${action.entries?.join(' ') || 'No description'}`;\n";
    content += "                actionsCell.appendChild(actionDiv);\n";
    content += "            });\n";
    content += "        }\n";
    content += "    }\n\n";

    content += "    modalContent.appendChild(closeButton);\n";
    content += "    modalContent.appendChild(statTable);\n";
    content += "    modal.appendChild(modalContent);\n";
    content += "    document.body.appendChild(modal);\n\n";

    content += "    modal.onclick = (e) => {\n";
    content += "        if (e.target === modal) {\n";
    content += "            document.body.removeChild(modal);\n";
    content += "        }\n";
    content += "    };\n";
    content += "}\n\n";

    content += "function parseEnabledSources(content) {\n";
    content += "    const enabledSources = [];\n";
    content += "    const lines = content.split('\\n');\n\n";

    content += "    for (const line of lines) {\n";
    content += "        const match = line.match(/- \\*\\*([A-Z0-9-]+)\\*\\*.*:\\s*`enabled:\\s*(true|false)`/);\n";
    content += "        if (match) {\n";
    content += "            const source = match[1];\n";
    content += "            const enabled = match[2] === 'true';\n";
    content += "            if (enabled) {\n";
    content += "                enabledSources.push(source);\n";
    content += "            }\n";
    content += "        }\n";
    content += "    }\n\n";

    content += "    return enabledSources;\n";
    content += "}\n\n";

    content += "async function deleteMonster(index) {\n";
    content += "    await app.fileManager.processFrontMatter(file, (frontmatter) => {\n";
    content += "        if (frontmatter.monsters && frontmatter.monsters[index]) {\n";
    content += "            frontmatter.monsters.splice(index, 1);\n";
    content += "        }\n";
    content += "    });\n";
    content += "}\n\n";

    content += "if (monsters.length === 0) {\n";
    content += "    dv.paragraph(\"_No monster planned_\");\n";
    content += "} else {\n";
    content += "    const table = dv.container.createEl(\"table\");\n";
    content += "    table.style.width = \"100%\";\n";
    content += "    const thead = table.createEl(\"thead\");\n";
    content += "    const headerRow = thead.createEl(\"tr\");\n";
    content += "    [\"Monster\", \"Qty\", \"Initiative\", \"HP Mode\", \"Actions\"].forEach(header => {\n";
    content += "        headerRow.createEl(\"th\", { text: header });\n";
    content += "    });\n";
    content += "    const tbody = table.createEl(\"tbody\");\n";
    content += "    monsters.forEach((monster, index) => {\n";
    content += "        const row = tbody.createEl(\"tr\");\n";
    content += "        const nameCell = row.createEl(\"td\");\n";
    content += "        const nameButton = nameCell.createEl(\"button\", { text: monster.name });\n";
    content += "        nameButton.style.cursor = \"pointer\";\n";
    content += "        nameButton.style.backgroundColor = \"transparent\";\n";
    content += "        nameButton.style.border = \"none\";\n";
    content += "        nameButton.style.color = \"var(--text-normal)\";\n";
    content += "        nameButton.style.textDecoration = \"underline\";\n";
    content += "        nameButton.style.padding = \"0\";\n";
    content += "        nameButton.style.fontSize = \"inherit\";\n";
    content += "        nameButton.addEventListener(\"click\", async () => {\n";
    content += "            await showMonsterModal(monster.name);\n";
    content += "        });\n";
    content += "        row.createEl(\"td\", { text: monster.qty });\n";
    content += "        row.createEl(\"td\", { text: monster.initiative });\n";
    content += "        row.createEl(\"td\", { text: monster.hpMode });\n";
    content += "        const actionCell = row.createEl(\"td\");\n";
    content += "        const deleteBtn = actionCell.createEl(\"button\", { text: \"Delete\" });\n";
    content += "        deleteBtn.style.cursor = \"pointer\";\n";
    content += "        deleteBtn.style.padding = \"2px 8px\";\n";
    content += "        deleteBtn.style.backgroundColor = \"#dc3545\";\n";
    content += "        deleteBtn.style.color = \"white\";\n";
    content += "        deleteBtn.style.border = \"none\";\n";
    content += "        deleteBtn.style.borderRadius = \"3px\";\n";
    content += "        deleteBtn.addEventListener(\"click\", async () => {\n";
    content += "            if (confirm(`Delete ${monster.name}?`)) {\n";
    content += "                await deleteMonster(index);\n";
    content += "            }\n";
    content += "        });\n";
    content += "    });\n";
    content += "}\n";
    content += "```\n";

    content += `#### Actions\n`;
    content += `\`\`\`button\n`;
    content += `name Add Monsters\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-monster\n`;
    content += `\`\`\`\n`;
    content += `\`\`\`button\n`;
    content += `name Set Players Initiatives\n`;
    content += `type command\n`;
    content += `action QuickAdd: add-player-initiative\n`;
    content += `\`\`\`\n`;
    content += `\`\`\`button\n`;
    content += `name Start Combat\n`;
    content += `type command\n`;
    content += `action QuickAdd: start-combat\n`;
    content += `\`\`\`\n`;
    content += `\`\`\`button\n`;
    content += `name End Combat\n`;
    content += `type command\n`;
    content += `action QuickAdd: end-combat\n`;
    content += `\`\`\`\n\n`;

    content += `## Initiative\n\n`
    // Dynamic initiative table with dataviewjs
    content += `\`\`\`dataviewjs\n`;
    content += `const initiatives = dv.current().initiatives || [];\n`;
    content += `const status = dv.current().status || ""\n`;
    content += `const currentTurn = dv.current().currentTurn || 0;\n\n`;

    content += `if (status === "planned") {\n`;
    content += `    dv.paragraph("_Combat has not started_");\n`;
    content += `} else {\n`;
    content += `    const table = dv.container.createEl("table");\n`;
    content += `    table.style.width = "100%";\n`;
    content += `    const thead = table.createEl("thead");\n`;
    content += `    const headerRow = thead.createEl("tr");\n`;
    content += `    ["Turn", "Name", "Label", "Initiative", "HP", "AC", "Speed", "Status"].forEach(h => {\n`;
    content += `        headerRow.createEl("th", { text: h });\n`;
    content += `    });\n`;
    content += `    const tbody = table.createEl("tbody");\n`;
    content += `    initiatives.forEach((combatant, idx) => {\n`;
    content += `        const row = tbody.createEl("tr");\n`;
    content += `        if (idx === currentTurn) {\n`;
    content += `            row.style.backgroundColor = "var(--background-modifier-success)";\n`;
    content += `            row.style.fontWeight = "bold";\n`;
    content += `        }\n`;
    content += `        const turnCell = row.createEl("td", { text: idx === currentTurn ? "➤" : "" });\n`;
    content += `        turnCell.style.textAlign = "center";\n`;
    content += `        const nameCell = row.createEl("td");\n`;
    content += `        if (combatant.name && combatant.name.path) {\n`;
    content += `            const basename = combatant.name.path.split("/").pop().replace(/\\.md$/, "");\n`;
    content += `            const link = nameCell.createEl("a", {\n`;
    content += `                cls: "internal-link",\n`;
    content += `                href: combatant.name.path,\n`;
    content += `                text: basename\n`;
    content += `            });\n`;
    content += `        } else if (typeof combatant.name === "string") {\n`;
    content += `            nameCell.textContent = combatant.name.replace(/\\.md$/, "");\n`;
    content += `        } else {\n`;
    content += `            nameCell.textContent = "Unknown";\n`;
    content += `        }\n`;
    content += `        row.createEl("td", { text: combatant.label || "--" });\n`;
    content += `        row.createEl("td", { text: combatant.initiative || 0 });\n`;
    content += `        const hp = combatant.type === "monster" ? \`\${combatant.currentHp}/\${combatant.maxHp}\` : "--";\n`;
    content += `        row.createEl("td", { text: hp });\n`;
    content += `        row.createEl("td", { text: combatant.ac || "--" });\n`;
    content += `        row.createEl("td", { text: combatant.speed || "--" });\n`;
    content += `        row.createEl("td", { text: combatant.status || "healthy" });\n`;
    content += `    });\n`;
    content += `}\n`;
    content += `\`\`\`\n\n`;

    // Combat action buttons
    content += `#### Actions\n`;
    content += `\`\`\`button\n`;
    content += `name Next Turn\n`;
    content += `type command\n`;
    content += `action QuickAdd: next-turn\n`;
    content += `\`\`\`\n`;

    content += `\`\`\`button\n`;
    content += `name Apply Damage\n`;
    content += `type command\n`;
    content += `action QuickAdd: combat-damage\n`;
    content += `\`\`\`\n`;

    content += `\`\`\`button\n`;
    content += `name Apply Healing\n`;
    content += `type command\n`;
    content += `action QuickAdd: combat-heal\n`;
    content += `\`\`\`\n`;

    content += `\n## Combat Log\n\n`

    await app.vault.create(filePath, content);

    new Notice(`Created ${fileName}`);

    // Add delay before opening to let Obsidian index the file
    setTimeout(async () => {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (file) {
            await app.workspace.getLeaf('tab').openFile(file);
        }
    }, 1000);
};
