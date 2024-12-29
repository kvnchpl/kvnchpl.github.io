const isMobile = () => window.innerWidth <= 768;

window.onload = () => {
    const overlay = document.getElementById('image-overlay');
    const linkContainer = document.getElementById('link-container');
    const rows = document.querySelectorAll('#link-container .row');
    let shuffledImages = [];
    let currentImageIndex = 0;
    let initialPositions = [];

    fetch('https://kvnchpl.github.io/main/sky_images.json')
        .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        return response.json();
    })
        .then(data => {
        console.log('Fetched data:', data); // Log the fetched data
        if (!data.imageList || !Array.isArray(data.imageList)) {
            throw new Error('Invalid JSON structure: "imageList" key missing or not an array');
        }
        const imageList = data.imageList;

        overlay.setAttribute('data-images', JSON.stringify(imageList));

        initializeImageOverlay(imageList);
    })
        .catch(error => console.error('Error loading images:', error));
    
    function initializeImageOverlay(imageList) {

        const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

        const getNextImage = () => {
            const nextImage = shuffledImages[currentImageIndex];
            currentImageIndex = (currentImageIndex + 1) % shuffledImages.length; // Loop back to start
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

        const debounce = (func, wait) => {
            let timeout;
            return function (...args) {
                const context = this;
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(context, args), wait);
            };
        };

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

                // Allow links to navigate
                if (target.closest('a')) {
                    console.log('Link clicked:', target.closest('a').href);
                    return; // Let the link handle navigation
                }

                // Otherwise, cycle the image
                const nextImage = getNextImage();
                overlay.style.backgroundImage = `url(${nextImage})`;
            });
        }

        const debounceTime = 200; // Adjust as needed
        initialPositions = randomizeLinks(rows); // Randomize link positions
        enableHoverEffect(rows, initialPositions, debounceTime); // Enable hover effects

        linkContainer.style.visibility = 'visible';
        linkContainer.style.opacity = '1';
    };
}