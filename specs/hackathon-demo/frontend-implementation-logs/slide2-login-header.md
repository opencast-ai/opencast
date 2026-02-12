# Slide 2: Login and Header Navigation - Implementation Log

## Overview
Update login UI and top nav to reflect wallet auth + new guide-focused flow.

## Checklist Items

### [x] Update `apps/web/src/pages/LoginPage.tsx`
**Status:** Done

Changes implemented:
- Removed X OAuth login CTA
- Added wallet connect/sign CTA with states:
  - `isConnecting` - MetaMask connection in progress
  - `isConnected` - Wallet connected, waiting for sign
  - `isSigning` - Message signing in progress
  - `isVerifying` - Server verification in progress
- Uses Wagmi hooks: `useConnect`, `useAccount`, `useSignMessage`
- Flow: Connect MetaMask → Get nonce from `/auth/web3/nonce` → Sign message → Verify via `/auth/web3/verify`
- Kept "Register Agent" shortcut at bottom
- Shows wallet address in logged-in state (not X handle/avatar)

### [x] Update `apps/web/src/components/TerminalHeader.tsx`
**Status:** Done

Changes implemented:
- Retained `#/config` nav target
- Removed X-specific identity affordances (X avatar, X handle display)
- For human accounts: displays truncated wallet address (`0x1234...5678`) instead of X handle
- For agent accounts: displays agent ID as before
- Login button shows wallet icon instead of X icon

### [x] Update `apps/web/src/router.tsx` and `apps/web/src/App.tsx`
**Status:** Done

Changes:
- Route compatibility maintained
- No dead-end auth-callback dependency in normal flow
- `#/auth-callback` route kept for backwards compatibility but not used in wallet auth flow

## UI Validation (Agent Browser)

### Screenshot: Unauthenticated Login Page
![Login Page Unauthenticated](slide2-login-page-unauthenticated.png)

Validation results:
- ✅ Shows "Connect MetaMask" button (not X OAuth)
- ✅ Shows "Register Agent" button
- ✅ Terminal theme styling preserved
- ✅ No X-specific UI elements

### Snapshot Results
```
- link "MOLT_OS" [ref=e1]
- textbox [ref=e2]
- link "/dashboard" [ref=e3]
- link "/markets" [ref=e4]
- link "/leaderboard" [ref=e5]
- link "/config" [ref=e6]
- link "Login" [ref=e7]
- button [ref=e8]
- link "?" [ref=e9]
- button "Connect MetaMask" [ref=e10]   <-- Wallet button
- button "Register Agent" [ref=e11]    <-- Agent shortcut
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
✓ 1462 modules transformed.
✅ Build successful
```

## Files Modified
1. `apps/web/src/pages/LoginPage.tsx` - Rewrote with wallet auth flow
2. `apps/web/src/components/TerminalHeader.tsx` - Updated identity display for wallet addresses

## Done Gate
- [x] Slide checks pass
- [x] Typecheck + build pass
- [x] UI validated: No visible X OAuth entrypoint
- [x] UI validated: Wallet login button present
