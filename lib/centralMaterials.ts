import centralMaterialsSeed from '../data/central-materials.seed.json';
import { CentralMaterial, CentralMaterialCategory, CentralMaterialPreviewType } from '../types';

type CentralMaterialMeta = {
  label: string;
  badgeClassName: string;
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const stripUrlDecorators = (value: string): string => {
  return value.split('#')[0]?.split('?')[0] ?? value;
};

export const CENTRAL_MATERIAL_META: Record<CentralMaterialCategory, CentralMaterialMeta> = {
  guide: {
    label: 'Guia',
    badgeClassName: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  tutorial: {
    label: 'Tutorial',
    badgeClassName: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  family_support: {
    label: 'Famílias',
    badgeClassName: 'bg-rose-50 text-rose-700 border-rose-100',
  },
  catalog: {
    label: 'Catálogo',
    badgeClassName: 'bg-amber-50 text-amber-700 border-amber-100',
  },
};

export const inferCentralMaterialPreviewType = (
  material: Pick<CentralMaterial, 'preview_type' | 'url'>
): CentralMaterialPreviewType => {
  if (material.preview_type && material.preview_type !== 'other') {
    return material.preview_type;
  }

  const normalizedUrl = stripUrlDecorators(material.url).toLowerCase();

  if (normalizedUrl.endsWith('.pdf')) {
    return 'pdf';
  }

  if (/(\.mp3|\.wav|\.ogg|\.m4a|\.aac)$/i.test(normalizedUrl)) {
    return 'audio';
  }

  if (/(\.mp4|\.webm|\.mov|\.avi|\.m4v)$/i.test(normalizedUrl)) {
    return 'video';
  }

  if (/(\.jpg|\.jpeg|\.png|\.gif|\.webp|\.svg)$/i.test(normalizedUrl)) {
    return 'image';
  }

  return 'other';
};

export const getMockCentralMaterials = (): CentralMaterial[] => {
  return clone(centralMaterialsSeed as CentralMaterial[]);
};