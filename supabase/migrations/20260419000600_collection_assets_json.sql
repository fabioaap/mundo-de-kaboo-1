-- Migration: preserva metadados ricos de assets no próprio registro de collections.
-- Os campos legados (pdf_url, audio_url, video_url, extra_materials) continuam existindo
-- como projeção para retrocompatibilidade, mas o admin precisa persistir collection_assets
-- para não perder título, descrição, categoria e escopo no round-trip remoto.

alter table public.collections
  add column if not exists collection_assets jsonb not null default '[]'::jsonb;

update public.collections
set collection_assets = coalesce(
  nullif(collection_assets, '[]'::jsonb),
  (
    select coalesce(jsonb_agg(asset), '[]'::jsonb)
    from (
      select jsonb_build_object(
        'id', 'reading-' || substr(md5(pdf_url), 1, 12),
        'category', 'reading',
        'media_type', 'document',
        'title', 'Leitura',
        'url', pdf_url,
        'description', null,
        'scope', 'primary'
      ) as asset
      where nullif(trim(pdf_url), '') is not null

      union all

      select jsonb_build_object(
        'id', 'storytelling-' || substr(md5(audio_url), 1, 12),
        'category', 'storytelling',
        'media_type', 'audio',
        'title', 'Contação da História',
        'url', audio_url,
        'description', null,
        'scope', 'primary'
      )
      where nullif(trim(audio_url), '') is not null

      union all

      select jsonb_build_object(
        'id', 'animation-' || substr(md5(video_url), 1, 12),
        'category', 'animation',
        'media_type', 'video',
        'title', 'Desenho Animado',
        'url', video_url,
        'description', null,
        'scope', 'primary'
      )
      where nullif(trim(video_url), '') is not null

      union all

      select jsonb_build_object(
        'id', 'extra-material-' || substr(md5(extra_url), 1, 12),
        'category', 'extra_material',
        'media_type', 'document',
        'title', 'Material Extra',
        'url', extra_url,
        'description', null,
        'scope', 'library'
      )
      from unnest(coalesce(extra_materials, '{}'::text[])) as extra_url
      where nullif(trim(extra_url), '') is not null
    ) seeded_assets
  ),
  '[]'::jsonb
)
where collection_assets = '[]'::jsonb;