# send-group-invitation

Sends group invitation emails through Resend when a member invites someone to a shared expense group.

## Configure email sending

1. Create a [Resend](https://resend.com) account.
2. Verify a sending domain in Resend (do not use an unverified Gmail address as the sender).
3. Create a Resend API key.
4. Set Supabase secrets:

```bash
npx supabase secrets set RESEND_API_KEY=YOUR_RESEND_API_KEY
npx supabase secrets set RESEND_FROM_EMAIL="Seagull Split <no-reply@YOUR_VERIFIED_DOMAIN>"
npx supabase secrets set PUBLIC_APP_URL=https://split.seagullcoffee.ca
npx supabase secrets set EMAIL_ICON_URL=https://yljcebabixdakgwsvqtm.supabase.co/storage/v1/object/public/public-assets/brand/icon.png
```

Invitation accept links use:

`https://split.seagullcoffee.ca/register?invite={token}`

### Email icon

Email clients cannot load local `assets/icon.png`. Upload the icon to Supabase Storage and set `EMAIL_ICON_URL`:

```bash
npx supabase db push
SUPABASE_URL=https://yljcebabixdakgwsvqtm.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npm run upload:email-icon
npx supabase secrets set EMAIL_ICON_URL=https://yljcebabixdakgwsvqtm.supabase.co/storage/v1/object/public/public-assets/brand/icon.png
```

Confirm the public URL opens in a browser before sending test emails.

If `EMAIL_ICON_URL` is missing or unreachable, the template falls back to an inline SVG mark (not an emoji or blank square).

5. Deploy the function:

```bash
npx supabase functions deploy send-group-invitation
```

6. Check logs:

```bash
npx supabase functions logs send-group-invitation
```

## Request

```json
{
  "invitationId": "uuid"
}
```

## Response

Success:

```json
{
  "success": true,
  "emailSent": true
}
```

Failure:

```json
{
  "success": false,
  "error": "..."
}
```

On success, `group_invitations.email_sent_at` is set and `email_error` is cleared. On failure, `email_error` is updated and the invitation row is kept.

## Security

- Never commit `RESEND_API_KEY` to Git or bundle it in the Expo app.
- The API key is read only from `Deno.env.get("RESEND_API_KEY")` in this Edge Function.
- Logs do not include API keys, service role keys, or auth tokens.
