// Previews follow the visitor's motion preference without adding visible controls.
const previews = [...document.querySelectorAll('img[data-preview-src]')];
if (previews.length) {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function render() {
        for (const image of previews) {
            if (motion.matches) {
                image.removeAttribute('srcset');
                image.src = image.dataset.previewStill;
            } else {
                image.src = image.dataset.previewSrc;
                if (image.dataset.previewSrcset) image.srcset = image.dataset.previewSrcset;
            }
        }
    }
    motion.addEventListener('change', render);
    render();
}
