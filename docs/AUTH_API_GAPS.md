# Auth API gaps (customer mobile)

## Telegram verification — missing on backend

Clearpay `docs/API_CUSTOMER_AUTH.md` documents register, login, refresh, logout,
me, forgot/reset password, and verify-email. It does **not** document Telegram
verification.

Mobile Step 2 calls this **provisional** contract (do not treat responses as
authoritative until the backend ships it):

| Method | Path | Auth |
| --- | --- | --- |
| POST | `/api/v1/customer/auth/telegram/verify` | Bearer access token |

Request body:

```json
{ "telegramUsername": "example_user" }
```

Expected success `data` (proposed):

```json
{
  "status": "verified | pending | not_started | failed | expired",
  "telegramUsername": "example_user",
  "customer": {},
  "tokens": {}
}
```

Client behavior:

- Calls the real endpoint via `features/auth/api/telegram.ts`
- Never fakes a verified outcome on network / 404 / pending
- Maps pending / not_started / failed / expired to safe UI copy
- Continues the flow only when `status === "verified"`
- Does not invent session tokens unless the API returns them (Step 1 register
  may already have stored tokens)

## Telegram bot URL

Requires `EXPO_PUBLIC_TELEGRAM_BOT_URL` (see `.env.example`). Opening the bot
without this config shows a controlled configuration error.
