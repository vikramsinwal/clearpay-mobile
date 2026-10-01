# Clearpay Customer Mobile — Security

Security baseline for the customer mobile client. Architecture and MCP setup are
documented separately.

## Trust boundary

```
Device (untrusted) → HTTPS REST → Clearpay Backend (authoritative) → MongoDB
```

- The app is an untrusted client.
- Authorization and customer ownership are enforced only on the backend.
- Client-side route guards and hidden UI are not security controls.

## Token handling

- Access and refresh tokens: **Expo Secure Store** only
- Never log tokens or `Authorization` headers
- Never persist passwords on device
- Clear SecureStore session material on logout and failed refresh

## Configuration

- Use `.env` locally; commit only `.env.example`
- `EXPO_PUBLIC_*` is public — no private keys, Mongo URIs, webhook secrets, or
  admin credentials
- Production API base URL must be HTTPS
- Signing keys and store credentials: EAS Secrets / CI, not the repo

## API client expectations

- Send Bearer tokens only to the configured Clearpay API host
- Normalize errors; show safe user messages (no stacks, no internal DB errors)
- Do not accept client-supplied `customerId` as proof of access
- Money as integer `amountMinor`; public IDs only

## What this app must never do

- Connect to MongoDB or any database
- Embed admin tooling
- Ship mock financial ledgers as production truth
- Disable TLS validation for convenience
- Commit `.keystore` / `.jks` / `.p8` / `.p12` / `.mobileprovision`

## Incident hygiene

If a token or signing secret may have leaked: revoke/rotate on the backend and
EAS, clear local SecureStore, and rotate any exposed `EXPO_PUBLIC` endpoints if
they pointed at non-prod systems incorrectly documented as production.
