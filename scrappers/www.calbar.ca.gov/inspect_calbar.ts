import puppeteer from 'puppeteer';
import * as fs from 'fs';

async function inspect() {
    const browser = await puppeteer.launch({
        headless: true, // or "new"
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    try {
        await page.goto('https://apps.calbar.ca.gov/attorney/Licensee/Detail/190000', { waitUntil: 'domcontentloaded' });
        const content = await page.content();
        fs.writeFileSync('calbar_sample.html', content);
        console.log('Saved calbar_sample.html');
    } catch (err) {
        console.error(err);
    } finally {
        await browser.close();
    }
}

inspect();
