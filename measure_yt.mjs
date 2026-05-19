import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        const urls = [
            'https://www.youtube.com/',
            'https://www.youtube.com/feed/explore',
            'https://www.youtube.com/@YouTube/videos'
        ];

        let success = false;
        for (const url of urls) {
            try {
                console.log(`Trying ${url}...`);
                await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                
                // Handle consent
                const consentButtons = [
                    'button:has-text("Accept all")',
                    'button:has-text("Aceitar tudo")',
                    'button:has-text("I agree")',
                    'button:has-text("Agree to all")',
                    '#yDmH0d button[aria-label*="Accept"]',
                    '[aria-label="Accept all"]'
                ];
                for (const selector of consentButtons) {
                    if (await page.locator(selector).isVisible()) {
                        await page.click(selector);
                        await page.waitForLoadState('networkidle');
                        break;
                    }
                }

                await page.evaluate(() => window.scrollBy(0, 1000));
                await page.waitForTimeout(3000);

                const selectors = ['ytd-rich-item-renderer', 'ytd-rich-grid-media', 'ytd-grid-video-renderer'];
                let foundSelector = null;
                for (const sel of selectors) {
                    const count = await page.locator(sel).count();
                    if (count > 0) {
                        foundSelector = sel;
                        break;
                    }
                }

                if (foundSelector) {
                    const results = await page.evaluate((sel) => {
                        const card = document.querySelector(sel);
                        if (!card) return null;

                        const thumb = card.querySelector('ytd-thumbnail, #thumbnail');
                        const thumbImg = thumb?.querySelector('img');
                        const metadata = card.querySelector('#details, #meta');
                        
                        const cardRect = card.getBoundingClientRect();
                        const thumbRect = thumb?.getBoundingClientRect();
                        const metaRect = metadata?.getBoundingClientRect();

                        const thumbStyle = window.getComputedStyle(thumb || card);

                        return {
                            selector: sel,
                            card: { width: cardRect.width, height: cardRect.height },
                            thumb: thumbRect ? { width: thumbRect.width, height: thumbRect.height } : null,
                            meta: metaRect ? { width: metaRect.width, height: metaRect.height, top: metaRect.top } : null,
                            thumbBottom: thumbRect ? thumbRect.bottom : 0,
                            borderRadius: thumbStyle.borderRadius
                        };
                    }, foundSelector);

                    if (results && results.card.width > 0) {
                        console.log('--- MEASUREMENTS ---');
                        console.log(`Selector: ${results.selector}`);
                        console.log(`Card: ${results.card.width.toFixed(1)}x${results.card.height.toFixed(1)}`);
                        if (results.thumb) {
                            console.log(`Thumbnail: ${results.thumb.width.toFixed(1)}x${results.thumb.height.toFixed(1)}`);
                            console.log(`Aspect Ratio: ${(results.thumb.width / results.thumb.height).toFixed(2)}`);
                            if (results.meta) {
                                console.log(`Text Block Height: ${results.meta.height.toFixed(1)}`);
                                console.log(`Spacing (Thumb-Text): ${(results.meta.top - results.thumbBottom).toFixed(1)}`);
                            }
                            console.log(`Border Radius: ${results.borderRadius}`);
                        }
                        success = true;
                        break;
                    }
                }
            } catch (e) {
                console.log(`Failed ${url}: ${e.message}`);
            }
        }
    } finally {
        await browser.close();
    }
})();
