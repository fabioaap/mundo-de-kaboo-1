alter table public.collections
  add column if not exists collection_type text default 'book';

alter table public.collections
  add column if not exists kit_cover_image text;

alter table public.collections
  add column if not exists kit_book_ids text[] not null default '{}';

update public.collections
set collection_type = coalesce(nullif(collection_type, ''), 'book')
where collection_type is null or collection_type = '';

alter table public.collections
  alter column collection_type set default 'book';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'collections_collection_type_check'
      and conrelid = 'public.collections'::regclass
  ) then
    alter table public.collections
      add constraint collections_collection_type_check
      check (collection_type in ('book', 'kit')) not valid;
  end if;
end
$$;

alter table public.collections
  validate constraint collections_collection_type_check;