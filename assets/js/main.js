const IMAGE_LIST_URL = "/_data/sky_images.json";

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

            if (isMobile()) {
                overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
                overlay.style.opacity = '0.5';
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
        // Set the initial overlay image
        overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
        overlay.style.opacity = '0.5';

        let previousInterval = -1; // Track the last interval crossed

        // Scroll-based image cycling
        window.addEventListener('scroll', () => {
            const scrollTop = Math.max(0, document.documentElement.scrollTop || document.body.scrollTop);
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

            // Dynamically adjust total intervals based on scrollable height
            let totalIntervals;
            if (scrollHeight < 800) {
                totalIntervals = 2; // For short pages
            } else if (scrollHeight < 1600) {
                totalIntervals = 3; // For medium-length pages
            } else {
                totalIntervals = 4; // For long pages
            }

            // Calculate the current interval
            const currentInterval = Math.min(
                Math.floor((scrollTop / scrollHeight) * totalIntervals),
                totalIntervals - 1 // Ensure the interval index doesn't exceed bounds
            );

            // Change image if entering a new interval
            if (currentInterval !== previousInterval) {
                overlay.style.backgroundImage = `url(${getNextImage()})`;
                previousInterval = currentInterval; // Update the last interval crossed
            }
        });

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.closest('a')) return; // Allow links to navigate
            overlay.style.backgroundImage = `url(${getNextImage()})`;
        });
    }
    // Mobile navigation toggle
    const navToggle = document.getElementById("nav-toggle");
    const siteNav = document.getElementById("site-nav");

    if (navToggle && siteNav) {
        const navLinks = siteNav.querySelectorAll("a");
        const firstLink = navLinks[0];
        const lastLink = navLinks[navLinks.length - 1];

        const closeNav = () => {
            siteNav.classList.remove("open");
            navToggle.setAttribute("aria-expanded", "false");
        };

        const toggleNav = () => {
            const isOpen = siteNav.classList.toggle("open");
            navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

            if (isOpen && firstLink) {
                firstLink.focus(); // move focus into nav
            }
        };

        // Click toggle
        navToggle.addEventListener("click", toggleNav);

        // Keyboard toggle
        navToggle.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleNav();
            }
        });

        // Close on link click
        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                if (siteNav.classList.contains("open")) {
                    closeNav();
                }
            });
        });

        // Trap focus within nav
        document.addEventListener("keydown", (e) => {
            if (!siteNav.classList.contains("open")) return;

            if (e.key === "Tab") {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstLink) {
                        e.preventDefault();
                        lastLink.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastLink) {
                        e.preventDefault();
                        firstLink.focus();
                    }
                }
            }

            if (e.key === "Escape") {
                // ESC closes nav
                closeNav();
                navToggle.focus();
            }
        });
    }
}