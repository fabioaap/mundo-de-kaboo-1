// ai-suggest — gera sugestões de conteúdo via o provedor de IA da marca.
//
// Segurança:
//   * Só admin/editor que gerencia a marca pode chamar.
//   * A chave é lida do Vault no servidor (nunca trafega ao client).
//   * Requer que a IA esteja habilitada para a marca.
//
// Body: { brand_id: string, action: string, input: object }

import { corsHeaders, json, preflight } from '../_shared/http.ts';
import { requireOperator, canManageBrand } from '../_shared/auth.ts';
import { getProvider } from '../_shared/providers/index.ts';
import { getAction } from '../_shared/actions.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();

  try {
    const { adminClient, caller } = await requireOperator(req, ['admin', 'editor']);
    const body = await req.json();
    const brandId = String(body?.brand_id ?? '');
    const actionId = String(body?.action ?? '');
    const input = (body?.input ?? {}) as Record<string, unknown>;

    if (!brandId) return json({ error: 'brand_id é obrigatório' }, 400);

    const action = getAction(actionId);
    if (!action) return json({ error: `ação inválida: ${actionId}` }, 400);

    if (!(await canManageBrand(adminClient, caller.id, brandId))) {
      return json({ error: 'Forbidden: sem permissão para esta marca' }, 403);
    }

    // Config de IA da marca (não-secreta).
    const { data: row } = await adminClient
      .from('brand_settings')
      .select('menu_config')
      .eq('brand_id', brandId)
      .maybeSingle();
    const aiConfig =
      ((row?.menu_config as Record<string, unknown> | null) ?? {})['white_label_ai'] as
        | Record<string, unknown>
        | undefined;

    if (!aiConfig || aiConfig.enabled !== true) {
      return json({ error: 'ai_disabled' }, 200);
    }

    const providerId = String(aiConfig.provider ?? '');
    const provider = getProvider(providerId);
    if (!provider) return json({ error: `provider inválido: ${providerId}` }, 200);
    const model = (aiConfig.model as string | undefined) || provider.defaultModel;

    // Chave decifrada do Vault.
    const { data: key, error: keyErr } = await adminClient.rpc('get_brand_llm_secret', {
      p_brand_id: brandId,
      p_provider: providerId,
    });
    if (keyErr || typeof key !== 'string' || !key) {
      return json({ error: 'no_key' }, 200);
    }

    const { system, prompt, maxTokens } = action.build(input);
    const result = await provider.call({ apiKey: key, model, system, prompt, maxTokens });

    return json({ success: true, text: (result.text ?? '').trim() }, 200);
  } catch (err) {
    const status = (err as { status?: number })?.status ?? 200;
    const message = (err as { message?: string })?.message ?? 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
