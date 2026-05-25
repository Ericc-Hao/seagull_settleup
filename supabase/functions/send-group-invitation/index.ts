import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { group_id, invitation_id } = await req.json();
    if (!group_id || !invitation_id) {
      return new Response(JSON.stringify({ error: 'group_id and invitation_id are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, owner_id')
      .eq('id', group_id)
      .single();

    if (groupError) {
      throw groupError;
    }

    const { data: invitation, error: invitationError } = await supabase
      .from('group_invitations')
      .select('id, invited_by, invited_email, message, token')
      .eq('id', invitation_id)
      .eq('group_id', group_id)
      .single();

    if (invitationError) {
      throw invitationError;
    }

    const callerId = userData.user.id;
    if (group.owner_id !== callerId && invitation.invited_by !== callerId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // TODO: Integrate a server-side email provider (Resend, SendGrid, SMTP, etc.).
    // Keep service-role secrets in the Edge Function environment only, never in the mobile app.
    console.log('Group invitation email queued', {
      groupName: group.name,
      invitedEmail: invitation.invited_email,
      message: invitation.message,
      token: invitation.token,
    });

    return new Response(JSON.stringify({ sent: false, reason: 'email_provider_not_configured' }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
