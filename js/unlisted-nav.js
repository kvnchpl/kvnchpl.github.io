// A held modifier reveals the alternate collection without a permanent menu item.
(() => {
    if (window.unlistedNavigationInitialized) return;
    window.unlistedNavigationInitialized = true;
    const items = [];
    const style = document.createElement('style');
    style.textContent = `[data-unlisted-nav][hidden]{display:none!important}
.home-navigation .home-unlisted{position:absolute;top:100%;left:0}
@media(max-width:600px){
 html[data-unlisted-nav-open] .page-header,html[data-unlisted-nav-open] .portfolio-header{min-height:168px}
 html[data-unlisted-nav-open] .site-header .site-identity,html[data-unlisted-nav-open] .portfolio-header .site-identity{top:90px}
}`;
    document.head.append(style);
    for (const nav of document.querySelectorAll('.site-nav, .home-navigation')) {
        const collection = nav.querySelector('a[href*="view=collection"]');
        if (!collection) continue;
        const link = document.createElement('a');
        link.href = new URL('/?view=unlisted', collection.href).href;
        link.dataset.viewLink = 'unlisted';
        link.dataset.unlistedLink = '';
        link.setAttribute('aria-label', 'unlisted');
        link.rel = 'nofollow';
        const code = document.createElement('span');
        code.className = 'nav-code';
        code.setAttribute('aria-hidden', 'true');
        code.textContent = '[-]';
        const label = document.createElement('span');
        label.className = 'nav-label';
        label.textContent = 'unlisted';
        let item = link;
        if (nav.classList.contains('home-navigation')) {
            item = document.createElement('div');
            item.className = 'home-nav-item home-unlisted';
            link.append(label);
            item.append(code, link);
        } else link.append(code, label);
        item.dataset.unlistedNav = '';
        item.hidden = true;
        nav.append(item);
        items.push({item, link, previous: collection});
    }
    let revealed = false;
    function reveal(value, restoreFocus = true) {
        if (revealed === value) return;
        revealed = value;
        document.documentElement.toggleAttribute('data-unlisted-nav-open', value);
        for (const {item, link, previous} of items) {
            if (!value && restoreFocus && document.activeElement === link) previous.focus({preventScroll: true});
            item.hidden = !value;
        }
    }
    const modifier = event => reveal(event.altKey);
    window.addEventListener('keydown', modifier);
    window.addEventListener('keyup', modifier);
    window.addEventListener('pointermove', modifier);
    window.addEventListener('blur', () => reveal(false, false));
    window.addEventListener('pagehide', () => reveal(false, false));
    document.addEventListener('visibilitychange', () => { if (document.hidden) reveal(false, false); });
    // Alt-click normally downloads a link in some browsers. Follow this link instead.
    document.addEventListener('click', event => {
        const link = event.target.closest('[data-unlisted-link]');
        if (link && event.altKey && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.defaultPrevented) {
            event.preventDefault();
            location.assign(link.href);
        }
    });
})();
