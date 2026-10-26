// Keep the existing Each All service and its credentials in its own project.
// A regular fetch is needed: Netlify's internal rewrites retain browser Origin.
const target = 'https://each-all.netlify.app/.netlify/functions/submitImage';
const maxBytes = 300 * 1024;

export default async function submitImageProxy(request) {
    const origin = new URL(request.url).origin;
    const caller = request.headers.get('origin');
    const headers = {'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin'};
    const json = (status, error) => new Response(JSON.stringify({error}), {status, headers});
    // Preserve the service's browser-origin restriction. This is not an open proxy.
    if (caller && caller !== origin) return json(403, 'Origin is not allowed.');
    if (caller) headers['Access-Control-Allow-Origin'] = origin;
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: {
        ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type'
    }});
    if (request.method !== 'POST') return new Response(JSON.stringify({error: 'Use POST to submit an image.'}), {
        status: 405, headers: {...headers, Allow: 'POST, OPTIONS'}
    });
    if (Number(request.headers.get('content-length')) > maxBytes) return json(413, 'The submission is too large.');
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maxBytes) return json(413, 'The submission is too large.');
    try {
        const response = await fetch(target, {
            method: 'POST',
            headers: {'Content-Type': 'application/json', Origin: 'https://kvnchpl.com'},
            body,
            redirect: 'error',
            signal: AbortSignal.timeout(25000)
        });
        return new Response(response.body, {status: response.status, headers});
    } catch {
        return json(503, 'Submissions are temporarily unavailable. Please try again; your form has been kept.');
    }
}
