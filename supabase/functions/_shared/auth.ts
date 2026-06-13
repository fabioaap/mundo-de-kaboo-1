// Autenticação/autorização compartilhada das edge functions.
//
// Replica o padrão de invite-user: valida o JWT do caller via /auth/v1/user e
// checa o papel em profiles. Para autorização por marca, replica a lógica do
// RPC public.can_manage_brand (que usa auth.uid() e por isso NÃO funciona sob
// service_role): super admin OU membership admin/editor naquela marca.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AdminContext {
  adminClient: SupabaseClient;
  caller: { id: string };
  role: string;
}

export const getEnv = () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return { url, serviceKey };
};

/**
 * Valida o caller e exige papel admin/editor. Retorna o contexto ou lança um
 * objeto { status, message } adequado para virar resposta HTTP.
 */
export const requireOperator = async (
  req: Request,
  allowedRoles: string[] = ['admin', 'editor'],
): Promise<AdminContext> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw { status: 401, message: 'Unauthorized' };

  const { url, serviceKey } = getEnv();
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const userResp = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: authHeader, apikey: serviceKey },
  });
  if (!userResp.ok) throw { status: 401, message: 'Unauthorized' };
  const caller = await userResp.json();
  if (!caller?.id) throw { status: 401, message: 'Unauthorized' };

  const { data: profile, error } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();

  if (error || !profile || !allowedRoles.includes(String(profile.role))) {
    throw { status: 403, message: 'Forbidden' };
  }

  return { adminClient, caller: { id: caller.id }, role: String(profile.role) };
};

/** Espelha public.can_manage_brand sem depender de auth.uid() (service_role). */
export const canManageBrand = async (
  adminClient: SupabaseClient,
  userId: string,
  brandId: string,
): Promise<boolean> => {
  const { data: superAdmin } = await adminClient
    .from('white_label_super_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (superAdmin) return true;

  const { data: membership } = await adminClient
    .from('brand_admin_memberships')
    .select('brand_id')
    .eq('user_id', userId)
    .eq('brand_id', brandId)
    .maybeSingle();
  return !!membership;
};
