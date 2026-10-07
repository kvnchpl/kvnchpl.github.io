(() => {
    const shell = document.querySelector('.field-shell');
    if (!shell) {
        const returnLink = document.querySelector('.work-field-return');
        try {
            if (returnLink && localStorage.getItem('field-view') === 'index') {
                const target = new URL(returnLink.href);
                target.searchParams.set('view', 'index');
                returnLink.href = target.pathname + target.search + target.hash;
            }
        } catch { /* The ordinary return link remains usable. */ }
        return;
    }
    const modeLinks = [...shell.querySelectorAll('[data-field-view]')];
    const mapNodes = [...shell.querySelectorAll('[data-map-node]')];
    const browser = shell.querySelector('[data-field-browser]');
    const browserClose = shell.querySelector('[data-browser-close]');
    const about = shell.querySelector('[data-about-popup]');
    const aboutClose = shell.querySelector('[data-about-close]');
    const aboutLink = shell.querySelector('[data-about-open]');
    aboutLink.setAttribute('aria-haspopup', 'dialog');
    modeLinks.forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));
    const initial = new URL(location.href);
    if (!initial.searchParams.has('view') && shell.dataset.defaultView === 'index') initial.searchParams.set('view', 'index');
    initial.searchParams.delete('peek');
    history.replaceState(null, '', initial);
    function render(announce = false) {
        const url = new URL(location.href);
        const view = ['index', 'network'].includes(url.searchParams.get('view')) ? url.searchParams.get('view') : 'landing';
        const anchor = url.hash.slice(1);
        shell.dataset.view = view;
        shell.classList.add('field-ready');
        modeLinks.forEach((link) => {
            link.setAttribute('aria-current', String(link.dataset.fieldView === view));
            const target = new URL(url);
            target.searchParams.set('view', link.dataset.fieldView);
            link.href = target.pathname + target.search + target.hash;
        });
        mapNodes.forEach((node) => node.toggleAttribute('data-selected', node.id === anchor));
        shell.querySelectorAll('[data-index-node]').forEach((row) => row.toggleAttribute('data-selected', row.dataset.indexNode === anchor));
        try { if (view !== 'landing') localStorage.setItem('field-view', view); } catch { /* Optional preference. */ }
        if (announce) shell.querySelector('[data-field-announcement]').textContent = view === 'network' ? 'atlas' : view === 'landing' ? 'entrance' : 'index';
        if (view === 'landing') {
            if (browser.open) browser.close();
        } else if (!browser.open) {
            browser.showModal();
            browserClose.focus({preventScroll: true});
        }
        if (browser.open && anchor) {
            const selected = view === 'network' ? mapNodes.find((node) => node.id === anchor) : [...shell.querySelectorAll('[data-index-node]')].find((row) => row.dataset.indexNode === anchor);
            selected?.scrollIntoView({block: 'center'});
        }
        if (url.searchParams.get('about') === '1') {
            if (!about.open) about.showModal();
        } else if (about.open) about.close();
    }
    for (const [dialog, button, params] of [[browser, browserClose, ['view']], [about, aboutClose, ['about']]]) {
        const close = () => {
            dialog.close();
            const url = new URL(location.href);
            params.forEach((param) => url.searchParams.delete(param));
            history.replaceState(null, '', url);
            render();
        };
        button.addEventListener('click', close);
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
        dialog.addEventListener('click', (event) => {
            const rect = dialog.getBoundingClientRect();
            if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) close();
        });
    }
    const landing = shell.querySelector('.landing');
    const colors = [...shell.querySelectorAll('[data-color]')];
    let intervention = 0;
    colors.forEach((button, index) => button.addEventListener('click', () => {
        colors.forEach((color) => color.setAttribute('aria-pressed', String(color === button)));
        landing.style.setProperty('--intervention', button.dataset.color);
        landing.style.setProperty('--counter-color', ['#ffff00', '#00ffff', '#0000ff'][index % 3]);
        landing.dataset.colorLayout = String(++intervention % 3);
    }));
    shell.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a');
        if (!link) return;
        const target = new URL(location.href);
        if (link === aboutLink) target.searchParams.set('about', '1');
        else if (link.matches('[data-field-view]')) target.searchParams.set('view', link.dataset.fieldView);
        else return; // Work links navigate directly, including PDFs and external projects.
        event.preventDefault();
        if (target.href !== location.href) history.pushState(null, '', target);
        render(true);
    });
    window.addEventListener('popstate', () => render(true));
    window.addEventListener('hashchange', () => render(true));
    render();
})();
