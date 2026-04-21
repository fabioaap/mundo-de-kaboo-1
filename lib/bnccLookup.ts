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
