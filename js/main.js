function imageUrl(image, size = 'medium') {
    return `/a/${image}--${size}.webp`;
}

function imageSrcset(image, fullWidth) {
    const candidates = [
        `${imageUrl(image, 'small')} 600w`,
        `${imageUrl(image, 'medium')} 1280w`
    ];

    if (fullWidth > 1280) candidates.push(`${imageUrl(image, 'full')} ${fullWidth}w`);
    return candidates.join(', ');
}

function initSlideshow(wrapper) {
    const image = wrapper.querySelector('img');
    const previousButton = wrapper.querySelector('.slideshow-prev');
    const nextButton = wrapper.querySelector('.slideshow-next');
    const fullWidth = Number.parseInt(wrapper.dataset.fullWidth, 10) || 1920;
    let images;
    let currentIndex = 0;

    try {
        images = JSON.parse(wrapper.dataset.images || '[]');
    } catch {
        return;
    }

    if (!image || !previousButton || !nextButton || images.length < 2) return;

    function showImage(index) {
        currentIndex = (index + images.length) % images.length;
        const { file, src, alt } = images[currentIndex];
        const position = currentIndex + 1;

        image.src = src || imageUrl(file);
        if (src) image.removeAttribute('srcset');
        else image.srcset = imageSrcset(file, fullWidth);
        image.alt = alt;
        previousButton.setAttribute('aria-label', `Previous image, ${position} of ${images.length}`);
        nextButton.setAttribute('aria-label', `Next image, ${position} of ${images.length}`);
    }

    previousButton.addEventListener('click', () => showImage(currentIndex - 1));
    nextButton.addEventListener('click', () => showImage(currentIndex + 1));
}

function initAutoplayVideos() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('video[data-autoplay]').forEach((video) => {
        video.play().catch(() => {
            // Controls remain available when the browser declines autoplay.
        });
    });
}

function init() {
    initAutoplayVideos();
    document.querySelectorAll('[data-slideshow]').forEach(initSlideshow);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
