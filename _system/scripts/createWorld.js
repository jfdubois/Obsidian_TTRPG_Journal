module.exports = async (params) => {
    const { quickAddApi: { inputPrompt } } = params;

    const worldName = await inputPrompt("Enter World name:");
    if (!worldName) return;

    // Create the folder
    const folderPath = "Worlds/" + worldName;
    await app.vault.createFolder(folderPath).catch(() => {});
    await app.vault.createFolder(folderPath + "/Ressources").catch(() => {});

    // Define the template of World note
    let fileContent = "---\n"
    fileContent += `world: ${worldName}\n`
    fileContent += `campaign: ${worldName}\n`
    fileContent += `status: active\n`
    fileContent += `role: player\n`
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

    // Sessions section
    fileContent += `### Sessions\n\n`
    // Table: view-sessions
    fileContent += "```dataview\n"
    fileContent += `TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary"\n`
    fileContent += `FROM "${folderPath}"\n`
    fileContent += `WHERE contains(type, "session")\n`
    fileContent += `SORT file.name ASC\n`
    fileContent += "```\n\n"

    // World entities section
    fileContent += `### World's knowledge\n\n`
    // Base: view all entities
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

    // Create the World.md file
    const filePath = `${folderPath}/World.md`;
    await app.vault.create(filePath,fileContent);

    // Open the file
    const file = app.vault.getAbstractFileByPath(filePath);
    await app.workspace.getLeaf().openFile(file);
};
