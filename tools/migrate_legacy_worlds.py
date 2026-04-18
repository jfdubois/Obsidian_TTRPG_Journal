#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from dataclasses import dataclass, field
from pathlib import Path


LEGACY_WORLD_SECTION_TITLES_TO_DROP = {
    "Players",
    "Actions",
    "Sessions",
    "World's knowledge",
    "Campaigns",
    "Campaign knowledge",
    "DM: Encounters",
}

WORLD_FRONTMATTER_ORDER = [
    "type",
    "world",
    "status",
    "role",
    "system",
    "banner",
    "banner_y",
]

CAMPAIGN_FRONTMATTER_ORDER = [
    "type",
    "world",
    "campaign",
    "status",
    "role",
    "timelineNotes",
]


@dataclass
class Frontmatter:
    order: list[str] = field(default_factory=list)
    values: dict[str, str] = field(default_factory=dict)
    has_frontmatter: bool = True

    def clone(self) -> "Frontmatter":
        return Frontmatter(
            order=list(self.order),
            values=dict(self.values),
            has_frontmatter=self.has_frontmatter,
        )

    def set(self, key: str, raw_value: str, after_key: str | None = None) -> None:
        if key in self.values:
            self.values[key] = raw_value
            return

        if after_key and after_key in self.order:
            index = self.order.index(after_key) + 1
            self.order.insert(index, key)
        else:
            self.order.append(key)

        self.values[key] = raw_value

    def delete(self, key: str) -> None:
        self.values.pop(key, None)
        self.order = [current_key for current_key in self.order if current_key != key]


@dataclass
class MarkdownDocument:
    frontmatter: Frontmatter
    body: str


@dataclass
class MigrationContext:
    source_worlds_root: Path
    target_vault_root: Path
    dry_run: bool
    verbose: bool
    warnings: list[str] = field(default_factory=list)


@dataclass
class MigrationSummary:
    source_world: str
    target_world: str
    target_campaign: str
    migrated_markdown_files: int = 0
    copied_binary_files: int = 0
    added_alive_defaults: int = 0
    added_player_names: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Migrate legacy flat world folders into the new TTRPGv2 layout.",
    )
    parser.add_argument("--config", required=True, help="Path to the migration config JSON file.")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing files.")
    parser.add_argument("--verbose", action="store_true", help="Print detailed actions.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    config_path = Path(args.config).expanduser().resolve()
    config = load_config(config_path)

    source_worlds_root = resolve_from_config(config_path, config.get("sourceWorldsRoot"))
    target_vault_root = normalize_target_vault_root(
        resolve_from_config(config_path, config.get("targetVaultRoot", ".."))
    )

    assert_target_vault(target_vault_root)

    worlds = config.get("worlds")
    if not isinstance(worlds, list) or not worlds:
      raise ValueError('Config must include a non-empty "worlds" array.')

    context = MigrationContext(
        source_worlds_root=source_worlds_root,
        target_vault_root=target_vault_root,
        dry_run=args.dry_run,
        verbose=args.verbose,
    )

    summaries = [migrate_world(world_config, context) for world_config in worlds]
    print_summary(summaries, context)
    return 0


def load_config(config_path: Path) -> dict:
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ValueError(f'Unable to read config file "{config_path}": {error}') from error
    except json.JSONDecodeError as error:
        raise ValueError(f'Invalid JSON in config file "{config_path}": {error}') from error


def resolve_from_config(config_path: Path, configured_path: str | None) -> Path:
    if not configured_path:
        raise ValueError(f'Config file "{config_path}" is missing a required path value.')

    candidate = Path(configured_path).expanduser()
    if candidate.is_absolute():
        return candidate.resolve()

    return (config_path.parent / candidate).resolve()


def assert_target_vault(target_vault_root: Path) -> None:
    marker = target_vault_root / "Worlds" / "TTRPG Game Index.md"
    if not marker.exists():
        raise ValueError(
            f'Target vault "{target_vault_root}" does not look like a TTRPGv2 vault. '
            f"Missing {marker}."
        )


def normalize_target_vault_root(configured_target_path: Path) -> Path:
    vault_marker = configured_target_path / "Worlds" / "TTRPG Game Index.md"
    worlds_marker = configured_target_path / "TTRPG Game Index.md"

    if vault_marker.exists():
        return configured_target_path

    if worlds_marker.exists():
        return configured_target_path.parent

    return configured_target_path


def migrate_world(world_config: dict, context: MigrationContext) -> MigrationSummary:
    source_world = required_string(world_config.get("sourceWorld"), "sourceWorld")
    target_world = required_string(world_config.get("targetWorld") or source_world, "targetWorld")
    target_campaign = required_string(
        world_config.get("targetCampaign") or source_world,
        "targetCampaign",
    )

    source_world_path = context.source_worlds_root / source_world
    source_world_note_path = source_world_path / "World.md"
    target_world_path = context.target_vault_root / "Worlds" / target_world
    target_campaign_path = target_world_path / target_campaign
    target_world_note_path = target_world_path / "World.md"
    target_campaign_note_path = target_campaign_path / "Campaign.md"

    if not source_world_path.exists():
        raise ValueError(f"Source world folder does not exist: {source_world_path}")

    if not source_world_note_path.exists():
        raise ValueError(f"Missing source World.md: {source_world_note_path}")

    if target_world_note_path.exists():
        raise ValueError(f"Target World.md already exists: {target_world_note_path}")

    if target_campaign_note_path.exists():
        raise ValueError(f"Target Campaign.md already exists: {target_campaign_note_path}")

    source_world_note = parse_markdown_document(source_world_note_path.read_text(encoding="utf-8"))
    role = world_config.get("role") or source_world_note.frontmatter.values.get("role") or "player"
    timeline_notes = world_config.get("timelineNotes") or ""
    legacy_players_section = get_section_body(source_world_note.body, "Players")
    legacy_player_map = parse_legacy_player_map(legacy_players_section)
    world_resource_refs = collect_referenced_world_resources(source_world_note.body, source_world)

    summary = MigrationSummary(
        source_world=source_world,
        target_world=target_world,
        target_campaign=target_campaign,
    )

    ensure_dir(target_world_path, context)
    ensure_dir(target_world_path / "Ressources", context)
    ensure_dir(target_campaign_path, context)
    ensure_dir(target_campaign_path / "Ressources", context)

    world_content = build_migrated_world_note(
        source_world=source_world,
        target_world=target_world,
        frontmatter=source_world_note.frontmatter,
        body=source_world_note.body,
        role=role,
    )
    write_text_file(target_world_note_path, world_content, context)

    campaign_content = build_campaign_note(
        target_world=target_world,
        target_campaign=target_campaign,
        role=role,
        timeline_notes=timeline_notes,
        legacy_players_section=legacy_players_section,
    )
    write_text_file(target_campaign_note_path, campaign_content, context)

    for source_file_path in list_files_recursively(source_world_path):
        relative_path = source_file_path.relative_to(source_world_path)

        if relative_path.as_posix() == "World.md":
            continue

        if source_file_path.suffix.lower() == ".md":
            target_path = target_campaign_path / relative_path
            result = migrate_campaign_markdown(
                content=source_file_path.read_text(encoding="utf-8"),
                file_name=source_file_path.name,
                source_world=source_world,
                target_world=target_world,
                target_campaign=target_campaign,
                legacy_player_map=legacy_player_map,
            )
            summary.migrated_markdown_files += 1
            summary.added_alive_defaults += result["added_alive_defaults"]
            summary.added_player_names += result["added_player_names"]
            write_text_file(target_path, result["content"], context)
            continue

        for target_path in resolve_binary_targets(
            relative_path=relative_path,
            target_world_path=target_world_path,
            target_campaign_path=target_campaign_path,
            world_resource_refs=world_resource_refs,
        ):
            copy_binary_file(source_file_path, target_path, context)
            summary.copied_binary_files += 1

    return summary


def required_string(value: str | None, field_name: str) -> str:
    if not value or not isinstance(value, str):
        raise ValueError(f'Missing required config field "{field_name}".')
    return value


def list_files_recursively(root_dir: Path) -> list[Path]:
    files = []
    for candidate in root_dir.rglob("*"):
        if ".git" in candidate.parts:
            continue
        if candidate.is_file():
            files.append(candidate)
    return sorted(files)


def parse_markdown_document(content: str) -> MarkdownDocument:
    normalized = normalize_newlines(content)
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", normalized, flags=re.DOTALL)
    if not match:
        return MarkdownDocument(
            frontmatter=Frontmatter(has_frontmatter=False),
            body=normalized,
        )

    return MarkdownDocument(
        frontmatter=parse_frontmatter_block(match.group(1)),
        body=match.group(2),
    )


def normalize_newlines(content: str) -> str:
    return content.replace("\r\n", "\n")


def parse_frontmatter_block(block: str) -> Frontmatter:
    frontmatter = Frontmatter()
    for line in normalize_newlines(block).split("\n"):
        if not line.strip():
            continue

        match = re.match(r"^([^:]+):\s*(.*)$", line)
        if not match:
            raise ValueError(f"Unsupported frontmatter line: {line}")

        key = match.group(1).strip()
        raw_value = match.group(2)
        frontmatter.order.append(key)
        frontmatter.values[key] = raw_value

    return frontmatter


def serialize_frontmatter(frontmatter: Frontmatter, preferred_order: list[str] | None = None) -> str:
    if not frontmatter.values and not frontmatter.has_frontmatter:
        return ""

    preferred_order = preferred_order or []
    lines = ["---"]
    emitted = set()

    for key in preferred_order:
        if key in frontmatter.values:
            lines.append(f"{key}: {frontmatter.values[key]}")
            emitted.add(key)

    for key in frontmatter.order:
        if key not in emitted and key in frontmatter.values:
            lines.append(f"{key}: {frontmatter.values[key]}")
            emitted.add(key)

    lines.append("---")
    return "\n".join(lines) + "\n"


def build_migrated_world_note(
    *,
    source_world: str,
    target_world: str,
    frontmatter: Frontmatter,
    body: str,
    role: str,
) -> str:
    migrated_frontmatter = frontmatter.clone()
    migrated_frontmatter.delete("campaign")
    migrated_frontmatter.set("type", "world")
    migrated_frontmatter.set("world", to_yaml_scalar(target_world))
    migrated_frontmatter.set("status", migrated_frontmatter.values.get("status") or "active")
    migrated_frontmatter.set("role", to_yaml_scalar(role))
    migrated_frontmatter.set("system", migrated_frontmatter.values.get("system", ""))
    migrated_frontmatter.set("banner", migrated_frontmatter.values.get("banner") or '"![[world-banner.jpg]]"')

    world_notes = strip_leading_world_title(body)
    world_notes = remove_named_sections(world_notes, LEGACY_WORLD_SECTION_TITLES_TO_DROP)
    world_notes = rewrite_world_level_paths(world_notes, source_world, target_world)
    world_notes = clean_markdown_spacing(world_notes)

    content = serialize_frontmatter(migrated_frontmatter, WORLD_FRONTMATTER_ORDER)
    content += f"# The world of {target_world}\n\n"
    content += "## World Notes\n\n"

    if world_notes:
        content += f"{world_notes}\n\n"

    content += build_world_actions_section()
    content += build_world_campaigns_section(target_world)
    content += build_world_knowledge_section(target_world)
    return content


def strip_leading_world_title(body: str) -> str:
    return re.sub(r"^#\s+The world of[^\n]*\n+", "", body, flags=re.IGNORECASE)


def remove_named_sections(markdown: str, section_titles: set[str]) -> str:
    result = markdown
    for title in section_titles:
        pattern = re.compile(
            rf"(^|\n)(#{{1,6}})\s*{re.escape(title)}\s*\n.*?(?=\n#{{1,6}}\s|$)",
            flags=re.DOTALL,
        )
        result = pattern.sub("\n", result)
    return result


def get_section_body(markdown: str, section_title: str) -> str:
    pattern = re.compile(
        rf"(?:^|\n)#{{1,6}}\s*{re.escape(section_title)}\s*\n(.*?)(?=\n#{{1,6}}\s|$)",
        flags=re.DOTALL | re.IGNORECASE,
    )
    match = pattern.search(markdown)
    return clean_markdown_spacing(match.group(1)) if match else ""


def rewrite_world_level_paths(content: str, source_world: str, target_world: str) -> str:
    return content.replace(
        f"Worlds/{source_world}/Ressources",
        f"Worlds/{target_world}/Ressources",
    )


def clean_markdown_spacing(markdown: str) -> str:
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    return markdown.strip()


def build_campaign_note(
    *,
    target_world: str,
    target_campaign: str,
    role: str,
    timeline_notes: str,
    legacy_players_section: str,
) -> str:
    frontmatter = Frontmatter()
    frontmatter.set("type", "campaign")
    frontmatter.set("world", to_yaml_scalar(target_world))
    frontmatter.set("campaign", to_yaml_scalar(target_campaign))
    frontmatter.set("status", "active")
    frontmatter.set("role", to_yaml_scalar(role))
    frontmatter.set("timelineNotes", to_yaml_scalar(timeline_notes))

    content = serialize_frontmatter(frontmatter, CAMPAIGN_FRONTMATTER_ORDER)
    content += f"# {target_campaign}\n\n"
    content += f"**World:** [[Worlds/{target_world}/World|{target_world}]]\n\n"
    content += "**Timeline notes:** `= this.timelineNotes`\n\n"
    content += "**Status:** `= this.status`\n\n"
    content += "## Campaign Notes\n\n"
    content += build_players_section()

    if legacy_players_section:
        content += "### Legacy Players\n\n"
        content += f"{legacy_players_section}\n\n"

    content += build_campaign_actions_section(role)
    content += build_campaign_sessions_section(target_world, target_campaign)
    content += build_campaign_knowledge_section(target_world, target_campaign)

    if role == "dm":
        content += build_dm_encounters_section(target_world, target_campaign)

    return content


def build_world_actions_section() -> str:
    return (
        "### Actions\n\n"
        "```button\n"
        "name Add Campaign\n"
        "type command\n"
        "action QuickAdd: create-campaign\n"
        "```\n\n"
    )


def build_world_campaigns_section(target_world: str) -> str:
    return (
        "### Campaigns\n\n"
        "```dataview\n"
        'TABLE WITHOUT ID link(file.path, campaign) as "Campaign", timelineNotes as "Timeline", status as "Status"\n'
        f'FROM "Worlds/{target_world}"\n'
        'WHERE type = "campaign"\n'
        "SORT campaign ASC\n"
        "```\n\n"
    )


def build_world_knowledge_section(target_world: str) -> str:
    return (
        "### World knowledge\n\n"
        "```dataview\n"
        'TABLE file.link as "Note", type as "Type", description as "Description"\n'
        f'FROM "Worlds/{target_world}"\n'
        f'WHERE file.folder = "Worlds/{target_world}" AND file.name != "World"\n'
        "SORT file.name ASC\n"
        "```\n"
    )


def build_players_section() -> str:
    return (
        "### Players\n"
        "```dataviewjs\n"
        "(async () => {\n"
        "  const activeFile = app.workspace.getActiveFile();\n"
        "  if (!activeFile) return;\n"
        "  const folder = activeFile.parent.path;\n"
        "  const chars = dv.pages(`\"${folder}\"`)\n"
        '    .where(p => p.type === "character" && p.playerName)\n'
        '    .sort(p => p.playerName, "asc");\n\n'
        "  const byPlayer = {};\n"
        "  for (const c of chars) {\n"
        "    if (!byPlayer[c.playerName]) byPlayer[c.playerName] = [];\n"
        "    byPlayer[c.playerName].push(c);\n"
        "  }\n\n"
        "  for (const [player, list] of Object.entries(byPlayer).sort()) {\n"
        "    dv.paragraph(`**${player}**`);\n"
        "    for (const c of list) {\n"
        '      const info = `${c.file.link} · ${c.race ?? "?"} · ${c.class ?? "?"}`;\n'
        "      const line = c.alive === false\n"
        '        ? `- DEAD - ~~${c.file.name} · ${c.race ?? "?"} · ${c.class ?? "?"}~~`\n'
        "        : `- ${info}`;\n"
        "      dv.paragraph(line);\n"
        "    }\n"
        "  }\n"
        "})();\n"
        "```\n\n"
    )


def build_campaign_actions_section(role: str) -> str:
    content = (
        "### Actions\n\n"
        "```button\n"
        "name Add Session\n"
        "type command\n"
        "action QuickAdd: create-session\n"
        "```\n"
        "```button\n"
        "name Add Entity\n"
        "type command\n"
        "action Templater: Create new-entity\n"
        "```\n"
    )

    if role == "dm":
        content += (
            "```button\n"
            "name Create Encounter\n"
            "type command\n"
            "action QuickAdd: create-encounter\n"
            "```\n"
        )

    return content + "\n"


def build_campaign_sessions_section(target_world: str, target_campaign: str) -> str:
    return (
        "### Sessions\n\n"
        "```dataview\n"
        'TABLE WITHOUT ID link(file.name) as "Session", summary as "Summary", location as "Location"\n'
        f'FROM "Worlds/{target_world}/{target_campaign}"\n'
        'WHERE type = "session"\n'
        "SORT file.name ASC\n"
        "```\n\n"
    )


def build_campaign_knowledge_section(target_world: str, target_campaign: str) -> str:
    return (
        "### Campaign knowledge\n\n"
        "```base\n"
        "views:\n"
        "  - type: table\n"
        "    name: CampaignView\n"
        "    filters:\n"
        "      and:\n"
        f'        - world == "{target_world}"\n'
        f'        - campaign == "{target_campaign}"\n'
        '        - file.name != "Campaign"\n'
        "        - '!type.contains(\"session\")'\n"
        "        - '!type.contains(\"encounter\")'\n"
        "    order:\n"
        "      - file.name\n"
        "      - plane\n"
        "      - region\n"
        "      - location\n"
        "      - type\n"
        "      - description\n"
        "    columnSize:\n"
        "      note.type: 93\n"
        "```\n"
    )


def build_dm_encounters_section(target_world: str, target_campaign: str) -> str:
    return (
        "\n### DM: Encounters\n\n"
        "#### Active Encounters\n"
        "```dataview\n"
        "TABLE\n"
        '  session as "Session",\n'
        '  location as "Location",\n'
        '  length(monsters) as "Types"\n'
        f'FROM "Worlds/{target_world}/{target_campaign}"\n'
        'WHERE type = "encounter" AND status != "completed"\n'
        "SORT file.ctime DESC\n"
        "```\n\n"
        "#### Recent Completed\n"
        "```dataview\n"
        "TABLE\n"
        '  session as "Session",\n'
        '  location as "Location",\n'
        '  date-completed as "Date"\n'
        f'FROM "Worlds/{target_world}/{target_campaign}"\n'
        'WHERE type = "encounter" AND status = "completed"\n'
        "SORT date-completed DESC\n"
        "LIMIT 5\n"
        "```\n"
    )


def parse_legacy_player_map(players_section: str) -> dict[str, str]:
    mapping: dict[str, str] = {}
    if not players_section:
        return mapping

    for line in players_section.split("\n"):
        match = re.match(r"^\s*[-*]\s*(.+?)\s+as\s+\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*$", line, flags=re.IGNORECASE)
        if match:
            mapping[match.group(2).strip()] = match.group(1).strip()

    return mapping


def collect_referenced_world_resources(world_body: str, source_world: str) -> set[str]:
    pattern = re.compile(
        rf"\[\[Worlds/{re.escape(source_world)}/Ressources/([^\]]+)\]\]",
    )
    return {match.group(1) for match in pattern.finditer(world_body)}


def migrate_campaign_markdown(
    *,
    content: str,
    file_name: str,
    source_world: str,
    target_world: str,
    target_campaign: str,
    legacy_player_map: dict[str, str],
) -> dict[str, object]:
    document = parse_markdown_document(content)
    frontmatter = document.frontmatter
    note_type = frontmatter.values.get("type", "").strip().strip('"')
    added_alive_defaults = 0
    added_player_names = 0

    if note_type:
        frontmatter.set("world", to_yaml_scalar(target_world), "date")
        frontmatter.set("campaign", to_yaml_scalar(target_campaign), "world")

    if note_type in {"npc", "character"} and "alive" not in frontmatter.values:
        frontmatter.set("alive", "true")
        added_alive_defaults += 1

    if note_type == "character" and "playerName" not in frontmatter.values:
        note_name = Path(file_name).stem
        player_name = legacy_player_map.get(note_name)
        if player_name:
            frontmatter.set("playerName", to_yaml_scalar(player_name))
            added_player_names += 1

    body = rewrite_campaign_level_paths(document.body, source_world, target_world, target_campaign)
    body = clean_markdown_spacing(body)

    frontmatter_block = serialize_frontmatter(frontmatter)
    content_out = f"{frontmatter_block}{body}\n" if frontmatter_block else f"{body}\n"

    return {
        "content": content_out,
        "added_alive_defaults": added_alive_defaults,
        "added_player_names": added_player_names,
    }


def rewrite_campaign_level_paths(
    content: str,
    source_world: str,
    target_world: str,
    target_campaign: str,
) -> str:
    return content.replace(
        f"Worlds/{source_world}",
        f"Worlds/{target_world}/{target_campaign}",
    )


def resolve_binary_targets(
    *,
    relative_path: Path,
    target_world_path: Path,
    target_campaign_path: Path,
    world_resource_refs: set[str],
) -> list[Path]:
    normalized_relative = relative_path.as_posix()
    if not normalized_relative.startswith("Ressources/"):
        return [target_campaign_path / relative_path]

    resource_relative = normalized_relative[len("Ressources/"):]
    targets = [target_campaign_path / "Ressources" / resource_relative]

    if resource_relative in world_resource_refs:
        targets.append(target_world_path / "Ressources" / resource_relative)

    return targets


def ensure_dir(dir_path: Path, context: MigrationContext) -> None:
    if context.dry_run:
        log(context, f"mkdir {dir_path}")
        return

    dir_path.mkdir(parents=True, exist_ok=True)


def write_text_file(file_path: Path, content: str, context: MigrationContext) -> None:
    ensure_dir(file_path.parent, context)
    if context.dry_run:
        log(context, f"write {file_path}")
        return

    file_path.write_text(content, encoding="utf-8")


def copy_binary_file(source_path: Path, target_path: Path, context: MigrationContext) -> None:
    ensure_dir(target_path.parent, context)
    if context.dry_run:
        log(context, f"copy {source_path} -> {target_path}")
        return

    shutil.copy2(source_path, target_path)


def to_yaml_scalar(value: object) -> str:
    if value is None:
        return ""

    if isinstance(value, bool):
        return "true" if value else "false"

    if isinstance(value, (int, float)):
        return str(value)

    value = str(value)
    if value == "":
        return '""'

    if re.match(r"^[\w .'/\"-]+$", value, flags=re.UNICODE) and not re.match(r"^(true|false|null|~)$", value, flags=re.IGNORECASE):
        return value

    return json.dumps(value, ensure_ascii=False)


def log(context: MigrationContext, message: str) -> None:
    if context.verbose or context.dry_run:
        print(message)


def print_summary(summaries: list[MigrationSummary], context: MigrationContext) -> None:
    print("")
    print("Dry-run summary" if context.dry_run else "Migration summary")
    print("=================")

    for summary in summaries:
        print(
            f"- {summary.source_world} -> {summary.target_world}/{summary.target_campaign}: "
            f"{summary.migrated_markdown_files} markdown notes, "
            f"{summary.copied_binary_files} copied files, "
            f"{summary.added_alive_defaults} alive defaults, "
            f"{summary.added_player_names} playerName updates"
        )

    if context.warnings:
        print("")
        print("Warnings")
        print("--------")
        for warning in context.warnings:
            print(f"- {warning}")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # noqa: BLE001
        print(f"Migration failed: {error}", file=sys.stderr)
        raise SystemExit(1)
