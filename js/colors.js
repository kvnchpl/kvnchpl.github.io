const initializedPalettes = new WeakMap();
const paletteViews = new Set();
const storageKey = 'kvn-color-composition';
const allowedColors = new Set(['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#00ffff', '#ff00ff', '#ffff00']);

function parseColorState(value) {
    if (!Array.isArray(value) || value.length < 1 || value.length > 8) return null;
    const restored = new Map();
    for (const rectangle of value) {
        if (!Array.isArray(rectangle) || rectangle.length !== 5) return null;
        const [color, x, y, width, height] = rectangle;
        if (!allowedColors.has(color) || restored.has(color) || ![x, y, width, height].every(Number.isFinite)
            || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 100.001 || y + height > 100.001) return null;
        restored.set(color, [x, y, width, height]);
    }
    return restored;
}
function readColorState() {
    try {
        const url = new URL(location.href);
        if (url.hash.startsWith('#colors=')) {
            const payload = url.hash.slice(8);
            url.hash = '';
            history.replaceState(history.state, '', url);
            if (payload.length <= 4096) {
                const incoming = parseColorState(JSON.parse(decodeURIComponent(payload)));
                if (incoming) return incoming;
            }
        }
    } catch { /* Ignore malformed transfers; fall back to this tab's state. */ }
    try { return parseColorState(JSON.parse(sessionStorage.getItem(storageKey))); }
    catch { return null; }
}
let colorState = readColorState() || new Map();
const serializedState = () => JSON.stringify([...colorState].map(([color, geometry]) => [color, ...geometry]));
function updateNavigationLinks() {
    if (!colorState.size) return;
    // Only shared navigation and the identity carry state across domains.
    // Reading/listening links and individual work/post links stay untouched.
    for (const link of document.querySelectorAll('.site-nav a, .site-identity a, .home-thoughts a')) {
        try {
            const url = new URL(link.href, location.href);
            if (!['http:', 'https:'].includes(url.protocol) || url.origin === location.origin) continue;
            url.hash = 'colors=' + encodeURIComponent(serializedState());
            link.href = url.href;
        } catch { /* An incomplete theme link should not affect the artwork. */ }
    }
}
function publishColorState() {
    for (const refresh of paletteViews) refresh();
    try { sessionStorage.setItem(storageKey, serializedState()); } catch { /* Optional per-tab persistence. */ }
    updateNavigationLinks();
}
function randomGeometry() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scale = Math.min(width, height);
    const random = (min, max) => min + Math.random() * (max - min);
    const w = random(8, 30) * scale / width;
    const h = random(8, 30) * scale / height;
    return [random(0, 100 - w), random(18, 86 - h), w, h];
}
function toggleColor(color) {
    if (colorState.has(color) && colorState.size > 1) colorState.delete(color);
    else colorState.set(color, randomGeometry());
    publishColorState();
}

// Every view renders the same composition. Navigation never regenerates it.
export function initColorPalette(composition) {
    if (initializedPalettes.has(composition)) return initializedPalettes.get(composition);
    const swatches = [...composition.querySelectorAll('[data-color]')];
    const rectangleLayer = composition.querySelector('[data-color-artifacts]');
    if (!rectangleLayer || !swatches.length) return;
    rectangleLayer.removeAttribute('aria-hidden');
    rectangleLayer.setAttribute('role', 'group');
    rectangleLayer.setAttribute('aria-label', 'color rectangles');
    rectangleLayer.replaceChildren();
    const rectangles = new Map();
    function refresh() {
        for (const [color, rectangle] of rectangles) {
            if (!colorState.has(color)) { rectangle.remove(); rectangles.delete(color); }
        }
        for (const [color, geometry] of colorState) {
            let rectangle = rectangles.get(color);
            if (!rectangle) {
                rectangle = document.createElement('button');
                rectangle.type = 'button';
                rectangle.className = 'color-rectangle';
                const marker = document.createElement('span');
                marker.className = 'rectangle-close';
                marker.textContent = 'x';
                marker.setAttribute('aria-hidden', 'true');
                rectangle.append(marker);
                rectangle.addEventListener('click', event => {
                    if (event.detail > 0) rectangle.blur();
                    toggleColor(color);
                    if (event.detail === 0 && !colorState.has(color)) swatches.find(button => button.dataset.color === color)?.focus();
                });
                rectangles.set(color, rectangle);
                rectangleLayer.append(rectangle);
            }
            const [x, y, width, height] = geometry;
            Object.assign(rectangle.style, {background: color, left: `${x}%`, top: `${y}%`, width: `${width}%`, height: `${height}%`});
        }
        swatches.forEach(button => {
            const color = button.dataset.color;
            button.setAttribute('aria-pressed', String(colorState.has(color)));
            rectangles.get(color)?.setAttribute('aria-label', `${colorState.size === 1 ? 'reposition' : 'close'} ${button.getAttribute('aria-label')} rectangle`);
        });
    }
    swatches.forEach(button => button.addEventListener('click', () => toggleColor(button.dataset.color)));
    initializedPalettes.set(composition, refresh);
    paletteViews.add(refresh);
    if (!colorState.size) colorState.set('#0000ff', randomGeometry());
    publishColorState();
    return refresh;
}

document.querySelectorAll('[data-color-composition]').forEach(initColorPalette);
window.addEventListener?.('pageshow', () => {
    colorState = readColorState() || colorState;
    publishColorState();
});
document.addEventListener?.('focusin', updateNavigationLinks);
document.addEventListener?.('pointerover', updateNavigationLinks);
