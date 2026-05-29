# AGENTS.md

## Expo version

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any Expo-related code.

## Project rules

This is an Expo React Native + TypeScript app with Web support.

Primary targets:

- iOS native
- Android native
- Expo Web
- GitHub Pages web deployment

Do not make web-only changes that break iOS.
Do not make iOS-only changes that break web.

Always run or recommend:

- `npm run typecheck`
- `npm test`
- `npm run web:build`

When changing iOS native config:

- `app.json` changes such as scheme/icon/splash require a native rebuild
- use `npx expo prebuild --clean` only when native config requires it
- use `npx expo run:ios` to verify native behavior

## Styling rules

Keep the Seagull Split pastel design.

Palette:

- `#B1B2FF`
- `#AAC4FF`
- `#D2DAFF`
- `#EEF1FF`

Use existing theme tokens from `src/theme`.

Do not redesign screens unless explicitly requested.

For iOS layout:

- avoid web-only CSS
- avoid `position: fixed`
- avoid CSS `boxShadow` strings
- avoid `100vh`
- avoid relying on web CSS
- use React Native `View` / `Text` / `Image` / `Pressable`
- use StyleSheet-compatible style objects
- use `shadowColor` / `shadowOffset` / `shadowOpacity` / `shadowRadius` / `elevation`
- use `minWidth: 0` and `numberOfLines` for compressed rows
- do not rely on `gap` for fragile horizontal layouts

For BottomTabBar:

- maintain 5 evenly distributed slots: Home | Expenses | + | Groups | Profile
- center plus button must have purple circular background
- normal tab labels must be directly under icons
- do not use random `zIndex` hacks
- do not render plus icon without the purple circle

## Supabase rules

Supabase is the source of truth.

Use:

- `auth.users` for auth users
- `public.profiles` for app-specific user data

Do not create `public.users`.

Never store passwords in `public.profiles`.

Do not expose:

- Supabase service role key
- Resend API key
- OpenAI API key
- OCR provider keys

Frontend may only use public Expo env vars:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_AUTH_REDIRECT_URL`

Use shared Supabase client from `src/lib/supabase.ts`.
Do not create new Supabase clients inside components.

## Supabase migration safety rules

Supabase migrations must be treated carefully.

Never create arbitrary timestamp/version prefixes manually if the project already has an established remote migration history.

Before creating or applying migrations, always check:

1. Local migration files:
   `supabase/migrations/`

2. Remote migration history:
   `npx supabase migration list`

3. Current linked project:
   `npx supabase projects list`
   `npx supabase link --project-ref <project-ref>`

For this project, the Supabase project ref is:

`yljcebabixdakgwsvqtm`

### Do not blindly run db push

Before running:

```bash
npx supabase db push
```

Make sure local migration versions match remote migration history.

If db push says:

- Remote migration versions not found in local migrations directory
- The remote database's migration history does not match local files

Do not immediately run migration repair.

First:

- inspect remote migration history
- inspect local migration files
- compare logical migration names
- determine whether the mismatch is only timestamp/version prefix mismatch
- determine whether local migrations are ahead of remote

### Preferred fix for timestamp mismatch

If remote migrations and local migrations are logically equivalent but timestamps differ, prefer:

**Option A:** Rename local migration files to match the remote applied version prefixes.

Do not modify SQL contents.
Only rename file prefixes.

This keeps remote migration history untouched and is safer than repairing remote history.

Only after local filenames match remote history should db push be used to apply truly pending migrations.

If a pending migration's version sorts before already-applied remote migrations, use:

```bash
npx supabase db push --include-all
```

Only for that out-of-order apply case, and only after confirming the migration SQL is safe to run.

### Migration repair is dangerous

Do not suggest or run:

```bash
supabase migration repair
```

unless:

1. remote schema has been inspected
2. local migrations have been compared to remote history
3. a backup of `supabase_migrations.schema_migrations` has been created
4. the user explicitly approves the repair plan

Before any repair, create a backup:

```sql
create table if not exists supabase_migrations.schema_migrations_backup_YYYYMMDD as
select * from supabase_migrations.schema_migrations;
```

Never repair migration history blindly.

Never reset the remote database unless the user explicitly asks and understands data loss risk.

### Applying urgent migrations

If migration history is mismatched and an urgent schema change is needed, use Supabase Dashboard SQL Editor to manually run only the new migration SQL.

After manually applying SQL:

- verify schema using `information_schema` or `pg_indexes`
- then later fix migration history properly

Do not use db push as a workaround when history is mismatched.

### New migration rules

When adding a new migration:

- create a new migration file only
- do not edit old applied migrations
- use idempotent SQL where possible:
  - `add column if not exists`
  - `create index if not exists`
  - `create extension if not exists`
- use `--` for PostgreSQL comments, not a single `-`
- include verification SQL in the final response if the migration is important

### Current known migration context

This project previously had a mismatch between local short-version migrations and remote long-version migrations.

Remote had 24 applied migrations.
Local had 27 migrations.
The first 24 were logically equivalent but had different version prefixes.
The safest plan was to rename local files to match remote versions, then run db push to apply only the 3 pending migrations.

The 3 pending local migrations at that time were:

- `202605251200_add_settlements_metadata`
- `202605261200_add_performance_indexes`
- `202605281200_add_receipt_conversion_metadata`

These have since been applied to remote. Future agents must avoid creating another mismatch.

When adding new migrations, use version timestamps after the latest applied remote migration (check `npx supabase migration list` first).

## Auth rules

Supported auth:

- email/password
- forgot password / reset password

Public email and recovery links use helpers in `src/lib/publicUrls.ts` and `supabase/functions/_shared/appUrls.ts`:

- `getPasswordResetUrl()`
- `getInvitationUrl(token)`
- `getPublicWebBaseUrl()` / `getPublicAppUrl()`

Do not hardcode production URLs in app or Edge Function code.

After sign-up or login, call `ensureProfileExists()` to create/update `public.profiles`:

- `display_name` from registration input or auth metadata
- `email` from `user.email`
- `default_currency = CAD`

Auth errors:

- Login errors must not appear on Register
- Register errors must not appear on Login
- use `localError` per auth screen
- clear errors on screen focus/blur
- failed login must stay on Login
- wrong password should show: `Invalid email or password.`
- do not redbox expected auth errors

Recoverable session errors:

- invalid refresh token
- refresh token not found
- JWT expired
- JWT issued at future

Treat these as expired session:

- sign out locally
- clear app cache
- show login
- do not redbox

## Data refresh/cache rules

Services should only read/write Supabase and return affected ids.

Services must not call:

- `refreshCache`
- `setCache`
- `invalidate` directly

Hooks/screens call `invalidate(...)` after successful mutations.

`AppDataContext` owns:

- cache
- targeted refresh
- loading flags
- version counters
- `mergeCache`

Use targeted invalidation.
Do not call `refreshAll` after normal mutations.

After mutations:

- create split expense -> invalidate `expenses`, `groups`, `group_detail`, `settlements`, `home`
- mark transfer paid -> invalidate `settlements`, `groups`, `home`, `expenses`
- accept invitation -> invalidate `groups`, `invitations`, `notifications`, `home`
- update profile -> invalidate `profile`, `home`, `groups`

## Group/invitation rules

Pending invited members count as group participants.

Pending invited members should be selectable in:

- Paid By selector
- Split Between selector
- Split Preview
- Expense Detail
- Settlement calculations

Pending invited members may not have `auth.users` or `profiles` yet.

Use `group_members` as stable participant records.

When inviting someone:

- create `group_invitations` row
- also create/upsert `group_members` row with `user_id=null`, `email`, `invitation_status='pending'`

When accepted:

- update same `group_members` row with `user_id` and `invitation_status='accepted'`
- existing `expense_splits` remain valid

When declined/cancelled:

- mark `group_members` declined/cancelled/inactive
- exclude from future selectors
- keep historical expense display

Pending badge rule:

Only show Pending for true pending invited participants.
Do not show Pending for:

- group owner
- active members
- accepted members
- users with accepted membership

## Expense/split rules

Use integer cents only.

Do not use floating point amounts for calculations.

Receipt upload should be associated with expenses through the existing receipt flow.

Do not auto-create expenses from Scan Receipt.
Scan Receipt should prefill Add Expense and let user confirm.

## Scan Receipt rules

Scan Receipt flow:

Scan Receipt -> take/upload photo -> OCR detects amount -> user confirms/edits amount -> choose Personal or Split -> continue to Add Expense.

OCR must run in Supabase Edge Function:

`supabase/functions/scan-receipt`

Do not call OpenAI/OCR providers directly from Expo frontend.

Frontend sends:

- `imageBase64`
- `mimeType`

Do not send only `file://` URI to Edge Function.

Edge Function must read `OPENAI_API_KEY` from Supabase secrets only.

Do not log:

- `OPENAI_API_KEY`
- image base64
- full receipt image
- full sensitive provider response

Edge Function should return structured OCR errors:

- `OCR_NOT_CONFIGURED`
- `OPENAI_REQUEST_FAILED`
- `OPENAI_INVALID_RESPONSE`
- `OPENAI_RATE_LIMITED`
- `OPENAI_UNAUTHORIZED`
- `OPENAI_QUOTA_EXCEEDED`
- `OPENAI_BAD_REQUEST`
- `NO_AMOUNT_DETECTED`
- `INVALID_IMAGE`
- `REQUEST_BODY_INVALID`
- `UNKNOWN_OCR_ERROR`

Frontend must preserve `errorCode` and show safe messages.

If OCR fails:

- keep receipt preview
- allow Replace Photo
- allow Remove Photo
- allow manual amount entry
- allow Continue if amount is valid

Deploy Edge Function:

```bash
supabase functions deploy scan-receipt
```

Set secret:

```bash
supabase secrets set OPENAI_API_KEY=...
```

## Email/invitation rules

Invitation emails use Resend from Supabase Edge Function/server side only.

Do not expose Resend API key in Expo.

Invitation email should include:

- inviter name/email
- group name
- clear register/login link
- public logo URL

For email logo:

Use `EMAIL_ICON_URL` from Supabase Function env.
Do not use local `assets/icon.png` in email HTML.

## Password reset email rules

Password reset emails use the `send-password-reset` Supabase Edge Function with Resend.
Do not use Supabase default auth email for this flow.

Required Edge Function secret:

```bash
supabase secrets set PASSWORD_RESET_REDIRECT_URL=https://split.seagullcoffee.ca/reset-password
```

Do not use `EXPO_PUBLIC_*` or localhost redirect URLs inside Edge Functions.

Required Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://split.seagullcoffee.ca`
- Redirect URLs:
  - `https://split.seagullcoffee.ca/reset-password`
  - `https://split.seagullcoffee.ca/register`

## iOS Universal Links (email deep links)

Email links use HTTPS Universal Links with automatic web fallback. Do **not** use `seagullsplit://` links in emails.

| Flow | URL helper |
|------|------------|
| Password reset | `getPasswordResetUrl()` + `token_hash` and `type=recovery` query params |
| Invitation | `getInvitationUrl(token)` |

iOS app (`app.json`):

- `ios.associatedDomains`: `applinks:split.seagullcoffee.ca`
- `ios.bundleIdentifier`: `com.seagullsplit.app`
- `scheme`: `seagullsplit` (native deep links only — not for email)

Required hosted files (GitHub Pages):

- `public/.well-known/apple-app-site-association` → copied to `dist/.well-known/apple-app-site-association`
- `dist/.nojekyll` (so GitHub Pages serves `.well-known`)

Generate AASA before web export:

```bash
APPLE_TEAM_ID=YOUR_TEAM_ID npm run web:build
```

GitHub Actions secret: `APPLE_TEAM_ID`

Universal Links require:

- Apple Developer Team ID
- iOS bundle identifier
- new native iOS build (not Expo Go)
- deployed AASA file over HTTPS with no redirect

Test from Mail/Notes/Messages — not by pasting into Safari’s address bar.

Required Supabase Dashboard → Authentication → Providers → Email → **Email OTP Expiration**:

- Set to **7200** seconds (~2 hours)
- Password recovery link lifetime is controlled here, not in app code
- Do not hardcode expiry in the frontend or try to extend tokens in app code

Important:

- Old links are not extended when this setting changes
- Users must request a new reset email after the setting changes
- A newer reset email may invalidate older links
- `ResetPasswordScreen` shows: “This reset link is invalid or has expired. Please request a new password reset email.”

Deploy:

```bash
npx supabase functions deploy send-password-reset --no-verify-jwt
```

After changing the function, redirect secret, or Email OTP Expiration, send a new reset email.
Old links may return `otp_expired`.

Custom reset emails use app URLs with `token_hash` and `type=recovery` (not direct
Supabase `action_link`). `ResetPasswordScreen` verifies the token only after the user
taps Continue, reducing early consumption by email scanners.

Follow `.cursor/rules/logging.mdc`.

Use `createLogger` from `src/utils/logger.ts` for all service, hook, and critical action logging.
Do not use raw `console.log` in app code.

Do not log:

- passwords
- auth tokens
- refresh tokens
- full sessions
- service role key
- OCR API key
- image base64

Expected errors should use `logger.warn` / `logger.info`, not `logger.error` if it causes redbox.

Examples of expected errors:

- invalid login credentials
- OCR no amount detected
- invalid refresh token
- missing scan receipt config

## Deployment rules

Web deployment:

- GitHub Pages
- custom domain: `split.seagullcoffee.ca`
- workflow runs manually from `web` branch if configured that way
- Node version: `24.3.0`

Do not commit:

- `.env`
- `.env.local`
- `node_modules`
- `dist`
- Supabase service role key
- Resend API key
- OpenAI API key

Required env vars:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_AUTH_REDIRECT_URL`

## Testing checklist

Before final response after code changes:

- `npm run typecheck`
- `npm test`
- `npm run web:build`

For iOS layout changes:

- verify iOS simulator manually
- check Home
- check Groups
- check Add Expense
- check Profile
- check Scan Receipt
- check BottomTabBar

For auth changes:

- wrong password
- register validation
- forgot password
- reset password link
- logout
- stale session

For Scan Receipt:

- take photo
- upload image
- OCR success
- OCR failure
- manual amount entry
- Replace Photo
- Remove Photo
- continue Personal
- continue Split
