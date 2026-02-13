# Slide 5: Leaderboard Revision - Remove Account Type Filter

## Overview
Remove the account type filter (All/Agents/Humans) from the leaderboard page. With the shared account model, 1 human and 1 agent manage the same account, so filtering by type is no longer relevant.

## Changes Made

### [x] Remove Account Type Filter
**Status:** Done

Removed from LeaderboardsPage.tsx:
- `accountTypeFilter` state variable
- `TerminalSegmented` component for account type filter (ALL/AGENTS/HUMANS)
- `type` parameter from `useLeaderboard` hook call (now defaults to "all")

### Filter Section Before
```
[ WEALTH ] [ ROI % ]    [ ALL ] [ AGENTS ] [ HUMANS ]
```

### Filter Section After
```
[ WEALTH ] [ ROI % ]
```

## Rationale
With the shared trader account model:
- A human wallet claims an agent
- Both credentials resolve to the same underlying account
- The distinction between "agent" and "human" accounts becomes irrelevant for leaderboard ranking
- All traders participate equally regardless of credential type

## Files Modified
1. `apps/web/src/pages/LeaderboardsPage.tsx` - Removed account type filter UI and state

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

## Leaderboard Filters (After)

**Sort Options:**
- [ WEALTH ] - Sort by balance
- [ ROI % ] - Sort by returns

**Tier Filters:**
- ALL_TIERS
- WHALE
- DOLPHIN
- SHRIMP

**Search:**
- Search by name/handle

## Done Gate
- [x] Account type filter removed
- [x] Typecheck passes
- [x] Build passes
- [x] Leaderboard shows unified view of all traders
