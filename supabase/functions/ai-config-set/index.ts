// ai-config-set — grava/atualiza a configuração de IA de uma marca.
//
// Segurança:
//   * Só admin que gerencia a marca pode chamar.
//   * A chave (api_key) vai para o Vault via RPC set_brand_llm_secret e NUNCA
//     é gravada em menu_config nem retornada na resposta.
//   * menu_config.white_label_ai guarda apenas dados mascarados.
//
// Body: {
//   brand_id: string,
//   provider: 'anthropic'|'openai'|'gemini',
//   model?: string,
//   enabled?: boolean,
//   api_key?: string,        // só quando for definir/substituir a chave
//   reason?: string,         // auditoria
//   mode?: 'save' | 'test'   // 'test' faz um ping no provedor
// }

import { corsHeaders, json, preflight } from '../_shared/http.ts';
import { requireOperator, canManageBrand } from '../_shared/auth.ts';
import { getProvider } from '../_shared/providers/index.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const { adminClient, caller } = await requireOperator(req, ['admin']);
    const body = await req.json();
    const brandId = String(body?.brand_id ?? '');
    const providerId = String(body?.provider ?? '');
    const model = (body?.model ? String(body.model) : '').trim();
    const apiKey = typeof body?.api_key === 'string' ? body.api_key.trim() : '';
    const enabled = body?.enabled === true;
    const reason = (body?.reason ? String(body.reason) : '').trim();
    const mode = body?.mode === 'test' ? 'test' : 'save';

    if (!brandId) return json({ error: 'brand_id é obrigatório' }, 400);

    const provider = getProvider(providerId);
    if (!provider) return json({ error: `provider inválido: ${providerId}` }, 400);

    if (!(await canManageBrand(adminClient, caller.id, brandId))) {
      return json({ error: 'Forbidden: sem permissão para esta marca' }, 403);
    }

    const resolvedModel = model || provider.defaultModel;

    // --- Modo TEST: valida a chave (a fornecida ou a já armazenada) ---
    if (mode === 'test') {
      let keyToTest = apiKey;
      if (!keyToTest) {
        const { data: stored, error: rpcErr } = await adminClient.rpc('get_brand_llm_secret', {
          p_brand_id: brandId,
          p_provider: providerId,
        });
        if (rpcErr) return json({ ok: false, error: 'erro ao ler chave armazenada' }, 200);
        keyToTest = typeof stored === 'string' ? stored : '';
      }
      if (!keyToTest) return json({ ok: false, error: 'nenhuma chave configurada' }, 200);
      const result = await provider.test(keyToTest, resolvedModel);
      return json(result, 200);
    }

    // --- Modo SAVE ---
    // 1) Se veio chave nova, grava no Vault (cifrada).
    let keyConfigured: boolean;
    let keyLast4: string | null;

    if (apiKey) {
      const { error: setErr } = await adminClient.rpc('set_brand_llm_secret', {
        p_brand_id: brandId,
        p_provider: providerId,
        p_secret: apiKey,
      });
      if (setErr) return json({ error: 'falha ao gravar a chave com segurança' }, 200);
      keyConfigured = true;
      keyLast4 = apiKey.slice(-4);
    } else {
      // Mantém o estado atual da chave (toggle/modelo sem trocar a chave).
      const { data: cur } = await adminClient
        .from('brand_settings')
        .select('menu_config')
        .eq('brand_id', brandId)
        .maybeSingle();
      const curAi =
        ((cur?.menu_config as Record<string, unknown> | null) ?? {})['white_label_ai'] as
          | Record<string, unknown>
          | undefined;
      keyConfigured = (curAi?.key_configured as boolean | undefined) ?? false;
      keyLast4 = (curAi?.key_last4 as string | null | undefined) ?? null;
    }

    const nowIso = new Date().toISOString();
    const aiConfig = {
      enabled,
      provider: providerId,
      model: resolvedModel,
      key_configured: keyConfigured,
      key_last4: keyLast4,
      updated_at: nowIso,
      updated_by: caller.id,
      last_reason: reason || null,
    };

    // 2) Merge no menu_config (mantém o resto da config da marca).
    const { data: row } = await adminClient
      .from('brand_settings')
      .select('menu_config')
      .eq('brand_id', brandId)
      .maybeSingle();

    const menuConfig = (row?.menu_config as Record<string, unknown> | null) ?? {};
    const nextMenuConfig = { ...menuConfig, white_label_ai: aiConfig };

    if (row) {
      const { error: updErr } = await adminClient
        .from('brand_settings')
        .update({ menu_config: nextMenuConfig, updated_at: nowIso })
        .eq('brand_id', brandId);
      if (updErr) return json({ error: updErr.message }, 200);
    } else {
      const { error: insErr } = await adminClient
        .from('brand_settings')
        .insert({ brand_id: brandId, menu_config: nextMenuConfig, updated_at: nowIso });
      if (insErr) return json({ error: insErr.message }, 200);
    }

    // Resposta SEM a chave — só o mascarado.
    return json({ success: true, config: aiConfig }, 200);
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 200;
    const message = (err as { message?: string })?.message ?? 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
