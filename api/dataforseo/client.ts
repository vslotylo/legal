import * as client from 'dataforseo-client'
import config from './config';

async function main() {

    const token = config.token;

    const authFetch = createAuthenticatedFetch(token);
    let serpApi = new client.SerpApi("https://api.dataforseo.com", { fetch: authFetch });

    let task = new client.SerpGoogleOrganicLiveAdvancedRequestInfo();
    task.location_code = 2840;
    task.language_code = "en";
    task.keyword = "albert einstein"

    let resp = await serpApi.googleOrganicLiveAdvanced([task]);
}

function createAuthenticatedFetch(token: string) {
    return (url: RequestInfo, init?: RequestInit): Promise<Response> => {
        const authHeader = { 'Authorization': `Bearer ${token}` };

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

main();