-- Migration: 20260409000600_performance_indexes.sql
-- US-DB4: Criar índices faltantes nas queries críticas
-- Melhora performance das queries mais comuns da aplicação

-- ─── user_progress ─────────────────────────────────────────────────────────
-- Filtros frequentes: busca pelo user_id (tela Home e relatórios)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_user_id
  ON user_progress (user_id);

-- Busca por coleção específica de um usuário
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_progress_user_collection
  ON user_progress (user_id, collection_id);

-- ─── collection_resources ──────────────────────────────────────────────────
-- Filtro mais frequente: listar recursos de uma coleção
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_resources_collection_id
  ON collection_resources (collection_id);

-- Para ordenação por posição (exibição nos players)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_resources_collection_order
  ON collection_resources (collection_id, position ASC);

-- ─── vouchers / user_vouchers ───────────────────────────────────────────────
-- Lookup frequente: vouchers ativos de um usuário (tela de acesso)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_vouchers_user_id
  ON user_vouchers (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_vouchers_voucher_id
  ON user_vouchers (voucher_id);

-- ─── collections ───────────────────────────────────────────────────────────
-- Filtros de busca e ordenação da LibraryScreen / AdminScreen
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collections_created_at
  ON collections (created_at DESC);
