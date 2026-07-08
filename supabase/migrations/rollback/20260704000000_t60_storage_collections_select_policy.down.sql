-- ROLLBACK de 20260704000000_t60_storage_collections_select_policy.sql (SEC-58 / DB-10)
-- ⚠️ DOCUMENTAÇÃO — não roda automaticamente. Execute manualmente se precisar reverter.
--
-- Remove a policy de SELECT criada em storage.objects para o bucket 'collections'.
--
-- ⚠️ PRÉ-CONDIÇÃO CRÍTICA DE ORDEM:
-- Se o bucket JÁ tiver sido virado para public=false (SEC-58 T2), NÃO rode este
-- rollback isolado — dropar a única policy de SELECT com o bucket privado deixa o
-- bucket ilegível para TODO MUNDO (site quebra visualmente). Neste cenário, reverta
-- PRIMEIRO o bucket para public=true (rollback da T2), e SÓ ENTÃO remova esta policy.
-- Enquanto o bucket seguir public=true, remover esta policy apenas volta ao estado
-- anterior (leitura governada só pela flag public), sem quebra.
--
-- Ordem segura de reversão total do SEC-58:
--   1) UPDATE storage.buckets SET public = true WHERE id = 'collections';  (rollback T2)
--   2) DROP POLICY abaixo                                                  (rollback T1/T60)

DROP POLICY IF EXISTS "Usuarios leem arquivos de collections da sua marca"
  ON storage.objects;
