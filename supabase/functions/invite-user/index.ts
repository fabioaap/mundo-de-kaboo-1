import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Valida que quem chama é um usuário autenticado com papel admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com anon key para verificar o caller
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Cliente admin — service_role, sem restrições RLS, nunca exposto ao browser
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Valida o JWT do caller via chamada HTTP direta ao endpoint de auth
    // (evita problemas com algoritmo ES256 na verificação local do SDK)
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseServiceKey },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const caller = await userResp.json();
    if (!caller?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica papel do caller usando adminClient (bypassa RLS)
    const { data: callerProfile, error: profileErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (profileErr || callerProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden: apenas admins podem convidar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse do body
    const { email, full_name, role, redirect_to } = await req.json();
    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: 'email e full_name são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assignedRole = role ?? 'viewer';
    const isOperationalRole = assignedRole === 'admin' || assignedRole === 'editor';

    // Convida o usuário — cria conta + envia e-mail de convite em uma só chamada
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirect_to ?? supabaseUrl,
        data: { full_name },
      }
    );

    if (inviteError) {
      // Retorna 200 com error no body para o SDK cliente não tratar como erro genérico
      return new Response(JSON.stringify({ success: false, error: inviteError.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!inviteData.user) {
      return new Response(JSON.stringify({ success: false, error: 'Falha ao criar usuário' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const nextAppMetadata = {
      ...(inviteData.user.app_metadata ?? {}),
      created_by: caller.id,
    };

    const { error: metadataError } = await adminClient.auth.admin.updateUserById(
      inviteData.user.id,
      { app_metadata: nextAppMetadata }
    );

    if (metadataError) {
      return new Response(JSON.stringify({ success: false, error: metadataError.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cria/atualiza o perfil com papel e status corretos
    const { error: upsertError } = await adminClient.from('profiles').upsert({
      id: inviteData.user.id,
      email,
      full_name,
      school_name: null,
      role: assignedRole,
      access_status: isOperationalRole ? 'active' : 'pending_voucher',
      access_starts_at: isOperationalRole ? new Date().toISOString() : null,
      access_expires_at: null,
      voucher_id: null,
      updated_at: new Date().toISOString(),
    });

    if (upsertError) {
      return new Response(JSON.stringify({ success: false, error: upsertError.message }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ success: true, userId: inviteData.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message ?? 'Internal error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
