# Clearpay Customer Mobile — Architecture

Customer-facing iOS/Android app. Separate from the Clearpay Next.js
marketing/admin web application.

## Data flow

```
Customer Mobile (this repo)
        ↓  HTTPS REST (/api/v1/customer/*)
Clearpay REST API (Clearpay backend)
        ↓
MongoDB
```

The mobile client **never** opens a MongoDB connection and never embeds DB
credentials.

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | React Native + Expo |
| Language | TypeScript (strict) |
| Routing | Expo Router (`app/`) |
| Styling | NativeWind + shared theme tokens |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| Secrets at rest | Expo Secure Store |
| Motion / icons | Reanimated, Lucide React Native |
| Delivery | EAS |

## Folder structure

```
app/            Expo Router routes and layouts only
components/     Shared UI primitives
features/       Feature modules (auth, payments, … — added when implemented)
hooks/          Shared React hooks
lib/            API client, env, query client, utilities wired to infrastructure
stores/         Zustand stores (UI / session shell — not financial source of truth)
types/          Shared TypeScript types
constants/      App constants (non-secret)
utils/          Pure helpers
docs/           Architecture, security, MCP, codebase memory
.cursor/        MCP config, Graft hooks, Cursor rules
```

## Expo Router

- Entry: `expo-router/entry` (`package.json` `main`)
- Typed routes enabled via `experiments.typedRoutes`
- Deep link scheme: `clearpay`
- Add screens as files under `app/`; keep business logic out of route files when
  it belongs in `features/` or `lib/`

## API architecture

- Base URL: `EXPO_PUBLIC_API_BASE_URL`
- Versioned customer API: `/api/v1/customer/*` (documented by the backend)
- Standard success/error envelope and pagination — see Cursor rule
  `clearpay-mobile-api` and backend `docs/API.md`
- Do not invent endpoints

## Auth architecture (planned; not implemented in foundation)

- Bearer access token + refresh token flow against backend auth routes
- Tokens in SecureStore; identity from server session only
- Details when auth is implemented: follow backend `API_CUSTOMER_AUTH.md`

## State

- **TanStack Query:** remote resources, mutations, cache invalidation
- **Zustand:** local UI state only
- Financial correctness always comes from the API response

## Design system

Navy / blue / teal brand tokens in `tailwind.config.js`. Reuse components;
avoid one-off palettes. See `clearpay-mobile-design` rule.

## Testing

Foundation does not yet pin a mobile test runner. When added, prefer Expo-
compatible unit/component tests without a second conflicting runner. Backend
contract tests remain on the Clearpay web/API repository.

## EAS

- Profiles in `eas.json`: `development`, `preview`, `production`
- Set `extra.eas.projectId` after `eas init`
- Production builds must not enable `EXPO_UNSTABLE_MCP_SERVER`

## Development workflow

```bash
npm install --legacy-peer-deps
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL
npm run typecheck
npm run lint
npx expo start
# AI local MCP: see docs/MCP_SETUP.md
npm run graft:build
```

## Related

- [`MCP_SETUP.md`](./MCP_SETUP.md)
- [`MOBILE_SECURITY.md`](./MOBILE_SECURITY.md)
- [`CODEBASE_MEMORY.md`](./CODEBASE_MEMORY.md)
