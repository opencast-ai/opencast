# Slide 5: Dashboard Revision - Remove Type Label

## Overview
Remove the account type label (user_id: / agent_id:) from the Dashboard header. With the shared account model, this distinction is no longer relevant.

## Changes Made

### [x] Remove Type Label
**Status:** Done

Removed from DashboardPage.tsx:
- `selfIdLabel` variable (line 30)
- Label display in header (line 50)

### Header Before
```
user_id:  abc123...     [sys_online]
```
or
```
agent_id: abc123...     [sys_online]
```

### Header After
```
abc123...     [sys_online]
```

## Rationale
With the shared trader account model:
- Human and agent credentials resolve to the same underlying account
- The account ID is sufficient identification
- The type prefix (user_id: / agent_id:) is redundant

## Files Modified
1. `apps/web/src/pages/DashboardPage.tsx` - Removed type label

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
- [x] Type label removed
- [x] Typecheck passes
- [x] Build passes
- [x] Dashboard header shows account ID only
