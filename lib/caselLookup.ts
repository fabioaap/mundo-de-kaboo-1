import caselData from '../data/casel-lookup.json';

export interface CaselCompetency {
  label: string;
  dimension: string;
  focus: string;
  description: string;
  skills: string[];
}

const caselMap = caselData as Record<string, CaselCompetency>;

const CASEL_ALIASES: Record<string, string> = {
  autogerenciamento: 'autogestao',
  auto_gerenciamento: 'autogestao',
};

const normalizeCaselKey = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

export const lookupCasel = (value: string): CaselCompetency | null => {
  const normalizedKey = normalizeCaselKey(value);
  const resolvedKey = CASEL_ALIASES[normalizedKey] ?? normalizedKey;

  return caselMap[resolvedKey] || null;
};