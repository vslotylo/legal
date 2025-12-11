import * as fs from 'fs';
import * as readline from 'readline';
import { FindLawProfileModel } from '../../db/db';
import { getHostname } from '../../utils/url';

const OUTPUT_FILE = 'output.csv';
const BATCH_SIZE = 1000;

interface LawyerData {
    name: string;
    city: string;
    state: string;
    website: string;
    hostname: string;
}

async function processFile() {

    const fileStream = fs.createReadStream(OUTPUT_FILE);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    let lawyers: LawyerData[] = [];

    console.log('Starting processing...');

    for await (const line of rl) {
        if (line.startsWith('"Name","State","Website"') || !line.trim()) {
            continue;
        }

        try {
            const parts = line.match(/^"(.*?)","(.*?)"$/);

            if (parts && parts.length === 3) {
                const infoPart = parts[1];
                const website = parts[2];

                const hostname = getHostname(website);
                const lastDashIndex = infoPart.lastIndexOf(' - ');
                let data: LawyerData;
                if (lastDashIndex !== -1) {
                    const name = infoPart.substring(0, lastDashIndex).trim();
                    const locationPart = infoPart.substring(lastDashIndex + 3).trim();

                    const commaIndex = locationPart.lastIndexOf(', ');
                    let city = locationPart;
                    let state = '';

                    if (commaIndex !== -1) {
                        city = locationPart.substring(0, commaIndex).trim();
                        state = locationPart.substring(commaIndex + 2).trim();
                    }

                    data = {
                        name,
                        city,
                        state,
                        website,
                        hostname: hostname?.replace('www.', '')
                    };
                    lawyers.push(data);
                } else {
                    console.log(`Invalid data: ${line}`);
                }
            }
        } catch (e) {
            console.error('Error parsing line:', line, e);
        }

        if (lawyers.length >= BATCH_SIZE) {
            await FindLawProfileModel.insertMany(lawyers);
            count += lawyers.length;
            console.log(`Imported ${count} records...`);
            lawyers = [];
        }
    }

    if (lawyers.length > 0) {
        await FindLawProfileModel.insertMany(lawyers);
        count += lawyers.length;
        console.log(`Imported ${count} records...`);
    }

    console.log('Import finished.');
    process.exit(0);
}

processFile();
