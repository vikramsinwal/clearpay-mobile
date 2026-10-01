# Clearpay Customer Mobile — Codebase Memory Seed

Persistent project understanding for Codebase Memory / AI assistants. Update when
major architectural decisions change.

**Architecture:** [`docs/MOBILE_ARCHITECTURE.md`](./MOBILE_ARCHITECTURE.md)  
**Security:** [`docs/MOBILE_SECURITY.md`](./MOBILE_SECURITY.md)  
**MCP:** [`docs/MCP_SETUP.md`](./MCP_SETUP.md)

Do not store temporary implementation details as permanent decisions.

## 1. Purpose

Clearpay **Customer Mobile** — iOS/Android app for customers to authenticate and
use Clearpay customer APIs. Separate from the Clearpay Next.js web/admin app.
No customer web dashboard lives here.

## 2. Architecture

```
Customer Mobile
    ↓
REST API  (/api/v1/customer/*)
    ↓
Clearpay Backend
    ↓
MongoDB
```

The mobile app **never** accesses MongoDB directly.

## 3. Folder structure

`app/` · `components/` · `features/` · `hooks/` · `lib/` · `stores/` · `types/` ·
`constants/` · `utils/` · `docs/` · `.cursor/`

## 4. Expo setup

Expo SDK 57 · `expo-router` entry · scheme `clearpay` · EAS profiles in
`eas.json` · NativeWind via `global.css` + `metro.config.js`.

## 5. Expo Router

File-based routes under `app/`. Typed routes enabled. Keep route files thin;
feature logic in `features/` / `lib/`.

## 6. API architecture

- `EXPO_PUBLIC_API_BASE_URL` + versioned `/api/v1/customer/*`
- Standard JSON envelope and pagination from backend docs
- Do not invent endpoints
- TanStack Query owns server state

## 7. Authentication architecture

Planned against backend customer auth (Bearer access + refresh). Not implemented
in the foundation phase. Identity always from server session — never from
client-supplied `customerId`.

## 8. Secure storage

Expo Secure Store for tokens only. Never passwords. Never log secrets.

## 9. TanStack Query

All REST reads/writes/cache/invalidation. No parallel ad-hoc fetch layer for
domain data.

## 10. Zustand

Client UI state only. Not the source of truth for payments, balances, or
ledger rows.

## 11. Customer feature modules

`features/` will hold auth, profile, payments list, transactions, notifications,
devices, etc., as they are implemented. Foundation intentionally has no business
screens yet.

## 12. Design system

Navy / blue / teal fintech UI via NativeWind theme tokens. Reusable components;
accessible contrast; clear status colors.

## 13. Testing

Not pinned in foundation. Add Expo-compatible tests when features land; do not
add a conflicting second runner without a decision.

## 14. EAS

`development` / `preview` / `production` profiles. Run `eas init` to set
`projectId`. No MCP unstable flag in production builds.

## 15. Development workflow

`npm install --legacy-peer-deps` → configure `.env` → `npm run typecheck` /
`npm run lint` → `npx expo start`. For AI local MCP see `MCP_SETUP.md`. After
large edits: `npm run graft:build`.

## 16. MCP tooling

- **Expo MCP** — `https://mcp.expo.dev/mcp` (OAuth); local capabilities via
  `expo-mcp` + `EXPO_UNSTABLE_MCP_SERVER=1`
- **Graft** — `@nanonets/graft` MCP + `graft/` graph (gitignored cache)
- **Codebase Memory** — this document as the seed
- Design tooling — same Cursor plugin approach as Clearpay web

## Current status — foundation only

Completed: Expo + TypeScript + Router shell, NativeWind theme, tooling
(lint/typecheck/EAS/MCP/Graft/Cursor rules/docs).

Not yet: full trades/payment-create flows, mock business data as source of truth.
Auth + Home (trader portal) in place: welcome, register, sign-in, home without modules,
deposit-required hero. Customer payment-create is not in the backend API yet.
