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

    const getNextImage = () => {
        const nextImage = shuffledImages[currentImageIndex];
        currentImageIndex = (currentImageIndex + 1) % shuffledImages.length;
        return nextImage;
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
            overlay.style.opacity = '0.5';

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

    // Helper function to format publication dates
    function formatDate(month, year) {
        if (typeof month === 'number') {
            const date = new Date(year, month - 1); // Convert month to zero-based index
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        return `${month} ${year}`; // For cases like "Fall 1964"
    }

    fetch(IMAGE_LIST_URL)
        .then((response) => {
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        return response.json();
    })
        .then((imageList) => {
        const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);
        const preloadImages = (images) => {
            images.forEach((src) => {
                const img = new Image();
                img.src = src;
            });
        };

        shuffledImages = shuffleArray(imageList);
        preloadImages(shuffledImages);

        // Set the first image as the initial overlay background
        overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
        overlay.style.opacity = '0.5';

        // Mobile-specific logic for swipe and click events
        if (isMobile()) {
            detectSwipeAnyDirection(overlay, () => {
                overlay.style.backgroundImage = `url(${getNextImage()})`;
            });

            document.addEventListener('click', (event) => {
                const target = event.target;
                if (target.closest('a')) return; // Allow links to navigate
                overlay.style.backgroundImage = `url(${getNextImage()})`;
            });
        }
    })
        .catch((error) => {
        console.error('Error loading images:', error);
    });

    fetch(jsonUrl)
        .then((response) => response.json())
        .then((linkData) => {
        // Helper function to configure link targets
        const configureLinkTarget = (link, linkItem) => {
            if (linkItem.newTab === false) {
                link.target = '_self'; // Force open in the same tab
            } else if (linkItem.href.startsWith('http')) {
                link.target = '_blank'; // Open external links in a new tab
                link.rel = 'noopener noreferrer';
            }
        };

        const rows = linkData.map((linkItem) => {
            const row = document.createElement('div');
            row.className = 'row';

            const wrapper = document.createElement('div');
            wrapper.className = 'link-wrapper';

            const link = document.createElement('a');
            link.href = linkItem.href;
            link.textContent = linkItem.label;
            configureLinkTarget(link, linkItem); // Apply link target logic

            wrapper.appendChild(link);

            // Add subtitle dynamically if applicable
            const subtitleParts = [];
            if (linkItem.author) subtitleParts.push(`By ${linkItem.author}`);
            if (linkItem.publication) subtitleParts.push(linkItem.publication);
            if (linkItem.month && linkItem.year) subtitleParts.push(formatDate(linkItem.month, linkItem.year));

            if (subtitleParts.length > 0) {
                const subtitle = document.createElement('span');
                subtitle.className = 'subtitle';
                subtitle.textContent = subtitleParts.join(', ');
                wrapper.appendChild(subtitle);
            }

            row.appendChild(wrapper);
            linkContainer.appendChild(row);

            return row;
        });

        initialPositions = randomizeLinks(rows);
        enableHoverEffect(rows, initialPositions, 200);
    })
        .catch((error) => console.error('Error loading links:', error));

    if (isMobile()) {
        // Set the initial overlay image and make it visible
        overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
        overlay.style.opacity = '0.5';

        // Detect swipes to change overlay image
        function detectSwipeAnyDirection(element, onSwipe) {
            let touchStartX = 0;
            let touchStartY = 0;
            let touchEndX = 0;
            let touchEndY = 0;

            element.addEventListener('touchstart', (event) => {
                touchStartX = event.changedTouches[0].screenX;
                touchStartY = event.changedTouches[0].screenY;
            });

            element.addEventListener('touchend', (event) => {
                touchEndX = event.changedTouches[0].screenX;
                touchEndY = event.changedTouches[0].screenY;

                const swipeThreshold = 50; // Minimum swipe distance
                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;

                // Trigger action for any swipe that meets the threshold
                if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
                    onSwipe();
                }
            });
        }

        // Attach swipe detection to overlay
        detectSwipeAnyDirection(overlay, () => {
            overlay.style.backgroundImage = `url(${getNextImage()})`;
        });

        // Fallback: Change image on click for non-swipeable interactions
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.closest('a')) return; // Allow links to navigate
            overlay.style.backgroundImage = `url(${getNextImage()})`;
        });
    }
}