---
world: DEMO
campaign: DEMO
status: active
role: player
type: world
system: 
banner: "![[world-banner.jpg]]"
---
# The world of DEMO

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
### Sessions

```dataview
TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary"
FROM "Worlds/DEMO"
WHERE contains(type, "session")
SORT file.name ASC
```

### World's knowledge

```base
views:
  - type: table
    name: WorldView
    filters:
      and:
        - world == "DEMO"
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
