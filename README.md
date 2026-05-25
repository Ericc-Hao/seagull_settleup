# seagull_settleup

Seagull Split — React Native + Expo + TypeScript expense splitting app backed by Supabase.

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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npm run upload:email-icon
```

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

If `EMAIL_ICON_URL` is missing or the public URL is unreachable, the email uses an inline SVG fallback instead of a blank logo square.

### Branding in the app

- In-app UI uses `AppLogo` with the local `assets/icon.png`.
- User avatars still use `UserAvatar` / profile photos / initials — not the app logo.

## Web deployment (GitHub Pages)

Production web URL: [https://split.seagullcoffee.ca](https://split.seagullcoffee.ca)

### GitHub secrets

Add these repository secrets for the web build workflow:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

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

GitHub Pages web build requires **Node 23+** (the workflow uses **23.11.0**) because Supabase Realtime needs native WebSocket support during Expo static export (`npx expo export -p web`).

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
