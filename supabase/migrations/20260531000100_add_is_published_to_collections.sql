-- Adiciona campo de controle de publicação à tabela collections
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT NULL;

-- Índice para performance na vitrine pública (filtra por brand + publicado)
CREATE INDEX IF NOT EXISTS idx_collections_is_published_brand
  ON public.collections (brand_id, is_published)
  WHERE is_published = true;

-- Conteúdos já existentes continuam como rascunho (is_published = false)
-- O admin precisará publicá-los explicitamente
