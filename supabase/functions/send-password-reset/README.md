# send-password-reset

Sends a branded password reset email via Resend for registered Supabase Auth users.

## Request

`POST` with JSON body:

```json
{ "email": "user@example.com" }
```

No authenticated user is required. The Supabase client still sends the anon key via `supabase.functions.invoke`.

## Response

Always returns the same success message when the request is accepted, including for unregistered emails:

```json
{
  "ok": true,
  "message": "If this email is registered, we'll send a password reset link."
}
```

Errors (invalid email, Resend failure, missing secrets) return `ok: false`.

## Secrets

Set in Supabase project secrets:

- `SUPABASE_URL` (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-injected)
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (e.g. `Seagull Split <noreply@seagullcoffee.ca>`)
- `PASSWORD_RESET_REDIRECT_URL` (required for production recovery links)
- `EMAIL_ICON_URL` (optional logo URL for email template)

Do **not** use frontend env vars (`EXPO_PUBLIC_*`) or `PUBLIC_APP_URL` in this function.
Recovery links must redirect to production, not localhost.

```bash
supabase secrets set RESEND_API_KEY=...
supabase secrets set RESEND_FROM_EMAIL="Seagull Split <noreply@seagullcoffee.ca>"
supabase secrets set PASSWORD_RESET_REDIRECT_URL=https://split.seagullcoffee.ca/reset-password
```

If `PASSWORD_RESET_REDIRECT_URL` is unset, the function defaults to
`https://split.seagullcoffee.ca/reset-password`.

## Supabase Dashboard

Authentication → URL Configuration:

- Site URL: `https://split.seagullcoffee.ca`
- Redirect URLs:
  - `https://split.seagullcoffee.ca/reset-password`
  - `https://split.seagullcoffee.ca/auth/callback`
  - `seagullsplit://auth/callback`

Authentication → Providers → Email → **Email OTP Expiration**:

- Set to **7200** seconds (~2 hours)
- Controls validity for email auth links, including password recovery links
- Do not hardcode expiry in app code; Supabase Auth owns token lifetime

Important:

- Old links are **not** extended when this setting changes
- After changing the setting, users must request a **new** reset email
- Requesting a new reset email may invalidate older links
- Expired links show `otp_expired`; `ResetPasswordScreen` shows a clean message and does not redirect to Home

After changing secrets or this function, redeploy and request a **new** reset email.
Old links may show `otp_expired` and should not be reused.

Custom reset emails use app URLs with `token_hash` and `type=recovery` (not direct
Supabase `action_link`). The reset page verifies the token only after the user taps
Continue, so email scanners are less likely to consume one-time recovery tokens early.

## Deploy

```bash
npx supabase functions deploy send-password-reset --no-verify-jwt
```

**Important:** This function must be deployed with JWT verification disabled (`--no-verify-jwt`).
Forgot-password is called while logged out; the publishable API key is not a JWT, so
gateway JWT verification returns 401 before the function runs.
