---
world: DEMO-DM
campaign: DEMO-DM
status: active
role: dm
type: world
system: 
banner: "![[world-banner.jpg]]"
---
# The world of DEMO-DM

### Players

- Player name as Character name

### Actions

```button
name Add Session
type command
action QuickAdd: create-session
```
```button
name Add Entity
type command
action Templater: Create new-entity
```
```button
name Create Encounter
type command
action QuickAdd: create-encounter
```

### Sessions

```dataview
TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary"
FROM "Worlds/DEMO-DM"
WHERE contains(type, "session")
SORT file.name ASC
```

### World knowledge

```base
views:
  - type: table
    name: WorldView
    filters:
      and:
        - world == "DEMO-DM"
        - file.name != "World"
        - '!type.contains("session")'
    order:
      - file.name
      - plane
      - region
      - location
      - type
      - description
    columnSize:
      note.type: 93
```

### DM: Encounters

#### Active Encounters
```dataview
TABLE 
  session as "Session",
  location as "Location",
  length(monsters) as "Types"
FROM "Worlds/DEMO-DM"
WHERE type = "encounter" AND status = "active"
SORT file.ctime DESC
```

#### Recent Completed
```dataview
TABLE 
  session as "Session",
  location as "Location",
  date-completed as "Date"
FROM "Worlds/DEMO-DM"
WHERE type = "encounter" AND status = "completed"
SORT date-completed DESC
LIMIT 5
```
