<%*
const formName = "newEntity"
const currentWorld = tp.file.folder(false)
const folderPath = "Worlds/" + currentWorld
const modalForm = app.plugins.plugins.modalforms.api

let fileName = tp.file.title
if (fileName === "Untitled") {
    fileName = ""
}

try {
    const result = await modalForm.openForm(formName, {
        values: {
            entityWorld: currentWorld,
            entityType: "npc",
            entityName: fileName
        }
    })
	
	if (result.status === "cancelled") {
	    return
	}
    if (result.status === "ok") {
        tR += "---\n"
        tR += `type: ${result.data.entityType}\n`
        tR += `date: ${tp.date.now("YYYY-MM-DD")}\n`
        tR += `world: ${currentWorld}\n`
        tR += `campaign: ${currentWorld}\n`
        tR += `plane: ${result.data.entityPlane ? `"[[${result.data.entityPlane}]]"` : ""}\n`
        tR += `region: ${result.data.entityRegion ? `"[[${result.data.entityRegion}]]"` : ""}\n`
        tR += `location: ${result.data.entityLocation ? `"[[${result.data.entityLocation}]]"` : ""}\n`
        tR += `description: ${result.data.entityDescription ? result.data.entityDescription : ""}\n`
        
        const entityType = result.data.entityType
        switch(entityType) {
            case "npc":
                tR += `occupation: ${result.data.entityOccupation ? result.data.entityOccupation : ""}\n`
                tR += `faction: ${result.data.entityFaction ? `"[[${result.data.entityFaction}]]"` : ""}\n`
                tR += `race: ${result.data.entityRace ? result.data.entityRace : ""}\n`
                tR += `gender: ${result.data.entityGender ? result.data.entityGender : ""}\n`
                tR += `class: ${result.data.entityClass ? result.data.entityClass : ""}\n`
                tR += "---\n"
                tR += `### NPC Introduction\n\n\n`
                tR += `### Additional information\n\n\n`
                break
            case "character":
                tR += "---\n"
                break
            case "place":
                tR += `ruler: ${result.data.entityRuler ? `"[[${result.data.entityRuler}]]"` : ""}\n`
                tR += "---\n"
                tR += `### Location details\n`
                tR += "**Ruler:** \`= this.ruler\`\n"
                tR += `**Size:**\n`
                tR += `**Population:**\n`
                tR += `**Party relationship:**\n\n\n`
                tR += `### Local knowledge\n\n`
			    tR += "```dataview\n"
			    tR += `TABLE file.link as "Name", type as "Type", description as "Description"\n`
			    tR += `FROM "${folderPath}"\n`
			    tR += `WHERE contains(string(location), "${result.data.entityName}") OR contains(string(place), "${result.data.entityName}")\n`
			    tR += `SORT file.name ASC\n`
			    tR += "```\n\n"
                break
            case "store":
                tR += `owner: ${result.data.entityOwner ? `"[[${result.data.entityOwner}]]"` : ""}\n`
                tR += "---\n"
                tR += `### Location details\n`
                tR += "**Owner:** \`= this.owner\`\n"
                tR += `**Price point:**\n`
                break
            case "faction":
                tR += `leader: ${result.data.entityLeader ? `"[[${result.data.entityLeader}]]"` : ""}\n`
                tR += "---\n"
                tR += "### Faction summary\n\n\n"
                tR += `### Faction details\n`
                tR += "**Leader:** \`= this.leader\`\n"
                break
            case "quest":
                tR += `givenBy: ${result.data.entityGivenBy ? `"[[${result.data.entityGivenBy}]]"` : ""}\n`
                tR += `status: ${result.data.entityQuestStatus ? "Active" : "Completed"}\n`
                tR += "---\n"
                tR += `### Quest summary\n\n\n`
                tR += `### Quest details\n`
                break
            case "plane":
                tR += "---\n"
                tR += `### Plane description\n\n\n`
                tR += `### Planar knowledge\n\n\n`
                tR += "```dataview\n"
			    tR += `TABLE file.link as "Name", type as "Type", description as "Description"\n`
			    tR += `FROM "${folderPath}"\n`
			    tR += `WHERE contains(string(plane), "${result.data.entityName}")\n`
			    tR += `SORT file.name ASC\n`
			    tR += "```\n\n"
                break
            case "region":
                tR += "---\n"
                tR += `### Region description\n\n\n`
                tR += `### Regional knowledge\n\n\n`
                tR += "```dataview\n"
			    tR += `TABLE file.link as "Name", type as "Type", description as "Description"\n`
			    tR += `FROM "${folderPath}"\n`
			    tR += `WHERE contains(string(region), "${result.data.entityName}")\n`
			    tR += `SORT file.name ASC\n`
			    tR += "```\n\n"
                break
        }
	
	await tp.file.rename(result.data.entityName)
    }
} catch (e) {
    new Notice("An error occurred. Check the console for details.");
    console.error("Templater Script Error:", e);
}
%>