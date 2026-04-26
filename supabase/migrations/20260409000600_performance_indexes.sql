-- Migration: 20260409000600_performance_indexes.sql
-- US-DB4: Criar índices faltantes nas queries críticas
-- Melhora performance das queries mais comuns da aplicação

-- ─── collections ───────────────────────────────────────────────────────────
-- Filtros de busca e ordenação da LibraryScreen / AdminScreen
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_created_at
  ON public.collections (created_at DESC);
