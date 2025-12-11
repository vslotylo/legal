import mongoose from 'mongoose';
import { BulkTrafficEstimationItemModel, FindLawProfileGroupedModel } from './db/db';
import config from './api/dataforseo/config';
import { getHostname } from './utils/url';
import * as client from 'dataforseo-client';

async function main() {
    const BATCH_SIZE = 200;
    let batch: string[] = [];

    console.log('Initializing DataForSEO client...');

    const authFetch = createAuthenticatedFetch(config.token);
    const labsApi = new client.DataforseoLabsApi("https://api.dataforseo.com", { fetch: authFetch });

    console.log('Reading from Database...');

    let traficEstimations = await BulkTrafficEstimationItemModel.find({});

    let offset = 0;
    let docs = await FindLawProfileGroupedModel.find({}).sort({ count: -1 }).limit(BATCH_SIZE).skip(offset);
    console.log(`Found ${docs.length} documents.`);
    while (true) {

        for (let doc of docs) {
            if (doc.hostname && !traficEstimations.some(estimation => estimation.target === doc.hostname)) {
                batch.push(doc.hostname as string);
            }

            if (batch.length === BATCH_SIZE) {
                await processBatch(labsApi, batch);
                traficEstimations = await BulkTrafficEstimationItemModel.find({});
                batch = [];
            }
        }

        offset += docs.length;

        docs = await FindLawProfileGroupedModel.find({}).sort({ count: -1 }).limit(BATCH_SIZE).skip(offset);
        console.log(`Found ${docs.length} documents.`);

        if (docs.length === 0) {
            if (batch.length > 0) {
                await processBatch(labsApi, batch);
            }
            break;
        }
    }

    console.log(`Processed ${batch.length} records.`);
    console.log('Batch processing completed.');
    await mongoose.disconnect();
    console.log('Database connection closed.');
}

async function processBatch(labsApi: client.DataforseoLabsApi, targets: string[]) {
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
                            if (hostname) item.target = hostname.replace('www.', '');
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
