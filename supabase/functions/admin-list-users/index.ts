import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/http.ts';

type AuthAdminUser = {
  id: string;
  email?: string | null;
  invited_at?: string | null;
  confirmed_at?: string | null;
  email_confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  app_metadata?: {
    created_by?: string | null;
    provider?: string;
    providers?: string[];
  } | null;
  user_metadata?: {
    full_name?: string | null;
    name?: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  avatar_id?: string | null;
  role?: string | null;
  voucher_id?: string | null;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
  access_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const getAuthStatus = (user: AuthAdminUser) => {
  if (user.last_sign_in_at) {
    return 'authenticated';
  }

  if (user.confirmed_at || user.email_confirmed_at) {
    return 'confirmed';
  }

  if (user.invited_at) {
    return 'invite_pending';
  }

  return 'created';
};

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const callerResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseServiceKey },
    });

    if (!callerResp.ok) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caller = await callerResp.json();
    if (!caller?.id) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerProfile, error: callerProfileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (callerProfileError || callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authUsers: AuthAdminUser[] = [];
    const perPage = 200;

    for (let page = 1; page <= 10; page += 1) {
      const listResp = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
        headers: { Authorization: `Bearer ${supabaseServiceKey}`, apikey: supabaseServiceKey },
      });

      if (!listResp.ok) {
        const message = await listResp.text();
        return new Response(JSON.stringify({ success: false, error: message || 'Erro ao listar usuários' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const payload = await listResp.json();
      const usersPage = Array.isArray(payload?.users) ? payload.users as AuthAdminUser[] : [];
      authUsers.push(...usersPage);

      if (usersPage.length < perPage) {
        break;
      }
    }

    const scopedAuthUsers = authUsers.filter((user) => user.app_metadata?.created_by === caller.id);
    const userIds = scopedAuthUsers.map((user) => user.id);

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ success: true, users: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, avatar_id, role, voucher_id, access_starts_at, access_expires_at, access_status, created_at, updated_at')
      .in('id', userIds);

    if (profilesError) {
      return new Response(JSON.stringify({ success: false, error: profilesError.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileMap = new Map<string, ProfileRow>();
    for (const profile of profiles ?? []) {
      profileMap.set(profile.id, profile as ProfileRow);
    }

    const users = scopedAuthUsers
      .map((authUser) => {
        const profile = profileMap.get(authUser.id);
        const confirmedAt = authUser.confirmed_at ?? authUser.email_confirmed_at ?? null;

        return {
          id: authUser.id,
          full_name: profile?.full_name ?? authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? null,
          email: profile?.email ?? authUser.email ?? null,
          avatar_id: profile?.avatar_id ?? null,
          created_by: authUser.app_metadata?.created_by ?? null,
          role: profile?.role ?? 'viewer',
          voucher_id: profile?.voucher_id ?? null,
          access_starts_at: profile?.access_starts_at ?? null,
          access_expires_at: profile?.access_expires_at ?? null,
          access_status: profile?.access_status ?? null,
          created_at: profile?.created_at ?? authUser.created_at ?? null,
          updated_at: profile?.updated_at ?? authUser.updated_at ?? null,
          invited_at: authUser.invited_at ?? null,
          confirmed_at: confirmedAt,
          last_sign_in_at: authUser.last_sign_in_at ?? null,
          auth_status: getAuthStatus(authUser),
        };
      })
      .sort((left, right) => {
        const leftDate = left.created_at ? new Date(left.created_at).getTime() : 0;
        const rightDate = right.created_at ? new Date(right.created_at).getTime() : 0;
        return rightDate - leftDate;
      });

    return new Response(JSON.stringify({ success: true, users }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message ?? 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
