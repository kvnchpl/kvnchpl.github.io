// Canonical site addresses. Older names are accepted only at this boundary.
export const legacyPages = {
    'home.html': '/',
    'projects.html': '/?view=collection',
    'writings.html': '/?view=collection&category=writing',
    'about.html': '/?view=about'
};
const legacyViews = {atlas: 'collection', network: 'collection', index: 'collection', landing: 'home'};
const legacyCategories = {image: 'images', spaces: 'space', interfaces: 'interface'};
const views = new Set(['home', 'collection', 'about']);
const categories = new Set(['images', 'space', 'interface', 'writing']);
const tags = new Set(['belief', 'desire', 'truth', 'fire', 'free']);

export function normalizeSiteUrl(input) {
    const url = new URL(input, 'https://kvnchpl.com');
    const path = url.pathname.replace(/\/$/, '').replace(/\.html$/, '');
    const alias = legacyPages[`${path.slice(1)}.html`];
    if (!alias && !['', '/index'].includes(path)) return url;
    const defaults = new URL(alias || '/', url.origin);
    url.pathname = '/';
    let view = url.searchParams.get('view') || defaults.searchParams.get('view');
    view = legacyViews[view] || view;
    if (url.searchParams.get('about') === '1') view = 'about';
    if (!view && (url.searchParams.has('category') || url.searchParams.has('tag'))) view = 'collection';
    if (!views.has(view)) view = 'home';
    url.searchParams.delete('about');
    url.searchParams.delete('peek');
    if (view === 'home') url.searchParams.delete('view');
    else url.searchParams.set('view', view);
    let category = url.searchParams.get('category') || defaults.searchParams.get('category');
    category = legacyCategories[category] || category;
    if (view === 'collection' && categories.has(category)) url.searchParams.set('category', category);
    else url.searchParams.delete('category');
    if (view !== 'collection' || !tags.has(url.searchParams.get('tag'))) url.searchParams.delete('tag');
    const parameters = new URLSearchParams();
    for (const key of ['view', 'category', 'tag']) {
        if (url.searchParams.has(key)) parameters.set(key, url.searchParams.get(key));
    }
    for (const [key, value] of url.searchParams) {
        if (!['view', 'category', 'tag'].includes(key)) parameters.append(key, value);
    }
    url.search = parameters.toString();
    return url;
}

export function getView(url) {
    const view = url.searchParams.get('view');
    return views.has(view) ? view : 'home';
}
