import {normalizeSiteUrl, getView} from "./navigation.js?v=6a3043fb24";

// Each screen owns its colors; toggles add or remove only that color's rectangle.
function initColorPalette(composition) {
    const swatches = [...composition.querySelectorAll('[data-color]')];
    const rectangleLayer = composition.querySelector('[data-color-artifacts]');
    rectangleLayer.removeAttribute('aria-hidden');
    rectangleLayer.setAttribute('role', 'group');
    rectangleLayer.setAttribute('aria-label', 'color rectangles');
    const selectedColors = new Set(swatches.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.color));
    const rectangles = new Map();
    if (!selectedColors.size) selectedColors.add(swatches[0].dataset.color);
    const random = (min, max) => min + Math.random() * (max - min);
    function moveRectangle(rectangle) {
        Object.assign(rectangle.style, {
            left: `${random(0, 100 - parseFloat(rectangle.style.width))}%`,
            top: `${random(18, 86 - parseFloat(rectangle.style.height))}%`
        });
    }
    function addRectangle(color) {
        const rectangle = document.createElement('button');
        rectangle.type = 'button';
        rectangle.className = 'color-rectangle';
        const closeMarker = document.createElement('span');
        closeMarker.className = 'rectangle-close';
        closeMarker.textContent = 'x';
        closeMarker.setAttribute('aria-hidden', 'true');
        rectangle.addEventListener('click', (event) => {
            if (event.detail > 0) rectangle.blur();
            toggleColor(color);
            if (event.detail === 0 && !selectedColors.has(color)) swatches.find((button) => button.dataset.color === color).focus();
        });
        rectangle.append(closeMarker);
        const width = random(8, 30);
        const height = random(4, 20);
        Object.assign(rectangle.style, {
            background: color, width: `${width}%`, height: `${height}%`
        });
        moveRectangle(rectangle);
        rectangles.set(color, rectangle);
        rectangleLayer.append(rectangle);
    }
    function updateSwatches() {
        swatches.forEach((button) => {
            const color = button.dataset.color;
            button.setAttribute('aria-pressed', String(selectedColors.has(color)));
            rectangles.get(color)?.setAttribute('aria-label', `${selectedColors.size === 1 ? 'reposition' : 'close'} ${button.getAttribute('aria-label')} rectangle`);
        });
    }
    function regenerate() {
        rectangleLayer.replaceChildren();
        rectangles.clear();
        selectedColors.forEach(addRectangle);
        updateSwatches();
    }
    function toggleColor(color) {
        if (selectedColors.has(color)) {
            if (selectedColors.size === 1) {
                moveRectangle(rectangles.get(color));
                return;
            }
            selectedColors.delete(color);
            rectangles.get(color).remove();
            rectangles.delete(color);
        } else {
            selectedColors.add(color);
            addRectangle(color);
        }
        updateSwatches();
    }
    swatches.forEach((button) => button.addEventListener('click', () => toggleColor(button.dataset.color)));
    regenerate();
    return function reset() {
        selectedColors.clear();
        selectedColors.add('#0000ff');
        regenerate();
    };
}

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

    function render(announce = false) {
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
            resetPalettes.get(view === 'collection' ? collectionView : homeView)?.();
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
        if (collectionView.open && url.hash) workItems.find(item => item.id === url.hash.slice(1) && !item.hidden)?.scrollIntoView({block: 'center'});
        if (announce) announcement.textContent = view === 'collection' ? `${selectedCategory} collection${selectedTag ? `, #${selectedTag}` : ''}, ${visibleCount} works` : view;
    }
    function navigate(destination) {
        const url = normalizeSiteUrl(destination);
        if (url.href !== location.href) history.pushState(getView(url) === 'about' ? {returnUrl: location.href} : null, '', url);
        render(true);
    }
    collectionView.addEventListener('cancel', event => {
        event.preventDefault();
        navigate(new URL('/', location.href));
    });
    aboutView.addEventListener('cancel', event => {
        event.preventDefault();
        navigate(history.state?.returnUrl || new URL('/', location.href));
    });
    site.querySelectorAll('[data-view-link="about"], [data-view-link="collection"]').forEach(link => link.setAttribute('aria-haspopup', 'dialog'));
    site.addEventListener('click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a');
        if (!link?.matches('[data-view-link], [data-category-filter], [data-tag-filter]')) return;
        event.preventDefault();
        navigate(link.href);
        if (collectionView.open && link.matches('[data-category-filter], [data-tag-filter]')) collectionView.scrollTop = 0;
    });
    window.addEventListener('pageshow', event => {
        if (event.persisted) { previousView = undefined; render(); }
    });
    window.addEventListener('popstate', () => { previousView = undefined; render(true); });
    window.addEventListener('hashchange', () => render(true));
    render();
})();

