const BASE_URL = "https://kvnchpl.github.io/main/";
const IMAGE_LIST_URL = "https://kvnchpl.github.io/main/sky_images.json";
const isMobile = () => window.innerWidth <= 768;

window.onload = () => {

    const overlay = document.getElementById('image-overlay');
    const linkContainer = document.getElementById('link-container');
    const rows = document.querySelectorAll('#link-container .row');

    fetch(IMAGE_LIST_URL)
        .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch images');
        }
        return response.json(); // Returns the array directly
    })
        .then(imageList => {
        if (!Array.isArray(imageList)) {
            throw new Error('Invalid data format for JSON: Expected an array.');
        }
        overlay.setAttribute('data-images', JSON.stringify(imageList));
        initializeImageOverlay(imageList);
    })
        .catch(error => console.error('Error loading images:', error));

    function initializeImageOverlay(imageList) {

        let shuffledImages = [];
        let currentImageIndex = 0;
        let initialPositions = [];

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

        // Function to load links dynamically
        function loadLinks(url = null) {
            const linkContainer = document.getElementById('link-container');
            // Use the provided URL or fallback to the data-json attribute
            const jsonFile = url || linkContainer.getAttribute('data-json');

            if (!jsonFile) {
                console.error("No JSON file specified via parameter or data-json attribute.");
                return;
            }

            fetch(`${BASE_URL}${jsonFile}`)
                .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${jsonFile}`);
                }
                return response.json();
            })
                .then(data => {
                renderLinks(data);
            })
                .catch(error => console.error("Error loading links:", error));
        }

        // Function to render the links into the link-container
        function renderLinks(data) {
            // Helper function to convert month number to name
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];

            data.forEach(item => {
                const row = document.createElement("div");
                row.classList.add("row");

                const linkWrapper = document.createElement("div");
                linkWrapper.classList.add("link-wrapper");

                // Create and configure the link
                const link = document.createElement("a");
                link.href = item.href;
                link.textContent = item.label;
                link.setAttribute("aria-label", item.label);

                // Determine whether to open in a new tab
                const isExternal = link.href.startsWith("http") && !link.href.includes(window.location.hostname);
                const openInNewTab = item.new_tab !== undefined ? item.new_tab : isExternal;

                if (openInNewTab) {
                    link.setAttribute("target", "_blank");
                    link.setAttribute("rel", "noopener noreferrer");
                }

                // Dynamically build the subtitle based on available attributes
                const subtitleParts = [];

                // Add author and publication if available
                if (item.author) subtitleParts.push(`By ${item.author}`);
                if (item.publication) subtitleParts.push(item.publication);

                // Handle publication_month (number to name or string as-is) and publication_year
                let monthAndYear = "";
                if (item.publication_month) {
                    const month =
                          typeof item.publication_month === "number"
                    ? monthNames[item.publication_month - 1]
                    : item.publication_month; // Use string as-is
                    monthAndYear = month;
                }
                if (item.publication_year) {
                    monthAndYear += ` ${item.publication_year}`;
                }

                // Append month and year as a single unit
                if (monthAndYear) subtitleParts.push(monthAndYear);

                // Combine subtitle parts into a single string with proper formatting
                const subtitleText = subtitleParts.join(", ");

                if (subtitleText) {
                    const subtitle = document.createElement("span");
                    subtitle.classList.add("subtitle");
                    subtitle.textContent = subtitleText;
                    linkWrapper.appendChild(subtitle);
                }

                // Apply any custom class specified in the JSON
                if (item.class) {
                    link.classList.add(item.class);
                }

                // Append the link and wrapper to the row
                linkWrapper.appendChild(link);
                row.appendChild(linkWrapper);

                // Append the row to the link container
                linkContainer.appendChild(row);
            });
        }

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
}