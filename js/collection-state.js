import {normalizeSiteUrl, getView} from './navigation.js';

const positionKey = 'kvnchpl:collection-position';
const returnPrefix = 'kvnchpl:work-return:';

function read(key) {
    try { return JSON.parse(sessionStorage.getItem(key)); }
    catch { return null; }
}
function write(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Ordinary collection links still work when storage is unavailable. */ }
}
function collectionPosition(value, origin) {
    if (!value || !Number.isFinite(value.scrollTop) || value.scrollTop < 0) return null;
    try {
        const url = normalizeSiteUrl(value.url);
        if (url.origin !== origin || url.pathname !== '/' || getView(url) !== 'collection') return null;
        return {url: url.href, scrollTop: value.scrollTop};
    } catch { return null; }
}
const workPath = url => url.pathname.replace(/\.html$/, '').replace(/\/$/, '');

export function saveCollectionPosition(url, scrollTop) {
    const position = collectionPosition({url: String(url), scrollTop}, new URL(url).origin);
    if (position) write(positionKey, position);
    return position;
}
export function readCollectionPosition(url) {
    const current = new URL(url);
    const position = collectionPosition(read(positionKey), current.origin);
    return position?.url === current.href ? position : null;
}
export function saveWorkReturn(workUrl, collectionUrl, scrollTop) {
    const work = new URL(workUrl);
    const position = collectionPosition({url: String(collectionUrl), scrollTop}, work.origin);
    if (position && /^\/0\/[a-z0-9-]+$/.test(workPath(work))) {
        write(returnPrefix + workPath(work), position);
        // The return URL includes the work anchor as a useful storage-free fallback.
        write(positionKey, position);
    }
}
export function readWorkReturn(workUrl) {
    const work = new URL(workUrl);
    return collectionPosition(read(returnPrefix + workPath(work)), work.origin);
}
