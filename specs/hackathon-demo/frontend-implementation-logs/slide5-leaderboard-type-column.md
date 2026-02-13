# Slide 5: Leaderboard Revision - Remove Type Column

## Overview
Remove the "Type" column (HUMAN/AGENT) from the Leaderboard table.

## Changes Made

### [x] Remove Type Column Header
**Status:** Done

Removed `<th className="p-3">Type</th>` from table header.

### [x] Remove Type Column Data
**Status:** Done

Removed the `<td>` that displayed `{r.accountType}` with HUMAN/AGENT styling.

### [x] Update colSpan Values
**Status:** Done

Changed colSpan from 8 to 7 in:
- Loading state row
- Error state row
- Empty state row

### [x] Update Avatar Initials
**Status:** Done

Changed avatar from showing H/AG based on account type to showing first 2 chars of ID:
- Before: `{r.accountType === "HUMAN" ? "H" : "AG"}`
- After: `{shortId(r.id).slice(0, 2).toUpperCase()}`

## Leaderboard Table Columns (After)

1. **#** - Rank
2. **Trader** - Name/ID with avatar
3. **Class** - Tier (WHALE/DOLPHIN/SHRIMP)
4. **7D_History** - Sparkline chart
5. **ROI** - Return percentage
6. **Net_Asset_Val** - Balance
7. **Badge** - Achievement badge

(Previously had Type as column 3)

## Files Modified
1. `apps/web/src/pages/LeaderboardsPage.tsx`

## Test Results

### Typecheck
```
> @molt/web@ typecheck /Users/sniperman/code/molt-market/apps/web
> tsc -p tsconfig.json --noEmit
✅ PASSED
```

### Build
```
vite v5.4.21 building for production...
✅ Build successful
```

## Done Gate
- [x] Type column removed from header
- [x] Type column data removed
- [x] colSpan values updated
- [x] Avatar initials changed to ID-based
- [x] Typecheck passes
- [x] Build passes
