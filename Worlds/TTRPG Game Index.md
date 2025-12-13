---
banner: "![[index-banner.jpg]]"
banner_y: 0.604
---
# TTRPG Game Index

```button
name Create World
type command
action QuickAdd: create-world
actions [{"type":"command","action":""}]
```
^button-h5jv


```dataview
TABLE WITHOUT ID
  link(file.path, world) as "World",
  system as "System",
  status as "Status"
FROM 
  "Worlds"
WHERE
  file.name = "World"
SORT world ASC
```
