// wiki-assistant — responde perguntas sobre a documentação usando RAG lexical.
//
// Fluxo: pergunta → busca full-text nos trechos da wiki (RPC) → monta prompt
// com o contexto → chama um LLM OpenAI-compatible (OpenRouter/OpenAI/Grok…) →
// devolve resposta + fontes.
//
// Config (secrets do Supabase, server-side — a chave nunca vai ao navegador):
//   WIKI_LLM_BASE_URL  ex.: https://api.groq.com/openai/v1 (Groq)
//   WIKI_LLM_API_KEY   chave do provedor
//   WIKI_LLM_MODEL     ex.: llama-3.3-70b-versatile (Groq), openai/gpt-4o, etc.
//   WIKI_LLM_DAILY_CAP teto de chamadas/dia (default 500; <=0 desliga)
//
// Sem WIKI_LLM_API_KEY a função responde { configured: false } — o widget cai
// no modo demo sem erro.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, json, preflight } from '../_shared/http.ts';

interface Chunk {
  doc_id: string;
  title: string;
  url: string;
  heading: string | null;
  content: string;
  rank: number;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return preflight(origin);
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  const baseUrl = (Deno.env.get('WIKI_LLM_BASE_URL') ?? '').replace(/\/+$/, '');
  const apiKey = Deno.env.get('WIKI_LLM_API_KEY') ?? '';
  const model = Deno.env.get('WIKI_LLM_MODEL') ?? '';
  const cap = Number(Deno.env.get('WIKI_LLM_DAILY_CAP') ?? '500');

  if (!apiKey || !baseUrl || !model) {
    // Ainda não configurado: widget usa o modo demo.
    return json({ configured: false }, 200, origin);
  }

  try {
    const { question } = await req.json();
    const q = String(question ?? '').trim();
    if (!q) return json({ error: 'empty_question' }, 400, origin);
    if (q.length > 500) return json({ error: 'question_too_long' }, 400, origin);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Teto diário — protege a chave contra abuso (função é pública na internet).
    // Falha fechada: erro no RPC também bloqueia (não gasta a chave).
    const { data: underCap, error: capErr } = await supabase.rpc('bump_wiki_usage', { p_cap: cap });
    if (capErr || underCap === false) {
      return json(
        { configured: true, answer: 'O limite diário de perguntas foi atingido. Tente novamente amanhã.', sources: [] },
        200,
        origin,
      );
    }

    // Recupera os trechos mais relevantes.
    const { data: chunks } = await supabase.rpc('search_wiki_chunks', { q, k: 6 });
    const hits = (chunks ?? []) as Chunk[];

    const contexto = hits
      .map((c, i) => `[${i + 1}] ${c.title}${c.heading ? ' › ' + c.heading : ''} (${c.url})\n${c.content}`)
      .join('\n\n');

    const system =
      'Você é o assistente da wiki do Mundo de Kaboo, uma plataforma educacional white-label. ' +
      'Responda em português, de forma direta e objetiva, SOMENTE com base nos trechos da documentação fornecidos. ' +
      'NUNCA invente nomes de seções, páginas ou fatos que não estejam nos trechos. ' +
      'NÃO liste, cite nem escreva os títulos ou links das páginas dentro da resposta — elas já aparecem automaticamente como botões clicáveis logo abaixo. ' +
      'Se os trechos não responderem diretamente, diga isso em uma frase curta e finalize com "Veja as páginas relacionadas abaixo."';

    const prompt = contexto
      ? `Trechos da documentação:\n\n${contexto}\n\n---\nPergunta do usuário: ${q}`
      : `Não há trechos relevantes na documentação para esta pergunta.\n\nPergunta do usuário: ${q}`;

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        // Recomendado pela OpenRouter (ignorado pelos demais). Só ASCII —
        // header não aceita bytes não-Latin1.
        'HTTP-Referer': 'https://mundodekaboo.educacross.dev/wiki',
        'X-Title': 'Mundo de Kaboo Wiki',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        max_tokens: 700,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      // Loga o detalhe no servidor; ao cliente só o status (não expor interno).
      console.error(`LLM error ${res.status}:`, (await res.text()).slice(0, 300));
      return json({ configured: true, error: `llm_http_${res.status}` }, 502, origin);
    }

    const data = await res.json();
    const answer = String(data?.choices?.[0]?.message?.content ?? '').trim();

    // Fontes únicas por URL, na ordem de relevância.
    const seen = new Set<string>();
    const sources = hits
      .filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)))
      .map((c) => ({ title: c.title, url: c.url }));

    return json({ configured: true, answer, sources }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
  }
});
