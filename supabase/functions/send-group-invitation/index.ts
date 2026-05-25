import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buildInvitationEmail } from './email-template.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function inviteLinkFor(token: string): string {
  return `seagullsplit://invite/${token}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const invitationId = body.invitationId ?? body.invitation_id;
    if (!invitationId) {
      return jsonResponse({ error: 'invitationId is required' }, 400);
    }

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: invitation, error: invitationError } = await userClient
      .from('group_invitations')
      .select('id, group_id, invited_by, invited_email, message, token, status')
      .eq('id', invitationId)
      .single();

    if (invitationError || !invitation) {
      return jsonResponse({ error: 'Invitation not found' }, 404);
    }

    const { data: group, error: groupError } = await userClient
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', invitation.group_id)
      .single();

    if (groupError || !group) {
      return jsonResponse({ error: 'Group not found' }, 404);
    }

    const callerId = userData.user.id;
    if (group.owner_id !== callerId && invitation.invited_by !== callerId) {
      return jsonResponse({ error: 'Forbidden' }, 403);
    }

    const { data: inviterProfile } = await userClient
      .from('profiles')
      .select('display_name, email')
      .eq('id', invitation.invited_by)
      .maybeSingle();

    const inviterName = inviterProfile?.display_name?.trim() || undefined;
    const inviterEmail = inviterProfile?.email?.trim() || undefined;

    const token = invitation.token ?? invitationId;
    const inviteLink = inviteLinkFor(token);
    const emailContent = buildInvitationEmail({
      groupName: group.name,
      inviterName,
      inviterEmail,
      inviteLink,
    });

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'Seagull Split <onboarding@resend.dev>';

    if (!resendApiKey) {
      await adminClient
        .from('group_invitations')
        .update({ email_error: 'RESEND_API_KEY is not configured' })
        .eq('id', invitationId);

      return jsonResponse({ sent: false, reason: 'email_provider_not_configured' }, 202);
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [invitation.invited_email],
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      await adminClient
        .from('group_invitations')
        .update({ email_error: errorText.slice(0, 500) })
        .eq('id', invitationId);

      return jsonResponse({ sent: false, error: errorText }, 502);
    }

    await adminClient
      .from('group_invitations')
      .update({
        email_sent_at: new Date().toISOString(),
        email_error: null,
      })
      .eq('id', invitationId);

    return jsonResponse({ sent: true }, 200);
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500,
    );
  }
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
