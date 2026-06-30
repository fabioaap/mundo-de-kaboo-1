-- ============================================================
-- RPC: get_voucher_consumers
-- A tabela de Códigos (admin) precisa exibir Consumidor/E-mail de quem
-- resgatou cada voucher. Esses dados vivem em public.profiles, cuja RLS
-- (fix DB-01) só permite o usuário ler o PRÓPRIO perfil — admins não leem
-- perfis de terceiros pelo client. Esta função SECURITY DEFINER expõe o
-- mínimo (nome + e-mail do consumidor) APENAS para vouchers de marcas que
-- o chamador administra (can_manage_brand). Não afrouxa a RLS de profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_voucher_consumers(p_voucher_ids UUID[])
RETURNS TABLE (
    voucher_id     UUID,
    consumer_name  TEXT,
    consumer_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        v.id,
        COALESCE(p.full_name, p.name),
        p.email
    FROM public.vouchers v
    JOIN public.profiles p ON p.id = v.consumed_by_user_id
    WHERE v.id = ANY(p_voucher_ids)
      AND v.consumed_by_user_id IS NOT NULL
      AND public.can_manage_brand(v.brand_id);  -- autoriza pelo brand do voucher (usa auth.uid() do chamador)
$$;

REVOKE ALL ON FUNCTION public.get_voucher_consumers(UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_voucher_consumers(UUID[]) TO authenticated;
