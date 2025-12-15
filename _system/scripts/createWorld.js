module.exports = async (params) => {
    const { quickAddApi: { inputPrompt, suggester } } = params;

    const worldName = await inputPrompt("Enter World name:");
    if (!worldName) return;

    // NEW: Prompt for role (player or dm)
    const roleOptions = [
        { label: "Player", value: "player" },
        { label: "Dungeon Master", value: "dm" }
    ];
    const selectedRole = await suggester(
        item => item.label,
        roleOptions,
        false,
        "Select your role in this world:"
    );
    if (!selectedRole) return; // User cancelled

    const role = selectedRole.value;

    // Create the folder
    const folderPath = "Worlds/" + worldName;
    await app.vault.createFolder(folderPath).catch(() => {});
    await app.vault.createFolder(folderPath + "/Ressources").catch(() => {});

    // Define the template of World note
    let fileContent = "---\n"
    fileContent += `world: ${worldName}\n`
    fileContent += `campaign: ${worldName}\n`
    fileContent += `status: active\n`
    fileContent += `role: ${role}\n`  // NEW: Role is now dynamic
    fileContent += `type: world\n`
    fileContent += `system: \n`
    fileContent += `banner: "![[world-banner.jpg]]"\n`
    fileContent += "---\n"

    fileContent += `# The world of ${worldName}\n\n`
    fileContent += `### Players\n\n`
    fileContent += `- Player name as Character name\n\n`

    // Action section
    fileContent += `### Actions\n\n`
    // Button: create-session
    fileContent += "```button\n";
    fileContent += "name Add Session\n";
    fileContent += "type command\n";
    fileContent += "action QuickAdd: create-session\n";
    fileContent += "```\n";
    // Button: add-entity
    fileContent += "```button\n";
    fileContent += "name Add Entity\n";
    fileContent += "type command\n";
    fileContent += "action Templater: Create new-entity\n";
    fileContent += "```\n";
    // DM - Button: create-encounter
    if (role === "dm") {
        fileContent += "```button\n";
        fileContent += "name Create Encounter\n";
        fileContent += "type command\n";
        fileContent += "action QuickAdd: create-encounter\n";
        fileContent += "```\n\n";
    }

    // Sessions section
    fileContent += `### Sessions\n\n`
    // Table: view-sessions
    fileContent += "```dataview\n"
    fileContent += `TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary"\n`
    fileContent += `FROM "${folderPath}"\n`
    fileContent += `WHERE contains(type, "session")\n`
    fileContent += `SORT file.name ASC\n`
    fileContent += "```\n\n"

    // World knowledge section
    fileContent += `### World knowledge\n\n`
    fileContent += "```base\n"
    fileContent += `views:\n`
    fileContent += `  - type: table\n`
    fileContent += `    name: WorldView\n`
    fileContent += `    filters:\n`
    fileContent += `      and:\n`
    fileContent += `        - world == "${worldName}"\n`
    fileContent += `        - file.name != "World"\n`
    fileContent += `        - '!type.contains("session")'\n`
    fileContent += `    order:\n`
    fileContent += `      - file.name\n`
    fileContent += `      - plane\n`
    fileContent += `      - region\n`
    fileContent += `      - location\n`
    fileContent += `      - type\n`
    fileContent += `      - description\n`
    fileContent += `    columnSize:\n`
    fileContent += `      note.type: 93\n`
    fileContent += "```\n"

    // DM-specific Dataview sections (only when role is dm)
    if (role === "dm") {
        fileContent += `\n### DM: Encounters\n\n`;
        fileContent += `#### Active Encounters\n`;
        fileContent += "```dataview\n";
        fileContent += `TABLE \n`;
        fileContent += `  session as "Session",\n`;
        fileContent += `  location as "Location",\n`;
        fileContent += `  length(monsters) as "Types"\n`;
        fileContent += `FROM "${folderPath}"\n`;
        fileContent += `WHERE type = "encounter" AND status = "active"\n`;
        fileContent += `SORT file.ctime DESC\n`;
        fileContent += "```\n\n";

        fileContent += `#### Recent Completed\n`;
        fileContent += "```dataview\n";
        fileContent += `TABLE \n`;
        fileContent += `  session as "Session",\n`;
        fileContent += `  location as "Location",\n`;
        fileContent += `  date-completed as "Date"\n`;
        fileContent += `FROM "${folderPath}"\n`;
        fileContent += `WHERE type = "encounter" AND status = "completed"\n`;
        fileContent += `SORT date-completed DESC\n`;
        fileContent += `LIMIT 5\n`;
        fileContent += "```\n";
    }

    // Create the World.md file
    const filePath = `${folderPath}/World.md`;
    await app.vault.create(filePath,fileContent);

    // Open the file
    const file = app.vault.getAbstractFileByPath(filePath);
    await app.workspace.getLeaf().openFile(file);
};
