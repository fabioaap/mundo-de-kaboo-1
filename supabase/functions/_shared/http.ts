// Helpers HTTP/CORS compartilhados pelas edge functions.

// Allowlist de origens (T0.4 — substitui o wildcard `*`).
// Produção: GitHub Pages → domínio custom via Cloudflare (mundodekaboo.educacross.dev).
// Dev: portas locais do Vite (4100 dev / 4101 preview) + portas comuns.
const ALLOWED_ORIGINS = [
  // localhost dev
  'http://localhost:3000',
  'http://localhost:4100',
  'http://localhost:4101',
  'http://localhost:5173',
  'http://127.0.0.1:4100',
  'http://127.0.0.1:4101',
  // produção
  'https://mundodekaboo.educacross.dev',
  // Migração Azure (em andamento): adicionar o domínio definitivo quando publicado.
  // e.g. 'https://<app>.azurestaticapps.net'
];

export function getCorsHeaders(origin: string | null | undefined): Record<string, string> {
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    base['Access-Control-Allow-Origin'] = origin;
  }
  // Origem não reconhecida: sem header ACAO — o browser bloqueia cross-origin automaticamente.
  return base;
}

// Compat: export estático para funções que ainda não passam a origem.
export const corsHeaders = getCorsHeaders('http://localhost:4101');

export const json = (body: unknown, status = 200, origin?: string | null): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
  });

export const preflight = (origin?: string | null): Response =>
  new Response('ok', { headers: getCorsHeaders(origin) });
