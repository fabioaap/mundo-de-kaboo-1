import type { Provider } from './types.ts';

export const anthropic: Provider = {
  id: 'anthropic',
  defaultModel: 'claude-sonnet-4-6',

  async call({ apiKey, model, system, prompt, maxTokens = 1024 }) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`anthropic_http_${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((c: { text?: string }) => c?.text ?? '').join('')
      : '';
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
