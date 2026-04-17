import puppeteer from 'puppeteer';

const guia = '34140081480';
const url = `https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${guia}`;

(async () => {
    console.log(`Testing Coordinadora tracking for guide: ${guia}`);
    console.log(`URL: ${url}`);
    
    const browser = await puppeteer.launch({
        headless: false, // Show browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        
        console.log('Navigating to page...');
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        console.log('Page loaded, waiting 5 seconds for content...');
        await page.waitForTimeout(5000);
        
        // Take a screenshot
        await page.screenshot({ path: 'debug_coordinadora_screenshot.png', fullPage: true });
        console.log('Screenshot saved to debug_coordinadora_screenshot.png');
        
        // Try to find elements
        console.log('\nLooking for .detail.active elements...');
        const detailActive = await page.$$('.detail.active');
        console.log(`Found ${detailActive.length} .detail.active elements`);
        
        console.log('\nLooking for .detail elements...');
        const detail = await page.$$('.detail');
        console.log(`Found ${detail.length} .detail elements`);
        
        // Get page HTML to inspect
        const bodyHTML = await page.evaluate(() => document.body.innerHTML);
        console.log('\nSearching for "detail" in HTML...');
        const detailMatches = bodyHTML.match(/class="[^"]*detail[^"]*"/g);
        if (detailMatches) {
            console.log('Found detail classes:', detailMatches.slice(0, 10));
        }
        
        // Try alternative selectors
        console.log('\nTrying alternative selectors...');
        const alternatives = [
            '[class*="detail"]',
            '[class*="tracking"]',
            '[class*="estado"]',
            '[class*="rastreo"]'
        ];
        
        for (const selector of alternatives) {
            const elements = await page.$$(selector);
            console.log(`${selector}: ${elements.length} elements`);
        }
        
        console.log('\nPress Ctrl+C to close browser...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await browser.close();
    }
})();
