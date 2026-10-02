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
    let trail = [];
    let preferredView;
    try {
        preferredView = localStorage.getItem('field-view');
    } catch { /* Navigation works when storage is unavailable. */ }
    const initial = new URL(location.href);
    if (!initial.searchParams.has('view')) {
        initial.searchParams.set('view', shell.dataset.defaultView === 'index' ? 'index' : preferredView || 'network');
    }
    if (!byAnchor.has(initial.hash.slice(1))) initial.hash = shell.dataset.fieldStart;
    history.replaceState(null, '', initial);

    function render(announce = false) {
        const url = new URL(location.href);
        const view = url.searchParams.get('view') === 'index' ? 'index' : 'network';
        const anchor = byAnchor.has(url.hash.slice(1)) ? url.hash.slice(1) : shell.dataset.fieldStart;
        shell.dataset.view = view;
        shell.classList.add('field-ready');
        nodes.forEach((node) => { node.hidden = node.id !== anchor; });
        modeLinks.forEach((link) => {
            link.setAttribute('aria-current', link.dataset.fieldView === view ? 'true' : 'false');
            const target = new URL(url);
            target.searchParams.set('view', link.dataset.fieldView);
            target.hash = anchor;
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
        currentLink.textContent = selected.querySelector('h2').textContent;
        currentLink.href = destination.href;
        for (const attribute of ['target', 'rel']) {
            if (destination.hasAttribute(attribute)) currentLink.setAttribute(attribute, destination.getAttribute(attribute));
            else currentLink.removeAttribute(attribute);
        }
        if (destination.target === '_blank') currentLink.append(' ↗');
        shell.querySelectorAll('[data-index-node]').forEach((row) => {
            if (row.dataset.indexNode === selected.dataset.fieldNode) {
                row.setAttribute('data-selected', 'true');
                if (view === 'index' && (announce || initial.hash === `#${anchor}`)) row.querySelector('details').open = true;
            } else row.removeAttribute('data-selected');
        });
        retrace.hidden = !trail.length;
        retrace.href = trail.at(-1) || '#';
        try { localStorage.setItem('field-view', view); } catch { /* Optional preference. */ }
        if (announce) shell.querySelector('[data-field-announcement]').textContent = `${view === 'network' ? 'Encounter' : 'Index'}: ${selected.querySelector('h2').textContent}`;
        if (view === 'network') locate();
    }
    function locate() {
        const selected = mapNodes.find((node) => node.hasAttribute('data-selected'));
        if (selected) mapViewport.scrollTo({left: selected.offsetLeft - mapViewport.clientWidth / 2, top: selected.offsetTop - mapViewport.clientHeight / 2});
    }
    shell.querySelector('[data-map-locate]').addEventListener('click', locate);
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
        if (link.matches('[data-field-view]')) {
            event.preventDefault();
            go(new URL(link.href), false);
        } else if (link.matches('[data-field-passage]')) {
            const target = new URL(location.href);
            target.searchParams.set('view', 'network');
            target.hash = link.dataset.fieldTarget || new URL(link.href).hash;
            if (!byAnchor.has(target.hash.slice(1))) return;
            event.preventDefault();
            go(target);
            // A map click retains its link focus; a passage locates the new mark.
            if (!link.hasAttribute('data-map-node')) {
                mapNodes.find((node) => node.dataset.mapNode === target.hash.slice(1)).focus({preventScroll: true});
            }
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
