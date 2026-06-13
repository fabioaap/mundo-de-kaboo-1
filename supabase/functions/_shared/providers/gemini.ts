import type { Provider } from './types.ts';

export const gemini: Provider = {
  id: 'gemini',
  defaultModel: 'gemini-1.5-flash',

  async call({ apiKey, model, system, prompt, maxTokens = 1024 }) {
    const text = system ? `${system}\n\n${prompt}` : prompt;
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    if (!res.ok) {
      throw new Error(`gemini_http_${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    const out = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p?.text ?? '')
      .join('') ?? '';
    return { text: out };
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
