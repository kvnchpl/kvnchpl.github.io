const BASE_URL = "https://kvnchpl.github.io/main/";
const IMAGE_LIST_URL = "https://kvnchpl.github.io/main/sky_images.json";

const isMobile = () => window.innerWidth <= 768;

window.onload = () => {
    const overlay = document.getElementById('image-overlay');
    const linkContainer = document.getElementById('link-container');
    const jsonUrl = document.querySelector("meta[name='link-data']").content;

    if (!jsonUrl) {
        console.error("No JSON URL found in the <meta> tag with name='link-data'.");
        return;
    }

    let shuffledImages = [];
    let currentImageIndex = 0;
    let initialPositions = [];

    const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

    const getNextImage = () => {
        const nextImage = shuffledImages[currentImageIndex];
        currentImageIndex = (currentImageIndex + 1) % shuffledImages.length;
        return nextImage;
    };

    const preloadImages = (images) => {
        images.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    };

    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector('.link-wrapper');
            const link = row.querySelector('a');

            const isLeftArrow = index % 2 === 0;
            row.classList.add(isLeftArrow ? 'left-arrow' : 'right-arrow');
            link.textContent = isLeftArrow ? `←${link.textContent}` : `${link.textContent}→`;

            if (!isMobile()) {
                const linkWidth = link.offsetWidth;
                const viewportWidth = window.innerWidth;

                const safeMinPercent = (linkWidth / 2 / viewportWidth) * 100;
                const safeMaxPercent = 100 - safeMinPercent;

                const randomPercent = Math.random() * (safeMaxPercent - safeMinPercent) + safeMinPercent;
                initialPositions.push(randomPercent);

                const initialLeft = `calc(${randomPercent}% - ${linkWidth / 2}px)`;
                linkWrapper.style.position = "absolute";
                linkWrapper.style.left = initialLeft;
            }

            row.style.visibility = "visible";
        });

        return initialPositions;
    };

    const enableHoverEffect = (rows, initialPositions, debounceTime) => {
        const debounce = (func, wait) => {
            let timeout;
            return function (...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        };

        const debouncedHoverHandler = debounce((linkWrapper, isLeftArrow, hoveredLeft) => {
            const nextImage = getNextImage();
            overlay.style.backgroundImage = `url(${nextImage})`;
            overlay.style.opacity = '1';

            rows.forEach((otherRow) => {
                const otherWrapper = otherRow.querySelector('.link-wrapper');
                if (otherWrapper !== linkWrapper) {
                    const otherLinkWidth = otherWrapper.offsetWidth;
                    otherWrapper.style.left = isLeftArrow
                        ? `${hoveredLeft}px`
                    : `${hoveredLeft + linkWrapper.offsetWidth - otherLinkWidth}px`;

                    otherWrapper.style.transition = 'left var(--transition-duration) ease-in-out';
                }
            });
        }, debounceTime);

        const debouncedLeaveHandler = debounce(() => {
            rows.forEach((row, index) => {
                const linkWrapper = row.querySelector('.link-wrapper');
                linkWrapper.style.left = `calc(${initialPositions[index]}% - ${linkWrapper.offsetWidth / 2}px)`;
                linkWrapper.style.transition = 'left var(--transition-duration) ease-in-out';
            });

            overlay.style.opacity = '0';
        }, debounceTime);

        rows.forEach((row) => {
            const linkWrapper = row.querySelector('.link-wrapper');
            const isLeftArrow = row.classList.contains('left-arrow');

            linkWrapper.addEventListener('mouseenter', () => {
                if (!isMobile()) {
                    const hoveredLeft = parseFloat(window.getComputedStyle(linkWrapper).left);
                    debouncedHoverHandler(linkWrapper, isLeftArrow, hoveredLeft);
                }
            });

            linkWrapper.addEventListener('mouseleave', () => {
                if (!isMobile()) {
                    debouncedLeaveHandler();
                }
            });
        });
    };

    fetch(IMAGE_LIST_URL)
        .then((response) => {
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        return response.json();
    })
        .then((imageList) => {
        shuffledImages = shuffleArray(imageList);
        preloadImages(shuffledImages);

        if (isMobile()) {
            overlay.style.backgroundImage = `url(${getNextImage()})`;
            overlay.style.opacity = '1';

            document.addEventListener('click', (event) => {
                const target = event.target;
                if (target.closest('a')) return;
                overlay.style.backgroundImage = `url(${getNextImage()})`;
            });
        }
    })
        .catch((error) => console.error('Error loading images:', error));

    fetch(jsonUrl)
        .then((response) => response.json())
        .then((linkData) => {
        const rows = linkData.map((linkItem) => {
            const row = document.createElement('div');
            row.className = 'row';

            const wrapper = document.createElement('div');
            wrapper.className = 'link-wrapper';

            const link = document.createElement('a');
            link.href = linkItem.href;
            link.textContent = linkItem.label;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';

            wrapper.appendChild(link);
            row.appendChild(wrapper);
            linkContainer.appendChild(row);

            return row;
        });

        initialPositions = randomizeLinks(rows);
        enableHoverEffect(rows, initialPositions, 200);
    })
        .catch((error) => console.error('Error loading links:', error));
};