export const getHostname = (url: string): string => {
    let hostname: string;
    try {
        hostname = new URL(url).hostname;
    } catch (e) {
        console.error(`Error parsing URL: ${url}`);
        const match = url.match(/^(?:https?:\/\/)?([^\/:?#]+)(?:[\/:?#]|$)/i);
        hostname = match ? match[1] : url;
        console.error(`Error parsing URL: ${url}, hostname: ${hostname}`);
    }

    return hostname;
}