import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildPasswordResetEmail } from '../_shared/emailTemplates.ts';
import { getPasswordResetUrl } from '../_shared/appUrls.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENERIC_SUCCESS_MESSAGE =
  "If this email is registered, we'll send a password reset link.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LogContext = Record<string, string | number | boolean | null | undefined>;

function log(event: string, context: LogContext = {}): void {
  console.log(JSON.stringify({ event, ...context }));
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) {
    return '***';
  }
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function resolvePasswordResetRedirectUrl(): string {
  return getPasswordResetUrl();
}

function resolveEmailIconUrl(configuredUrl: string): string {
  const trimmed = configuredUrl.trim();
  if (!trimmed || !/^https:\/\/.+/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

function isUserNotFoundError(error: { message?: string; code?: string; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? '';
  const code = error.code?.toLowerCase() ?? '';
  return (
    code === 'user_not_found' ||
    message.includes('user not found') ||
    message.includes('no user found') ||
    message.includes('unable to find user')
  );
}

function isRedirectNotAllowedError(error: { message?: string; code?: string }): boolean {
  const message = error.message?.toLowerCase() ?? '';
  const code = error.code?.toLowerCase() ?? '';
  return (
    code === 'redirect_url_not_allowed' ||
    message.includes('redirect') ||
    message.includes('not allowed')
  );
}

function buildAppResetUrl(redirectTo: string, tokenHash: string): string {
  const separator = redirectTo.includes('?') ? '&' : '?';
  return `${redirectTo}${separator}token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
}

async function generateRecoveryLink(
  adminClient: ReturnType<typeof createClient>,
  email: string,
  redirectTo: string,
): Promise<string | null> {
  let { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  });

  if (error && isRedirectNotAllowedError(error)) {
    log('password_reset_redirect_not_allowed', { redirectTo });
    ({ data, error } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
    }));
  }

  const properties = data?.properties;
  console.info(
    JSON.stringify({
      event: 'password_reset_link_generated',
      hasActionLink: Boolean(properties?.action_link),
      hasHashedToken: Boolean(properties?.hashed_token),
      hasTokenHash: Boolean(properties?.token_hash),
      verificationType: properties?.verification_type ?? null,
      redirectTo,
    }),
  );

  if (error) {
    if (isUserNotFoundError(error)) {
      return null;
    }
    log('password_reset_generate_link_failed', {
      code: error.code ?? null,
      message: error.message ?? 'unknown',
    });
    throw error;
  }

  const tokenHash = properties?.hashed_token ?? properties?.token_hash;
  if (!tokenHash) {
    log('password_reset_failed', { reason: 'missing_token_hash' });
    throw new Error('missing_token_hash');
  }

  return buildAppResetUrl(redirectTo, tokenHash);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  log('password_reset_requested');

  try {
    const body = await req.json();
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const normalizedEmail = normalizeEmail(rawEmail);

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail)) {
      return jsonResponse({ ok: false, error: 'Invalid email address.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      log('password_reset_failed', { reason: 'missing_supabase_config' });
      return jsonResponse({ ok: false, error: 'Password reset is unavailable right now.' }, 503);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const redirectTo = resolvePasswordResetRedirectUrl();
    const resetLink = await generateRecoveryLink(adminClient, normalizedEmail, redirectTo);

    if (!resetLink) {
      log('password_reset_email_skipped_unregistered', { email: maskEmail(normalizedEmail) });
      return jsonResponse({ ok: true, message: GENERIC_SUCCESS_MESSAGE }, 200);
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    if (!resendApiKey || !fromEmail) {
      log('password_reset_failed', {
        email: maskEmail(normalizedEmail),
        reason: !resendApiKey ? 'missing_resend_api_key' : 'missing_from_email',
      });
      return jsonResponse({ ok: false, error: 'Password reset is unavailable right now.' }, 503);
    }

    const iconUrl = resolveEmailIconUrl(Deno.env.get('EMAIL_ICON_URL') ?? '');
    const emailContent = buildPasswordResetEmail({
      resetLink,
      recipientEmail: normalizedEmail,
      iconUrl,
    });

    log('password_reset_email_send_started', { email: maskEmail(normalizedEmail) });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: normalizedEmail,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      log('password_reset_failed', {
        email: maskEmail(normalizedEmail),
        reason: 'resend_send_failed',
        status: resendResponse.status,
        error: errorText.slice(0, 200),
      });
      return jsonResponse({ ok: false, error: 'Password reset is unavailable right now.' }, 502);
    }

    log('password_reset_email_sent', { email: maskEmail(normalizedEmail) });
    return jsonResponse({ ok: true, message: GENERIC_SUCCESS_MESSAGE }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    log('password_reset_failed', { reason: message });
    return jsonResponse({ ok: false, error: 'Password reset is unavailable right now.' }, 500);
  }
});
