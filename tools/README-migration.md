# Legacy World Migration

This tool migrates legacy flat world folders from the old vault layout:

```text
Worlds/<WorldName>/
  World.md
  001_YYYYMMDD.md
  NPC.md
  Story/...
  Ressources/...
```

into the new layout used by this vault:

```text
Worlds/<WorldName>/
  World.md
  Ressources/
  <CampaignName>/
    Campaign.md
    001_YYYYMMDD.md
    NPC.md
    Story/...
    Ressources/...
```

## What it updates

- reads only from the configured source `Worlds/` folder
- creates a new `World.md` and `Campaign.md`
- moves legacy notes under the campaign folder
- preserves subfolders like `Story/`
- adds `alive: true` when missing on `npc` and `character` notes
- adds `playerName` to `character` notes when it can infer it from the old `Players` section
- rewrites old `Worlds/<WorldName>` query paths to the new campaign path

## First run

From the vault root:

```bash
python3 tools/migrate_legacy_worlds.py --config tools/migration.config.example.json --dry-run
```

## Real run

Linux/macOS:

```bash
python3 tools/migrate_legacy_worlds.py --config tools/migration.config.example.json
```

Windows:

```powershell
py .\tools\migrate_legacy_worlds.py --config .\tools\migration.config.example.json
```

## Config fields

- `sourceWorldsRoot`: source path that contains the legacy world folders
- `targetVaultRoot`: target TTRPGv2 vault root
- `worlds`: explicit migrations to run

Each `worlds[]` entry supports:

- `sourceWorld`
- `targetWorld`
- `targetCampaign`
- `role`
- `timelineNotes`

The tool is intentionally explicit. It does not auto-migrate every world unless you list it in the config.
