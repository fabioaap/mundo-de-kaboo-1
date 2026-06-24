import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/http.ts';
import { canManageBrand } from '../_shared/auth.ts';

type AuthAdminUser = {
  id: string;
  email?: string | null;
  app_metadata?: {
    created_by?: string | null;
  } | null;
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

    const body = await req.json();
    const targetUserId = body?.user_id;

    if (!targetUserId || typeof targetUserId !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (targetUserId === caller.id) {
      return new Response(JSON.stringify({ success: false, error: 'Você não pode excluir o próprio usuário.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: targetAuthData, error: targetAuthError } = await adminClient.auth.admin.getUserById(targetUserId);

    if (targetAuthError || !targetAuthData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Usuário não encontrado.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUser = targetAuthData.user as AuthAdminUser;
    if (targetUser.app_metadata?.created_by !== caller.id) {
      return new Response(JSON.stringify({ success: false, error: 'Você não tem permissão para excluir este usuário.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Brand scope: o caller só pode excluir usuários de marcas que ele gerencia.
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('brand_id')
      .eq('id', targetUserId)
      .single();

    if (targetProfile?.brand_id) {
      const canManage = await canManageBrand(adminClient, caller.id, targetProfile.brand_id);
      if (!canManage) {
        return new Response(JSON.stringify({ success: false, error: 'Você não tem permissão para excluir usuários desta marca.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId, false);

    if (deleteError) {
      return new Response(JSON.stringify({ success: false, error: deleteError.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
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
