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
        } catch { /* The static return link remains usable. */ }
        return;
    }
    const nodes = [...shell.querySelectorAll('[data-field-node]')];
    const byAnchor = new Map(nodes.map((node) => [node.id, node]));
    const modeLinks = [...shell.querySelectorAll('[data-field-view]')];
    const retrace = shell.querySelector('.field-retrace');
    const mapNodes = [...shell.querySelectorAll('[data-map-node]')];
    const mapEdges = [...shell.querySelectorAll('[data-map-edge]')];
    const mapViewport = shell.querySelector('.map-viewport');
    const popup = shell.querySelector('[data-field-popup]');
    const closeButton = popup.querySelector('[data-popup-close]');
    const browser = shell.querySelector('[data-field-browser]');
    const browserClose = shell.querySelector('[data-browser-close]');
    const about = shell.querySelector('[data-about-popup]');
    const aboutClose = shell.querySelector('[data-about-close]');
    const aboutLink = shell.querySelector('[data-about-open]');
    aboutLink.setAttribute('aria-haspopup', 'dialog');
    modeLinks.forEach((link) => link.setAttribute('aria-haspopup', 'dialog'));
    shell.querySelectorAll('[data-field-passage], [data-field-preview]').forEach((link) => {
        link.setAttribute('aria-haspopup', 'dialog');
        link.setAttribute('aria-controls', 'field-preview');
    });
    let trail = [];
    const initial = new URL(location.href);
    if (!initial.searchParams.has('view') && shell.dataset.defaultView === 'index') initial.searchParams.set('view', 'index');
    if (initial.hash && !byAnchor.has(initial.hash.slice(1))) initial.hash = '';
    history.replaceState(null, '', initial);

    function render(announce = false) {
        const url = new URL(location.href);
        const view = ['index', 'network'].includes(url.searchParams.get('view')) ? url.searchParams.get('view') : 'landing';
        const anchor = byAnchor.has(url.hash.slice(1)) ? url.hash.slice(1) : shell.dataset.fieldStart;
        shell.dataset.view = view;
        shell.classList.add('field-ready');
        nodes.forEach((node) => { node.hidden = node.id !== anchor; });
        modeLinks.forEach((link) => {
            link.setAttribute('aria-current', link.dataset.fieldView === view ? 'true' : 'false');
            const target = new URL(url);
            target.searchParams.set('view', link.dataset.fieldView);
            target.hash = anchor;
            target.searchParams.delete('peek');
            link.href = target.pathname + target.search + target.hash;
        });
        const selected = byAnchor.get(anchor);
        const neighbors = new Set();
        mapEdges.forEach((edge) => {
            const endpoints = edge.dataset.mapEdge.split(' ');
            const active = endpoints.includes(anchor);
            edge.toggleAttribute('data-active', active);
            if (active) endpoints.forEach((endpoint) => neighbors.add(endpoint));
        });
        mapNodes.forEach((node) => {
            const current = node.dataset.mapNode === anchor;
            node.toggleAttribute('data-selected', current);
            node.toggleAttribute('data-neighbor', !current && neighbors.has(node.dataset.mapNode));
            node.setAttribute('aria-current', String(current));
        });
        const currentLink = shell.querySelector('[data-map-current]');
        const destination = selected.querySelector('.encounter-open');
        currentLink.textContent = `${selected.querySelector('h2').textContent} [ + ]`;
        currentLink.href = destination.href;
        currentLink.dataset.fieldTarget = anchor;
        shell.querySelectorAll('[data-index-node]').forEach((row) => {
            row.toggleAttribute('data-selected', row.dataset.indexNode === selected.dataset.fieldNode);
        });
        retrace.hidden = !trail.length;
        retrace.href = trail.at(-1) || '#';
        try { if (view !== 'landing') localStorage.setItem('field-view', view); } catch { /* Optional preference. */ }
        if (announce) shell.querySelector('[data-field-announcement]').textContent = view === 'landing' ? 'entrance' : `${view}: ${selected.querySelector('h2').textContent}`;
        if (url.searchParams.get('peek') !== '1' && popup.open) popup.close();
        if (view === 'landing') {
            if (browser.open) browser.close();
        } else if (!browser.open) {
            browser.showModal();
            browserClose.focus({preventScroll: true});
        }
        if (view === 'network') locate();
        if (url.searchParams.get('about') === '1') {
            if (!about.open) about.showModal();
        } else if (about.open) about.close();
        popup.setAttribute('aria-labelledby', selected.querySelector('h2').id);
        popup.dataset.position = nodes.indexOf(selected) % 3;
        if (url.searchParams.get('peek') === '1') {
            if (!popup.open) popup.showModal();
            popup.scrollTop = 0;
            closeButton.focus({preventScroll: true});
        }
    }
    function locate() {
        const selected = mapNodes.find((node) => node.hasAttribute('data-selected'));
        if (selected) mapViewport.scrollTo({left: selected.offsetLeft - mapViewport.clientWidth / 2, top: selected.offsetTop - mapViewport.clientHeight / 2});
    }
    shell.querySelector('[data-map-locate]').addEventListener('click', locate);
    function dismiss() {
        popup.close();
        const url = new URL(location.href);
        url.searchParams.delete('peek');
        history.replaceState(null, '', url);
        render();
    }
    closeButton.addEventListener('click', dismiss);
    // Dismiss synchronously; queued native close events must not rewrite history.
    // The browser still handles focus trapping and returning focus to the opener.
    popup.addEventListener('cancel', (event) => {
        event.preventDefault();
        dismiss();
    });
    popup.addEventListener('click', (event) => {
        const rect = popup.getBoundingClientRect();
        if (event.target === popup && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dismiss();
    });
    function closeLayer(dialog, params) {
        dialog.close();
        const url = new URL(location.href);
        params.forEach((param) => url.searchParams.delete(param));
        history.replaceState(null, '', url);
        render();
    }
    for (const [dialog, button, params] of [[browser, browserClose, ['view', 'peek']], [about, aboutClose, ['about']]]) {
        const close = () => closeLayer(dialog, params);
        button.addEventListener('click', close);
        dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(); });
        dialog.addEventListener('click', (event) => {
            const rect = dialog.getBoundingClientRect();
            if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) close();
        });
    }
    // Discrete, static compositions: no animation loop or dragging machinery.
    const landing = shell.querySelector('.landing');
    const colors = [...shell.querySelectorAll('[data-color]')];
    let intervention = 0;
    colors.forEach((button, index) => button.addEventListener('click', () => {
        colors.forEach((color) => color.setAttribute('aria-pressed', String(color === button)));
        landing.style.setProperty('--intervention', button.dataset.color);
        landing.style.setProperty('--counter-color', ['yellow', 'cyan', 'blue'][index % 3]);
        landing.dataset.colorLayout = String(++intervention % 3);
    }));
    function go(target, remember = true) {
        if (target.href === location.href) return;
        if (remember) trail.push(location.pathname + location.search + location.hash);
        history.pushState(null, '', target);
        render(true);
    }
    shell.addEventListener('click', (event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const link = event.target.closest('a');
        if (!link) return;
        if (link === aboutLink) {
            event.preventDefault();
            const target = new URL(location.href);
            target.searchParams.set('about', '1');
            go(target, false);
        } else if (link.matches('[data-field-view]')) {
            event.preventDefault();
            go(new URL(link.href), false);
        } else if (link.matches('[data-field-passage], [data-field-preview]')) {
            const target = new URL(location.href);
            if (link.hasAttribute('data-field-passage')) target.searchParams.set('view', 'network');
            target.searchParams.set('peek', '1');
            target.hash = link.dataset.fieldTarget || new URL(link.href).hash;
            if (!byAnchor.has(target.hash.slice(1))) return;
            event.preventDefault();
            go(target);
        } else if (link === retrace) {
            event.preventDefault();
            const previous = trail.pop();
            if (previous) go(new URL(previous, location.origin), false);
        }
    });
    // Back/forward restores the URL's mode and encounter without rewriting history.
    window.addEventListener('popstate', () => { trail = []; render(true); });
    window.addEventListener('hashchange', () => render(true));
    window.addEventListener('resize', () => { if (shell.dataset.view === 'network') locate(); });
    // Encounter hashes identify content, but the masthead and mode switch remain
    // visible on arrival rather than allowing the browser's anchor scroll.
    window.addEventListener('load', () => {
        if (shell.dataset.view === 'network') window.scrollTo(0, 0);
    }, {once: true});
    render();
})();
