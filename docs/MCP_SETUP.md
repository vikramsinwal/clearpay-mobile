# Expo MCP setup — Clearpay Customer Mobile

This document covers Expo MCP (remote + local capabilities) for AI-assisted
development. Architecture and security live in sibling docs; do not duplicate
them here.

## Servers in this project

Configured in [`.cursor/mcp.json`](../.cursor/mcp.json):

| Server | Type | Purpose |
| --- | --- | --- |
| `expo` | Remote HTTP | Expo docs, package install helpers, EAS tools; local capabilities when the Expo dev server is running with MCP enabled |
| `graft` | Local stdio (`npx @nanonets/graft mcp`) | Repo context graph for this mobile codebase |

Codebase Memory and Design tooling follow the same Cursor plugin patterns used
by the Clearpay web project; they are not duplicated as invented entries in
`mcp.json`.

## Expo remote MCP

- **URL:** `https://mcp.expo.dev/mcp`
- **Auth:** Official OAuth (Expo account). Do not hardcode tokens.
- After adding the server, open Cursor MCP settings and complete the browser
  sign-in when prompted.

Remote server capabilities work without a running Metro process (docs search,
recommended installs, EAS helpers subject to Expo plan).

## Local MCP capability (`expo-mcp`)

Local capabilities (simulator screenshots, UI automation, Expo Router sitemap,
DevTools) require:

1. Expo SDK 54+ (this project targets SDK 57)
2. Dev dependency installed via the official method:

```bash
npx expo install expo-mcp --dev
```

3. Expo CLI logged in with the **same** Expo account used for MCP OAuth:

```bash
npx expo whoami || npx expo login
```

4. Start the development server with the unstable MCP flag (**development
   only** — never set this for production or EAS production builds):

```bash
# Windows PowerShell
$env:EXPO_UNSTABLE_MCP_SERVER=1; npx expo start

# macOS / Linux
EXPO_UNSTABLE_MCP_SERVER=1 npx expo start
```

Optional npm script (uses `cross-env`):

```bash
npm run start:mcp
```

Do **not** bake `EXPO_UNSTABLE_MCP_SERVER` into `eas.json` production profiles
or release pipelines.

## Reconnect after restarting Expo

Whenever you start or stop the Expo development server, **reconnect or restart
the Expo MCP connection** in Cursor so local capabilities refresh. Stale
connections will miss simulator / automation tools.

## Graft (same pattern as Clearpay web)

```bash
npm run graft:build
# or: npx graft build
```

Graft indexes tracked source (respecting `.gitignore`). Do not put secrets in
indexed files. After large code changes, rebuild the graph.

Important source areas: `app/`, `components/`, `features/`, `hooks/`, `lib/`,
`stores/`, `types/`, `constants/`, `utils/`.

Ignored via `.gitignore` (and therefore not treated as source of truth for the
graph): `node_modules/`, `.expo/`, `dist/`, `build/`, `coverage/`, `.git/`,
`.env*`, signing materials (`*.keystore`, `*.jks`, `*.p8`, `*.p12`,
`*.mobileprovision`), and the generated `graft/` cache itself.

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| Expo MCP asks for auth repeatedly | Complete OAuth in Cursor; confirm `npx expo whoami` matches that Expo account |
| Local tools missing (screenshot / tap) | Confirm `expo-mcp` is a **devDependency**, start with `EXPO_UNSTABLE_MCP_SERVER=1`, then reconnect Expo MCP in Cursor |
| Graft tools empty / stale | Run `npm run graft:build`; confirm `@nanonets/graft` is installed |
| `mcp.json` ignored | Ensure file is valid JSON under `.cursor/mcp.json`; reload Cursor window |
| Peer dependency install noise on Windows | Use `npm install --legacy-peer-deps` when Expo peer ranges conflict |

## Related docs

- [`CODEBASE_MEMORY.md`](./CODEBASE_MEMORY.md) — project seed for agents
- [`MOBILE_ARCHITECTURE.md`](./MOBILE_ARCHITECTURE.md) — app structure
- [`MOBILE_SECURITY.md`](./MOBILE_SECURITY.md) — security baseline
