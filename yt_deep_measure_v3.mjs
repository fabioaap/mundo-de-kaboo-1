import { chromium } from 'playwright';

async function measurePage(browser, url, label) {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log(`\n--- Testing URL: ${url} (${label}) ---`);
    try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
        
        // Wait for potential redirect or slow load
        await page.waitForTimeout(5000);

        const results = await page.evaluate(() => {
            const card = document.querySelector('ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer');
            if (!card) return { error: "No card found" };

            const getBox = (s) => {
                const el = s.startsWith('.') || s.startsWith('#') ? card.querySelector(s) : card.getElementsByTagName(s)[0];
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { tag: el.tagName, w: r.width.toFixed(1), h: r.height.toFixed(1), t: r.top.toFixed(1), b: r.bottom.toFixed(1) };
            };

            // Recursively find elements because of potential Shadow DOM or complex nesting
            const findDeep = (root, selector) => {
                let el = root.querySelector(selector);
                if (el) return el;
                if (root.shadowRoot) return findDeep(root.shadowRoot, selector);
                for (const child of root.children) {
                    const found = findDeep(child, selector);
                    if (found) return found;
                }
                return null;
            };

            const thumb = findDeep(card, 'ytd-thumbnail');
            const details = findDeep(card, '#details');
            const title = findDeep(card, '#video-title');
            const meta = findDeep(card, '#metadata-line');
            const avatar = findDeep(card, '#avatar-link');

            const getDeepBox = (el) => {
                 if (!el) return null;
                 const r = el.getBoundingClientRect();
                 return { tag: el.tagName, w: r.width.toFixed(1), h: r.height.toFixed(1), t: r.top.toFixed(1), b: r.bottom.toFixed(1) };
            };

            const tBox = getDeepBox(thumb);
            const dBox = getDeepBox(details);

            return {
                cardTag: card.tagName,
                thumbnail: tBox,
                details: dBox,
                title: getDeepBox(title),
                metadata: getDeepBox(meta),
                avatar: getDeepBox(avatar),
                gap: (tBox && dBox) ? (parseFloat(dBox.t) - parseFloat(tBox.b)).toFixed(1) : 'n/a',
                thumbRadius: thumb ? window.getComputedStyle(thumb).borderRadius : 'n/a'
            };
        });

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.log(`Failed: ${err.message}`);
    } finally {
        await page.close();
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        await measurePage(browser, 'https://www.youtube.com/@YouTube/videos', 'Channel');
    } finally {
        await browser.close();
    }
})();
