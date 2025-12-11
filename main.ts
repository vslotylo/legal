import mongoose from 'mongoose';
import { BulkTrafficEstimationItemModel, FindLawProfileGroupedModel } from './db/db';
import config from './api/dataforseo/config';
import { getHostname } from './utils/url';
import * as client from 'dataforseo-client';

async function main() {
    const BATCH_SIZE = 200;
    let batch: string[] = [];
    let count = 0;

    console.log('Initializing DataForSEO client...');

    const authFetch = createAuthenticatedFetch(config.token);
    const labsApi = new client.DataforseoLabsApi("https://api.dataforseo.com", { fetch: authFetch });

    console.log('Reading from Database...');

    let cursor = await FindLawProfileGroupedModel.find({}).sort({ count: -1 }).limit(BATCH_SIZE).skip(0);

    for (let doc of cursor) {
        if (doc.hostname) {
            batch.push(doc.hostname as string);
            count++;
        }

        if (batch.length >= BATCH_SIZE) {
            await processBatch(client, labsApi, batch);
            batch = [];
        }
    }

    // Process remaining
    if (batch.length > 0) {
        await processBatch(client, labsApi, batch);
    }

    console.log(`Processed total ${count} records.`);
    console.log('All batches processed.');
    await mongoose.disconnect();
    console.log('Database connection closed.');
}

async function processBatch(client: any, labsApi: any, targets: string[]) {
    console.log(`Processing batch of ${targets.length} URLs...`);
    const requestInfo = new client.DataforseoLabsGoogleBulkTrafficEstimationLiveRequestInfo();
    requestInfo.targets = targets;
    requestInfo.location_code = 2840; // US
    requestInfo.language_code = "en";

    try {
        const response = await labsApi.googleBulkTrafficEstimationLive([requestInfo]);

        if (response && response.tasks && response.tasks.length > 0) {
            const task = response.tasks[0];
            if (task.result && task.result.length > 0) {
                const result = task.result[0];
                console.log(`Available Result Items: ${result.items_count}`);

                if (result.items) {
                    console.log(`Saving ${result.items.length} items to database...`);
                    result.items.forEach(item => {
                        if (item.target) {
                            const hostname = getHostname(item.target);
                            if (hostname) item.target = hostname;
                        }
                    });

                    if (result.items.length > 0) {
                        await BulkTrafficEstimationItemModel.insertMany(result.items);
                        console.log('Data saved successfully.');
                    }

                    for (const item of result.items) {
                        const metrics = item.metrics?.organic;
                        // console.log(`Target: ${item.target}, Keywords: ${metrics?.count}`);
                    }
                }
            } else {
                console.log('No results in task.');
                if (task.status_message) console.log('Status:', task.status_message);
            }
        } else {
            console.log('Empty response or no tasks.');
        }

    } catch (error) {
        console.error('Error calling DataForSEO:', error);
    }
}

function createAuthenticatedFetch(token: string | undefined) {
    return (url: RequestInfo, init?: RequestInit): Promise<Response> => {
        // Fallback or error if token undefined?
        const authHeader = { 'Authorization': `Basic ${token}` };

        const newInit: RequestInit = {
            ...init,
            headers: {
                ...init?.headers,
                ...authHeader
            }
        };

        return fetch(url, newInit);
    };
}

// Execute
main().catch(err => console.error(err));
