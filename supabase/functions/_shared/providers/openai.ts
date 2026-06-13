import type { Provider } from './types.ts';

export const openai: Provider = {
  id: 'openai',
  defaultModel: 'gpt-4o-mini',

  async call({ apiKey, model, system, prompt, json, maxTokens = 1024 }) {
    const messages: Array<{ role: string; content: string }> = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) {
      throw new Error(`openai_http_${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return { text };
  },

  async test(apiKey, model) {
    try {
      await this.call({ apiKey, model: model || this.defaultModel, prompt: 'ping', maxTokens: 4 });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },
};
