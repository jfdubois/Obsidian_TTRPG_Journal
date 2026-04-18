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

```button
name Create Campaign
type command
action QuickAdd: create-campaign
```

## Migration

```button
name Prep Legacy Import
type command
action QuickAdd: prepare-legacy-world-import
```

```button
name Run Legacy Migration
type command
action QuickAdd: migrate-legacy-world
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

```dataview
TABLE WITHOUT ID
  link(file.path, campaign) as "Campaign",
  world as "World",
  timelineNotes as "Timeline",
  status as "Status"
FROM
  "Worlds"
WHERE
  type = "campaign"
SORT world ASC, campaign ASC
```
