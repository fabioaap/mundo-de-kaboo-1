import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const createStorageMock = (): Storage => {
    const store = new Map<string, string>();
    return {
        get length() { return store.size; },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => { store.delete(key); },
        setItem: (key: string, value: string) => { store.set(key, value); },
    };
};

const stubBrowserStorage = () => {
    const sessionStorage = createStorageMock();
    const localStorage = createStorageMock();
    vi.stubGlobal('sessionStorage', sessionStorage);
    vi.stubGlobal('localStorage', localStorage);
    vi.stubGlobal('window', {
        sessionStorage,
        localStorage,
        location: {
            hash: '', href: 'http://localhost:4100/', hostname: 'localhost',
            origin: 'http://localhost:4100', port: '4100', protocol: 'http:', search: '',
        },
    });
};

// Issue #59 / C5 — anti-enumeração no cadastro. A checagem de voucher roda ANTES do
// supabase.auth.signUp() e não é consumida por uma tentativa que falha em "já
// cadastrado" — um atacante com QUALQUER voucher válido poderia sondar e-mails
// arbitrários sem limite. registerWithVoucher() precisa devolver exatamente a
// mesma resposta (sucesso pendente de confirmação) tanto pra um e-mail novo quanto
// pra um já cadastrado, pra essas duas respostas ficarem indistinguíveis do cliente.
describe('registerWithVoucher anti-enumeration (remote path, #59/C5)', () => {
    beforeEach(() => {
        vi.resetModules();
        stubBrowserStorage();
        vi.doMock('./supabase', () => {
            const rpc = vi.fn().mockResolvedValue({
                data: { success: true, voucher: { code: 'TEST-VOUCHER', duration_months: 3 } },
                error: null,
            });
            const signUp = vi.fn().mockResolvedValue({
                data: { user: null, session: null },
                error: { message: 'User already registered' },
            });
            return {
                supabase: { rpc, auth: { signUp } },
                isSupabaseConfigured: true,
            };
        });
    });

    afterEach(() => {
        vi.doUnmock('./supabase');
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('returns the same pending-confirmation shape as a real new signup, not an error', async () => {
        const { api } = await import('./api');

        const result = await api.registerWithVoucher({
            email: 'ja-cadastrado@example.com',
            password: 'SenhaForte123!',
            full_name: 'Teste',
            voucherCode: 'TEST-VOUCHER',
        });

        expect(result.success).toBe(true);
        expect(result.requiresEmailConfirmation).toBe(true);
        expect(result.requiresLogin).toBe(true);
        expect(result.error).toBeUndefined();
        expect(result.message).toMatch(/Confirme seu e-mail/i);
    });
});
