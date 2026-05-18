import { chromium } from 'playwright';

async function measurePage(browser, url, label) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log(`\n--- Testing URL: ${url} (${label}) ---`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        // Handle Cookie Consent if present
        try {
            const consentBtn = await page.locator('button[aria-label*="Accept"], button[aria-label*="Concordo"], button[aria-label*="Agree"]').first();
            if (await consentBtn.isVisible()) {
                await consentBtn.click();
                await page.waitForTimeout(2000);
            }
        } catch (e) {}

        // Wait for any likely video card
        const cardSelector = 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer';
        await page.waitForSelector(cardSelector, { timeout: 15000 });

        const results = await page.evaluate((sel) => {
            const card = Array.from(document.querySelectorAll(sel)).find(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });

            if (!card) return { error: "No visible card found" };

            const getBox = (s) => {
                const el = card.querySelector(s);
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { w: r.width.toFixed(1), h: r.height.toFixed(1), t: r.top, b: r.bottom };
            };

            const thumbBox = getBox('#thumbnail') || getBox('ytd-thumbnail');
            const detailsBox = getBox('#details') || getBox('#meta');
            const dismissibleBox = getBox('#dismissible');
            
            const thumbEl = card.querySelector('#thumbnail') || card.querySelector('ytd-thumbnail');
            const borderRadius = thumbEl ? window.getComputedStyle(thumbEl).borderRadius : 'n/a';
            const cardRadius = window.getComputedStyle(card).borderRadius;

            return {
                tag: card.tagName,
                card: getBox(''),
                dismissible: dismissibleBox,
                thumbnail: thumbBox,
                details: detailsBox,
                avatar: getBox('#avatar-link'),
                title: getBox('#video-title'),
                metadata: getBox('#metadata-line'),
                gapThumbDetails: (thumbBox && detailsBox) ? (detailsBox.t - thumbBox.b).toFixed(1) : 'n/a',
                styles: { thumbRadius: borderRadius, cardRadius: cardRadius }
            };
        }, cardSelector);

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.log(`Failed to measure ${label}: ${err.message}`);
    } finally {
        await page.close();
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        await measurePage(browser, 'https://www.youtube.com/', 'Home');
        await measurePage(browser, 'https://www.youtube.com/feed/trending', 'Trending (Explore)');
        await measurePage(browser, 'https://www.youtube.com/@YouTube/videos', 'Channel Videos');
    } finally {
        await browser.close();
    }
})();
