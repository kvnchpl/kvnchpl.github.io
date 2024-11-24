const isMobile = () => window.innerWidth <= 768;

window.onload = () => {
    const overlay = document.getElementById('image-overlay');
    const imageList = JSON.parse(overlay.getAttribute('data-images'));
    const linkContainer = document.getElementById('link-container');
    const rows = document.querySelectorAll('#link-container .row');

    let shuffledImages = [];
    let currentImageIndex = 0;
    let initialPositions = [];

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

    // Randomize the positions of the links (desktop only)
    const randomizeLinks = (rows) => {
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
    };

    // Enable hover effects with debouncing (desktop only)
    const enableHoverEffect = (rows, initialPositions, debounceTime) => {
        const debouncedHoverHandler = debounce((linkWrapper, isLeftArrow, hoveredLeft) => {
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

    // Desktop: Handle hover effects with debouncing and randomized links
    const debounceTime = 200; // Adjust as needed
    initialPositions = randomizeLinks(rows); // Step 1: Randomize link positions
    enableHoverEffect(rows, initialPositions, debounceTime); // Step 2: Enable hover effects

    // Final adjustments
    adjustHeight();
    linkContainer.style.visibility = 'visible';
    linkContainer.style.opacity = '1';
};