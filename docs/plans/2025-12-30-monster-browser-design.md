# Monster Browser Design

**Date:** 2025-12-30
**Status:** Approved for Implementation

## Overview

A dedicated Monster Browser note that provides interactive filtering of SRD monsters across all enabled sources without requiring monster extraction during encounter creation.

## Requirements

- Filter monsters by: Environment, CR Range, Type, Size, and Name Search
- Display results in sortable table with key stats
- Integrate with existing monster modal for detailed view
- Handle large datasets efficiently (100-result smart loading)
- Work seamlessly with existing SRD configuration

## Architecture

### Location & Structure

- **File:** `_system/Monster Browser.md`
- **Technology:** DataviewJS for interactive filtering and rendering
- **Integration:** Uses existing `monsters.js` library and `window.showMonsterModal()`

### Components

1. **Monster Loading**
   - Uses `monsters.loadAllMonsters(app)` from `lib/monsters.js`
   - Loads once on note open, cached in memory
   - Respects enabled sources from `sources.md`

2. **Filter Controls** (5 inputs, all visible at once)
   - Name Search: Text input, case-insensitive partial match
   - Environment: Dropdown (All, Mountain, Swamp, Desert, etc.)
   - CR Range: Dropdown (All, 0-2, 3-5, 6-10, 11-15, 16-20, 21+)
   - Type: Dropdown (All, Humanoid, Dragon, Undead, etc.)
   - Size: Dropdown (All, Tiny, Small, Medium, Large, Huge, Gargantuan)

3. **Filtering Logic**
   - AND logic: monsters must match ALL active filters
   - Filters work on in-memory array (fast)
   - Re-renders on any filter change

4. **Results Display**
   - Table columns: Name | Source | CR | Type | Size | Environment | View
   - Sorted alphabetically by name
   - View button opens existing monster modal
   - 100-result limit with warning if more exist

## Implementation Details

### Filter Dropdown Population

Dropdowns dynamically populated from loaded monster data:
- Scan all monsters for unique environments, types, sizes
- Sort alphabetically
- Add "All" as first option

### CR Range Parsing

```javascript
function parseCR(cr) {
  if (cr === '0') return 0;
  if (cr.includes('/')) {
    const [num, denom] = cr.split('/').map(Number);
    return num / denom;
  }
  return parseFloat(cr) || 0;
}

function isInCRRange(cr, range) {
  const crNum = parseCR(cr);
  // Check against range boundaries (0-2, 3-5, etc.)
}
```

### Monster Type Extraction

Handle nested type structure:
```javascript
function getMonsterType(monster) {
  if (typeof monster.type === 'string') return monster.type;
  if (monster.type?.type) return monster.type.type;
  return 'Unknown';
}
```

### 100-Result Smart Loading

```javascript
const filtered = filterMonsters(allMonsters, currentFilters);
const displayMonsters = filtered.slice(0, 100);
const hasMore = filtered.length > 100;

if (hasMore) {
  // Display warning: "Showing 100 of {filtered.length} results..."
}
```

### View Button Integration

```javascript
const viewButton = dv.el('button', 'View');
viewButton.onclick = () => {
  window.showMonsterModal(dv.app, monsterName, source);
};
```

## User Workflow

1. Open `_system/Monster Browser.md` in Obsidian
2. Use filters to narrow down monsters by environment, CR, etc.
3. Browse results table
4. Click "View" to see full stat block in modal
5. Note monster name for later addition to encounter
6. Use existing "Add Monsters" action to add to encounter

## Performance Characteristics

- Initial load: 1-2 seconds (loads all enabled source monsters)
- Filter updates: <100ms (in-memory filtering)
- Table render: <200ms for 100 rows
- Modal open: <500ms (loads fluff data on demand)

## Integration Points

- **monsters.js**: `loadAllMonsters(app)` for data loading
- **monsterModal.js**: `window.showMonsterModal()` for stat display
- **sources.md**: Respects enabled sources configuration
- **No changes** to existing action scripts

## Future Extensions

Not implemented in initial version, but architecture supports:

- "Add to Active Encounter" button (requires encounter detection)
- Bookmark/favorite monsters
- Export filtered list to markdown
- Save/load filter presets
- Sort columns by clicking headers
