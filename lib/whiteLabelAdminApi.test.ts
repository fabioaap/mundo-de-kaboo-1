import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const createStorageMock = (): Storage => {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
};

beforeAll(() => {
    vi.stubGlobal('sessionStorage', createStorageMock());
    vi.stubGlobal('localStorage', createStorageMock());
});

describe('getWhiteLabelFeatures', () => {
    it('keeps music enabled by default for Central Coruja mock data', async () => {
        const { getWhiteLabelFeatures } = await import('./whiteLabelAdminApi');
        const features = await getWhiteLabelFeatures('mock-central-coruja', ['menu.music']);

        expect(features['menu.music']?.enabled).toBe(true);
    });

    it('exposes books and collections toggles in the Central Coruja mock baseline', async () => {
        const { getWhiteLabelFeatures } = await import('./whiteLabelAdminApi');
        const features = await getWhiteLabelFeatures('mock-central-coruja', ['menu.books', 'menu.collections']);

        expect(features['menu.books']?.enabled).toBe(true);
        expect(features['menu.collections']?.enabled).toBe(true);
    });
});

describe('assertSafeWebhookUrl (SSRF guard — BE-03 / #59)', () => {
    it('accepts a public https URL', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('https://hooks.slack.com/services/T000/B000/xxx')).not.toThrow();
    });

    it('rejects http:// (non-https scheme)', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('http://example.com/hook')).toThrow(/webhook_url_invalid/);
    });

    it('rejects non-http(s) schemes', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('file:///etc/passwd')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('ftp://example.com')).toThrow(/webhook_url_invalid/);
    });

    it('rejects malformed URLs', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('not a url')).toThrow(/webhook_url_invalid/);
    });

    it('rejects loopback hosts', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('https://localhost/hook')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://127.0.0.1/hook')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://127.5.5.5/hook')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://[::1]/hook')).toThrow(/webhook_url_invalid/);
    });

    it('rejects the cloud metadata endpoint (link-local 169.254.0.0/16)', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('https://169.254.169.254/latest/meta-data/')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://169.254.0.1/hook')).toThrow(/webhook_url_invalid/);
    });

    it('rejects private ranges (10/8, 172.16/12, 192.168/16)', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('https://10.0.0.1/hook')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://172.16.0.1/hook')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://172.31.255.255/hook')).toThrow(/webhook_url_invalid/);
        expect(() => assertSafeWebhookUrl('https://192.168.1.1/hook')).toThrow(/webhook_url_invalid/);
    });

    it('rejects 0.0.0.0', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('https://0.0.0.0/hook')).toThrow(/webhook_url_invalid/);
    });

    it('allows public IPs that are not in blocked ranges', async () => {
        const { assertSafeWebhookUrl } = await import('./whiteLabelAdminApi');
        expect(() => assertSafeWebhookUrl('https://172.15.0.1/hook')).not.toThrow();
        expect(() => assertSafeWebhookUrl('https://8.8.8.8/hook')).not.toThrow();
        expect(() => assertSafeWebhookUrl('https://172.32.0.1/hook')).not.toThrow();
    });
});

// BE-05 (#59): caminho remoto (Supabase) — a coluna de cor não pode receber
// vazio/undefined/inválido. Deve fazer fallback para o valor já salvo, igual
// ao merge não-destrutivo de menu_config. Evita data-wipe da paleta quando o
// save dispara antes do form de admin hidratar.
describe('setWhiteLabelBrandIdentity color data-wipe guard (remote path)', () => {
    const STORED_COLORS = {
        primary_color: '#111111',
        light_color: '#222222',
        bg_color: '#333333',
        accent_color: '#444444',
    };

    let capturedUpdate: Record<string, unknown> | null = null;

    beforeEach(() => {
        capturedUpdate = null;
        vi.resetModules();

        vi.doMock('./api', () => ({ isDevMockSession: () => false }));
        vi.doMock('./supabase', () => {
            const single = vi.fn().mockResolvedValue({
                data: { menu_config: {}, version: 1, ...STORED_COLORS },
                error: null,
            });
            const from = vi.fn(() => ({
                select: () => ({ eq: () => ({ single }) }),
                update: (payload: Record<string, unknown>) => {
                    capturedUpdate = payload;
                    return { eq: () => Promise.resolve({ error: null }) };
                },
            }));
            return { supabase: { from }, isSupabaseConfigured: true };
        });
    });

    afterEach(() => {
        vi.doUnmock('./api');
        vi.doUnmock('./supabase');
        vi.resetModules();
    });

    it('falls back to stored colors instead of writing empty/invalid ones', async () => {
        const mod = await import('./whiteLabelAdminApi');
        await mod.setWhiteLabelBrandIdentity({
            brandId: 'brand-1',
            display_name: 'Brand One',
            logo_url: '',
            primary_color: '',
            light_color: undefined as unknown as string,
            bg_color: 'rgb(0,0,0)', // não-hex → rejeitada
            accent_color: '#GGGGGG',
        });

        expect(capturedUpdate).not.toBeNull();
        expect(capturedUpdate!.primary_color).toBe(STORED_COLORS.primary_color);
        expect(capturedUpdate!.light_color).toBe(STORED_COLORS.light_color);
        expect(capturedUpdate!.bg_color).toBe(STORED_COLORS.bg_color);
        expect(capturedUpdate!.accent_color).toBe(STORED_COLORS.accent_color);
    });

    it('writes valid incoming colors (hex #RRGGBB and #RGB) through to the update', async () => {
        const mod = await import('./whiteLabelAdminApi');
        await mod.setWhiteLabelBrandIdentity({
            brandId: 'brand-1',
            display_name: 'Brand One',
            logo_url: '',
            primary_color: '#ABCDEF',
            light_color: '#ABC', // hex curto válido
            bg_color: STORED_COLORS.bg_color,
            accent_color: STORED_COLORS.accent_color,
        });

        expect(capturedUpdate!.primary_color).toBe('#ABCDEF');
        expect(capturedUpdate!.light_color).toBe('#ABC');
    });
});
