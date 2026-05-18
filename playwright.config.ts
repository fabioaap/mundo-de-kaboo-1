import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: 'html',
    timeout: 60_000,
    expect: { timeout: 10_000 },
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:4100',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
    webServer: {
        command: 'npm run dev -- --port 4100',
        url: 'http://127.0.0.1:4100',
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
            VITE_SUPABASE_URL: '',
            VITE_SUPABASE_ANON_KEY: '',
        },
    },
});
