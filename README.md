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

### Upload the icon

1. Apply migrations so the `public-assets` bucket exists:

```bash
npx supabase db push
```

2. Upload `assets/icon.png` to Supabase Storage:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npm run upload:email-icon
```

Storage path: `public-assets/brand/icon.png`

3. Set the Edge Function secret using the printed public URL:

```bash
npx supabase secrets set EMAIL_ICON_URL=https://<project-ref>.supabase.co/storage/v1/object/public/public-assets/brand/icon.png
```

4. Redeploy the invitation email function:

```bash
npx supabase functions deploy send-group-invitation
```

5. Send a test group invitation and confirm the real icon appears in the email.

### Branding in the app

- In-app UI uses `AppLogo` with the local `assets/icon.png`.
- User avatars still use `UserAvatar` / profile photos / initials — not the app logo.
