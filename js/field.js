// Each screen owns its selected colors; redraw without animation on entry or a toggle.
function initColorPalette(composition) {
    const buttons = [...composition.querySelectorAll('[data-color]')];
    const artifacts = composition.querySelector('[data-color-artifacts]');
    const selected = new Set(buttons.filter((button) => button.getAttribute('aria-pressed') === 'true').map((button) => button.dataset.color));
    if (!selected.size) selected.add(buttons[0].dataset.color);
    const random = (min, max) => min + Math.random() * (max - min);
    function regenerate() {
        buttons.forEach((button) => button.setAttribute('aria-pressed', String(selected.has(button.dataset.color))));
        const rectangles = [...selected].map((color) => {
            const rectangle = document.createElement('span');
            rectangle.className = 'color-rectangle';
            const width = random(8, 30);
            const height = random(4, 20);
            Object.assign(rectangle.style, {
                background: color, width: `${width}%`, height: `${height}%`,
                left: `${random(0, 100 - width)}%`, top: `${random(18, 86 - height)}%`
            });
            return rectangle;
        });
        artifacts.replaceChildren(...rectangles);
    }
    buttons.forEach((button) => button.addEventListener('click', () => {
        const color = button.dataset.color;
        if (selected.has(color)) {
            if (selected.size === 1) return;
            selected.delete(color);
        } else selected.add(color);
        regenerate();
    }));
    regenerate();
    return regenerate;
}

(() => {
    const shell = document.querySelector('.field-shell');
    if (!shell || typeof HTMLDialogElement === 'undefined') return;
    const browser = shell.querySelector('[data-field-browser]');
    const about = shell.querySelector('[data-about-popup]');
    const nodes = [...shell.querySelectorAll('[data-map-node]')];
    const filters = [...shell.querySelectorAll('[data-category-filter]')];
    const regenerateColors = new Map([...shell.querySelectorAll('[data-color-composition]')].map((composition) => [composition, initColorPalette(composition)]));
    let previousView;
    const initial = new URL(location.href);
    // Previously shared atlas/index links both resolve to the single visual catalog.
    if (['network', 'index'].includes(initial.searchParams.get('view'))) initial.searchParams.set('view', 'atlas');
    const renamedCategory = {images: 'image', spaces: 'space', interfaces: 'interface'}[initial.searchParams.get('category')];
    if (renamedCategory) initial.searchParams.set('category', renamedCategory);
    initial.searchParams.delete('peek');
    history.replaceState(null, '', initial);
    function render(announce = false) {
        const url = new URL(location.href);
        const view = url.searchParams.get('about') === '1' ? 'about' : url.searchParams.get('view') || shell.dataset.defaultView;
        const category = url.searchParams.get('category') || shell.dataset.defaultCategory;
        const selectedCategory = filters.some((link) => link.dataset.categoryFilter === category) ? category : 'all';
        for (const [dialog, open] of [[browser, view === 'atlas'], [about, view === 'about']]) {
            if (!open && dialog.open) dialog.close();
            if (open && !dialog.open) dialog.showModal();
        }
        if (view !== previousView) {
            regenerateColors.get(view === 'atlas' ? browser : shell.querySelector('.landing'))?.();
            previousView = view;
        }
        document.documentElement.classList.toggle('field-screen-open', browser.open || about.open);
        nodes.forEach((node) => {
            node.hidden = selectedCategory !== 'all' && node.dataset.category !== selectedCategory;
            node.toggleAttribute('data-selected', node.id === url.hash.slice(1));
        });
        filters.forEach((link) => {
            link.setAttribute('aria-current', link.dataset.categoryFilter === selectedCategory ? 'page' : 'false');
        });
        if (browser.open && url.hash) nodes.find((node) => node.id === url.hash.slice(1) && !node.hidden)?.scrollIntoView({block: 'center'});
        if (announce) shell.querySelector('[data-field-announcement]').textContent = view === 'atlas' ? `${selectedCategory} collection` : view === 'about' ? 'about' : 'entrance';
    }
    function go(url) {
        if (url.href !== location.href) history.pushState(null, '', url);
        render(true);
    }
    function entrance() {
        // Explicit entrance state also works on the standalone collection URLs.
        const url = new URL(location.href);
        url.searchParams.set('view', 'landing');
        url.searchParams.delete('about');
        url.searchParams.delete('category');
        url.hash = '';
        go(url);
    }
    for (const dialog of [browser, about]) {
        const close = dialog === about ? () => {
            const url = new URL(location.href);
            url.searchParams.delete('about');
            go(url);
        } : entrance;
        dialog.querySelector('[data-browser-close]').addEventListener('click', entrance);
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
    }
    shell.querySelectorAll('[data-about-open], [data-atlas-open]').forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));
    shell.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a');
        if (!link) return;
        const url = new URL(location.href);
        if (link.matches('[data-about-open]')) {
            url.searchParams.set('about', '1');
        } else if (link.matches('[data-atlas-open], [data-category-filter]')) {
            url.searchParams.delete('about');
            url.searchParams.set('view', 'atlas');
            url.searchParams.set('category', link.dataset.categoryFilter || 'all');
            url.hash = '';
        } else return;
        event.preventDefault();
        go(url);
        if (browser.open && link.matches('[data-category-filter]')) browser.scrollTop = 0;
    });
    window.addEventListener('popstate', () => render(true));
    window.addEventListener('hashchange', () => render(true));
    render();
})();
