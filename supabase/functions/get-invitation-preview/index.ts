import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return false;
  }
  return new Date(expiresAt).getTime() <= Date.now();
}

function buildInvitationPayload(
  invitation: {
    id: string;
    group_id: string;
    invited_email: string;
    status: string;
    expires_at: string | null;
    token: string | null;
  },
  groupName: string | null | undefined,
  inviter: { display_name: string | null; email: string | null } | null,
) {
  const status = invitation.status as InvitationStatus;
  return {
    invitationId: invitation.id,
    token: invitation.token ?? invitation.id,
    groupId: invitation.group_id,
    groupName: groupName?.trim() || 'this group',
    invitedEmail: invitation.invited_email?.trim() || '',
    inviterName: inviter?.display_name?.trim() || undefined,
    inviterEmail: inviter?.email?.trim() || undefined,
    status,
    expiresAt: invitation.expires_at,
    isValid: status === 'pending' && !isExpired(invitation.expires_at),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const token = (body.token ?? body.invite_token ?? '').trim();
    if (!token) {
      return jsonResponse({ success: false, error: 'token is required' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let { data: invitation, error: invitationError } = await adminClient
      .from('group_invitations')
      .select('id, group_id, invited_by, invited_email, status, expires_at, token')
      .eq('token', token)
      .maybeSingle();

    if (invitationError) {
      console.log(JSON.stringify({ event: 'get_invitation_preview_failed', reason: 'invitation_query' }));
      return jsonResponse({ success: false, error: 'Unable to load invitation preview.' }, 500);
    }

    if (!invitation) {
      const byId = await adminClient
        .from('group_invitations')
        .select('id, group_id, invited_by, invited_email, status, expires_at, token')
        .eq('id', token)
        .maybeSingle();
      invitation = byId.data;
      invitationError = byId.error;
    }

    if (invitationError) {
      return jsonResponse({ success: false, error: 'Unable to load invitation preview.' }, 500);
    }

    if (!invitation) {
      return jsonResponse({ success: false, error: 'Invitation not found' }, 200);
    }

    const [{ data: group }, { data: inviter }] = await Promise.all([
      adminClient.from('groups').select('name').eq('id', invitation.group_id).maybeSingle(),
      adminClient
        .from('profiles')
        .select('display_name, email')
        .eq('id', invitation.invited_by)
        .maybeSingle(),
    ]);

    const invitationPayload = buildInvitationPayload(invitation, group?.name, inviter);

    return jsonResponse({
      success: true,
      invitation: invitationPayload,
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.log(JSON.stringify({ event: 'get_invitation_preview_failed', error: message }));
    return jsonResponse({ success: false, error: message }, 500);
  }
});
