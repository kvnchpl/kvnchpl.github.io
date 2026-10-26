// Keep the book club on its existing, independently published GitHub Pages site.
// TLS still verifies kvnchpl.github.io; GitHub selects the site via the Host header.
import {request as httpsRequest} from 'node:https';

const prefix = '/homestuck-book-club';
const responseHeaders = ['content-type', 'cache-control', 'etag', 'last-modified', 'accept-ranges', 'content-range'];

export async function proxyBookClub(request, transport = httpsRequest) {
    const url = new URL(request.url);
    const headers = new Headers();
    if (url.hostname !== 'kvnchpl.com') headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return new Response('Not found', {status: 404, headers});
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405, headers});
    if (url.pathname === prefix) {
        headers.set('Location', `${prefix}/${url.search}`);
        return new Response(null, {status: 301, headers});
    }
    try {
        const upstreamHeaders = {Host: 'kvnchpl.com', 'Accept-Encoding': 'identity'};
        for (const name of ['if-none-match', 'if-modified-since', 'range']) {
            if (request.headers.has(name)) upstreamHeaders[name] = request.headers.get(name);
        }
        const upstream = await new Promise((resolve, reject) => {
            const connection = transport({
                hostname: 'kvnchpl.github.io', servername: 'kvnchpl.github.io', port: 443,
                path: url.pathname + url.search, method: request.method,
                headers: upstreamHeaders, signal: AbortSignal.timeout(25000)
            }, resolve);
            connection.on('error', reject);
            connection.end();
        });
        for (const name of responseHeaders) {
            if (upstream.headers[name]) headers.set(name, upstream.headers[name]);
        }
        if (upstream.headers.location) {
            const destination = new URL(upstream.headers.location, `https://kvnchpl.com${url.pathname}`);
            if (destination.origin !== 'https://kvnchpl.com' || !destination.pathname.startsWith(`${prefix}/`)) throw new Error('Unexpected origin redirect');
            headers.set('Location', destination.pathname + destination.search + destination.hash);
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of upstream) {
            size += chunk.length;
            if (size > 32 * 1024 * 1024) { upstream.destroy(); throw new Error('Oversized upstream response'); }
            chunks.push(chunk);
        }
        const status = upstream.statusCode;
        const body = request.method === 'HEAD' || [204, 304].includes(status) ? null : Buffer.concat(chunks);
        return new Response(body, {status, headers});
    } catch {
        headers.set('Cache-Control', 'no-store');
        return new Response('Book club temporarily unavailable.', {status: 502, headers});
    }
}

export default function handler(request) {
    return proxyBookClub(request);
}
