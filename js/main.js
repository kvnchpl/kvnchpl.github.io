function imageUrl(project, image, size = 'medium') {
    return `/img/projects/${project}/${size}/${image}.webp`;
}

function imageSrcset(project, image, fullWidth) {
    const candidates = [
        `${imageUrl(project, image, 'small')} 600w`,
        `${imageUrl(project, image, 'medium')} 1280w`
    ];

    if (fullWidth > 1280) candidates.push(`${imageUrl(project, image, 'full')} ${fullWidth}w`);
    return candidates.join(', ');
}

function initSlideshow(wrapper) {
    const image = wrapper.querySelector('img');
    const previousButton = wrapper.querySelector('.slideshow-prev');
    const nextButton = wrapper.querySelector('.slideshow-next');
    const project = wrapper.dataset.project;
    const fullWidth = Number.parseInt(wrapper.dataset.fullWidth, 10) || 1920;
    let images;
    let currentIndex = 0;

    try {
        images = JSON.parse(wrapper.dataset.images || '[]');
    } catch {
        return;
    }

    if (!image || !previousButton || !nextButton || !project || images.length < 2) return;

    function showImage(index) {
        currentIndex = (index + images.length) % images.length;
        const { file, alt } = images[currentIndex];
        const position = currentIndex + 1;

        image.src = imageUrl(project, file);
        image.srcset = imageSrcset(project, file, fullWidth);
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
