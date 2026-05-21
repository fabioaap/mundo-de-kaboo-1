import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------

// Get environment variables (Vite uses import.meta.env, not process.env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const REQUIRE_SUPABASE_IN_PROD = import.meta.env.VITE_REQUIRE_SUPABASE === 'true';
const ENABLE_DEV_SESSION_BRIDGE = import.meta.env.VITE_ENABLE_DEV_SESSION_BRIDGE === 'true';
const LOCAL_DEV_SESSION_BRIDGE_PORTS = ['4100', '4101'] as const;
const DEV_SESSION_BRIDGE_MODE_KEY = 'devSessionBridge';
const DEV_SESSION_BRIDGE_RETURN_TO_KEY = 'devSessionReturnTo';
const DEV_SESSION_IMPORT_FLAG_KEY = 'devSessionImport';
const DEV_SESSION_IMPORT_STATUS_KEY = 'devSessionImportStatus';
const DEV_SESSION_IMPORT_ACCESS_TOKEN_KEY = 'devSessionAccessToken';
const DEV_SESSION_IMPORT_REFRESH_TOKEN_KEY = 'devSessionRefreshToken';
const DEV_SESSION_IMPORT_SOURCE_KEY = 'devSessionSource';

// Check if Supabase is configured
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// Create a dummy client if not configured to prevent errors
// Use placeholder values that won't cause runtime errors
const safeUrl = SUPABASE_URL || 'https://placeholder.supabase.co';
const safeKey = SUPABASE_ANON_KEY || 'placeholder-key';

type DevSessionBridgeImportResult = 'none' | 'miss' | 'applied';

const isLocalHostname = (hostname: string): boolean => ['localhost', '127.0.0.1', '0.0.0.0'].includes(hostname);

const isLocalDevSessionBridgeContext = (): boolean => {
  if (typeof window === 'undefined' || !import.meta.env.DEV || !isSupabaseConfigured) {
    return false;
  }

  return isLocalHostname(window.location.hostname.toLowerCase())
    && LOCAL_DEV_SESSION_BRIDGE_PORTS.includes(window.location.port as (typeof LOCAL_DEV_SESSION_BRIDGE_PORTS)[number]);
};

const parseHashRoute = (hash: string): { screen: string; params: URLSearchParams } => {
  const rawHash = hash.replace(/^#/, '').trim();
  if (!rawHash) {
    return { screen: '', params: new URLSearchParams() };
  }

  const [screen = '', ...parts] = rawHash.split('&');
  return {
    screen,
    params: new URLSearchParams(parts.join('&')),
  };
};

const buildHashRoute = (screen: string, params: URLSearchParams): string => {
  const serializedParams = params.toString();
  const nextHash = screen
    ? `${screen}${serializedParams ? `&${serializedParams}` : ''}`
    : serializedParams;

  return nextHash ? `#${nextHash}` : '';
};

const stripDevSessionImportParamsFromUrl = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const url = new URL(window.location.href);
  const { screen, params } = parseHashRoute(url.hash);

  [
    DEV_SESSION_IMPORT_FLAG_KEY,
    DEV_SESSION_IMPORT_STATUS_KEY,
    DEV_SESSION_IMPORT_ACCESS_TOKEN_KEY,
    DEV_SESSION_IMPORT_REFRESH_TOKEN_KEY,
    DEV_SESSION_IMPORT_SOURCE_KEY,
  ].forEach((key) => params.delete(key));

  url.hash = buildHashRoute(screen, params);
  window.history.replaceState(window.history.state, '', url.toString());
};

const buildBridgeReturnUrl = (
  returnTo: string,
  payload:
    | { status: 'miss' }
    | { status: 'ok'; accessToken: string; refreshToken: string; sourceOrigin: string },
): string => {
  const url = new URL(returnTo);
  const { screen, params } = parseHashRoute(url.hash);

  [
    DEV_SESSION_IMPORT_FLAG_KEY,
    DEV_SESSION_IMPORT_STATUS_KEY,
    DEV_SESSION_IMPORT_ACCESS_TOKEN_KEY,
    DEV_SESSION_IMPORT_REFRESH_TOKEN_KEY,
    DEV_SESSION_IMPORT_SOURCE_KEY,
  ].forEach((key) => params.delete(key));

  if (payload.status === 'ok') {
    params.set(DEV_SESSION_IMPORT_FLAG_KEY, '1');
    params.set(DEV_SESSION_IMPORT_ACCESS_TOKEN_KEY, payload.accessToken);
    params.set(DEV_SESSION_IMPORT_REFRESH_TOKEN_KEY, payload.refreshToken);
    params.set(DEV_SESSION_IMPORT_SOURCE_KEY, payload.sourceOrigin);
  } else {
    params.set(DEV_SESSION_IMPORT_STATUS_KEY, 'miss');
  }

  url.hash = buildHashRoute(screen, params);
  return url.toString();
};

const getSiblingLocalOrigins = (): string[] => {
  if (typeof window === 'undefined' || !isLocalDevSessionBridgeContext()) {
    return [];
  }

  const { protocol, hostname, port } = window.location;

  return LOCAL_DEV_SESSION_BRIDGE_PORTS
    .filter((candidatePort) => candidatePort !== port)
    .map((candidatePort) => `${protocol}//${hostname}:${candidatePort}`);
};

if (!isSupabaseConfigured) {
  if (import.meta.env.PROD && REQUIRE_SUPABASE_IN_PROD) {
    throw new Error(
      '[Mundo de Kaboo] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios em produção. ' +
      'Configure as variáveis de ambiente do provedor de deploy antes de publicar o app.'
    );
  }
  if (import.meta.env.DEV) {
    console.warn('⚠️ Supabase credentials are missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
    console.warn('⚠️ The app will run in fallback mode without Supabase functionality.');
  } else if (import.meta.env.PROD) {
    console.warn('⚠️ Supabase credentials are missing in production. The app will run in demo mode.');
  }
}

export const supabase = createClient(safeUrl, safeKey);

const devSessionBridgeImportPromise: Promise<DevSessionBridgeImportResult> = (async () => {
  if (typeof window === 'undefined' || !isLocalDevSessionBridgeContext()) {
    return 'none';
  }

  const { params } = parseHashRoute(window.location.hash);
  const importStatus = params.get(DEV_SESSION_IMPORT_STATUS_KEY);
  const shouldImport = params.get(DEV_SESSION_IMPORT_FLAG_KEY) === '1';

  if (!shouldImport && importStatus !== 'miss') {
    return 'none';
  }

  const accessToken = params.get(DEV_SESSION_IMPORT_ACCESS_TOKEN_KEY);
  const refreshToken = params.get(DEV_SESSION_IMPORT_REFRESH_TOKEN_KEY);

  stripDevSessionImportParamsFromUrl();

  if (importStatus === 'miss' || !accessToken || !refreshToken) {
    return 'miss';
  }

  try {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return 'applied';
  } catch (error) {
    console.warn('[Mundo de Kaboo] Falha ao importar sessao do bridge local:', error);
    return 'miss';
  }
})();

export const awaitDevSessionBridgeImport = (): Promise<DevSessionBridgeImportResult> => devSessionBridgeImportPromise;

export async function maybeHandleDevSessionBridgeExport(): Promise<boolean> {
  if (typeof window === 'undefined' || !isLocalDevSessionBridgeContext()) {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get(DEV_SESSION_BRIDGE_MODE_KEY) !== 'export') {
    return false;
  }

  const returnTo = currentUrl.searchParams.get(DEV_SESSION_BRIDGE_RETURN_TO_KEY);
  if (!returnTo) {
    return false;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }

    const session = data.session;
    if (!session?.access_token || !session.refresh_token) {
      window.location.replace(buildBridgeReturnUrl(returnTo, { status: 'miss' }));
      return true;
    }

    window.location.replace(buildBridgeReturnUrl(returnTo, {
      status: 'ok',
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      sourceOrigin: window.location.origin,
    }));

    return true;
  } catch (error) {
    console.warn('[Mundo de Kaboo] Falha ao exportar sessao pelo bridge local:', error);
    window.location.replace(buildBridgeReturnUrl(returnTo, { status: 'miss' }));
    return true;
  }
}

export function maybeRequestDevSessionFromSibling(returnTo: string = window.location.href): boolean {
  if (typeof window === 'undefined' || !ENABLE_DEV_SESSION_BRIDGE || !isLocalDevSessionBridgeContext()) {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.get(DEV_SESSION_BRIDGE_MODE_KEY) === 'export') {
    return false;
  }

  const { params } = parseHashRoute(currentUrl.hash);
  if (params.get(DEV_SESSION_IMPORT_FLAG_KEY) === '1' || params.get(DEV_SESSION_IMPORT_STATUS_KEY) === 'miss') {
    return false;
  }

  const [siblingOrigin] = getSiblingLocalOrigins();
  if (!siblingOrigin) {
    return false;
  }

  const bridgeUrl = new URL(`${siblingOrigin}/`);
  bridgeUrl.searchParams.set(DEV_SESSION_BRIDGE_MODE_KEY, 'export');
  bridgeUrl.searchParams.set(DEV_SESSION_BRIDGE_RETURN_TO_KEY, returnTo);
  window.location.replace(bridgeUrl.toString());
  return true;
}
