import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    const warnings = [];

    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
        if (msg.type() === 'warning') warnings.push(msg.text());
    });

    page.on('pageerror', err => {
        errors.push(err.message);
    });

    try {
        await page.goto('http://127.0.0.1:4100', { timeout: 10000 });
        await new Promise(r => setTimeout(r, 3000));
        
        const screenshotDir = 'test-results/qa-jtbd';
        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }
        const screenshotPath = path.join(screenshotDir, 'app-overview.png');
        await page.screenshot({ path: screenshotPath });

        const result = {
            screenshot_path: screenshotPath,
            console_errors: errors,
            console_warnings: warnings,
            app_status: errors.length > 0 ? "ERROR" : "OK"
        };

        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.log(JSON.stringify({
            screenshot_path: null,
            console_errors: [e.message, ...errors],
            console_warnings: warnings,
            app_status: "ERROR"
        }, null, 2));
    } finally {
        await browser.close();
    }
})();
