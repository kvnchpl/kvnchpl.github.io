const isMobile = () => window.innerWidth <= 768;

let initialPositions = [];

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

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
    const linkContainer = document.getElementById('link-container');
    const overlay = document.getElementById('image-overlay');
    const imageList = JSON.parse(overlay.getAttribute('data-images'));

    function preloadImages(imageList) {
        imageList.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    }

    function handleLinkHover(event, overlay, imageList) {
        const link = event.target.closest('a');
        if (!link) return;

        if (!link.dataset.originalText) {
            link.dataset.originalText = link.textContent;
        }

        // Randomize and set an overlay image
        const randomImage = imageList[Math.floor(Math.random() * imageList.length)];
        overlay.style.backgroundImage = `url(${randomImage})`;
        overlay.style.opacity = '1'; // Make overlay visible
    }

    function handleLinkLeave(event, overlay) {
        const link = event.target.closest('a');
        if (!link) return;

        link.textContent = link.dataset.originalText; // Reset link text if changed
        overlay.style.opacity = '0'; // Hide overlay
    }

    // Preload all images
    preloadImages(imageList);

    // Shuffle the image list for randomness
    const shuffledImages = [...imageList].sort(() => Math.random() - 0.5);

    // Set a random static overlay image for mobile
    if (isMobile()) {
        const randomImage = shuffledImages[Math.floor(Math.random() * shuffledImages.length)];
        const img = new Image();
        img.onload = () => {
            console.log(`Image loaded: ${randomImage}`);
            overlay.style.backgroundImage = `url(${randomImage})`;
            overlay.style.opacity = '1';
        };
        img.src = randomImage;
    }

    const rows = document.querySelectorAll('#link-container .row');

    const debounceTime = 200; // Locally scoped constant for debouncing

    // Step 1: Randomize link positions and get initial positions
    const initialPositions = randomizeLinks(rows);

    // Step 2: Enable hover effects with local debounce time
    enableHoverEffect(rows, initialPositions, debounceTime);

    // Step 3: Set up event delegation for hover and click interactions
    linkContainer.addEventListener('mouseover', (event) => {
        const link = event.target.closest('a');
        if (link && !isMobile()) {
            handleLinkHover(event, overlay, shuffledImages);
        }
    });

    linkContainer.addEventListener('mouseout', (event) => {
        const link = event.target.closest('a');
        if (link && !isMobile()) {
            handleLinkLeave(event, overlay);
        }
    });

    linkContainer.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link) {
            if (isMobile()) {
                event.preventDefault(); // Prevent immediate navigation

                // Start fading out the overlay
                overlay.style.transition = 'opacity 0.3s ease'; // Adjust duration as needed
                overlay.style.opacity = '0';

                // Delay navigation until the fade-out is complete
                setTimeout(() => {
                    window.location.href = link.href;
                }, 1000);
            } else {
                // Desktop-specific behavior remains unchanged (if any)
            }
        }
    });

    window.addEventListener('pageshow', () => {
        const overlay = document.getElementById('image-overlay');
        const imageList = JSON.parse(overlay.getAttribute('data-images'));

        if (isMobile()) {
            const randomImage = imageList[Math.floor(Math.random() * imageList.length)];
            const img = new Image();
            img.onload = () => {
                console.log(`Page restored: Image loaded: ${randomImage}`);
                overlay.style.backgroundImage = `url(${randomImage})`;
                overlay.style.opacity = '1'; // Ensure visibility
            };
            img.src = randomImage;
        }
    });
};
