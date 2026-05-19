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
            if (!card) return { error: "No card found" };

            // New View Model selectors
            const thumb = card.querySelector('.ytLockupViewModelContentImage, yt-thumbnail-view-model');
            const metadata = card.querySelector('.ytLockupViewModelContentMetadata');
            const title = card.querySelector('.ytLockupViewModelContentMetadataEntityTitle');
            const details = card.querySelector('.yt-lockup-view-model-wiz__metadata-at-bottom');

            const getBox = (el) => {
                if (!el) return null;
                const r = el.getBoundingClientRect();
                return { tag: el.tagName, class: el.className, w: r.width.toFixed(1), h: r.height.toFixed(1), top: r.top, bottom: r.bottom };
            };

            const tBox = getBox(thumb);
            const mBox = getBox(metadata);

            return {
                cardTag: card.tagName,
                thumbnail: tBox,
                metadata: mBox,
                title: getBox(title),
                bottomDetails: getBox(details),
                gap: (tBox && mBox) ? (mBox.top - tBox.bottom).toFixed(1) : 'n/a',
                thumbRadius: thumb ? window.getComputedStyle(thumb).borderRadius : 'n/a'
            };
        });

        console.log(JSON.stringify(results, null, 2));
    } catch (err) {
        console.log("Error: " + err.message);
    } finally {
        await browser.close();
    }
})();
