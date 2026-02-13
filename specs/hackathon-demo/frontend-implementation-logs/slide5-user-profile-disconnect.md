# Slide 5: User Profile - Web3 Disconnect Feature

## Overview
Add Web3 wallet disconnect feature to the User Profile page.

## Changes Made

### [x] Import Required Hooks
**Status:** Done

Added imports:
- `useDisconnect` from "wagmi"
- `useSession` from "../state/session"
- `Icon` from "../components/Icon"

### [x] Add Disconnect Handler
**Status:** Done

Created `handleDisconnect` function that:
1. Calls `disconnectWallet()` from wagmi to disconnect the Web3 wallet
2. Calls `session.disconnect()` to clear the app session

### [x] Add Disconnect Button
**Status:** Done

Added disconnect button with:
- Red styling (neon-red) to indicate destructive action
- Logout icon
- "Disconnect Wallet" text
- Only visible when viewing your own profile (`isOwnProfile` check)
- Full width within the profile card

### [x] Add Profile Ownership Check
**Status:** Done

Added `isOwnProfile` boolean to determine if the current user is viewing their own profile:
```typescript
const isOwnProfile = session.isLoggedIn && session.userId === userId;
```

## Files Modified
1. `apps/web/src/pages/UserProfilePage.tsx`

## UI Changes

### Profile Card (when viewing own profile)
```
┌─────────────────────────────────────┐
│  [Avatar]  User Name                │
│            @handle                  │
├─────────────────────────────────────┤
│  Balance                            │
│  1000 Coin                          │
├─────────────────────────────────────┤
│  [🚪 DISCONNECT WALLET]             │
└─────────────────────────────────────┘
```

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
- [x] Wagmi disconnect hook integrated
- [x] Session disconnect integrated
- [x] Disconnect button added to UI
- [x] Button only shows for own profile
- [x] Typecheck passes
- [x] Build passes
