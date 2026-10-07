const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const anchorFor = (id) => `work-${id.replace(':', '-')}`;
export const palette = [['black', '#000000'], ['white', '#ffffff'], ['red', '#ff0000'], ['green', '#00ff00'], ['blue', '#0000ff'], ['cyan', '#00ffff'], ['magenta', '#ff00ff'], ['yellow', '#ffff00']];
const shapes = {
    mercury: '<path d="M7 2a5 5 0 0 0 10 0 M12 15v8 M8 19h8"/><circle cx="12" cy="9" r="6"/>',
    sulfur: '<path d="m12 2 7 12H5Z M12 14v9 M8 19h8"/>',
    salt: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/>',
    saturn: '<path d="M8 2v16 M4 6h8 M8 13c8-11 13 1 7 5-3 2-2 4 1 4"/>',
    vessel: '<path d="M6 3h12 M9 3v7L3 21h18L15 10V3 M7 15h10"/>',
    seal: '<circle cx="12" cy="12" r="9"/><path d="m12 4 7 12H5Z m0 16 7-12H5Z M12 1v4 M12 19v4 M1 12h4 M19 12h4"/>'
};
export function mark(name) {
    return `<svg class="field-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2">${shapes[name]}</svg>`;
}
export function createField(projects, writings, config = {}) {
    const catalog = [...projects, ...writings].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.month || 0) - (a.month || 0) || (b.day || 0) - (a.day || 0));
    const nodes = new Map();
    const marks = Object.keys(shapes);
    for (const [index, work] of catalog.entries()) {
        if (!['project', 'writing'].includes(work.type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.key) || !work.title?.trim()) throw new Error(`Invalid work identity: ${work.key}`);
        const id = `${work.type}:${work.key}`;
        if (nodes.has(id)) throw new Error(`Duplicate work: ${id}`);
        if (work.mark !== undefined && !Object.hasOwn(shapes, work.mark)) throw new Error(`Unknown mark: ${work.mark}`);
        for (const key of ['note']) {
            if (work[key] !== undefined && typeof work[key] !== 'string') throw new Error(`Invalid ${key}: ${id}`);
        }
        if (work.accountSections !== undefined && (!Array.isArray(work.accountSections) || work.accountSections.some((i) => !Number.isInteger(i) || !work.sections?.[i]?.text))) throw new Error(`Invalid account section: ${id}`);
        if (work.permalink !== undefined && (typeof work.permalink !== 'string' || !/^(?:\/(?!\/)|https?:\/\/)/.test(work.permalink))) throw new Error(`Invalid destination: ${id}`);
        if (work.external && !work.permalink) throw new Error(`Missing destination: ${id}`);
        const symbolIndex = [...work.key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % marks.length;
        nodes.set(id, {...work, id, mark: work.mark || marks[symbolIndex], index, anchor: anchorFor(id), href: work.permalink || `/${work.type}s/${work.key}`});
    }
    if (!nodes.size) throw new Error('The catalog needs at least one work');
    const landing = config.landing || {work: nodes.keys().next().value};
    if (!nodes.has(landing.work) || (landing.image !== undefined && (typeof landing.image !== 'string' || !landing.image.startsWith('/img/')))) throw new Error('Invalid landing artwork');
    return {nodes, landing};
}
const number = (n) => String(n + 1).padStart(2, '0');
const destinationAttributes = (node) => node.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
const metadata = (node) => `${node.type === 'writing' ? 'text' : 'work'} / ${node.year || 'undated'}${node.href.endsWith('.pdf') ? ' / pdf' : ''}`;
export const previewFor = (node) => {
    const image = node.sections?.flatMap((s) => s.images || [])[0];
    return node.thumbnail || image?.src || (image?.file ? `/img/projects/${node.key}/small/${image.file}.webp` : undefined);
};
function renderMap(nodes) {
    const items = nodes.map((node) => {
        const preview = previewFor(node);
        const art = preview ? `<img src="${escape(preview)}" alt="" loading="lazy" decoding="async" width="600" height="450"/>` : `<span class="map-text-number" aria-hidden="true">${number(node.index)}</span>`;
        return `<a class="map-node" id="${node.anchor}" data-map-node="${node.anchor}" href="${escape(node.href)}"${destinationAttributes(node)} aria-label="${escape(node.title.toLowerCase())}"><span class="map-token">${mark(node.mark)}<span class="map-preview">${art}</span><span class="map-block" aria-hidden="true"></span></span><span class="map-title">${escape(node.title)}</span><span class="map-meta">${metadata(node)}</span></a>`;
    }).join('\n');
    return `<div class="map-caption"><span aria-hidden="true">[ : ]</span><span>${nodes.length} works / texts</span></div><div class="field-map" aria-label="atlas of works">${items}</div>`;
}
export function renderField(field, filter = 'all', about = '') {
    const visible = [...field.nodes.values()].filter((node) => filter === 'all' || node.type === filter);
    const index = visible.map((node) => `<li class="field-index-row" data-index-node="${node.anchor}"><a href="${escape(node.href)}"${destinationAttributes(node)}><span class="index-number">${number(node.index)}</span> <span class="index-title">${escape(node.title)}</span></a><span class="index-meta">[ ${metadata(node)} ]</span></li>`).join('\n');
    const featured = field.nodes.get(field.landing.work);
    const featuredImage = field.landing.image || previewFor(featured);
    return `<div class="field-shell" data-default-view="${filter === 'all' ? 'landing' : 'index'}">
        <div class="landing" data-color-layout="0">
            <h1 class="landing-name"><a href="/" aria-label="KEVIN CUNANAN CHAPPELLE"><svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><text x="0" y="350" font-size="400" textLength="1200" lengthAdjust="spacingAndGlyphs">KEVIN CUNANAN CHAPPELLE</text></svg><span class="visually-hidden">KEVIN CUNANAN CHAPPELLE</span></a></h1>
            <a class="landing-image" href="${escape(featured.href)}"${destinationAttributes(featured)} aria-label="open ${escape(featured.title.toLowerCase())}">${featuredImage ? `<img src="${escape(featuredImage)}" alt="" width="1920" height="2400" fetchpriority="high" />` : ''}</a>
            <nav class="landing-links" aria-label="primary"><a class="landing-about" href="/about" data-about-open>a(bout)</a><a class="landing-projects" href="#field-index-heading" data-field-view="index">(project)s</a><a class="landing-network" href="#field-index-heading" data-field-view="network" aria-label="atlas">*</a><a class="landing-thoughts" href="https://kvnchpl-thoughts.tumblr.com/" aria-label="thoughts">&amp;&amp;&amp;</a></nav>
            <div class="color-block color-block-primary" aria-hidden="true"></div><div class="color-block color-block-secondary" aria-hidden="true"></div>
            <div class="landing-palette" role="group" aria-label="color interventions">${palette.map(([name, color]) => `<button type="button" data-color="${color}" aria-label="${name}" aria-pressed="${name === 'blue'}" style="--swatch:${color}" title="${name}"></button>`).join('')}</div>
        </div>
        <dialog class="field-browser" data-field-browser aria-label="works and writings"><div class="browser-bar"><nav class="field-modes" aria-label="display mode"><a data-field-view="index" href="?view=index">index [ = ]</a><a data-field-view="network" href="?view=network">atlas [ * ]</a></nav><button type="button" data-browser-close>close [ x ]</button></div>
        <div class="field-network" aria-label="atlas">${renderMap(visible)}</div>
        <section class="field-index" aria-labelledby="field-index-heading"><div class="index-heading"><h2 id="field-index-heading">${filter === 'all' ? 'an index' : filter === 'project' ? 'works' : 'writings'}</h2><nav aria-label="index collection"><a href="/home?view=index"${filter === 'all' ? ' aria-current="page"' : ''}>all</a><a href="/projects?view=index"${filter === 'project' ? ' aria-current="page"' : ''}>works</a><a href="/writings?view=index"${filter === 'writing' ? ' aria-current="page"' : ''}>writings</a></nav></div><ol class="field-index-list">${index}</ol></section>
        </dialog>
        <noscript><style>.field-browser:not([open]) { display:block; position:relative; margin:30px auto; } .browser-bar,.landing-palette { display:none; }</style><p class="field-nojs">open a work from the index.</p></noscript>
        <dialog class="about-popup field-popup" data-about-popup aria-labelledby="about-popup-heading"><button type="button" class="popup-close" data-about-close>close [ x ]</button><h2 id="about-popup-heading">A(BOUT)</h2>${about}<a href="/about">more [ + ]</a><details><summary>elsewhere</summary><div class="field-elsewhere"><a href="https://www.goodreads.com/kvnchpl">reading ↗</a><a href="https://letterboxd.com/kvnchpl/">watching ↗</a><a href="https://soundcloud.com/kvnchpl">listening ↗</a><a href="https://hydranthunt.com/">hydrants ↗</a><a href="https://kvnchpl.com/homestuck-book-club/">homestuck ↗</a></div></details></dialog>
        <p class="visually-hidden" data-field-announcement role="status" aria-live="polite"></p>
    </div>`;
}
export function renderWorkReturn(id) {
    return `<a class="work-field-return" href="/home?view=network#${anchorFor(id)}">return [ * ]</a>`;
}
