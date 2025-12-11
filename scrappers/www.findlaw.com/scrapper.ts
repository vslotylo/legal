import puppeteer, { Browser, Page } from 'puppeteer';
import * as fs from 'fs';

const BASE_URL = 'https://lawyers.findlaw.com/profile/lawyer';
const OUTPUT_FILE = 'output.csv';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ProfileData {
    name: string;
    website: string;
}

interface ProfileLink {
    url: string;
    profile: string;
}

async function scrapeProfile(browser: Browser, profileUrl: string): Promise<ProfileData | null> {
    const page: Page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // 1. Name
        const name = await page.$eval('h1', el => (el as HTMLElement).innerText.trim()).catch(() => '');

        // 3. Website
        const website = await page.$eval('.profile-website-header', el => (el as HTMLAnchorElement).href).catch(() => '');

        return { name, website };
    } catch (error: any) {
        console.error(`Error scraping profile ${profileUrl}: ${error.message}`);
        return null;
    } finally {
        await page.close();
    }
}

const retryDelay = 5 * 60 * 1000;
let retries = 0;

async function scrapeListingPage(browser: Browser, letter: string, pageNumber: number): Promise<boolean> {
    const url = `${BASE_URL}/${letter}/${pageNumber}.html`;
    console.log(`Scraping listing page: ${url}`);

    const page: Page = await browser.newPage();
    try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const profileLinks: ProfileLink[] = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('#main-content > section.fl-profiles.fl-container > div.fl-profiles-list-wrapper > ol > li > div.fl-profiles-list-header > a')).map(
                o => ({
                    url: (o as HTMLAnchorElement).href,
                    profile: (o as HTMLElement).innerText // outerText is non-standard, innerText is better
                })
            );
        });

        console.log(JSON.stringify(profileLinks))

        console.log(`Found ${profileLinks.length} profiles on page ${pageNumber} for letter ${letter.toUpperCase()}`);
        await page.close();

        for (const item of profileLinks) {
            const link = item.url;
            console.log(`Scraping profile: ${link}`);
            if (link === url) continue;

            await sleep(50);
            const data = await scrapeProfile(browser, link);

            if (data && data.website) {
                const csvLine = `"${data.name}","${data.website}"\n`;

                try {
                    fs.appendFileSync(OUTPUT_FILE, csvLine);
                } catch (err: any) {
                    console.error(`Failed to write to file: ${err.message}`);
                }
            }
        }

        return profileLinks.length > 0;
    } catch (error: any) {
        console.error(`Error scraping listing page ${url}: ${error.message}. Retrying in 5 minutes...`);
        if (!page.isClosed()) await page.close();
        retries++;
        await sleep(retryDelay * retries);
        if (retries > 5) {
            console.error(`Failed to scrape listing page ${url} after 5 retries. Skipping...`);
            retries = 0;
            return false;
        }
        return await scrapeListingPage(browser, letter, pageNumber);
    } finally {
        if (page && !page.isClosed()) {
            await page.close();
        }
    }
}

async function main() {
    console.log('Starting scraper (Puppeteer)...');
    // Write CSV Header if file doesn't exist or is empty
    if (!fs.existsSync(OUTPUT_FILE) || fs.statSync(OUTPUT_FILE).size === 0) {
        fs.writeFileSync(OUTPUT_FILE, '"Name","State","Website"\n');
        console.log(`Initialized ${OUTPUT_FILE} with headers.`);
    }

    const browser: Browser = await puppeteer.launch({
        headless: true, // "new"
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const alphabet = 'pqrstuvwxyz'.split('');

        for (const letter of alphabet) {
            console.log(`\n--- Starting Letter: ${letter.toUpperCase()} ---`);
            let pageNum = 9;
            if (letter === 'p') {
                pageNum = 9;
            }
            while (true) {
                const hasProfiles = await scrapeListingPage(browser, letter, pageNum);
                if (!hasProfiles) {
                    console.log(`No more profiles found for letter ${letter.toUpperCase()}. Moving to next letter.`);
                    break;
                }
                pageNum++;
            }
        }
    } finally {
        await browser.close();
        console.log('Done!');
    }
}

main();
