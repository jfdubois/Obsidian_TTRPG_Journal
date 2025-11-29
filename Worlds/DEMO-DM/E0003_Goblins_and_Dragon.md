---
type: encounter
world: DEMO-DM
status: planned
session:
location:
description: Forest ambush
monsters:
  - name: Goblin
    qty: 4
    initiative: group
    hpMode: default
    labels: []
  - name: Adult Green Dragon
    qty: 1
    initiative: individual
    hpMode: default
    labels: []
initiatives: []
combatLog: []
---

# Goblins and Dragon

*Planning phase - add monsters below*

### Actions

```button
name Add Monsters
type command
action QuickAdd: add-monster
```


# TEST

```meta-bind-button
style: primary
label: Add Monsters
id: add-monster
action:
  type: command
  command: "quickadd:choice:29a8d869-374a-4bbd-b424-28f7c5af193c"
```

```js-engine
/* js-engine */
/**
 * 1 — Initial Setup 
 **/
 
// 1.1 — Summoning Meta Bind API
const mb = engine.getPlugin('obsidian-meta-bind-plugin').api;
// 1.2 - Getting current file context from JS Engine
const currentFile = context.file.path;

// 1.3 - Getting the actual list of monsters from the current note's frontmatter
// FIX applied here: use optional chaining (?.) for safe access
const monsters = engine.frontmatter?.monsters || [];

// ADD THIS LINE FOR DEBUGGING:
console.log("Monsters list read by JS Engine:", monsters); 

/**
 * 2 — Function used to create the delete buttons. 
 **/

function createDeleteButton(monsterName, buttonId) {
    
    const buttonConfigDeclaration = {
        label: 'Delete Row',
        icon: 'trash-2', // Lucide icon for trash/delete
        style: 'danger', // Makes the button red
        tooltip: `Delete ${monsterName} from frontmatter`,
        id: buttonId,
        actions: [
            {
                type: 'inlineJS',
                code: `
                    if (app.plugins.enabledPlugins.includes('metaedit')) {
                        const metaEditApi = app.plugins.plugins.metaedit.api;
                        // Call removeListItem: (fieldName, itemToRemove, filePath)
                        await metaEditApi.removeListItem("monsters", "${monsterName}", "${currentFile}");
                        new Notice("Removed ${monsterName}!");
                    } else {
                        new Notice("MetaEdit plugin not found or enabled.");
                    }
                `
            }
        ]
    };
    
    const buttonOptions = {
        declaration: buttonConfigDeclaration,
        isPreview: false
    };
    
    const button = mb.createButtonMountable(context.file.path, buttonOptions);
    return mb.wrapInMDRC(button, container, component);
};

/**
 * 3 — JS Engine Table Setup 
 **/

const headers = [
    "<center><h6>Name</h6></center>",
    "<center><h6>Quantity</h6></center>",
    "<center><h6>Initiative Mode</h6></center>",
    "<center><h6>Action</h6></center>"
];

let body = [];

// Loop only runs if 'monsters' is a valid array now
for (let i = 0; i < monsters.length; i++) {
    
    const monster = monsters[i];
    
    const buttonId = `MBCreateNote${i}`;
    const deleteButton = createDeleteButton(monster.name, buttonId);
    const inlineButtonPlaceholder = "`" + `BUTTON[${buttonId}]` + "`";
    
    body.push(
        [
            `<center>${monster.name}</center>`,
            `<center>${monster.qty}</center>`, 
            `<center>${monster.initiative}</center>`,
            `<center>${inlineButtonPlaceholder}</center>`
        ]
    );
};

/**
 * 4 — JS Engine Markdown Builder 
 **/
 
const mdBuilder = engine.markdown.createBuilder();
mdBuilder.createTable(headers, body);
return mdBuilder;

```



# END OF TEST