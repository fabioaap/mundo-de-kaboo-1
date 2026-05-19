import { chromium } from 'playwright';

async function measurePage(browser, url, label) {
    const page = await browser.newPage();
    // User agent to avoid some bot detection/mobile redirects
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log(`\n--- Testing URL: ${url} (${label}) ---`);
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        
        // Brief wait for dynamic content
        await page.waitForTimeout(5000);

        const results = await page.evaluate(() => {
            // Broad search for any element that looks like a video container
            const possible = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-compact-video-renderer');
            const card = Array.from(possible).find(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 20 && rect.height > 20;
            });

            if (!card) {
                // Return debug info if nothing found
                return { error: "No visible card found", htmlSnippet: document.body.innerHTML.substring(0, 500) };
            }

            const getBox = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { w: r.width.toFixed(1), h: r.height.toFixed(1), t: r.top, b: r.bottom };
            };

            const thumb = card.querySelector('#thumbnail, ytd-thumbnail, .ytd-thumbnail');
            const details = card.querySelector('#details, #meta, .ytd-rich-grid-media #details');
            const dismissible = card.querySelector('#dismissible');
            const title = card.querySelector('#video-title, #video-title-link');
            const avatar = card.querySelector('#avatar-link, #avatar');
            const metaLine = card.querySelector('#metadata-line');

            return {
                tag: card.tagName,
                cardBox: { w: card.offsetWidth, h: card.offsetHeight },
                dismissible: getBox(dismissible),
                thumbnail: getBox(thumb),
                details: getBox(details),
                avatar: getBox(avatar),
                title: getBox(title),
                metadata: getBox(metaLine),
                gapThumbDetails: (thumb && details) ? (details.getBoundingClientRect().top - thumb.getBoundingClientRect().bottom).toFixed(1) : 'n/a',
                styles: { 
                    thumbRadius: thumb ? window.getComputedStyle(thumb).borderRadius : 'n/a',
                    cardRadius: window.getComputedStyle(card).borderRadius
                }
            };
        });

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.log(`Failed to measure ${label}: ${err.message}`);
    } finally {
        await page.close();
    }
}

(async () => {
    // Launch with headful mode or specific args if needed, but keeping headless for speed
    const browser = await chromium.launch({ headless: true });
    try {
        // Try the channel page first as it usually has a stable grid
        await measurePage(browser, 'https://www.youtube.com/@YouTube/videos', 'Channel Videos');
        await measurePage(browser, 'https://www.youtube.com/', 'Home');
    } finally {
        await browser.close();
    }
})();
