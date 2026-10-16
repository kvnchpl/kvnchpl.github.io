// Collection previews can pause independently of the work opened by their links.
const control = document.querySelector('[data-preview-motion]');
if (control) {
    const previews = [...document.querySelectorAll('img[data-preview-src]')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const key = 'kvn-preview-motion';
    let preference;
    try {
        const saved = sessionStorage.getItem(key);
        if (saved === 'paused' || saved === 'playing') preference = saved;
    } catch { /* The control still works when storage is unavailable. */ }
    let paused = preference ? preference === 'paused' : motion.matches;
    function render() {
        for (const image of previews) {
            if (paused) {
                image.removeAttribute('srcset');
                image.src = image.dataset.previewStill;
            } else {
                image.src = image.dataset.previewSrc;
                if (image.dataset.previewSrcset) image.srcset = image.dataset.previewSrcset;
            }
        }
        control.textContent = paused ? 'Play previews' : 'Pause previews';
        control.dataset.previewPaused = String(paused);
    }
    control.hidden = previews.length === 0;
    control.addEventListener('click', () => {
        paused = !paused;
        preference = paused ? 'paused' : 'playing';
        try { sessionStorage.setItem(key, preference); } catch { /* Optional persistence. */ }
        render();
    });
    motion.addEventListener('change', () => {
        if (preference !== undefined) return;
        paused = motion.matches;
        render();
    });
    render();
}
