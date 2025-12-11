export const getHostname = (url: string): string | undefined => {
    let hostname: string | undefined;
    try {
        hostname = new URL(url).hostname;
    } catch (e) {
        const match = url.match(/^(?:https?:\/\/)?([^\/:?#]+)(?:[\/:?#]|$)/i);
        hostname = match ? match[1] : undefined;
    }

    return hostname;
}