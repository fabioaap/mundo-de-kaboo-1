// Ações de IA plugáveis. Cada ação monta system+prompt a partir de um input.
// Para adicionar uma ação nova (ex.: sugerir tema/BNCC), basta registrar aqui.

export interface SuggestInput {
  title?: string;
  theme?: string;
  level?: string;
  /** Trecho de texto extraído do PDF (primeiras páginas). */
  pdfText?: string;
  currentSynopsis?: string;
}

export interface AIAction {
  id: string;
  build(input: SuggestInput): { system: string; prompt: string; maxTokens: number };
}

const clamp = (s: string | undefined, n: number) => (s ?? '').toString().slice(0, n);

const suggestSynopsis: AIAction = {
  id: 'suggest_synopsis',
  build(input) {
    const system =
      'Você é um editor de conteúdo literário infantil em português do Brasil. ' +
      'Escreve sinopses curtas, envolventes e adequadas à faixa etária, sem spoilers do final ' +
      'e sem inventar fatos que não estejam no material fornecido.';
    const parts = [
      input.title ? `Título: ${clamp(input.title, 200)}` : '',
      input.level ? `Nível: ${clamp(input.level, 60)}` : '',
      input.theme ? `Tema: ${clamp(input.theme, 200)}` : '',
      input.pdfText ? `Trecho do livro:\n"""${clamp(input.pdfText, 6000)}"""` : '',
    ].filter(Boolean);
    const prompt =
      `${parts.join('\n')}\n\n` +
      'Escreva UMA sinopse de 2 a 3 frases (máx. ~60 palavras), em tom convidativo para ' +
      'famílias e educadores. Responda apenas com o texto da sinopse, sem aspas nem rótulos.';
    return { system, prompt, maxTokens: 400 };
  },
};

export const ACTIONS: Record<string, AIAction> = {
  suggest_synopsis: suggestSynopsis,
};

export const getAction = (id: string): AIAction | null => ACTIONS[id] ?? null;
