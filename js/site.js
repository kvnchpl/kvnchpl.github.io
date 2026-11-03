import {normalizeSiteUrl, getView} from "./navigation.js";
import "./colors.js";
import {saveCollectionPosition, readCollectionPosition, saveWorkReturn} from "./collection-state.js";

(() => {
    const site = document.querySelector('.site-shell');
    if (!site || typeof HTMLDialogElement === 'undefined') return;
    const collectionView = site.querySelector('[data-collection-view]');
    const unlistedView = site.querySelector('[data-unlisted-view]');
    const currentCollection = () => unlistedView?.open ? unlistedView : collectionView;
    const aboutView = site.querySelector('[data-about-view]');
    const workItems = [...site.querySelectorAll('[data-work-id]')];
    const emptyMessage = site.querySelector('[data-collection-empty]');
    const categoryLinks = [...site.querySelectorAll('[data-category-filter]')];
    const tagLinks = [...site.querySelectorAll('[data-tag-filter]')];
    const announcement = site.querySelector('[data-view-announcement]');
    const originalUrl = new URL(location.href);
    let initialState = history.state;
    if (originalUrl.searchParams.get('about') === '1') {
        originalUrl.searchParams.delete('about');
        initialState = {...initialState, returnUrl: normalizeSiteUrl(originalUrl).href};
    }
    history.replaceState(initialState, '', normalizeSiteUrl(location.href));

    function rememberPosition() {
        const current = currentCollection();
        if (!current.open) return;
        const position = saveCollectionPosition(location.href, currentCollection().scrollTop);
        if (position) history.replaceState({...history.state, collectionPosition: position}, '', location.href);
    }
    function rememberWork(event) {
        const link = event.target.closest('a.collection-item');
        const current = currentCollection();
        if (!current.open || !link) return;
        rememberPosition();
        const workUrl = new URL(link.href, location.href);
        if (workUrl.origin !== location.origin) return;
        const returnUrl = new URL(location.href);
        returnUrl.hash = link.id;
        saveWorkReturn(workUrl, returnUrl, currentCollection().scrollTop);
    }

    function render(announce = false, restorePosition = false) {
        const url = normalizeSiteUrl(location.href);
        if (url.href !== location.href) history.replaceState(history.state, '', url);
        const view = getView(url);
        let robots=document.querySelector('meta[data-view-robots]');
        if (view === 'unlisted') { if (!robots) { robots=document.createElement('meta');robots.name='robots';robots.dataset.viewRobots='';document.head.append(robots); } robots.content='noindex, nofollow'; } else robots?.remove();
        const selectedCategory = url.searchParams.get('category') || 'all';
        const selectedTag = url.searchParams.get('tag');
        for (const [dialog, active] of [[collectionView, view === 'collection'], [unlistedView, view === 'unlisted'], [aboutView, view === 'about']]) {
            if (!dialog) continue;
            if (!active && dialog.open) dialog.close();
            if (active && !dialog.open) dialog.showModal();
        }
        document.documentElement.classList.toggle('site-view-open', collectionView.open || Boolean(unlistedView?.open) || aboutView.open);
        document.title = {home: 'KEVIN CUNANAN CHAPPELLE', collection: 'COLLECTION', unlisted: 'UNLISTED', about: 'ABOUT'}[view];
        workItems.forEach(item => {
            item.hidden = (selectedCategory !== 'all' && item.dataset.category !== selectedCategory)
                || (selectedTag !== null && !item.dataset.tags.split(' ').includes(selectedTag));
        });
        const activeCollection = view === 'unlisted' ? unlistedView : collectionView;
        const visibleCount = workItems.filter(item => !item.hidden && activeCollection?.contains(item)).length;
        if (activeCollection) activeCollection.querySelector('[data-collection-empty]').hidden = visibleCount > 0;
        categoryLinks.forEach(link => {
            link.setAttribute('aria-current', link.dataset.categoryFilter === selectedCategory ? 'page' : 'false');
            const destination = new URL(link.closest('[data-unlisted-view]') ? '/?view=unlisted' : '/?view=collection', location.href);
            if (link.dataset.categoryFilter !== 'all') destination.searchParams.set('category', link.dataset.categoryFilter);
            if (selectedTag) destination.searchParams.set('tag', selectedTag);
            link.href = destination.href;
        });
        tagLinks.forEach(link => {
            const active = link.dataset.tagFilter === selectedTag;
            link.setAttribute('aria-current', active ? 'page' : 'false');
            const destination = new URL(link.closest('[data-unlisted-view]') ? '/?view=unlisted' : '/?view=collection', location.href);
            if (selectedCategory !== 'all') destination.searchParams.set('category', selectedCategory);
            if (!active) destination.searchParams.set('tag', link.dataset.tagFilter);
            link.href = destination.href;
        });
        if (activeCollection?.open) {
            const saved = history.state?.collectionPosition;
            const position = restorePosition && (saved?.url === url.href ? saved : readCollectionPosition(url));
            if (position && Number.isFinite(position.scrollTop)) {
                // Dialog scrolling is separate from the document's browser-managed scroll.
                requestAnimationFrame(() => {
                    if (activeCollection.open && location.href === url.href) currentCollection().scrollTop = position.scrollTop;
                });
            } else if (url.hash) {
                workItems.find(item => item.id === url.hash.slice(1) && !item.hidden && activeCollection.contains(item))?.scrollIntoView({block: 'center'});
            }
        }
        if (announce) announcement.textContent = ['collection','unlisted'].includes(view) ? `${selectedCategory} collection${selectedTag ? `, #${selectedTag}` : ''}, ${visibleCount} works` : view;
    }
    function navigate(destination, restorePosition = false) {
        rememberPosition();
        const url = normalizeSiteUrl(destination);
        if (url.href !== location.href) history.pushState(getView(url) === 'about' ? {returnUrl: location.href} : null, '', url);
        render(true, restorePosition);
    }
    unlistedView?.addEventListener('cancel', event => { event.preventDefault(); navigate(new URL('/', location.href)); });
    collectionView.addEventListener('cancel', event => {
        event.preventDefault();
        navigate(new URL('/', location.href));
    });
    aboutView.addEventListener('cancel', event => {
        event.preventDefault();
        navigate(history.state?.returnUrl || new URL('/', location.href), true);
    });
    site.querySelectorAll('[data-view-link="about"], [data-view-link="collection"], [data-view-link="unlisted"]').forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
    site.addEventListener('click', event => {
        rememberWork(event);
        const link = event.target.closest('a');
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || (event.altKey && !link?.matches('[data-unlisted-link]'))) return;
        if (!link?.matches('[data-view-link], [data-category-filter], [data-tag-filter]')) return;
        event.preventDefault();
        navigate(link.href);
        if (currentCollection().open && link.matches('[data-category-filter], [data-tag-filter]')) currentCollection().scrollTop = 0;
    });
    site.addEventListener('auxclick', rememberWork);
    site.addEventListener('contextmenu', rememberWork);
    window.addEventListener('pagehide', rememberPosition);
    window.addEventListener('pageshow', event => {
        // Run after native fragment scrolling as well as Back/Forward restoration.
        render(false, true);
    });
    window.addEventListener('popstate', () => render(true, true));
    window.addEventListener('hashchange', () => render(true));
    render(false, true);
})();

