import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildGroupInvitationEmail } from '../_shared/emailTemplates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LogContext = Record<string, string | number | boolean | null | undefined>;

function log(event: string, context: LogContext = {}): void {
  console.log(JSON.stringify({ event, ...context }));
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) {
    return '***';
  }
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function buildInviterNameOrEmail(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmedName = displayName?.trim();
  const trimmedEmail = email?.trim();

  if (trimmedName && trimmedEmail) {
    return `${trimmedName} (${trimmedEmail})`;
  }
  if (trimmedName) {
    return trimmedName;
  }
  if (trimmedEmail) {
    return trimmedEmail;
  }
  return 'Someone';
}

function buildInviteLink(token: string): string {
  const publicAppUrl = Deno.env.get('PUBLIC_APP_URL') ?? 'https://split.seagullcoffee.ca';
  const normalizedBase = publicAppUrl.endsWith('/') ? publicAppUrl.slice(0, -1) : publicAppUrl;
  return `${normalizedBase}/register?invite=${encodeURIComponent(token)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  log('send_group_invitation_started');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const body = await req.json();
    const invitationId = body.invitationId ?? body.invitation_id;
    if (!invitationId) {
      return jsonResponse({ success: false, error: 'invitationId is required' }, 400);
    }

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ success: false, error: 'Unauthorized' }, 401);
    }

    const { data: invitation, error: invitationError } = await userClient
      .from('group_invitations')
      .select('id, group_id, invited_by, invited_email, token, status')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      log('invitation_load_failed', { invitationId, error: invitationError?.message });
      return jsonResponse({ success: false, error: 'Invitation not found' }, 404);
    }

    log('invitation_loaded', {
      invitationId,
      groupId: invitation.group_id,
      invitedEmail: maskEmail(invitation.invited_email),
      status: invitation.status,
    });

    const { data: group, error: groupError } = await userClient
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', invitation.group_id)
      .single();

    if (groupError || !group) {
      log('group_load_failed', { invitationId, groupId: invitation.group_id, error: groupError?.message });
      return jsonResponse({ success: false, error: 'Group not found' }, 404);
    }

    log('group_loaded', { invitationId, groupId: group.id, groupName: group.name });

    const callerId = userData.user.id;
    if (group.owner_id !== callerId && invitation.invited_by !== callerId) {
      return jsonResponse({ success: false, error: 'Forbidden' }, 403);
    }

    const { data: inviterProfile, error: inviterError } = await userClient
      .from('profiles')
      .select('display_name, email')
      .eq('id', invitation.invited_by)
      .maybeSingle();

    if (inviterError) {
      log('inviter_load_failed', { invitationId, error: inviterError.message });
    } else {
      log('inviter_loaded', { invitationId, inviterId: invitation.invited_by });
    }

    const inviterNameOrEmail = buildInviterNameOrEmail(
      inviterProfile?.display_name,
      inviterProfile?.email,
    );
    const token = invitation.token ?? invitationId;
    const inviteLink = buildInviteLink(token);

    const iconUrl = Deno.env.get('EMAIL_ICON_URL') ?? '';
    const emailIconConfigured = iconUrl.trim().length > 0;

    const email = buildGroupInvitationEmail({
      inviterNameOrEmail,
      groupName: group.name,
      invitedEmail: invitation.invited_email,
      inviteLink,
      iconUrl,
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');

    if (!resendApiKey) {
      const errorMessage = 'RESEND_API_KEY is not configured';
      await adminClient
        .from('group_invitations')
        .update({ email_error: errorMessage })
        .eq('id', invitationId);

      log('email_send_failed', { invitationId, reason: 'missing_resend_api_key' });
      log('group_invitations_updated', { invitationId, emailSent: false });

      return jsonResponse({ success: false, error: errorMessage }, 503);
    }

    if (!fromEmail) {
      const errorMessage = 'RESEND_FROM_EMAIL is not configured';
      await adminClient
        .from('group_invitations')
        .update({ email_error: errorMessage })
        .eq('id', invitationId);

      log('email_send_failed', { invitationId, reason: 'missing_from_email' });
      log('group_invitations_updated', { invitationId, emailSent: false });

      return jsonResponse({ success: false, error: errorMessage }, 503);
    }

    log('email_send_started', {
      invitationId,
      invitedEmail: maskEmail(invitation.invited_email),
      groupId: group.id,
      emailIconConfigured,
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: invitation.invited_email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      const errorMessage = errorText.slice(0, 500);

      await adminClient
        .from('group_invitations')
        .update({ email_error: errorMessage })
        .eq('id', invitationId);

      log('email_send_failed', {
        invitationId,
        status: resendResponse.status,
        error: errorMessage,
      });
      log('group_invitations_updated', { invitationId, emailSent: false });

      return jsonResponse({ success: false, error: errorMessage }, 502);
    }

    await adminClient
      .from('group_invitations')
      .update({
        email_sent_at: new Date().toISOString(),
        email_error: null,
      })
      .eq('id', invitationId);

    log('email_send_succeeded', { invitationId, groupId: group.id });
    log('group_invitations_updated', { invitationId, emailSent: true });

    return jsonResponse({ success: true, emailSent: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('send_group_invitation_failed', { error: message });
    return jsonResponse({ success: false, error: message }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
