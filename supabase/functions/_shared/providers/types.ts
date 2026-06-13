// Contrato comum dos provedores de LLM (plugável: anthropic, openai, gemini).

export type ProviderId = 'anthropic' | 'openai' | 'gemini';

export interface ProviderCallInput {
  apiKey: string;
  model: string;
  system?: string;
  prompt: string;
  /** Pede saída JSON (quando o provedor suporta nativamente). */
  json?: boolean;
  maxTokens?: number;
}

export interface ProviderCallResult {
  text: string;
}

export interface Provider {
  id: ProviderId;
  /** Modelo padrão usado quando a marca não definiu um. */
  defaultModel: string;
  /** Chamada de geração. Lança Error em falha (mensagem sem vazar a chave). */
  call(input: ProviderCallInput): Promise<ProviderCallResult>;
  /** Validação barata para "Testar conexão". */
  test(apiKey: string, model: string): Promise<{ ok: boolean; error?: string }>;
}
