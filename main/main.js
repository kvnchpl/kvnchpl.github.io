const BASE_URL = "https://kvnchpl.github.io/main/";
const IMAGE_LIST_URL = "https://kvnchpl.github.io/main/sky_images.json";
const isMobile = () => window.innerWidth <= 768;

window.onload = () => {
    const overlay = document.getElementById('image-overlay');
    const linkContainer = document.getElementById('link-container');
    const metaLinkList = document.querySelector('meta[name="link-data"]');
    const jsonUrl = metaLinkList ? metaLinkList.getAttribute('content') : null;

    if (!jsonUrl) {
        console.error("No JSON URL found in the <meta> tag with name='link-data'.");
        return;
    }

    // Function to shuffle the array of images
    const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

    // Preload images for smooth transitions
    const preloadImages = (images) => {
        images.forEach((src) => {
            const img = new Image();
            img.src = src;
        });
    };

    // Initialize image overlay
    function initializeImageOverlay(imageList) {
        let shuffledImages = [];
        let currentImageIndex = 0;

        const getNextImage = () => {
            const nextImage = shuffledImages[currentImageIndex];
            currentImageIndex = (currentImageIndex + 1) % shuffledImages.length; // Loop back to start
            return nextImage;
        };

        // Shuffle and preload images
        shuffledImages = shuffleArray([...imageList]);
        preloadImages(shuffledImages);

        if (isMobile()) {
            const initialImage = getNextImage();
            overlay.style.backgroundImage = `url(${initialImage})`;
            overlay.style.opacity = '0.5';

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
    }

    // Fetch and handle sky_images.json
    fetch(IMAGE_LIST_URL)
        .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        return response.json(); // Returns the array directly
    })
        .then(imageList => {
        if (!Array.isArray(imageList)) {
            throw new Error('Invalid data format for sky images: Expected an array.');
        }
        console.log("Data successfully parsed from JSON: ", imageList);
        overlay.setAttribute('data-images', JSON.stringify(imageList));
        initializeImageOverlay(imageList); // Handle image logic
    })
        .catch(error => console.error('Error loading images:', error));

    // Fetch and handle link data
    function loadLinks() {
        fetch(jsonUrl)
            .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch JSON from ${jsonUrl}`);
            }
            return response.json();
        })
            .then(data => {
            console.log("Data successfully parsed from JSON:", data);
            renderLinks(data);
        })
            .catch(error => console.error("Error loading link list:", error));
    }

    // Function to render the links
    function renderLinks(data) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error("Invalid or empty data for rendering links:", data);
            return;
        }

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        data.forEach(item => {
            console.log("Processing item:", item);

            const row = document.createElement("div");
            row.classList.add("row");

            const linkWrapper = document.createElement("div");
            linkWrapper.classList.add("link-wrapper");

            const link = document.createElement("a");
            link.href = item.href;
            link.textContent = item.label;
            link.setAttribute("aria-label", item.label);

            const isExternal = link.href.startsWith("http") && !link.href.includes(window.location.hostname);
            const openInNewTab = item.newTab !== undefined ? item.newTab : isExternal;

            if (openInNewTab) {
                link.setAttribute("target", "_blank");
                link.setAttribute("rel", "noopener noreferrer");
            }

            const subtitleParts = [];
            if (item.author) subtitleParts.push(`By ${item.author}`);
            if (item.publication) subtitleParts.push(item.publication);

            let monthAndYear = "";
            if (item.publication_month) {
                const month = typeof item.publication_month === "number"
                ? monthNames[item.publication_month - 1]
                : item.publication_month;
                monthAndYear = month;
            }
            if (item.publication_year) {
                monthAndYear += ` ${item.publication_year}`;
            }

            if (monthAndYear) subtitleParts.push(monthAndYear);

            const subtitleText = subtitleParts.join(", ");
            if (subtitleText) {
                const subtitle = document.createElement("span");
                subtitle.classList.add("subtitle");
                subtitle.textContent = subtitleText;
                linkWrapper.appendChild(subtitle);
            }

            linkWrapper.appendChild(link);
            row.appendChild(linkWrapper);
            document.getElementById('link-container').appendChild(row);
        });

        console.log("Links rendered successfully.");
    }

    loadLinks(); // Trigger fetching and rendering of links

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

    // Mobile: Display the first image in the shuffled list;
    if (isMobile()) {
        const initialImage = getNextImage();
        overlay.style.backgroundImage = `url(${initialImage})`;
        overlay.style.opacity = '0.5';

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