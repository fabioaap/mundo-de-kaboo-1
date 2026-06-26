-- Migration: 20260409000600_performance_indexes.sql
-- US-DB4: Criar índices faltantes nas queries críticas
-- Melhora performance das queries mais comuns da aplicação

-- ─── collections ───────────────────────────────────────────────────────────
-- Filtros de busca e ordenação da LibraryScreen / AdminScreen
-- DB-08 fix (2026-06-26): removido CONCURRENTLY — não pode rodar dentro da
-- transação que o runner de migrations do Supabase usa (falha no apply em rebuild limpo).
CREATE INDEX IF NOT EXISTS idx_collections_created_at
  ON public.collections (created_at DESC);
