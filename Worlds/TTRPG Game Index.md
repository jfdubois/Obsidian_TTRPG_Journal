---
banner: "![[index-banner.jpg]]"
banner_y: 0.604
---
# TTRPG Game Index

```button
name Create World
type command
action QuickAdd: create-world
```


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