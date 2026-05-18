import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        const page = await context.newPage();

        const urls = [
            'https://www.youtube.com/@YouTube/videos',
            'https://www.youtube.com/feed/explore'
        ];

        for (const url of urls) {
            try {
                console.log(`Trying ${url}...`);
                await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
                
                // Detailed measurement
                const results = await page.evaluate(() => {
                    const selectors = ['ytd-rich-grid-media', 'ytd-rich-item-renderer', 'ytd-grid-video-renderer'];
                    let card = null;
                    let selFound = '';
                    
                    for (const s of selectors) {
                        const el = document.querySelector(s);
                        if (el && el.getBoundingClientRect().width > 50) {
                            card = el;
                            selFound = s;
                            break;
                        }
                    }

                    if (!card) return null;

                    const thumb = card.querySelector('ytd-thumbnail, #thumbnail, #content > ytd-thumbnail');
                    const meta = card.querySelector('#details, #meta, .ytd-grid-video-renderer#details');
                    
                    const cardRect = card.getBoundingClientRect();
                    const thumbRect = thumb ? thumb.getBoundingClientRect() : null;
                    const metaRect = meta ? meta.getBoundingClientRect() : null;
                    
                    const thumbStyle = thumb ? window.getComputedStyle(thumb) : null;
                    const imgStyle = thumb?.querySelector('img') ? window.getComputedStyle(thumb.querySelector('img')) : null;

                    return {
                        selector: selFound,
                        card: { w: cardRect.width, h: cardRect.height },
                        thumb: thumbRect ? { w: thumbRect.width, h: thumbRect.height, b: thumbRect.bottom } : null,
                        meta: metaRect ? { h: metaRect.height, t: metaRect.top } : null,
                        radius: thumbStyle?.borderRadius || imgStyle?.borderRadius || 'none'
                    };
                });

                if (results) {
                    console.log('--- DATA ---');
                    console.log(`Selector: ${results.selector}`);
                    console.log(`Card: ${results.card.w.toFixed(1)}x${results.card.h.toFixed(1)}`);
                    if (results.thumb) {
                        console.log(`Thumb: ${results.thumb.w.toFixed(1)}x${results.thumb.h.toFixed(1)}`);
                        console.log(`Ratio: ${(results.thumb.w / results.thumb.h).toFixed(2)}`);
                        console.log(`Radius: ${results.radius}`);
                        if (results.meta) {
                            console.log(`MetaHeight: ${results.meta.h.toFixed(1)}`);
                            console.log(`Gap: ${(results.meta.t - results.thumb.b).toFixed(1)}`);
                        }
                    }
                    break;
                }
            } catch (e) {}
        }
    } finally {
        await browser.close();
    }
})();
