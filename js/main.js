const isMobile = () => window.innerWidth <= 768;

window.onload = () => {
    const overlay = document.getElementById('image-overlay');
    const imageList = JSON.parse(overlay.getAttribute('data-images'));
    const linkContainer = document.getElementById('link-container');
    const rows = document.querySelectorAll('#link-container .row');

    let shuffledImages = [];
    let currentImageIndex = 0;
    let initialPositions = [];

    // Helper to shuffle array
    const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

    // Get the next image in sequence
    const getNextImage = () => {
        const nextImage = shuffledImages[currentImageIndex];
        currentImageIndex = (currentImageIndex + 1) % shuffledImages.length; // Loop back to start
        return nextImage;
    };

    // Preload images for better performance
    const preloadImages = (images) => {
        images.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    };

    // Randomize link positions
    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector('.link-wrapper');
            const link = row.querySelector('a');

            // Alternate left/right arrow alignment
            const isLeftArrow = index % 2 === 0;
            row.classList.add(isLeftArrow ? 'left-arrow' : 'right-arrow');

            // Add arrows to the link text
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

    // Debounce function
    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    };

    // Enable hover effects with sliding and image handling
    const enableHoverEffect = (rows, initialPositions, debounceTime) => {
        const debouncedHoverHandler = debounce((linkWrapper, isLeftArrow, hoveredLeft) => {
            const nextImage = getNextImage(); // Update the overlay image
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

            overlay.style.opacity = '0'; // Hide the overlay
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

    // Initialize shuffled images
    shuffledImages = shuffleArray([...imageList]);
    preloadImages(shuffledImages);

    // Mobile: Display the first image in the shuffled list
    const isMobile = () => window.innerWidth <= 768;
    if (isMobile()) {
        const initialImage = getNextImage();
        overlay.style.backgroundImage = `url(${initialImage})`;
        overlay.style.opacity = '1';

        document.addEventListener('click', (event) => {
            const target = event.target;

            // Check if the target is a link
            if (target.tagName.toLowerCase() === 'a') {
                console.log('Link clicked:', target.href);
                return; // Allow the link to function normally
            }

            // Otherwise, cycle the image
            if (!linkContainer.contains(target)) { // Ensure clicks on links are excluded
                const nextImage = getNextImage();
                overlay.style.backgroundImage = `url(${nextImage})`;
            }
        });
    }

    // Add a global tap listener


    // Desktop: Handle hover effects and randomized links
    const debounceTime = 200; // Adjust as needed
    initialPositions = randomizeLinks(rows); // Randomize link positions
    enableHoverEffect(rows, initialPositions, debounceTime); // Enable hover effects

    // Final adjustments
    linkContainer.style.visibility = 'visible';
    linkContainer.style.opacity = '1';
};