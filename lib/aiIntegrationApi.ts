// Cliente da Integração de IA por marca (White Label).
//
// Leitura: a config MASCARADA mora em brand_settings.menu_config.white_label_ai
// (não-secreta) e é lida direto. Escrita/teste: sempre via edge function
// ai-config-set (a chave nunca trafega de volta ao navegador).

import { supabase } from './supabase';
import { canUseRemoteWhiteLabel } from './whiteLabelAdminApi';

export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

export interface WhiteLabelAIConfig {
  enabled: boolean;
  provider: AIProviderId;
  model: string;
  /** Mascarado — nunca a chave em si. */
  key_configured: boolean;
  key_last4: string | null;
  updated_at: string | null;
  updated_by: string | null;
  last_reason: string | null;
}

export const AI_PROVIDERS: Array<{ id: AIProviderId; label: string; defaultModel: string }> = [
  { id: 'anthropic', label: 'Anthropic (Claude)', defaultModel: 'claude-sonnet-4-6' },
  { id: 'openai', label: 'OpenAI (GPT)', defaultModel: 'gpt-4o-mini' },
  { id: 'gemini', label: 'Google (Gemini)', defaultModel: 'gemini-1.5-flash' },
];

export const defaultModelFor = (provider: AIProviderId): string =>
  AI_PROVIDERS.find((p) => p.id === provider)?.defaultModel ?? '';

const emptyConfig = (): WhiteLabelAIConfig => ({
  enabled: false,
  provider: 'anthropic',
  model: defaultModelFor('anthropic'),
  key_configured: false,
  key_last4: null,
  updated_at: null,
  updated_by: null,
  last_reason: null,
});

// Store em memória para o modo mock/local (sem edge function).
const MOCK_AI_CONFIG: Record<string, WhiteLabelAIConfig> = {};

const coerceConfig = (raw: Record<string, unknown> | undefined): WhiteLabelAIConfig => {
  if (!raw) return emptyConfig();
  const provider = (['anthropic', 'openai', 'gemini'] as const).includes(raw.provider as AIProviderId)
    ? (raw.provider as AIProviderId)
    : 'anthropic';
  return {
    enabled: (raw.enabled as boolean | undefined) ?? false,
    provider,
    model: (raw.model as string | undefined) || defaultModelFor(provider),
    key_configured: (raw.key_configured as boolean | undefined) ?? false,
    key_last4: (raw.key_last4 as string | null | undefined) ?? null,
    updated_at: (raw.updated_at as string | null | undefined) ?? null,
    updated_by: (raw.updated_by as string | null | undefined) ?? null,
    last_reason: (raw.last_reason as string | null | undefined) ?? null,
  };
};

export async function getWhiteLabelAIConfig(brandId: string): Promise<WhiteLabelAIConfig> {
  if (!canUseRemoteWhiteLabel()) {
    return MOCK_AI_CONFIG[brandId] ?? emptyConfig();
  }

  const { data, error } = await supabase
    .from('brand_settings')
    .select('menu_config')
    .eq('brand_id', brandId)
    .maybeSingle();

  if (error || !data) return emptyConfig();
  const menuConfig = (data.menu_config as Record<string, unknown> | null) ?? {};
  return coerceConfig(menuConfig.white_label_ai as Record<string, unknown> | undefined);
}

export async function setWhiteLabelAIConfig(input: {
  brandId: string;
  provider: AIProviderId;
  model: string;
  enabled: boolean;
  /** Só quando for definir/substituir a chave. */
  apiKey?: string;
  reason?: string;
}): Promise<WhiteLabelAIConfig> {
  if (!canUseRemoteWhiteLabel()) {
    const next: WhiteLabelAIConfig = {
      enabled: input.enabled,
      provider: input.provider,
      model: input.model || defaultModelFor(input.provider),
      key_configured: input.apiKey ? true : (MOCK_AI_CONFIG[input.brandId]?.key_configured ?? false),
      key_last4: input.apiKey ? input.apiKey.slice(-4) : (MOCK_AI_CONFIG[input.brandId]?.key_last4 ?? null),
      updated_at: new Date().toISOString(),
      updated_by: 'mock',
      last_reason: input.reason ?? null,
    };
    MOCK_AI_CONFIG[input.brandId] = next;
    return next;
  }

  const { data, error } = await supabase.functions.invoke('ai-config-set', {
    body: {
      brand_id: input.brandId,
      provider: input.provider,
      model: input.model,
      enabled: input.enabled,
      reason: input.reason,
      ...(input.apiKey ? { api_key: input.apiKey } : {}),
      mode: 'save',
    },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return coerceConfig(data?.config as Record<string, unknown> | undefined);
}

export interface AISuggestInput {
  title?: string;
  theme?: string;
  level?: string;
  pdfText?: string;
  currentSynopsis?: string;
}

/** Executa uma ação de sugestão de IA (ex.: 'suggest_synopsis') via edge function. */
export async function aiSuggest(params: {
  brandId: string;
  action: string;
  input: AISuggestInput;
}): Promise<{ text: string }> {
  if (!canUseRemoteWhiteLabel()) {
    throw new Error('Sugestão por IA indisponível em modo mock/local.');
  }
  const { data, error } = await supabase.functions.invoke('ai-suggest', {
    body: { brand_id: params.brandId, action: params.action, input: params.input },
  });
  if (error) throw error;
  if (data?.error) {
    if (data.error === 'ai_disabled') throw new Error('A IA não está ativada para esta marca (White Label).');
    if (data.error === 'no_key') throw new Error('Nenhuma chave de IA configurada para esta marca.');
    throw new Error(data.error);
  }
  return { text: String(data?.text ?? '') };
}

export async function testWhiteLabelAIConnection(input: {
  brandId: string;
  provider: AIProviderId;
  model: string;
  /** Testa a chave fornecida; se ausente, testa a já armazenada. */
  apiKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!canUseRemoteWhiteLabel()) {
    return { ok: false, error: 'Teste indisponível em modo mock/local (sem edge function).' };
  }
  const { data, error } = await supabase.functions.invoke('ai-config-set', {
    body: {
      brand_id: input.brandId,
      provider: input.provider,
      model: input.model,
      ...(input.apiKey ? { api_key: input.apiKey } : {}),
      mode: 'test',
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: data?.ok === true, error: data?.error };
}
