<%*
// Prompt for number of monsters
const numMonsters = await tp.system.prompt("How many different monster types?", "2");
if (!numMonsters) return;

const monsterCount = parseInt(numMonsters);

// Start building the combat callout
tR += "> [!combat]- Combat\n";
tR += "> > [!initiative]+ Initiative\n";
tR += "> > | Roll | Name |\n";
tR += "> > | ---  | ------ |\n";
tR += "> > |  |  |\n";
tR += "> > |  |  |\n";
tR += "> > |  |  |\n";
tR += "> > Number of rounds:\n";
tR += ">\n";

// Add monster callouts based on count
for (let i = 0; i < monsterCount; i++) {
    tR += "> > [!monster]- Monster\n";
    tR += "> > Name: **[[]]**\n";
    tR += "> > toHit: **>**\n";
    tR += "> > Weaknesses:\n";
    tR += "> > Immunities:\n";
    tR += "> > Resistances:\n";
    tR += "> > Special attack:\n";
    tR += ">\n";
}

// Add loot callout
tR += "> > [!loot]- Loot\n";
tR += "> > - Loot 1\n";
%>
