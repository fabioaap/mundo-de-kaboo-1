-- Wiki Assistant — backend de RAG lexical (embedding-free) sobre a documentação.
--
-- Estratégia v1: full-text search do Postgres (config 'portuguese') sobre os
-- trechos dos .md da wiki. Sem embeddings, sem dependência de provider de
-- vetor. Upgrade para pgvector é aditivo depois.
--
-- Segurança:
--   * wiki_chunks tem RLS ligado sem policy pública — só acessível via a RPC
--     SECURITY DEFINER (leitura) e via service_role (indexação).
--   * A RPC de busca é read-only e não expõe nada sensível (só docs públicos).
--   * Cap diário de uso protege a chave de LLM contra abuso (função é
--     alcançável pela internet).

-- ─────────────────────────────── Trechos ───────────────────────────────
create table if not exists public.wiki_chunks (
  id         bigint generated always as identity primary key,
  doc_id     text not null,
  title      text not null,
  url        text not null,
  heading    text,
  content    text not null,
  tsv        tsvector generated always as (
               to_tsvector('portuguese',
                 coalesce(title, '') || ' ' ||
                 coalesce(heading, '') || ' ' ||
                 content)
             ) stored,
  updated_at timestamptz not null default now()
);

create index if not exists wiki_chunks_tsv_idx on public.wiki_chunks using gin (tsv);
create index if not exists wiki_chunks_doc_idx on public.wiki_chunks (doc_id);

alter table public.wiki_chunks enable row level security;
-- Sem policy de SELECT: acesso só via RPC (definer) ou service_role.

-- ──────────────────────────── Busca (RPC) ────────────────────────────
-- Retorna os top-k trechos mais relevantes para a pergunta. SECURITY DEFINER
-- para ler a tabela apesar do RLS; conteúdo é documentação, não é sensível.
-- Busca em dois níveis: match estrito (todos os termos) e, se vazio, fallback
-- OR (qualquer termo) — assim sempre há páginas candidatas para sugerir/linkar.
create or replace function public.search_wiki_chunks(q text, k int default 6)
returns table (doc_id text, title text, url text, heading text, content text, rank real)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  strict_q tsquery := websearch_to_tsquery('portuguese', q);
  loose_q  tsquery;
begin
  return query
    select c.doc_id, c.title, c.url, c.heading, c.content,
           ts_rank(c.tsv, strict_q) as rank
    from public.wiki_chunks c
    where c.tsv @@ strict_q
    order by rank desc
    limit greatest(1, least(k, 12));
  if found then return; end if;

  select to_tsquery('portuguese', string_agg(lexeme, ' | '))
    into loose_q
    from unnest(to_tsvector('portuguese', q)) as t(lexeme, positions, weights);
  if loose_q is null then return; end if;

  return query
    select c.doc_id, c.title, c.url, c.heading, c.content,
           ts_rank(c.tsv, loose_q) as rank
    from public.wiki_chunks c
    where c.tsv @@ loose_q
    order by rank desc
    limit greatest(1, least(k, 12));
end;
$$;

grant execute on function public.search_wiki_chunks(text, int) to anon, authenticated, service_role;

-- ───────────────────────── Cap diário de uso ─────────────────────────
create table if not exists public.wiki_assistant_usage (
  day   date primary key,
  count int  not null default 0
);

alter table public.wiki_assistant_usage enable row level security;
-- Sem policy: só service_role (a Edge Function) mexe aqui.

-- Incrementa atômico e diz se ainda está sob o teto. Chamado pela Edge
-- Function antes de gastar a chave de LLM. p_cap <= 0 desliga o teto.
create or replace function public.bump_wiki_usage(p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  novo int;
begin
  insert into public.wiki_assistant_usage (day, count)
    values (current_date, 1)
  on conflict (day) do update set count = public.wiki_assistant_usage.count + 1
  returning count into novo;

  return (p_cap <= 0) or (novo <= p_cap);
end;
$$;

grant execute on function public.bump_wiki_usage(int) to service_role;
