import {normalizeSiteUrl, getView} from "./navigation.js";
import {initColorPalette} from "./colors.js";
import {saveCollectionPosition, readCollectionPosition, saveWorkReturn} from "./collection-state.js";

(() => {
    const site = document.querySelector('.site-shell');
    if (!site || typeof HTMLDialogElement === 'undefined') return;
    const homeView = site.querySelector('.home-view');
    const collectionView = site.querySelector('[data-collection-view]');
    const aboutView = site.querySelector('[data-about-view]');
    const workItems = [...site.querySelectorAll('[data-work-id]')];
    const emptyMessage = site.querySelector('[data-collection-empty]');
    const categoryLinks = [...site.querySelectorAll('[data-category-filter]')];
    const tagLinks = [...site.querySelectorAll('[data-tag-filter]')];
    const announcement = site.querySelector('[data-view-announcement]');
    const resetPalettes = new Map([...site.querySelectorAll('[data-color-composition]')].map(view => [view, initColorPalette(view)]));
    let previousView;
    const originalUrl = new URL(location.href);
    let initialState = history.state;
    if (originalUrl.searchParams.get('about') === '1') {
        originalUrl.searchParams.delete('about');
        initialState = {...initialState, returnUrl: normalizeSiteUrl(originalUrl).href};
    }
    history.replaceState(initialState, '', normalizeSiteUrl(location.href));

    function rememberPosition() {
        if (!collectionView.open) return;
        const position = saveCollectionPosition(location.href, collectionView.scrollTop);
        if (position) history.replaceState({...history.state, collectionPosition: position}, '', location.href);
    }
    function rememberWork(event) {
        const link = event.target.closest('a.collection-item');
        if (!collectionView.open || !link) return;
        rememberPosition();
        const workUrl = new URL(link.href, location.href);
        if (workUrl.origin !== location.origin) return;
        const returnUrl = new URL(location.href);
        returnUrl.hash = link.id;
        saveWorkReturn(workUrl, returnUrl, collectionView.scrollTop);
    }

    function render(announce = false, restorePosition = false) {
        const url = normalizeSiteUrl(location.href);
        if (url.href !== location.href) history.replaceState(history.state, '', url);
        const view = getView(url);
        const selectedCategory = url.searchParams.get('category') || 'all';
        const selectedTag = url.searchParams.get('tag');
        for (const [dialog, active] of [[collectionView, view === 'collection'], [aboutView, view === 'about']]) {
            if (!active && dialog.open) dialog.close();
            if (active && !dialog.open) dialog.showModal();
        }
        if (view !== previousView) {
            resetPalettes.get({home: homeView, collection: collectionView, about: aboutView}[view])?.();
            previousView = view;
        }
        document.documentElement.classList.toggle('site-view-open', collectionView.open || aboutView.open);
        document.title = {home: 'KEVIN CUNANAN CHAPPELLE', collection: 'COLLECTION', about: 'ABOUT'}[view];
        workItems.forEach(item => {
            item.hidden = (selectedCategory !== 'all' && item.dataset.category !== selectedCategory)
                || (selectedTag !== null && !item.dataset.tags.split(' ').includes(selectedTag));
        });
        const visibleCount = workItems.filter(item => !item.hidden).length;
        emptyMessage.hidden = visibleCount > 0;
        categoryLinks.forEach(link => {
            link.setAttribute('aria-current', link.dataset.categoryFilter === selectedCategory ? 'page' : 'false');
            const destination = new URL('/?view=collection', location.href);
            if (link.dataset.categoryFilter !== 'all') destination.searchParams.set('category', link.dataset.categoryFilter);
            if (selectedTag) destination.searchParams.set('tag', selectedTag);
            link.href = destination.href;
        });
        tagLinks.forEach(link => {
            const active = link.dataset.tagFilter === selectedTag;
            link.setAttribute('aria-current', active ? 'page' : 'false');
            const destination = new URL('/?view=collection', location.href);
            if (selectedCategory !== 'all') destination.searchParams.set('category', selectedCategory);
            if (!active) destination.searchParams.set('tag', link.dataset.tagFilter);
            link.href = destination.href;
        });
        if (collectionView.open) {
            const saved = history.state?.collectionPosition;
            const position = restorePosition && (saved?.url === url.href ? saved : readCollectionPosition(url));
            if (position && Number.isFinite(position.scrollTop)) {
                // Dialog scrolling is separate from the document's browser-managed scroll.
                requestAnimationFrame(() => {
                    if (collectionView.open && location.href === url.href) collectionView.scrollTop = position.scrollTop;
                });
            } else if (url.hash) {
                workItems.find(item => item.id === url.hash.slice(1) && !item.hidden)?.scrollIntoView({block: 'center'});
            }
        }
        if (announce) announcement.textContent = view === 'collection' ? `${selectedCategory} collection${selectedTag ? `, #${selectedTag}` : ''}, ${visibleCount} works` : view;
    }
    function navigate(destination, restorePosition = false) {
        rememberPosition();
        const url = normalizeSiteUrl(destination);
        if (url.href !== location.href) history.pushState(getView(url) === 'about' ? {returnUrl: location.href} : null, '', url);
        render(true, restorePosition);
    }
    collectionView.addEventListener('cancel', event => {
        event.preventDefault();
        navigate(new URL('/', location.href));
    });
    aboutView.addEventListener('cancel', event => {
        event.preventDefault();
        navigate(history.state?.returnUrl || new URL('/', location.href), true);
    });
    site.querySelectorAll('[data-view-link="about"], [data-view-link="collection"]').forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
    site.addEventListener('click', event => {
        rememberWork(event);
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a');
        if (!link?.matches('[data-view-link], [data-category-filter], [data-tag-filter]')) return;
        event.preventDefault();
        navigate(link.href);
        if (collectionView.open && link.matches('[data-category-filter], [data-tag-filter]')) collectionView.scrollTop = 0;
    });
    site.addEventListener('auxclick', rememberWork);
    site.addEventListener('contextmenu', rememberWork);
    window.addEventListener('pagehide', rememberPosition);
    window.addEventListener('pageshow', event => {
        if (event.persisted) previousView = undefined;
        // Run after native fragment scrolling as well as Back/Forward restoration.
        render(false, true);
    });
    window.addEventListener('popstate', () => { previousView = undefined; render(true, true); });
    window.addEventListener('hashchange', () => render(true));
    render(false, true);
})();

