import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    try {
        await page.goto('https://www.youtube.com/@YouTube/videos', { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForTimeout(5000);

        const results = await page.evaluate(() => {
            const card = document.querySelector('ytd-rich-item-renderer');
            if (!card) return { error: "No ytd-rich-item-renderer found" };

            // Helper to get ALL IDs inside the card to see what exists
            const allElements = Array.from(card.querySelectorAll('*'));
            const elementsWithId = allElements.filter(el => el.id).map(el => ({ tag: el.tagName, id: el.id, visible: el.offsetWidth > 0 }));
            
            // Try to find the thumbnail manually by looking for image containers
            const imgContainer = card.querySelector('a#thumbnail, .ytd-thumbnail');
            const details = card.querySelector('#details, #meta');
            
            const getBox = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { tag: el.tagName, w: r.width, h: r.height, top: r.top, bottom: r.bottom };
            };

            const tBox = getBox(imgContainer);
            const dBox = getBox(details);

            return {
                cardHtml: card.innerHTML.substring(0, 1000), // Peek at structure
                foundIds: elementsWithId,
                thumbnail: tBox,
                details: dBox,
                gap: (tBox && dBox) ? (dBox.top - tBox.bottom) : 'n/a'
            };
        });

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.log("Error: " + err.message);
    } finally {
        await browser.close();
    }
})();
