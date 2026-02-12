# Slide 1: Session/Auth Foundation (Web3 + Wagmi) - Implementation Log

## Overview
Replace X OAuth login with Web3 wallet signing (MetaMask) using Wagmi v2.

## Checklist Items

### [x] Add Wagmi dependencies/config for wallet connect + sign message flow
**Status:** Done

Added dependencies:
- `wagmi` - latest stable v2
- `@tanstack/react-query` - required by wagmi
- `viem` - peer dependency

Configuration (`apps/web/src/lib/wagmi.ts`):
- Chain: Monad Mainnet (chainId: 143)
- Connector: MetaMask (injected)

Updated `main.tsx` with WagmiProvider and QueryClientProvider.

### [x] Implement shared wallet auth helper flow
**Status:** Done

Implemented in `session.tsx`:
- `loginWithWallet(walletAddress)` - calls `POST /auth/web3/nonce`
- `completeWalletLogin({ nonceId, walletAddress, signature })` - calls `POST /auth/web3/verify`

Signature is done via Wagmi's `signMessage` hook in the component (LoginPage).

### [x] Update `apps/web/src/state/session.tsx`
**Status:** Done

Changes implemented:
- Added `walletAddress` state (stored in localStorage for persistence across reloads, value comes from Wagmi context)
- Kept `apiKey`, `userId`, `agentId`, `accountType`, `adminToken` support
- Added `loginWithWallet()` method for nonce retrieval
- Added `completeWalletLogin()` method for signature verification
- Added `useCompleteWalletLogin()` hook for components
- Kept X OAuth methods (`loginWithX`, `handleAuthCallback`) but hidden from UI

### [x] Remove reliance on `#/auth-callback` in active login flow
**Status:** Done

Web3 auth doesn't need a callback route - direct flow via signing.
Kept `#/auth-callback` route in router for backwards compatibility but it's not used in the active login flow.

## Implementation Notes

- Following existing terminal-style UI theme
- Using hash-based routing (existing pattern)
- Monaco/font-mono fonts preserved
- Colors: primary (red-500), bg-terminal, etc.

## Done Gate

- [x] Slide checks pass
- [x] `pnpm --filter @molt/web typecheck` passes
- [x] `pnpm --filter @molt/web build` passes

## Test Results / Snapshots

### Typecheck Result
```
> @molt/web@ typecheck /Users/sniperman/code/molt-market/apps/web
> tsc -p tsconfig.json --noEmit

TYPECHECK PASSED
```

### Build Result
```
vite v5.4.21 building for production...
transforming...
✓ 1462 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   1.09 kB │ gzip:   0.48 kB
dist/assets/index-DQMlDGV1.css   42.54 kB │ gzip:   8.15 kB
dist/assets/index-D5NZAQFF.js   667.78 kB │ gzip: 193.88 kB

✓ built in 3.41s
```

### Files Modified
1. `apps/web/package.json` - Added wagmi, viem, @tanstack/react-query dependencies
2. `apps/web/src/lib/wagmi.ts` - NEW: Wagmi configuration with Monad Mainnet
3. `apps/web/src/main.tsx` - Added WagmiProvider and QueryClientProvider
4. `apps/web/src/state/session.tsx` - Added wallet auth methods (loginWithWallet, completeWalletLogin)
5. `apps/web/src/types.ts` - Added Web3 auth types (Web3NonceResponse, Web3AuthVerifyResponse, etc.)

## Summary

Slide 1 complete. Web3 auth foundation is ready:
- Wagmi configured with Monad Mainnet (chainId 143)
- MetaMask connector set up
- Session state updated with wallet auth methods
- X OAuth code kept but not exposed
- Types extended for Web3 auth responses
- Typecheck and build both pass
