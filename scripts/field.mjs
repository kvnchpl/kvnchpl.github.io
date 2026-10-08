const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const anchorFor = (id) => `work-${id.replace(':', '-')}`;
export const palette = [['black', '#000000'], ['white', '#ffffff'], ['red', '#ff0000'], ['green', '#00ff00'], ['blue', '#0000ff'], ['cyan', '#00ffff'], ['magenta', '#ff00ff'], ['yellow', '#ffff00']];
export const categoryLabel = (category) => category === 'image' ? 'images' : category;
export const categories = ['image', 'space', 'interface', 'writing'];
// Each label has a unique three-character code using only []*!+?:=>.
export const navCodes = {home: '[!]', about: '?::', collection: '[*]', thoughts: '???', reading: '[:]', watching: '[>]', listening: ']+[', hydrants: '!+!', homestuck: '>=>', return: '!!>', all: '***', image: '[+]', space: '[]=', interface: '>:=', writing: ':::'};
export function renderNavLabel(key) {
    return `<span class="nav-code" aria-hidden="true">${escape(navCodes[key])}</span><span class="nav-label">${escape(categoryLabel(key))}</span>`;
}
export const ui = Object.fromEntries(Object.keys(navCodes).map((key) => [key, renderNavLabel(key)]));
export function formatWorkDate(work) {
    if (!work.year) return 'undated';
    return `${work.year}${Number.isInteger(work.month) && work.month >= 1 && work.month <= 12 ? `.${String(work.month).padStart(2, '0')}` : ''}`;
}
function renderPalette() {
    return `<div class="color-palette" role="group" aria-label="color interventions">${palette.map(([name, color]) => `<button type="button" data-color="${color}" aria-label="${name}" aria-pressed="${name === 'blue'}" style="--swatch:${color}" title="${name}"></button>`).join('')}</div>`;
}
export function createField(projects, writings, config = {}) {
    const catalog = [...projects, ...writings].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.month || 0) - (a.month || 0) || (b.day || 0) - (a.day || 0));
    const nodes = new Map();
    for (const work of catalog) {
        if (!['project', 'writing'].includes(work.type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.key) || !work.title?.trim()) throw new Error(`Invalid work identity: ${work.key}`);
        const id = `${work.type}:${work.key}`;
        if (nodes.has(id)) throw new Error(`Duplicate work: ${id}`);
        const category = work.category || (work.type === 'writing' ? 'writing' : 'image');
        if (!categories.includes(category)) throw new Error(`Unknown category: ${category}`);
        if (work.displayTitle !== undefined && (typeof work.displayTitle !== 'string' || !work.displayTitle.trim())) throw new Error(`Invalid display title: ${id}`);
        if (work.note !== undefined && typeof work.note !== 'string') throw new Error(`Invalid note: ${id}`);
        if (work.permalink !== undefined && (typeof work.permalink !== 'string' || !/^(?:\/(?!\/)|https?:\/\/)/.test(work.permalink))) throw new Error(`Invalid destination: ${id}`);
        if (work.external && !work.permalink) throw new Error(`Missing destination: ${id}`);
        nodes.set(id, {...work, id, category, anchor: anchorFor(id), href: work.permalink || `/${work.type}s/${work.key}`});
    }
    if (!nodes.size) throw new Error('The catalog needs at least one work');
    const landing = config.landing || {work: nodes.keys().next().value};
    if (!nodes.has(landing.work) || (landing.image !== undefined && (typeof landing.image !== 'string' || !landing.image.startsWith('/img/')))) throw new Error('Invalid landing artwork');
    if (landing.href !== undefined && (typeof landing.href !== 'string' || !/^\/(?!\/)/.test(landing.href))) throw new Error('Invalid landing destination');
    return {nodes, landing};
}
const destinationAttributes = (node) => (node.newTab || /^https?:\/\//.test(node.href)) ? ' target="_blank" rel="noopener noreferrer"' : '';
export const previewFor = (node) => {
    const image = node.sections?.flatMap((s) => s.images || [])[0];
    const sky = [...node.key].reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) % 22, 0) + 1;
    return node.thumbnail || image?.src || (image?.file ? `/img/projects/${node.key}/small/${image.file}.webp` : `/img/placeholders/sky_${sky}.webp`);
};
export function renderIdentity(className = '') {
    return `<div class="screen-identity${className ? ` ${className}` : ''}"><a href="/" aria-label="KEVIN CUNANAN CHAPPELLE"><svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><text x="0" y="350" font-size="400" textLength="1200" lengthAdjust="spacingAndGlyphs">KEVIN CUNANAN CHAPPELLE</text></svg><span class="visually-hidden">KEVIN CUNANAN CHAPPELLE</span></a></div>`;
}
// About, the collection, and individual works share navigation and identity.
export function renderNavigation(page = '', popup = false) {
    const home = popup ? `<button type="button" data-browser-close aria-label="home">${ui.home}</button>` : `<a href="/" aria-label="home">${ui.home}</a>`;
    return `<div class="screen-chrome page-chrome">${renderIdentity()}<nav class="site-nav" aria-label="primary">${home}<a href="/projects" data-atlas-open aria-label="collection"${page === 'collection' ? ' aria-current="page"' : ''}>${ui.collection}</a><a href="/about" data-about-open aria-label="about"${page === 'about' ? ' aria-current="page"' : ''}>${ui.about}</a><a href="https://kvnchpl-thoughts.tumblr.com/" aria-label="thoughts">${ui.thoughts}</a></nav></div>`;
}
export function renderAbout(about, popup = false, contactImage = '/img/contact/contact_email.webp') {
    return `${renderNavigation('about', popup)}
        <section class="about-room" aria-labelledby="${popup ? 'about-screen-heading' : 'about-heading'}"><header class="room-heading"><h${popup ? '2' : '1'} id="${popup ? 'about-screen-heading' : 'about-heading'}">ABOUT</h${popup ? '2' : '1'}></header><div class="about-copy">${about}<img class="about-image" src="${escape(contactImage)}" alt="contact email" /></div></section>`;
}
function renderMap(nodes) {
    return `<div class="field-map" aria-label="collection of projects and writing">${nodes.map((node) => {
        const preview = previewFor(node);
        const art = `<img src="${escape(preview)}" alt="" loading="lazy" decoding="async" width="600" height="450"/>`;
        return `<a class="map-node" id="${node.anchor}" data-map-node="${node.anchor}" href="${escape(node.href)}" data-category="${node.category}"${destinationAttributes(node)} aria-label="${escape(node.title.toLowerCase())}"><span class="map-token"><span class="map-preview">${art}</span></span><span class="map-title">${escape(node.title)}</span><span class="map-meta">${categoryLabel(node.category)} / ${formatWorkDate(node)}</span></a>`;
    }).join('\n')}</div>`;
}
export function renderField(field, filter = 'all', about = '', contactImage) {
    const featured = field.nodes.get(field.landing.work);
    const featuredImage = field.landing.image || previewFor(featured);
    return `<div class="field-shell" data-default-view="${filter === 'all' ? 'landing' : 'atlas'}" data-default-category="${filter === 'writing' ? 'writing' : 'all'}">
        <div class="landing" data-color-composition>
            <h1 class="visually-hidden">KEVIN CUNANAN CHAPPELLE</h1>${renderIdentity('landing-name')}
            <a class="landing-image" href="${escape(field.landing.href || featured.href)}"${field.landing.href === '/about' ? ' data-about-open aria-label="about"' : `${destinationAttributes(featured)} aria-label="open ${escape(featured.title.toLowerCase())}"`}>${featuredImage ? `<img src="${escape(featuredImage)}" alt="" width="3000" height="3000" fetchpriority="high" />` : ''}</a>
            <nav class="landing-links" aria-label="primary"><a class="landing-projects" href="/projects" data-atlas-open aria-label="collection">${ui.collection}</a><a class="landing-about" href="/about" data-about-open aria-label="about">${ui.about}</a><a class="landing-thoughts" href="https://kvnchpl-thoughts.tumblr.com/" aria-label="thoughts">${ui.thoughts}</a>${[['reading', 'https://www.goodreads.com/kvnchpl'], ['watching', 'https://letterboxd.com/kvnchpl/'], ['listening', 'https://soundcloud.com/kvnchpl'], ['hydrants', 'https://hydranthunt.com/'], ['homestuck', 'https://kvnchpl.com/homestuck-book-club/']].map(([key, href]) => `<a class="landing-${key}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${key}">${ui[key]}</a>`).join('')}</nav>
            <div class="color-artifacts" data-color-artifacts aria-hidden="true"><span class="color-rectangle" style="background:blue;left:70%;top:48%;width:25%;height:26%"></span></div>
            ${renderPalette()}
        </div>
        <dialog class="field-screen field-browser" data-field-browser data-color-composition aria-labelledby="atlas-heading">${renderNavigation('collection', true)}<div class="collection-heading"><h2 id="atlas-heading">COLLECTION</h2><nav class="field-categories" aria-label="collection categories"><a href="/projects" data-category-filter="all" aria-label="all">${ui.all}</a>${categories.map((category) => `<a href="/projects?category=${category}" data-category-filter="${category}" aria-label="${categoryLabel(category)}">${ui[category]}</a>`).join('')}</nav></div>
        <div class="atlas-artifacts" data-color-artifacts aria-hidden="true"><span class="color-rectangle" style="background:blue;left:54%;top:47%;width:23%;height:8%"></span></div>
        ${renderMap([...field.nodes.values()])}
        ${renderPalette()}
        </dialog>
        <noscript><style>.landing{display:none}.field-browser:not([open]){display:block;position:relative;height:auto;overflow:visible}.field-browser [data-browser-close]{display:none}${filter === 'writing' ? '.map-node:not([data-category="writing"]){display:none}' : ''}</style></noscript>
        <dialog class="field-screen about-screen" data-about-popup aria-labelledby="about-screen-heading">${renderAbout(about, true, contactImage)}</dialog>
        <p class="visually-hidden" data-field-announcement role="status" aria-live="polite"></p>
    </div>`;
}
export function renderWorkReturn(id) {
    return `<a class="work-field-return" href="/projects#${anchorFor(id)}">${ui.return}</a>`;
}
