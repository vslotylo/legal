import puppeteer, { Browser, Page, HTTPRequest, HTTPResponse } from 'puppeteer';
import * as fs from 'fs';

const OUTPUT_FILE = 'calbar_lawyers.csv';
const START_ID = 1;

// Helper sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface LawyerData {
    name: string;
    city: string;
    state: string;
    status: string;
    website: string;
    email: string;
}

async function scrapeCalBar() {
    console.log('Starting CalBar Scraper...');

    // Initialize output file if needed
    if (!fs.existsSync(OUTPUT_FILE)) {
        fs.writeFileSync(OUTPUT_FILE, '"Name","City","State","Status","Website","Email"\n');
    }

    const browser: Browser = await puppeteer.launch({
        headless: true, // "new" is deprecated, but valid in recent versions. Using boolean true/false or "new" depends on version. types suggest boolean or "new" might be valid but let's stick to type safe.
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page: Page = await browser.newPage();

    // Optimize page loading
    await page.setRequestInterception(true);
    page.on('request', (req: HTTPRequest) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
            req.abort();
        } else {
            req.continue();
        }
    });

    let id = START_ID;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 50; // Use a high buffer for gaps in IDs

    try {
        while (true) {
            const url = `https://apps.calbar.ca.gov/attorney/Licensee/Detail/${id}`;
            // console.log(`Checking ID: ${id}`); // Verbose logging

            try {
                const response: HTTPResponse | null = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

                if (!response || response.status() === 404) {
                    console.log(`ID ${id}: 404 Not Found.`);
                    consecutiveFailures++;
                } else {
                    const data: LawyerData | null = await page.evaluate(() => {
                        const container = document.querySelector('#moduleMemberDetail') as HTMLElement;
                        if (!container) return null;

                        // Name
                        // Typically in h3 > b, text like "Name #ID"
                        // Or look for text containing "#"
                        let name = '';
                        const headers = Array.from(container.querySelectorAll('h3 > b'));
                        for (const h of headers) {
                            const el = h as HTMLElement;
                            // console.log(el.innerText);
                            if (el.innerText.includes('#')) {
                                name = el.innerText.replace(/#\d+/, '').trim();
                                break;
                            }
                        }
                        // Use document title if name not found in h3
                        if (!name) {
                            name = document.title.split('-')[0].trim();
                            if (name === 'Attorney Licensee Search') name = '';
                        }

                        if (!name) return null;

                        // Status
                        let status = '';
                        const statusLabel = Array.from(container.querySelectorAll('b')).find(el => (el as HTMLElement).innerText.includes('License Status:'));
                        if (statusLabel) {
                            const span = statusLabel.querySelector('span');
                            if (span) {
                                status = span.innerText.trim();
                            } else {
                                status = (statusLabel as HTMLElement).innerText.replace('License Status:', '').trim();
                            }
                        }

                        // Address (City/State)
                        let address = '';
                        const paragraphs = container.querySelectorAll('p');
                        for (const p of paragraphs) {
                            const el = p as HTMLElement;
                            if (el.innerText.includes('Address:')) {
                                address = el.innerText.replace('Address:', '').trim();
                                break;
                            }
                        }

                        let city = '';
                        let state = '';
                        if (address) {
                            // Address format often: "Street, City, ST ZIP"
                            // Parse simple comma separation
                            const parts = address.split(',');
                            if (parts.length >= 2) {
                                // Assume last part is "ST ZIP" or "Country"
                                const stateZip = parts[parts.length - 1].trim();
                                const stateMatch = stateZip.match(/^([A-Z]{2})/); // Basic 2-letter state check
                                if (stateMatch) {
                                    state = stateMatch[1];
                                }
                                city = parts[parts.length - 2].trim();
                            } else {
                                city = address; // Fallback
                            }
                        }

                        // Website
                        let website = '';
                        for (const p of paragraphs) {
                            const el = p as HTMLElement;
                            if (el.innerText.includes('Website:')) {
                                const a = el.querySelector('a');
                                if (a) {
                                    website = a.href;
                                } else {
                                    const text = el.innerText.replace('Website:', '').trim();
                                    if (text !== 'Not Available') {
                                        website = text;
                                    }
                                }
                                break;
                            }
                        }

                        // Email (Handle Obfuscation)
                        let email = '';
                        for (const p of paragraphs) {
                            const el = p as HTMLElement;
                            if (el.innerText.includes('Email:')) {
                                const spans = el.querySelectorAll('span[id^="e"]');
                                for (const span of spans) {
                                    // Check visibility logic: styles are often in a style tag, 
                                    // but we can check computed style or if display is not none

                                    // Note: getComputedStyle might not work perfectly inside Puppeteer evaluate if not attached or specific context
                                    const style = window.getComputedStyle(span);
                                    if (style.display !== 'none') {
                                        const a = span.querySelector('a');
                                        if (a) {
                                            email = a.innerText.trim();
                                            break;
                                        }
                                    }
                                }
                                break;
                            }
                        }

                        return { name, city, state, status, website, email };
                    });

                    if (data) {
                        console.log(`Found ID ${id}: ${data.name} | ${data.email} | ${data.status}`);
                        const csvLine = `"${data.name}","${data.city}","${data.state}","${data.status}","${data.website}","${data.email}"\n`;
                        fs.appendFileSync(OUTPUT_FILE, csvLine);
                        consecutiveFailures = 0;
                    } else {
                        console.log(`ID ${id}: Empty/Invalid profile.`);
                        consecutiveFailures++;
                    }
                }
            } catch (err: any) {
                console.error(`Error processing ID ${id}: ${err.message}`);
                consecutiveFailures++;
            }

            if (consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
                // Determine if we should really stop or just skip gaps
                // CalBar might have large gaps. For now, we'll continue a bit more conservatively or just accept the gap.
                // But usually, we don't want to run forever if we hit the end.
                // If we're starting from 1, there might be gaps.
                if (id > 200000 && consecutiveFailures > 1000) {
                    // Heuristic break
                    console.log('Too many consecutive failures after ID 200000. Stopping.');
                    break;
                }
            }

            id++;
            await sleep(100); // Small delay to be polite
        }
    } finally {
        await browser.close();
    }
}

scrapeCalBar();
