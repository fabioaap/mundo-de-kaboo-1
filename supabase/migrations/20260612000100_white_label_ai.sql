-- White Label · Integração de IA (BYOK por marca)
-- Armazenamento SEGURO da chave de API de LLM via Supabase Vault.
--
-- Princípios:
--   * A chave NUNCA fica em brand_settings.menu_config nem em qualquer coluna
--     legível pelo client. Só o Vault (cifrado) guarda a chave.
--   * Apenas service_role (edge functions) pode gravar/ler a chave decifrada.
--     As funções abaixo são SECURITY DEFINER e têm EXECUTE revogado de
--     anon/authenticated, então o PostgREST não as expõe ao navegador.

create extension if not exists supabase_vault with schema vault;

-- Upsert da chave de uma marca/provedor no Vault.
create or replace function public.set_brand_llm_secret(
  p_brand_id uuid,
  p_provider text,
  p_secret text
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_name text := 'brand_llm__' || p_brand_id::text || '__' || p_provider;
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then
    perform vault.create_secret(
      p_secret,
      v_name,
      'LLM API key — brand ' || p_brand_id::text || ' / provider ' || p_provider
    );
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
end;
$$;

-- Leitura da chave decifrada (só usada por edge function service_role).
create or replace function public.get_brand_llm_secret(
  p_brand_id uuid,
  p_provider text
) returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_name text := 'brand_llm__' || p_brand_id::text || '__' || p_provider;
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = v_name;
  return v_secret;
end;
$$;

-- Remoção da chave (ao desconfigurar o provedor).
create or replace function public.delete_brand_llm_secret(
  p_brand_id uuid,
  p_provider text
) returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_name text := 'brand_llm__' || p_brand_id::text || '__' || p_provider;
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = v_name;
  if v_id is not null then
    delete from vault.secrets where id = v_id;
  end if;
end;
$$;

-- Trava de exposição: nunca chamáveis pelo browser.
revoke all on function public.set_brand_llm_secret(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_brand_llm_secret(uuid, text) from public, anon, authenticated;
revoke all on function public.delete_brand_llm_secret(uuid, text) from public, anon, authenticated;

grant execute on function public.set_brand_llm_secret(uuid, text, text) to service_role;
grant execute on function public.get_brand_llm_secret(uuid, text) to service_role;
grant execute on function public.delete_brand_llm_secret(uuid, text) to service_role;
