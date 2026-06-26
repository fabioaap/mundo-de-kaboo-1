-- ROLLBACK de 20260409000600_performance_indexes.sql (DB-08)
-- ⚠️ DOCUMENTAÇÃO — não roda automaticamente.
--
-- A edição DB-08 só trocou CREATE INDEX CONCURRENTLY por CREATE INDEX (mesmo índice).
-- Não há mudança de dados. Para remover o índice (raramente necessário):

-- DROP INDEX IF EXISTS public.idx_collections_created_at;
