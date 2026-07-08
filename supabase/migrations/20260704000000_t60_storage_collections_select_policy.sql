-- ============================================================
-- SEC-58 / DB-10 — Policy de SELECT em storage.objects (bucket 'collections')
-- ============================================================
-- Contexto (verificado ao vivo em prod yevysgqlnhonhkczkyhu, 2026-07-04):
-- O bucket 'collections' é public=true e NÃO tem nenhuma policy de SELECT em
-- storage.objects — hoje o controle de leitura é feito INTEIRAMENTE pela flag
-- public do bucket. Antes de virar o bucket privado (SEC-58 T2, migration
-- separada), precisa existir esta policy, senão ao desligar public=true ninguém
-- (nem os usuários certos) consegue mais ler nada e o site quebra.
--
-- Esta migration cria APENAS a policy de SELECT. NÃO altera storage.buckets.public
-- (isso é a T2, aplicada só depois desta validada + autorização do Fábio).
--
-- Regra de leitura: usuário autenticado só lê um objeto se o brand_id da entidade
-- dona do path bater com o profiles.brand_id do usuário. Mesmo padrão de isolamento
-- por marca usado no resto do RLS do projeto (cf. 20260615170000_brand_scope_media_rls
-- e a policy de SELECT de collections): junta com profiles via
--   (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
-- e mantém os escapes de admin (is_white_label_super_admin / can_manage_brand).
--
-- ------------------------------------------------------------
-- ⚠️ ESTRUTURA REAL DE PATH (investigada ao vivo, DIVERGE do assumido na story):
-- O bucket serve várias formas de path, e split_part(name,'/',2) NEM SEMPRE é um
-- UUID de entidade. Formas encontradas em prod:
--   covers/{collections.id-uuid}/{file}     -> 2º seg = UUID de collection
--   pdfs/{collections.id-uuid}/{file}       -> 2º seg = UUID de collection
--   audio/{collections.id-uuid}/{file}      -> 2º seg = UUID de collection
--   characters/{characters.id-slug}/{file}  -> 2º seg = id TEXT de character (ex: 'belinha')
--   characters/{slug}.png                   -> path de 2 segmentos; 2º seg = '<slug>.png' (legado)
--   extras/{brand.slug}/{file}              -> 2º seg = slug de marca (ex: 'kaboo')
--   {folder}/temp/{file}                    -> upload de coleção ainda não salva
--   covers|pdfs|audio/{uuid-órfão}/{file}   -> UUID sem collection dona (43+ órfãos hoje)
--
-- Constraints de tipo confirmados ao vivo:
--   collections.id, materials.id, formations.id : UUID  (cast '<slug>'::uuid EXPLODE)
--   characters.id                               : TEXT  (aceita slug e uuid)
-- Por isso o EXISTS contra collections/materials/formations é GUARDADO por um teste
-- de "o 2º segmento é um UUID válido?" antes de qualquer comparação — senão um path
-- de character (slug) faria o cast '::uuid' lançar erro em tempo de avaliação de linha
-- e derrubaria o SELECT inteiro. O ramo de characters é tratado à parte (id TEXT),
-- cobrindo tanto characters/{slug}/... quanto o legado characters/{slug}.png.
--
-- Órfãos (UUID sem linha dona) e paths não reconhecidos: negados para viewer,
-- visíveis só para admin/editor (não há brand_id a que ancorar; mesmo tratamento
-- do caso temp/). Isso não quebra o app porque os órfãos não pertencem a nenhuma
-- coleção viva de nenhuma marca.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Usuarios leem arquivos de collections da sua marca'
  ) THEN
    CREATE POLICY "Usuarios leem arquivos de collections da sua marca"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'collections'
        AND (
          -- (A) Admin/editor: acesso total ao bucket (mantém o workflow do CMS e
          --     cobre temp/, órfãos e paths não mapeados). Mesma checagem de role
          --     usada nas 3 policies de INSERT/UPDATE/DELETE deste bucket.
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND lower(COALESCE(p.role, 'viewer')) IN ('admin', 'editor')
          )

          -- (B) Super admin white-label / gestor de marca: mesmos escapes do resto do RLS.
          OR public.is_white_label_super_admin(auth.uid())

          -- (C) Viewer da marca dona — ENTIDADES COM id UUID (collections/materials/formations).
          --     Só avalia o cast/EXISTS quando o 2º segmento é um UUID válido, evitando
          --     '<slug>'::uuid em paths de character.
          OR (
            split_part(name, '/', 2) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND (
              EXISTS (
                SELECT 1 FROM public.collections c
                WHERE c.id = split_part(name, '/', 2)::uuid
                  AND c.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
              )
              OR EXISTS (
                SELECT 1 FROM public.materials m
                WHERE m.id = split_part(name, '/', 2)::uuid
                  AND m.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
              )
              OR EXISTS (
                SELECT 1 FROM public.formations f
                WHERE f.id = split_part(name, '/', 2)::uuid
                  AND f.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
              )
            )
          )

          -- (D) Viewer da marca dona — CHARACTERS (id TEXT: slug). Cobre
          --     characters/{slug}/... e o legado characters/{slug}.png (extensão removida).
          OR EXISTS (
            SELECT 1 FROM public.characters ch
            WHERE ch.id = regexp_replace(split_part(name, '/', 2), '\.[^.]+$', '')
              AND ch.brand_id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
          )

          -- (E) Assets de marca em extras/{brand.slug}/... — 2º segmento é o slug da marca.
          OR EXISTS (
            SELECT 1 FROM public.brands b
            WHERE b.slug = split_part(name, '/', 2)
              AND b.id = (SELECT p.brand_id FROM public.profiles p WHERE p.id = auth.uid())
          )
        )
      );
  END IF;
END
$$;
