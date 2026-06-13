import type { Provider, ProviderId } from './types.ts';
import { anthropic } from './anthropic.ts';
import { openai } from './openai.ts';
import { gemini } from './gemini.ts';

export const PROVIDERS: Record<ProviderId, Provider> = {
  anthropic,
  openai,
  gemini,
};

export const isProviderId = (v: unknown): v is ProviderId =>
  v === 'anthropic' || v === 'openai' || v === 'gemini';

export const getProvider = (id: string): Provider | null =>
  isProviderId(id) ? PROVIDERS[id] : null;

export type { Provider, ProviderId } from './types.ts';
