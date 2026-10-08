const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
export const anchorFor = (id) => `work-${id.replace(':', '-')}`;
export const palette = [['black', '#000000'], ['white', '#ffffff'], ['red', '#ff0000'], ['green', '#00ff00'], ['blue', '#0000ff'], ['cyan', '#00ffff'], ['magenta', '#ff00ff'], ['yellow', '#ffff00']];
export const categories = ['images', 'spaces', 'interfaces', 'writing'];
export function createField(projects, writings, config = {}) {
    const catalog = [...projects, ...writings].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.month || 0) - (a.month || 0) || (b.day || 0) - (a.day || 0));
    const nodes = new Map();
    for (const work of catalog) {
        if (!['project', 'writing'].includes(work.type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.key) || !work.title?.trim()) throw new Error(`Invalid work identity: ${work.key}`);
        const id = `${work.type}:${work.key}`;
        if (nodes.has(id)) throw new Error(`Duplicate work: ${id}`);
        const category = work.category || (work.type === 'writing' ? 'writing' : 'images');
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
    return {nodes, landing};
}
const destinationAttributes = (node) => node.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
export const previewFor = (node) => {
    const image = node.sections?.flatMap((s) => s.images || [])[0];
    return node.thumbnail || image?.src || (image?.file ? `/img/projects/${node.key}/small/${image.file}.webp` : undefined);
};
export function renderIdentity(className = '') {
    return `<div class="screen-identity${className ? ` ${className}` : ''}"><a href="/" aria-label="KEVIN CUNANAN CHAPPELLE"><svg viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true" focusable="false"><text x="0" y="350" font-size="400" textLength="1200" lengthAdjust="spacingAndGlyphs">KEVIN CUNANAN CHAPPELLE</text></svg><span class="visually-hidden">KEVIN CUNANAN CHAPPELLE</span></a></div>`;
}
export function renderAbout(about, popup = false) {
    return `<div class="screen-chrome">${renderIdentity()}<nav aria-label="about navigation">${popup ? '<button type="button" data-about-close>return [ x ]</button>' : '<a href="/">return [ x ]</a>'}<a href="/projects" data-about-atlas>(project)s</a><a href="https://kvnchpl-thoughts.tumblr.com/">&amp;&amp;&amp;</a></nav></div>
        <section class="about-room" aria-labelledby="${popup ? 'about-screen-heading' : 'about-heading'}"><h${popup ? '2' : '1'} id="${popup ? 'about-screen-heading' : 'about-heading'}">A(BOUT)</h${popup ? '2' : '1'}><img class="about-portrait" src="/img/contact/self_portrait.webp" alt="kevin cunanan chappelle" /><div class="about-copy">${about}<img class="about-email" src="/img/contact/contact_email.webp" alt="contact email" /><nav class="field-elsewhere" aria-label="elsewhere"><a href="https://www.goodreads.com/kvnchpl">reading</a><a href="https://letterboxd.com/kvnchpl/">watching</a><a href="https://soundcloud.com/kvnchpl">listening</a><a href="https://hydranthunt.com/">hydrants</a><a href="https://kvnchpl.com/homestuck-book-club/">homestuck</a></nav></div><span class="about-block" aria-hidden="true"></span></section>`;
}
function renderMap(nodes) {
    return `<div class="field-map" aria-label="atlas of projects and writing">${nodes.map((node) => {
        const preview = previewFor(node);
        const art = preview ? `<img src="${escape(preview)}" alt="" loading="lazy" decoding="async" width="600" height="450"/>` : `<span class="map-text-fragment" aria-hidden="true">${escape(node.title)}</span>`;
        return `<a class="map-node" id="${node.anchor}" data-map-node="${node.anchor}" href="${escape(node.href)}" data-category="${node.category}"${destinationAttributes(node)} aria-label="${escape(node.title.toLowerCase())}"><span class="map-token"><span class="map-preview">${art}</span><span class="map-block" aria-hidden="true"></span></span><span class="map-title">${escape(node.title)}</span><span class="map-meta">${node.category}${node.year ? ` / ${node.year}` : ''}${node.href.endsWith('.pdf') ? ' / pdf' : ''}</span></a>`;
    }).join('\n')}</div>`;
}
export function renderField(field, filter = 'all', about = '') {
    const featured = field.nodes.get(field.landing.work);
    const featuredImage = field.landing.image || previewFor(featured);
    return `<div class="field-shell" data-default-view="${filter === 'all' ? 'landing' : 'atlas'}" data-default-category="${filter === 'writing' ? 'writing' : 'all'}">
        <div class="landing" data-color-layout="0">
            <h1 class="visually-hidden">KEVIN CUNANAN CHAPPELLE</h1>${renderIdentity('landing-name')}
            <a class="landing-image" href="${escape(featured.href)}"${destinationAttributes(featured)} aria-label="open ${escape(featured.title.toLowerCase())}">${featuredImage ? `<img src="${escape(featuredImage)}" alt="" width="1920" height="2400" fetchpriority="high" />` : ''}</a>
            <nav class="landing-links" aria-label="primary"><a class="landing-about" href="/about" data-about-open>a(bout)</a><a class="landing-projects" href="/projects" data-atlas-open>(project)s</a><a class="landing-network" href="/projects" data-atlas-open aria-label="projects">*</a><a class="landing-thoughts" href="https://kvnchpl-thoughts.tumblr.com/" aria-label="thoughts">&amp;&amp;&amp;</a></nav>
            <div class="color-block color-block-primary" aria-hidden="true"></div><div class="color-block color-block-secondary" aria-hidden="true"></div>
            <div class="landing-palette" role="group" aria-label="color interventions">${palette.map(([name, color]) => `<button type="button" data-color="${color}" aria-label="${name}" aria-pressed="${name === 'blue'}" style="--swatch:${color}" title="${name}"></button>`).join('')}</div>
        </div>
        <dialog class="field-screen field-browser" data-field-browser aria-labelledby="atlas-heading"><div class="screen-chrome">${renderIdentity()}<nav aria-label="projects navigation"><button type="button" data-browser-close>return [ x ]</button><a href="/about" data-about-open>a(bout)</a><a href="https://kvnchpl-thoughts.tumblr.com/">&amp;&amp;&amp;</a></nav><h2 id="atlas-heading">(project)s</h2><nav class="field-categories" aria-label="project categories"><a href="/projects" data-category-filter="all">all</a>${categories.map((category) => `<a href="/projects?category=${category}" data-category-filter="${category}">${category}</a>`).join('')}</nav></div>
        ${renderMap([...field.nodes.values()])}
        </dialog>
        <noscript><style>.landing{display:none}.field-browser:not([open]){display:block;position:relative;height:auto;overflow:visible}.field-browser [data-browser-close]{display:none}${filter === 'writing' ? '.map-node:not([data-category="writing"]){display:none}' : ''}</style></noscript>
        <dialog class="field-screen about-screen" data-about-popup aria-labelledby="about-screen-heading">${renderAbout(about, true)}</dialog>
        <p class="visually-hidden" data-field-announcement role="status" aria-live="polite"></p>
    </div>`;
}
export function renderWorkReturn(id) {
    return `<a class="work-field-return" href="/projects#${anchorFor(id)}">return [ * ]</a>`;
}
