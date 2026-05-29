# seagull_settleup

Seagull Split — React Native + Expo + TypeScript expense splitting app backed by Supabase.

## Development environment

Required:

- Node.js 24.3.0
- npm

Using nvm:

```bash
nvm install 24.3.0
nvm use 24.3.0
npm ci
```

Using asdf:

```bash
asdf plugin add nodejs
asdf install nodejs 24.3.0
asdf local nodejs 24.3.0
npm ci
```

Then run:

```bash
npm start
```

For web build:

```bash
npm run web:build
npm run web:preview
```

Node 20 should not be used because Supabase Realtime may fail during Expo static export due to WebSocket support.

Version pins: `.nvmrc` and `.node-version` both specify `24.3.0`. GitHub Actions uses the same version for web deployment.

## Logging Standard

Use the shared logger for all application logging. Do not use raw `console.log` outside `src/utils/logger.ts`.

```typescript
import { createLogger } from './src/utils/logger';

const logger = createLogger('myService');

logger.info('Operation started', { groupId, table: 'groups' });
logger.info('Operation succeeded', { groupId });
logger.error('Operation failed', error, { groupId });
```

### Rules

- Log operation start, success, and failure in services and critical hooks.
- Include useful identifiers (`groupId`, `expenseId`, `invitationId`) and table names for Supabase operations.
- Never log passwords, tokens, sessions, API keys, or full profile objects.
- Mask emails with `maskEmail()` from `src/utils/validation.ts`.
- Use `toUserFriendlyError()` from `src/utils/errors.ts` for UI error messages.
- In development, all log levels print to the console.
- In production, only `warn` and `error` logs are emitted by default.

See `.cursor/rules/logging.mdc` for the full project rule.

## Email icon setup

Invitation emails load the app icon from a public HTTPS URL. Email clients cannot use local files such as `assets/icon.png`.

### 1. Create the public bucket

Apply migrations so the `public-assets` bucket exists:

```bash
npx supabase db push
```

Bucket name: `public-assets` (must be public)

### 2. Upload the icon

Upload `assets/icon.png` to `public-assets/brand/icon.png`:

```bash
SUPABASE_URL=https://yljcebabixdakgwsvqtm.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret \
npm run upload:email-icon
```

Use the **Supabase service_role** secret from Dashboard → Project Settings → API. Do not use `RESEND_API_KEY` (`re_...`) or the publishable key (`sb_publishable_...`).

This script is for developer/admin use only. Do not run it in the mobile app or expose the service role key in frontend code.

### 3. Confirm the public URL works

Open this URL in a browser — it should display the app icon:

https://yljcebabixdakgwsvqtm.supabase.co/storage/v1/object/public/public-assets/brand/icon.png

If you get 404 or access denied:

- Confirm the bucket name is exactly `public-assets`
- Confirm the file path is exactly `brand/icon.png`
- Confirm the bucket is public
- Re-run the upload script

### 4. Set the Edge Function secret

```bash
npx supabase secrets set EMAIL_ICON_URL=https://yljcebabixdakgwsvqtm.supabase.co/storage/v1/object/public/public-assets/brand/icon.png
```

### 5. Redeploy the invitation email function

```bash
npx supabase functions deploy send-group-invitation
```

### 6. Send a test invitation

Send a test group invitation and confirm the real icon appears in Gmail.

If `EMAIL_ICON_URL` is missing, the email uses a text logo mark (`SS`). When the secret is set, the email renders the public icon URL in an `<img>` tag.

### Branding in the app

- In-app UI uses `AppLogo` with the local `assets/icon.png`.
- User avatars still use `UserAvatar` / profile photos / initials — not the app logo.

### Native app icon and splash (iOS / Android)

Icon and splash are configured in `app.json` to use `assets/icon.png` with background `#EEF1FF`.

After changing icon or splash assets, clear Metro cache:

```bash
npx expo start -c
```

If the simulator or device still shows an old icon or splash:

```bash
npx expo prebuild --clean
npx expo run:ios
```

**Expo Go note:** Expo Go may show Expo-related splash behavior. A development build (`npx expo run:ios`) or production build is required to fully verify custom app icon and splash screen on native.

## Authentication setup (Supabase)

Seagull Split uses **Supabase Auth** as the source of truth. Auth users live in `auth.users`; app profile data lives in `public.profiles`. Passwords are never stored in `public.profiles`.

Supported sign-in methods:

- Email / password
- Forgot password (email recovery link)

### Supabase Dashboard — Redirect URLs

Go to **Authentication → URL Configuration → Redirect URLs** and add:

- `https://split.seagullcoffee.ca/reset-password`

Also set **Site URL** to `https://split.seagullcoffee.ca` for production web.

Add `EXPO_PUBLIC_AUTH_REDIRECT_URL=https://split.seagullcoffee.ca` to your local `.env` (used for password recovery redirects).

### Forgot password flow

1. User requests recovery from `/forgot-password`.
2. Supabase sends an email with redirect `https://split.seagullcoffee.ca/reset-password`.
3. `/reset-password` exchanges the recovery code, verifies a session exists, then allows `updateUser({ password })`.
4. If the link is missing or expired, the UI shows **Link Expired** with options to request a new link.

### Auth testing checklist

**Automated (run locally):**

```bash
npm run typecheck
npm run lint
npm run web:build
```

**Web manual tests:**

1. Email/password login succeeds
2. Wrong password shows inline **Invalid email or password.** — stays on login, no redirect to home
3. Login errors do not appear on Register (and vice versa)
4. Forgot password sends email; `/reset-password` updates password when the recovery link is valid

**iOS manual tests:**

```bash
npx expo start -c
npx expo prebuild --clean && npx expo run:ios
```

1. Email/password login and wrong-password error behavior match web
2. Splash/loading and auth screens use `AppLogo` (`assets/icon.png`)
3. Register screen scrolls; Create Account button and footer link are reachable
4. Login button stays visible when the keyboard is open
5. Expired refresh token clears session and shows login with optional notice

## Web deployment (GitHub Pages)

Production web URL: [https://split.seagullcoffee.ca](https://split.seagullcoffee.ca)

### GitHub secrets

Add these repository secrets for the web build workflow:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_AUTH_REDIRECT_URL` (e.g. `https://split.seagullcoffee.ca`)

Do not add service role keys, Resend keys, or other private secrets to GitHub Actions for the web app build.

### Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to **GitHub Actions**.
4. Set **Custom domain** to `split.seagullcoffee.ca`.

### Custom domain and DNS

Custom domain: `split.seagullcoffee.ca`

Create a DNS CNAME record:

| Type | Host | Value |
|------|------|-------|
| CNAME | `split` | `USERNAME.github.io` |

Replace `USERNAME` with the GitHub username or organization that owns the repository.

The deploy workflow writes `dist/CNAME`, `dist/.nojekyll`, and copies `dist/index.html` to `dist/404.html` so GitHub Pages serves the Expo app for deep links and unknown paths.

### Web routing

- Unauthenticated users are redirected to `/welcome` from `/`, protected tabs, and unknown routes.
- Authenticated users are redirected to `/home` from `/` and public auth pages.
- Invite links such as `/register?invite={token}` remain public and preserve the invitation flow.

### Build locally

Use **Node.js 24.3.0** (same as CI). See [Development environment](#development-environment) for setup with nvm or asdf.

```bash
npm run web:build
npm run web:preview
```

The static export is written to `dist/`.

### Manual deployment

Deployment is manual only — it does not run on push to `main` or any other branch.

1. Push code to the `main` branch.
2. Go to **GitHub → Actions**.
3. Select **Deploy Web to GitHub Pages**.
4. Click **Run workflow**.
5. Choose branch: **`main`**.
6. Click **Run workflow**.
7. Visit [https://split.seagullcoffee.ca](https://split.seagullcoffee.ca).

If you run the workflow from any branch other than `main`, it fails with: *This workflow must be run from the main branch.*

### Invitation email web links

Set the public app URL used in invitation emails:

```bash
npx supabase secrets set PUBLIC_APP_URL=https://split.seagullcoffee.ca
npx supabase functions deploy send-group-invitation
```

Invitation emails use:

`https://split.seagullcoffee.ca/register?invite={token}`

Email clients cannot load local `assets/icon.png`. The web app uses the local asset; emails use the public `EMAIL_ICON_URL` from Supabase Storage.

## Receipt scanning (OCR)

Receipt OCR runs in a Supabase Edge Function. **Do not** put `OPENAI_API_KEY` or any OCR provider key in Expo `.env` or frontend code. The mobile/web app only calls:

```typescript
supabase.functions.invoke('scan-receipt', { body: { imageBase64, mimeType } })
```

### Deploy the Edge Function

```bash
npx supabase functions deploy scan-receipt
```

### Set the OCR secret (Edge Function env only)

```bash
npx supabase secrets set OPENAI_API_KEY=your_key_here
```

Optional:

```bash
npx supabase secrets set RECEIPT_OCR_PROVIDER=openai
npx supabase secrets set OPENAI_VISION_MODEL=gpt-4o-mini
```

If `OPENAI_API_KEY` is missing, the function returns:

`Receipt scanning is not configured yet.`

### Debugging OCR failures

After deploying, scan a receipt and check Supabase Edge Function logs. Expected success path:

```json
{"event":"scan_receipt_started","mimeType":"image/png","imageBytes":348508}
{"event":"openai_ocr_request_started","model":"gpt-4o-mini","mimeType":"image/png","imageBytes":348508,"hasApiKey":true}
{"event":"openai_ocr_response_received","status":200,"ok":true}
{"event":"openai_ocr_content_received","contentPreview":"..."}
{"event":"scan_receipt_succeeded","hasAmount":true}
```

If OpenAI fails, logs include `openai_ocr_response_error` with `status` and `bodyPreview` (first 500 chars). Common statuses:

| Status | Likely cause |
|--------|----------------|
| 401 | Invalid OpenAI key or wrong secret value |
| 403 | Key/project lacks access |
| 404 | Wrong endpoint or model name |
| 429 | Quota, rate limit, or billing issue |
| 400 | Bad payload or invalid image data |
| 500/502/503 | OpenAI temporary outage |

Structured error codes returned to the app: `OCR_NOT_CONFIGURED`, `OPENAI_REQUEST_FAILED`, `OPENAI_INVALID_RESPONSE`, `NO_AMOUNT_DETECTED`, `INVALID_IMAGE`, `REQUEST_BODY_INVALID`.

### Security notes

- Never add `OPENAI_API_KEY` to `EXPO_PUBLIC_*` variables.
- Never add the Supabase **service role** key to the Expo app.
- Receipt images and OCR API keys are not logged by the app logger.

### Manual test checklist (iOS)

1. Home → **Scan Receipt**
2. **Take Photo** and **Upload Image**
3. OCR loading state appears
4. Detected amount can be edited
5. Continue as **Personal** or **Split** opens Add Expense with amount + receipt prefilled
6. Save expense — receipt appears on Expense Detail
7. If OCR is not configured, user sees a clean inline message (no redbox)
8. If no total is detected, user can enter amount manually and continue
