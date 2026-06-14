import bnccData from '../data/bncc-lookup.json';

export interface BnccSkill {
  description: string;
  component: string;
  year: string;
  thematic_unit?: string;
  knowledge_object?: string;
  stage: string;
}

const bnccMap = bnccData as Record<string, BnccSkill>;

export const lookupBncc = (code: string): BnccSkill | null => {
  return bnccMap[code] || null;
};

export interface BnccOption {
  value: string;
  label: string;
  description: string;
  group: string;
}

const ANOS_INICIAIS_RE = /[1-5]º/;
const ANOS_FINAIS_RE = /[6-9]º/;

// Faixas etárias da Educação Infantil cobertas pelo cadastro (G3-G5):
//   EI02 = Crianças bem pequenas (1a7m–3a11m) -> cobre G3 (3 anos)
//   EI03 = Crianças pequenas (4a–5a11m)        -> cobre G4 e G5 (4-5 anos)
// EI01 (Bebês, 0–1a6m) fica de fora porque o cadastro não tem essa faixa.
const EI_AGE_GROUPS = ['EI02', 'EI03'];

/**
 * Opções de habilidades BNCC para formulários (compatível com SearchableMultiSelect).
 * Filtra pela FAIXA ETÁRIA suportada pelo cadastro (G3-G5 + EF Anos Iniciais 1º-5º),
 * em TODAS as áreas de conhecimento / campos de experiência — não por componente.
 * Derivado de data/bncc-lookup.json (fonte única de verdade) e agrupado por componente.
 */
export const getBnccOptions = (): BnccOption[] =>
  Object.entries(bnccMap)
    .filter(([code, skill]) => {
      if (skill.stage === 'EI') return EI_AGE_GROUPS.includes(code.slice(0, 4));
      if (skill.stage === 'EF') return ANOS_INICIAIS_RE.test(skill.year) && !ANOS_FINAIS_RE.test(skill.year);
      return false;
    })
    .map(([code, skill]) => ({
      value: code,
      label: code,
      description: skill.description,
      group: skill.component,
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.value.localeCompare(b.value));
