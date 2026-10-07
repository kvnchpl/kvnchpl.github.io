// Authored relationships are independent of catalog order, URLs, and presentation.
const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const anchorFor = (id) => `work-${id.replace(':', '-')}`;
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
// An original recurring device, rather than a historical symbol with an assigned meaning.
function emblem() {
    return '<svg class="field-emblem" viewBox="0 0 96 96" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1"><circle cx="48" cy="48" r="32"/><path d="M48 2v22 M48 72v22 M2 48h22 M72 48h22 M40 8h16 M40 88h16 M8 40v16 M88 40v16 M48 16 73 60H23Z M48 80 73 36H23Z M20 20l56 56 M20 76l56-56"/><circle cx="48" cy="48" r="9"/><path d="M39 48h18 M48 39v18"/></svg>';
}
export function createField(projects, writings, config) {
    const catalog = [...projects, ...writings];
    const records = new Map();
    for (const work of catalog) {
        if (!['project', 'writing'].includes(work.type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.key)) throw new Error(`Invalid work identity: ${work.key}`);
        const id = `${work.type}:${work.key}`;
        if (records.has(id)) throw new Error(`Duplicate work: ${id}`);
        records.set(id, work);
    }
    if (!Array.isArray(config.nodes) || !Array.isArray(config.connections)) throw new Error('Missing field nodes or connections');
    if (!Array.isArray(config.marks)) throw new Error('Missing symbol vocabulary');
    const nodes = new Map();
    config.nodes.forEach((settings, index) => {
        const record = records.get(settings.id);
        if (!record || nodes.has(settings.id)) throw new Error(`Unknown or duplicate node: ${settings.id}`);
        if (!Object.hasOwn(shapes, settings.mark) || !config.marks.includes(settings.mark)) throw new Error(`Unknown mark: ${settings.mark}`);
        if (!Array.isArray(settings.position) || settings.position.length !== 2 || settings.position.some((n) => !Number.isFinite(n) || n < 5 || n > 95)) throw new Error(`Invalid map position: ${settings.id}`);
        if (settings.size !== undefined && (!Number.isFinite(settings.size) || settings.size < 70 || settings.size > 230)) throw new Error(`Invalid map size: ${settings.id}`);
        if (settings.tilt !== undefined && (!Number.isFinite(settings.tilt) || Math.abs(settings.tilt) > 15)) throw new Error(`Invalid map tilt: ${settings.id}`);
        if (settings.echo !== undefined && typeof settings.echo !== 'boolean') throw new Error(`Invalid map echo: ${settings.id}`);
        for (const key of ['note', 'fragment']) {
            if (settings[key] !== undefined && typeof settings[key] !== 'string') throw new Error(`Invalid ${key}: ${settings.id}`);
        }
        if (settings.accountSections !== undefined && (!Array.isArray(settings.accountSections) || settings.accountSections.some((i) => !Number.isInteger(i) || !record.sections?.[i]?.text))) throw new Error(`Invalid account section: ${settings.id}`);
        nodes.set(settings.id, {...record, id: settings.id, mark: settings.mark, position: settings.position, size: settings.size || 112, tilt: settings.tilt || 0, echo: settings.echo || false, note: settings.note, fragment: settings.fragment, accountSections: settings.accountSections, index, anchor: anchorFor(settings.id), href: record.permalink || `/${record.type}s/${record.key}`, neighbors: []});
    });
    if (nodes.size !== records.size) throw new Error('Every catalog work must have a field node');
    if (!nodes.has(config.start)) throw new Error('Invalid field start');
    if (config.inscription !== undefined && !nodes.get(config.inscription)?.fragment) throw new Error('Invalid field inscription');
    const edges = new Set();
    for (const edge of config.connections) {
        if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to || typeof edge.phrase !== 'string' || !edge.phrase.trim()) throw new Error(`Invalid connection: ${edge.from} / ${edge.to}`);
        const key = [edge.from, edge.to].sort().join('|');
        if (edges.has(key)) throw new Error(`Duplicate connection: ${key}`);
        edges.add(key);
        nodes.get(edge.from).neighbors.push({node: nodes.get(edge.to), phrase: edge.phrase});
        nodes.get(edge.to).neighbors.push({node: nodes.get(edge.from), phrase: edge.phrase});
    }
    return {nodes, start: config.start, inscription: config.inscription, connections: config.connections};
}
const number = (n) => String(n + 1).padStart(2, '0');
const destinationAttributes = (node) => node.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
const destinationLabel = (node) => node.href.endsWith('.pdf') ? 'read pdf' : node.external ? 'enter work' : node.type === 'writing' ? 'read work' : 'open work';
const metadata = (node) => `${node.type === 'writing' ? 'text' : 'work'} / ${node.year || 'undated'}${node.href.endsWith('.pdf') ? ' / pdf' : ''}`;
const previewFor = (node) => {
    const image = node.sections?.flatMap((s) => s.images || [])[0];
    return image ? `/img/projects/${node.key}/small/${image.file}.webp` : node.thumbnail;
};
function renderMap(field) {
    const lines = field.connections.map((edge) => {
        const from = field.nodes.get(edge.from);
        const to = field.nodes.get(edge.to);
        return `<line data-map-edge="${from.anchor} ${to.anchor}" x1="${from.position[0]}%" y1="${from.position[1]}%" x2="${to.position[0]}%" y2="${to.position[1]}%"/>`;
    }).join('');
    const nodes = [...field.nodes.values()].map((node) => {
        const preview = previewFor(node);
        const image = preview ? `<img src="${escape(preview)}" alt="" loading="lazy" decoding="async" width="600" height="450"/>` : '';
        return `<a class="map-node" data-map-node="${node.anchor}" data-field-passage data-field-target="${node.anchor}" href="${escape(node.href)}"${destinationAttributes(node)} style="left:${node.position[0]}%;top:${node.position[1]}%;--node-size:${node.size}px;--node-tilt:${node.tilt}deg"><span class="map-token">${mark(node.mark)}${image || `<span class="map-number" aria-hidden="true">${number(node.index)} /</span>`}${node.echo && image ? `<span class="map-echo" aria-hidden="true">${image}</span>` : ''}</span>${node.fragment ? `<span class="map-fragment" aria-hidden="true">${escape(node.fragment)}</span>` : ''}<span class="map-title">${escape(node.title)}</span></a>`;
    }).join('');
    const start = field.nodes.get(field.start);
    return `<div class="map-caption"><span aria-hidden="true">+ / . / +</span><span>selected: <a data-map-current href="${escape(start.href)}"${destinationAttributes(start)}>${escape(start.title)}</a></span><button type="button" data-map-locate>locate [ + ]</button></div><div class="map-viewport" tabindex="0" role="region" aria-label="Map of works. Scroll to explore; select a work to trace its passages."><div class="field-map"><svg class="map-inscriptions" viewBox="0 0 960 760" aria-hidden="true" focusable="false" fill="none"><path d="M25 290h220v-95h70 M410 40l330 175-230 430 M150 680l720-485 M460 395h335v230 M60 60v100 M80 60v100 M100 60v100"/><path d="M205 545a187 187 0 0 0 280-320 M670 230a110 110 0 1 0 195 80" stroke-dasharray="2 13"/></svg><svg class="map-lines" aria-hidden="true" focusable="false">${lines}</svg><span class="map-bearing" aria-hidden="true">${emblem()}<span>///// : /<br/>. . | .<br/>+ . . +</span></span>${nodes}</div></div><p class="map-hint">select a mark / follow a line / scroll to wander</p>`;
}
export function renderConnections(node) {
    if (!node.neighbors.length) return '<p class="field-empty">An open end. <a href="?view=index">Continue through the index <span aria-hidden="true">--&gt;</span></a></p>';
    return `<ul class="field-connections">${node.neighbors.map(({node: next, phrase}) => `<li><a data-field-passage data-field-target="${next.anchor}" href="${escape(next.href)}"${destinationAttributes(next)}><span class="passage-phrase">${escape(phrase)}</span><span class="passage-title"><span aria-hidden="true">↳</span> ${escape(next.title)}${next.newTab ? ' ↗<span class="visually-hidden"> (opens a new tab)</span>' : ''}</span></a></li>`).join('')}</ul>`;
}
export function renderField(field, filter = 'all') {
    const nodes = [...field.nodes.values()];
    const visible = nodes.filter((node) => filter === 'all' || node.type === filter);
    const threshold = field.nodes.get(field.inscription);
    const encounters = nodes.map((node) => {
        const image = node.sections?.flatMap((s) => s.images || [])[0];
        const preview = previewFor(node);
        const art = preview
            ? `<a class="encounter-image" href="${escape(node.href)}"${destinationAttributes(node)} aria-label="${destinationLabel(node)}: ${escape(node.title.toLowerCase())}"><img src="${escape(preview)}" alt="${escape(image?.alt || '')}" loading="lazy" decoding="async" width="600" height="450" /></a>`
            : node.fragment ? `<blockquote class="encounter-fragment">${escape(node.fragment)}</blockquote>` : `<div class="encounter-text-mark" aria-hidden="true">${mark(node.mark)}<pre> . : .\n:     :\n ' : '</pre></div>`;
        return `<section class="field-encounter" id="${node.anchor}" data-field-node="${escape(node.id)}" aria-labelledby="title-${node.anchor}">
            <div class="encounter-number"><span aria-hidden="true">${mark(node.mark)} :: </span>${number(node.index)} / ${number(nodes.length - 1)}<span class="encounter-meta">${metadata(node)}</span></div>
            <div class="encounter-grid"><div class="encounter-work"><h2 id="title-${node.anchor}">${escape(node.title)}</h2>${art}<a class="encounter-open" href="${escape(node.href)}"${destinationAttributes(node)}>${destinationLabel(node)} <span aria-hidden="true">[ + ]${node.newTab ? ' ↗' : ''}</span>${node.newTab ? '<span class="visually-hidden"> (opens a new tab)</span>' : ''}</a></div>
            <div class="encounter-adjacent">${node.note ? `<p class="encounter-note">${escape(node.note)}</p>` : ''}<h3><span aria-hidden="true">: : :</span> passages</h3>${renderConnections(node)}</div></div>
        </section>`;
    }).join('\n');
    const index = visible.map((node) => `<li class="field-index-row" data-index-node="${escape(node.id)}"><details><summary><span class="index-number">${number(node.index)}</span> ${mark(node.mark)} <span class="index-title">${escape(node.title)}</span> <span class="index-meta">[ ${metadata(node)} ]</span></summary><div class="index-content">${node.note || node.fragment ? `<p>${escape(node.note || node.fragment)}</p>` : ''}<div class="index-actions"><a href="${escape(node.href)}"${destinationAttributes(node)}>${destinationLabel(node)}${node.newTab ? ' ↗<span class="visually-hidden"> (opens a new tab)</span>' : ''}</a><a data-field-passage href="?view=network#${node.anchor}">Encounter <span aria-hidden="true">[ * ]</span></a></div>${renderConnections(node)}</div></details></li>`).join('\n');
    return `<div class="field-shell" data-field-start="${anchorFor(field.start)}" data-default-view="${filter === 'all' ? 'network' : 'index'}">
        <header class="field-header"><a class="field-name" href="/"><span>Kevin Cunanan<br/>Chappelle</span><span class="field-name-echo" aria-hidden="true">Kevin Cunanan<br/>Chappelle</span></a><nav class="field-utilities" aria-label="Primary"><a href="/about">About</a><a href="https://kvnchpl-thoughts.tumblr.com/">Thoughts ↗</a></nav></header>
        <div class="field-threshold"><span class="threshold-device" aria-hidden="true"><span>.:.</span>${emblem()}<span>.:.</span></span>${threshold?.fragment ? `<a class="threshold-fragment" data-field-passage data-field-target="${threshold.anchor}" href="${escape(threshold.href)}">${escape(threshold.fragment)}</a>` : ''}</div>
        <div class="field-toolbar"><nav class="field-modes" aria-label="Display mode"><a data-field-view="network" href="?view=network">Network <span aria-hidden="true">[ * ]</span></a><a data-field-view="index" href="?view=index">Index <span aria-hidden="true">[ = ]</span></a></nav><span class="field-caption">${filter === 'all' ? 'works & writings' : filter === 'project' ? 'works' : 'writings'} / ${visible.length}</span><a class="field-retrace" href="#" hidden>Retrace <span aria-hidden="true">&lt;--</span></a></div>
        <noscript><p class="field-nojs">Browse the index below. Open a work or follow its passages.</p></noscript>
        <div class="field-network" aria-label="Network">${renderMap(field)}${encounters}</div>
        <section class="field-index" aria-labelledby="field-index-heading"><div class="index-heading"><h1 id="field-index-heading">${filter === 'all' ? 'An index' : filter === 'project' ? 'Works' : 'Writings'}</h1><nav aria-label="Index collection"><a href="/home?view=index"${filter === 'all' ? ' aria-current="page"' : ''}>All</a><a href="/projects?view=index"${filter === 'project' ? ' aria-current="page"' : ''}>Works</a><a href="/writings?view=index"${filter === 'writing' ? ' aria-current="page"' : ''}>Writings</a></nav></div><ol class="field-index-list">${index}</ol></section>
        <footer class="field-footer"><span aria-hidden="true">+ -- : -- +</span><a href="https://www.goodreads.com/kvnchpl">Reading ↗</a><a href="https://letterboxd.com/kvnchpl/">Watching ↗</a><a href="https://soundcloud.com/kvnchpl">Listening ↗</a><a href="https://hydranthunt.com/">Hydrants ↗</a><a href="https://kvnchpl.com/homestuck-book-club/">Homestuck ↗</a></footer>
        <p class="visually-hidden" data-field-announcement role="status" aria-live="polite"></p>
    </div>`;
}
export function renderWorkPassages(field, id) {
    const node = field.nodes.get(id);
    return `<aside class="work-passages" aria-label="Related works"><h2>${mark(node.mark)} Passages <span aria-hidden="true">: : :</span></h2>${renderConnections(node)}<a class="work-field-return" href="/home?view=network#${node.anchor}">Return to the field <span aria-hidden="true">[ * ]</span></a></aside>`;
}
