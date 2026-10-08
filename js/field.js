(() => {
    const shell = document.querySelector('.field-shell');
    if (!shell || typeof HTMLDialogElement === 'undefined') return;
    const browser = shell.querySelector('[data-field-browser]');
    const about = shell.querySelector('[data-about-popup]');
    const nodes = [...shell.querySelectorAll('[data-map-node]')];
    const filters = [...shell.querySelectorAll('[data-category-filter]')];
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
        document.documentElement.classList.toggle('field-screen-open', browser.open || about.open);
        nodes.forEach((node) => {
            node.hidden = selectedCategory !== 'all' && node.dataset.category !== selectedCategory;
            node.toggleAttribute('data-selected', node.id === url.hash.slice(1));
        });
        filters.forEach((link) => {
            link.setAttribute('aria-current', link.dataset.categoryFilter === selectedCategory ? 'page' : 'false');
        });
        if (browser.open && url.hash) nodes.find((node) => node.id === url.hash.slice(1) && !node.hidden)?.scrollIntoView({block: 'center'});
        if (announce) shell.querySelector('[data-field-announcement]').textContent = view === 'atlas' ? `${selectedCategory} projects` : view === 'about' ? 'about' : 'entrance';
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
    for (const [dialog, selector] of [[browser, '[data-browser-close]'], [about, '[data-about-close]']]) {
        const close = dialog === about ? () => {
            const url = new URL(location.href);
            url.searchParams.delete('about');
            go(url);
        } : entrance;
        dialog.querySelector(selector).addEventListener('click', close);
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
    }
    shell.querySelectorAll('[data-about-open], [data-atlas-open], [data-about-atlas]').forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));
    shell.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a');
        if (!link) return;
        const url = new URL(location.href);
        if (link.matches('[data-about-open]')) {
            url.searchParams.set('about', '1');
        } else if (link.matches('[data-atlas-open], [data-about-atlas], [data-category-filter]')) {
            url.searchParams.delete('about');
            url.searchParams.set('view', 'atlas');
            url.searchParams.set('category', link.dataset.categoryFilter || 'all');
            url.hash = '';
        } else return;
        event.preventDefault();
        go(url);
        if (browser.open && link.matches('[data-category-filter]')) browser.scrollTop = 0;
    });
    for (const composition of shell.querySelectorAll('[data-color-composition]')) {
        const colors = [...composition.querySelectorAll('[data-color]')];
        let intervention = 0;
        colors.forEach((button, index) => button.addEventListener('click', () => {
            colors.forEach((color) => color.setAttribute('aria-pressed', String(color === button)));
            composition.style.setProperty('--intervention', button.dataset.color);
            composition.style.setProperty('--counter-color', ['#ffff00', '#00ffff', '#0000ff'][index % 3]);
            composition.dataset.colorLayout = String(++intervention % 3);
        }));
    }
    window.addEventListener('popstate', () => render(true));
    window.addEventListener('hashchange', () => render(true));
    render();
})();
