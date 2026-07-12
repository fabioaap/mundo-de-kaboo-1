// wiki-draft — gera um rascunho de entrada de changelog a partir do diff de um PR.
// Chamada pela CI (GitHub Actions) para a Camada 2 do doc-sync. A chave do LLM
// fica só aqui (secrets do Supabase) — a CI só precisa da anon key (pública).
//
// Reusa os mesmos secrets da wiki-assistant: WIKI_LLM_BASE_URL/API_KEY/MODEL,
// WIKI_LLM_DAILY_CAP.
//
// Body: { diff: string, files?: string[], date?: string }
// Retorna: { configured: boolean, draft?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, json, preflight } from '../_shared/http.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  const baseUrl = (Deno.env.get('WIKI_LLM_BASE_URL') ?? '').replace(/\/+$/, '');
  const apiKey = Deno.env.get('WIKI_LLM_API_KEY') ?? '';
  const model = Deno.env.get('WIKI_LLM_MODEL') ?? '';
  const cap = Number(Deno.env.get('WIKI_LLM_DAILY_CAP') ?? '500');

  if (!apiKey || !baseUrl || !model) return json({ configured: false }, 200, origin);

  try {
    const body = await req.json();
    const diff = String(body?.diff ?? '').slice(0, 14000); // limita o input
    const files = Array.isArray(body?.files) ? body.files.slice(0, 60) : [];
    const date = String(body?.date ?? '').slice(0, 10);
    if (!diff.trim()) return json({ error: 'empty_diff' }, 400, origin);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Falha fechada no cap (protege a chave contra abuso).
    const { data: underCap, error: capErr } = await supabase.rpc('bump_wiki_usage', { p_cap: cap });
    if (capErr || underCap === false) {
      return json({ configured: true, draft: '', error: 'rate_limited' }, 200, origin);
    }

    const system =
      'Você gera UMA entrada de changelog técnico em português a partir do diff de um Pull Request. ' +
      'Baseie-se SOMENTE no diff — não invente. Seja conciso e objetivo. ' +
      'Formato Markdown exato:\n' +
      '## {data} — {título curto}\n\n' +
      '**Contexto:** {1 frase do porquê}\n\n' +
      '**Mudanças (antes → depois):**\n- {item: como era → como ficou}\n\n' +
      '**Arquivos:** {lista curta dos principais}\n';

    const prompt =
      `Data: ${date || '(use a data de hoje)'}\n` +
      (files.length ? `Arquivos alterados:\n${files.join('\n')}\n\n` : '') +
      `Diff (pode estar truncado):\n\n${diff}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'HTTP-Referer': 'https://mundodekaboo.educacross.dev/wiki',
        'X-Title': 'Mundo de Kaboo Wiki',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: 900,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.error(`LLM error ${res.status}:`, (await res.text()).slice(0, 300));
      return json({ configured: true, draft: '', error: `llm_http_${res.status}` }, 502, origin);
    }

    const data = await res.json();
    const draft = String(data?.choices?.[0]?.message?.content ?? '').trim();
    return json({ configured: true, draft }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
});
