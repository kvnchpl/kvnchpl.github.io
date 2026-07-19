const SITE_ORIGIN = 'https://kvnchpl.com';
const SKY_COUNT = 22;

function imageUrl(project, image, size = 'medium') {
    return `/img/projects/${project}/${size}/${image}.webp`;
}

function imageSrcset(project, image) {
    return [
        `${imageUrl(project, image, 'small')} 600w`,
        `${imageUrl(project, image, 'medium')} 1280w`,
        `${imageUrl(project, image, 'full')} 1920w`
    ].join(', ');
}

function initSlideshow(wrapper) {
    const image = wrapper.querySelector('img');
    const previousButton = wrapper.querySelector('.slideshow-prev');
    const nextButton = wrapper.querySelector('.slideshow-next');
    const project = wrapper.dataset.project;
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
        const name = images[currentIndex];
        const position = currentIndex + 1;

        image.src = imageUrl(project, name);
        image.srcset = imageSrcset(project, name);
        image.alt = `${image.alt.split(', image ')[0]}, image ${position} of ${images.length}`;
        previousButton.setAttribute('aria-label', `Previous image, ${position} of ${images.length}`);
        nextButton.setAttribute('aria-label', `Next image, ${position} of ${images.length}`);
    }

    previousButton.addEventListener('click', () => showImage(currentIndex - 1));
    nextButton.addEventListener('click', () => showImage(currentIndex + 1));
}

function shuffledSkyImages() {
    const images = Array.from({ length: SKY_COUNT }, (_, index) => `/img/home/sky_${index + 1}.webp`);

    for (let index = images.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [images[index], images[swapIndex]] = [images[swapIndex], images[index]];
    }

    return images;
}

function randomizeSkyImages() {
    const images = document.querySelectorAll('[data-sky-image]');
    if (!images.length) return;

    const sources = shuffledSkyImages();
    images.forEach((image, index) => {
        image.src = sources[index % sources.length];
    });
}

async function renderTumblrNav() {
    if (document.body.dataset.page !== 'thoughts') return;

    const nav = document.getElementById('nav');
    const dataUrl = document.querySelector('meta[name="nav-data"]')?.content;
    if (!nav || !dataUrl) return;

    try {
        const response = await fetch(dataUrl);
        if (!response.ok) throw new Error(`Could not load ${dataUrl}: ${response.status}`);

        const navData = await response.json();
        const fragment = document.createDocumentFragment();

        navData
            .filter((link) => link.navBar)
            .forEach((link) => {
                const anchor = document.createElement('a');
                anchor.href = new URL(link.href, SITE_ORIGIN).href;
                anchor.textContent = link.label.toLowerCase() === 'thoughts' ? `*${link.label}*` : link.label;

                if (link.newTab) {
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                }

                fragment.appendChild(anchor);
            });

        nav.replaceChildren(fragment);
    } catch (error) {
        console.error('Error loading Tumblr navigation:', error);
    }
}

function init() {
    randomizeSkyImages();
    document.querySelectorAll('[data-slideshow]').forEach(initSlideshow);
    renderTumblrNav();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
