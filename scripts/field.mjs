// Authored relationships are independent of catalog order, URLs, and presentation.
const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const anchorFor = (id) => `work-${id.replace(':', '-')}`;
const shapes = {
    sun: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    moon: '<path d="M15 3a9 9 0 1 0 0 18 10 10 0 0 1 0-18Z"/>',
    fire: '<path d="m12 3 9 17H3Z"/>',
    earth: '<path d="m12 21 9-17H3Z M6 10h12"/>'
};
export function mark(name) {
    return `<svg class="field-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2">${shapes[name]}</svg>`;
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
        for (const key of ['note', 'fragment']) {
            if (settings[key] !== undefined && typeof settings[key] !== 'string') throw new Error(`Invalid ${key}: ${settings.id}`);
        }
        if (settings.accountSections !== undefined && (!Array.isArray(settings.accountSections) || settings.accountSections.some((i) => !Number.isInteger(i) || !record.sections?.[i]?.text))) throw new Error(`Invalid account section: ${settings.id}`);
        nodes.set(settings.id, {...record, id: settings.id, mark: settings.mark, note: settings.note, fragment: settings.fragment, accountSections: settings.accountSections, index, anchor: anchorFor(settings.id), href: record.permalink || `/${record.type}s/${record.key}`, neighbors: []});
    });
    if (nodes.size !== records.size) throw new Error('Every catalog work must have a field node');
    if (!nodes.has(config.start)) throw new Error('Invalid field start');
    const edges = new Set();
    for (const edge of config.connections) {
        if (!nodes.has(edge.from) || !nodes.has(edge.to) || edge.from === edge.to || typeof edge.phrase !== 'string' || !edge.phrase.trim()) throw new Error(`Invalid connection: ${edge.from} / ${edge.to}`);
        const key = [edge.from, edge.to].sort().join('|');
        if (edges.has(key)) throw new Error(`Duplicate connection: ${key}`);
        edges.add(key);
        nodes.get(edge.from).neighbors.push({node: nodes.get(edge.to), phrase: edge.phrase});
        nodes.get(edge.to).neighbors.push({node: nodes.get(edge.from), phrase: edge.phrase});
    }
    return {nodes, start: config.start};
}
const number = (n) => String(n + 1).padStart(2, '0');
const destinationAttributes = (node) => node.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
const destinationLabel = (node) => node.href.endsWith('.pdf') ? 'Read PDF' : node.external ? 'Enter work' : node.type === 'writing' ? 'Read work' : 'Open work';
const metadata = (node) => `${node.type === 'writing' ? 'text' : 'work'} / ${node.year || 'undated'}${node.href.endsWith('.pdf') ? ' / pdf' : ''}`;
export function renderConnections(node) {
    if (!node.neighbors.length) return '<p class="field-empty">An open end. <a href="?view=index">Continue through the index <span aria-hidden="true">--&gt;</span></a></p>';
    return `<ul class="field-connections">${node.neighbors.map(({node: next, phrase}) => `<li><a data-field-passage data-field-target="${next.anchor}" href="${escape(next.href)}"${destinationAttributes(next)}><span class="passage-phrase">${escape(phrase)}</span><span class="passage-title"><span aria-hidden="true">↳</span> ${escape(next.title)}${next.newTab ? ' ↗<span class="visually-hidden"> (opens a new tab)</span>' : ''}</span></a></li>`).join('')}</ul>`;
}
export function renderField(field, filter = 'all') {
    const nodes = [...field.nodes.values()];
    const visible = nodes.filter((node) => filter === 'all' || node.type === filter);
    const encounters = nodes.map((node) => {
        const image = node.sections?.flatMap((s) => s.images || [])[0];
        const preview = image ? `/img/projects/${node.key}/small/${image.file}.webp` : node.thumbnail;
        const art = preview
            ? `<a class="encounter-image" href="${escape(node.href)}"${destinationAttributes(node)} aria-label="${destinationLabel(node)}: ${escape(node.title)}"><img src="${escape(preview)}" alt="${escape(image?.alt || '')}" loading="lazy" decoding="async" width="600" height="450" /></a>`
            : node.fragment ? `<blockquote class="encounter-fragment">${escape(node.fragment)}</blockquote>` : `<div class="encounter-text-mark" aria-hidden="true">${mark(node.mark)}<pre> . : .\n:     :\n ' : '</pre></div>`;
        return `<section class="field-encounter" id="${node.anchor}" data-field-node="${escape(node.id)}" aria-labelledby="title-${node.anchor}">
            <div class="encounter-number"><span aria-hidden="true">${mark(node.mark)} :: </span>${number(node.index)} / ${number(nodes.length - 1)}<span class="encounter-meta">${metadata(node)}</span></div>
            <div class="encounter-grid"><div class="encounter-work"><h2 id="title-${node.anchor}">${escape(node.title)}</h2>${art}<a class="encounter-open" href="${escape(node.href)}"${destinationAttributes(node)}>${destinationLabel(node)} <span aria-hidden="true">[ + ]${node.newTab ? ' ↗' : ''}</span>${node.newTab ? '<span class="visually-hidden"> (opens a new tab)</span>' : ''}</a></div>
            <div class="encounter-adjacent">${node.note ? `<p class="encounter-note">${escape(node.note)}</p>` : ''}<h3><span aria-hidden="true">: : :</span> passages</h3>${renderConnections(node)}</div></div>
        </section>`;
    }).join('\n');
    const index = visible.map((node) => `<li class="field-index-row" data-index-node="${escape(node.id)}"><details><summary><span class="index-number">${number(node.index)}</span>${mark(node.mark)}<span class="index-title">${escape(node.title)}</span><span class="index-meta">${metadata(node)}</span><span class="index-plus" aria-hidden="true">+</span></summary><div class="index-content">${node.note || node.fragment ? `<p>${escape(node.note || node.fragment)}</p>` : ''}<div class="index-actions"><a href="${escape(node.href)}"${destinationAttributes(node)}>${destinationLabel(node)}${node.newTab ? ' ↗<span class="visually-hidden"> (opens a new tab)</span>' : ''}</a><a data-field-passage href="?view=network#${node.anchor}">Encounter <span aria-hidden="true">[ * ]</span></a></div>${renderConnections(node)}</div></details></li>`).join('\n');
    return `<div class="field-shell" data-field-start="${anchorFor(field.start)}" data-default-view="${filter === 'all' ? 'network' : 'index'}">
        <header class="field-header"><a class="field-name" href="/">Kevin Cunanan<br />Chappelle</a><p class="field-coordinate"><span aria-hidden="true">[ . . . ]</span><br />images / texts / passages</p><nav class="field-utilities" aria-label="Primary"><a href="/about">About</a><a href="https://kvnchpl-thoughts.tumblr.com/">Thoughts ↗</a></nav></header>
        <div class="field-toolbar"><nav class="field-modes" aria-label="Display mode"><a data-field-view="network" href="?view=network">Network <span aria-hidden="true">[ * ]</span></a><a data-field-view="index" href="?view=index">Index <span aria-hidden="true">[ = ]</span></a></nav><span class="field-caption">${filter === 'all' ? 'works & writings' : filter === 'project' ? 'works' : 'writings'} / ${visible.length}</span><a class="field-retrace" href="#" hidden>Retrace <span aria-hidden="true">&lt;--</span></a></div>
        <noscript><p class="field-nojs">Browse the index below. Open a work or follow its passages.</p></noscript>
        <div class="field-network" aria-label="Encounters">${encounters}</div>
        <section class="field-index" aria-labelledby="field-index-heading"><div class="index-heading"><h1 id="field-index-heading">${filter === 'all' ? 'An index' : filter === 'project' ? 'Works' : 'Writings'}</h1><nav aria-label="Index collection"><a href="/home?view=index"${filter === 'all' ? ' aria-current="page"' : ''}>All</a><a href="/projects?view=index"${filter === 'project' ? ' aria-current="page"' : ''}>Works</a><a href="/writings?view=index"${filter === 'writing' ? ' aria-current="page"' : ''}>Writings</a></nav></div><ol class="field-index-list">${index}</ol></section>
        <footer class="field-footer"><span aria-hidden="true">. . . / . . .</span><a href="https://www.goodreads.com/kvnchpl">Reading ↗</a><a href="https://letterboxd.com/kvnchpl/">Watching ↗</a><a href="https://soundcloud.com/kvnchpl">Listening ↗</a><a href="https://hydranthunt.com/">Hydrants ↗</a><a href="https://kvnchpl.com/homestuck-book-club/">Homestuck ↗</a></footer>
        <p class="visually-hidden" data-field-announcement role="status" aria-live="polite"></p>
    </div>`;
}
export function renderWorkPassages(field, id) {
    const node = field.nodes.get(id);
    return `<aside class="work-passages" aria-label="Related works"><h2>Passages <span aria-hidden="true">: : :</span></h2>${renderConnections(node)}<a class="work-field-return" href="/home?view=network#${node.anchor}">Return to the field <span aria-hidden="true">[ * ]</span></a></aside>`;
}
