alter table public.collections
  add column if not exists segments text[] not null default '{}';

alter table public.collections
  add column if not exists primary_segment text;

update public.collections
set
  segments = case
    when coalesce(array_length(segments, 1), 0) = 0 then
      case
        when level = 'Educação Infantil' then array['Educação Infantil']
        else array['E.F. Anos Iniciais']
      end
    else segments
  end,
  primary_segment = coalesce(
    nullif(primary_segment, ''),
    case
      when level = 'Educação Infantil' then 'Educação Infantil'
      else 'E.F. Anos Iniciais'
    end
  )
where
  coalesce(array_length(segments, 1), 0) = 0
  or primary_segment is null
  or primary_segment = '';