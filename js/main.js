const isMobile = () => window.innerWidth <= 768;

let initialPositions = [];

function randomizeLinks(rows) {
    rows.forEach((row, index) => {
        const linkWrapper = row.querySelector('.link-wrapper');
        const link = row.querySelector('a');

        // Alternate left/right arrow alignment
        const isLeftArrow = index % 2 === 0;
        row.classList.add(isLeftArrow ? 'left-arrow' : 'right-arrow');

        // Add arrows to the link text
        link.textContent = isLeftArrow ? `←${link.textContent}` : `${link.textContent}→`;

        if (isMobile()) {
            row.style.visibility = 'visible';
            return;
        }

        // Random placement on desktop
        const linkWidth = link.offsetWidth;
        const viewportWidth = window.innerWidth;

        const safeMinPercent = (linkWidth / 2 / viewportWidth) * 100;
        const safeMaxPercent = 100 - safeMinPercent;

        const randomPercent = Math.random() * (safeMaxPercent - safeMinPercent) + safeMinPercent;
        initialPositions.push(randomPercent);

        const initialLeft = `calc(${randomPercent}% - ${linkWidth / 2}px)`;
        linkWrapper.style.position = "absolute";
        linkWrapper.style.left = initialLeft;
        row.style.visibility = "visible";
    });

    return initialPositions; // Return positions for hover effects
}

function enableHoverEffect(rows, initialPositions, debounceTime) {
    const debouncedHoverHandler = debounce((linkWrapper, isLeftArrow, rows, hoveredLeft) => {
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
    }, debounceTime);

    rows.forEach((row) => {
        const linkWrapper = row.querySelector('.link-wrapper');
        const isLeftArrow = row.classList.contains('left-arrow');

        linkWrapper.addEventListener('mouseenter', () => {
            if (!isMobile()) {
                const hoveredLeft = parseFloat(window.getComputedStyle(linkWrapper).left);
                debouncedHoverHandler(linkWrapper, isLeftArrow, rows, hoveredLeft);
            }
        });

        linkWrapper.addEventListener('mouseleave', () => {
            if (!isMobile()) {
                debouncedLeaveHandler();
            }
        });
    });
}

window.onload = () => {
    const overlay = document.getElementById('image-overlay');
    const imageList = JSON.parse(overlay.getAttribute('data-images'));
    const linkContainer = document.getElementById('link-container');
    const rows = document.querySelectorAll('#link-container .row');

    let shuffledImages = [];
    let currentImageIndex = 0;

    // Helper to shuffle the image list
    const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

    // Function to get the next image in sequence
    const getNextImage = () => {
        const nextImage = shuffledImages[currentImageIndex];
        currentImageIndex = (currentImageIndex + 1) % shuffledImages.length; // Loop back to start
        return nextImage;
    };

    // Debounce function to limit hover effect execution
    const debounce = (func, wait) => {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    };

    // Preload images for better performance
    const preloadImages = (images) => {
        images.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    };

    // Adjust the height of the container
    const adjustHeight = () => {
        let maxHeight = 0;
        rows.forEach((row) => {
            const rowBottom = row.offsetTop + row.offsetHeight;
            if (rowBottom > maxHeight) maxHeight = rowBottom;
        });
        linkContainer.style.height = `${maxHeight}px`;
    };

    // Initialize the shuffled image list
    shuffledImages = shuffleArray([...imageList]);
    preloadImages(shuffledImages);

    // Mobile: Display the first image in the shuffled list
    const isMobile = () => window.innerWidth <= 768;
    if (isMobile()) {
        const initialImage = getNextImage();
        const img = new Image();
        img.onload = () => {
            overlay.style.backgroundImage = `url(${initialImage})`;
            overlay.style.opacity = '1';
        };
        img.src = initialImage;
    }

    // Desktop: Handle hover effects with debouncing
    const debouncedHoverHandler = debounce((linkWrapper) => {
        const nextImage = getNextImage();
        overlay.style.backgroundImage = `url(${nextImage})`;
        overlay.style.opacity = '1';
    }, 200); // Debounce wait time in milliseconds

    const debouncedLeaveHandler = debounce(() => {
        overlay.style.opacity = '0';
    }, 200); // Debounce wait time in milliseconds

    rows.forEach((row) => {
        const linkWrapper = row.querySelector('.link-wrapper');

        linkWrapper.addEventListener('mouseenter', () => {
            if (!isMobile()) {
                debouncedHoverHandler(linkWrapper);
            }
        });

        linkWrapper.addEventListener('mouseleave', () => {
            if (!isMobile()) {
                debouncedLeaveHandler();
            }
        });
    });

    // Final adjustments
    adjustHeight();
    linkContainer.style.visibility = 'visible';
    linkContainer.style.opacity = '1';
};