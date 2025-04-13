window.onload = async () => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Utility function for centralized error logging
    const logError = (message) => console.error(`DEBUG: ${message}`);

    // Utility function to fetch JSON data from a URL
    const fetchJSON = async (metaName) => {
        const url = document.querySelector(`meta[name='${metaName}']`).content;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch data from ${url}`);
            return await response.json();
        } catch (error) {
            logError(`Error loading ${metaName}: ${error.message}`);
            return null;
        }
    };

    // Utility function to debounce function calls
    const debounce = (func, wait, immediate = false) => {
        let timeout;
        return function (...args) {
            const context = this;
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                timeout = null;
                if (!immediate) func.apply(context, args);
            }, wait);
            if (callNow) func.apply(context, args);
        };
    };

    // Fetch configuration from config.json
    const config = await fetchJSON("config-data");
    if (!config) return;

    // Extract configuration values
    const debounceTime = config.debounceTime || 200;
    const linkContainerId = config.linkContainerId || "link-container";
    const imageOverlayId = config.imageOverlayId || "image-overlay";

    const overlay = document.getElementById(imageOverlayId);
    const linkContainer = document.getElementById(linkContainerId);

    if (!overlay) {
        logError("No #image-overlay element found!");
        return;
    }

    if (!linkContainer) {
        logError("No link container found!");
        return;
    }

    overlay.setAttribute("aria-hidden", "true");

    let shuffledImages = [];
    let currentImageIndex = 0;

    // Utility function to get the next image in the shuffled list
    const getNextImage = () => {
        const nextImage = shuffledImages[currentImageIndex];
        currentImageIndex = (currentImageIndex + 1) % shuffledImages.length;
        return nextImage;
    };

    // Preload images for smoother transitions
    const preloadImages = (images) => {
        images.forEach((src) => {
            const img = new Image();
            img.onerror = () => logError(`Failed to preload image: ${src}`);
            img.src = src;
        });
    };

    const initialPositions = []; // Define the array to store initial positions

    // Randomize link positions for desktop and alternate positions for mobile
    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = document.createElement("div");
            linkWrapper.className = "link-wrapper";

            // Move existing children into the wrapper
            while (row.firstChild) {
                linkWrapper.appendChild(row.firstChild);
            }
            row.appendChild(linkWrapper);

            const link = row.querySelector("a");
            if (!link) {
                logError(`No <a> element found in row ${index}`);
                return;
            }

            const originalText = link.textContent.trim();
            link.setAttribute("aria-label", originalText);

            const isLeftArrow = index % 2 === 0; // Alternate left/right based on index
            row.classList.add(isLeftArrow ? "left-arrow" : "right-arrow");

            // Desktop: Randomize horizontal positions
            if (!isMobile) {
                const linkWidth = link.offsetWidth;
                const viewportWidth = window.innerWidth;

                if (viewportWidth === 0) {
                    logError("Viewport width is zero, cannot calculate positions!");
                    return;
                }

                const safeMinPercent = (linkWidth / 2 / viewportWidth) * 100;
                const safeMaxPercent = 100 - safeMinPercent;

                const randomPercent = Math.random() * (safeMaxPercent - safeMinPercent) + safeMinPercent;
                const initialLeft = `calc(${randomPercent}% - ${linkWidth / 2}px)`;

                linkWrapper.classList.add("randomized");
                linkWrapper.style.left = initialLeft; // Initialize left property

                initialPositions[index] = randomPercent; // Store initial position
            }

            row.classList.add("visible");
        });
    };

    // Enable hover effects with debounced handlers
    const enableHoverEffect = (rows) => {
        const debouncedHoverHandler = debounce((row, isLeftArrow) => {
            const nextImage = getNextImage();
            overlay.style.backgroundImage = `url(${nextImage})`;
            overlay.classList.add("visible-overlay");

            // Get the hovered link's position relative to the containing block
            const containerRect = linkContainer.getBoundingClientRect();
            const rowRect = row.getBoundingClientRect();
            const hoveredLeft = rowRect.left - containerRect.left;

            rows.forEach((otherRow) => {
                if (otherRow !== row) {
                    const otherLinkWrapper = otherRow.querySelector(".link-wrapper");
                    const otherLinkWidth = otherRow.offsetWidth;

                    // Align other links with the hovered link
                    otherLinkWrapper.style.left = isLeftArrow
                        ? `${hoveredLeft}px`
                        : `${hoveredLeft + row.offsetWidth - otherLinkWidth}px`;
                }
            });
        }, debounceTime);

        const debouncedLeaveHandler = debounce(() => {
            rows.forEach((row, index) => {
                const linkWrapper = row.querySelector(".link-wrapper");
                linkWrapper.style.left = `calc(${initialPositions[index]}% - ${row.offsetWidth / 2}px)`;
            });

            overlay.classList.add("hidden-overlay");
        }, debounceTime);

        rows.forEach((row) => {
            const isLeftArrow = row.classList.contains("left-arrow");
            if (!isLeftArrow && !row.classList.contains("right-arrow")) {
                console.warn(`DEBUG: Row ${row} has no arrow class, skipping hover effect`);
                return;
            }

            row.addEventListener("mouseenter", () => {
                if (!isMobile) {
                    debouncedHoverHandler(row, isLeftArrow);
                }
            });

            row.addEventListener("mouseleave", () => {
                if (!isMobile) {
                    debouncedLeaveHandler();
                }
            });
        });
    };

    // Fetch and process overlay images
    const overlayImages = await fetchJSON("overlay-images-data");
    if (overlayImages && Array.isArray(overlayImages) && overlayImages.length > 0) {
        shuffledImages = overlayImages.sort(() => Math.random() - 0.5);
        preloadImages(shuffledImages);

        if (isMobile) {
            overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
            overlay.classList.add("visible-overlay");
        }
    }

    // Fetch and process homepage links
    const indexLinks = await fetchJSON("index-links-data");
    if (indexLinks && Array.isArray(indexLinks) && indexLinks.length > 0) {
        // Select the <ul> inside #link-container
        const linkContainer = document.getElementById("link-container");
        const linkList = linkContainer.querySelector("ul");

        if (!linkList) {
            logError("No <ul> element found inside #link-container!");
            return;
        }

        // Create rows and append them to the <ul>
        const rows = indexLinks.map((linkItem) => {
            const row = document.createElement("li");
            const link = document.createElement("a");
            link.href = linkItem.href;
            link.textContent = linkItem.label;

            // Handle target attributes for links
            if (linkItem.newTab === false) {
                link.target = "_self";
            } else if (linkItem.href.startsWith("http")) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }

            row.appendChild(link);

            // Add subtitle dynamically if applicable
            if (linkItem.subtitle) {
                const subtitle = document.createElement("span");
                subtitle.className = "subtitle";
                subtitle.textContent = linkItem.subtitle;
                row.appendChild(subtitle);
            }

            linkList.appendChild(row);
            return row;
        });

        // Apply randomization and hover effects
        randomizeLinks(rows);
        enableHoverEffect(rows);
    } else {
        logError("DEBUG: No valid links found in index.json or the file is empty.");
    }

    if (isMobile) {
        let previousInterval = -1;

        // Scroll-based image cycling
        const handleScroll = debounce(() => {
            const scrollTop = Math.max(0, document.documentElement.scrollTop || document.body.scrollTop);
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

            // Dynamically adjust total intervals based on scrollable height
            let totalIntervals;
            if (scrollHeight < scrollThresholds.shortPage) {
                totalIntervals = scrollIntervals.shortPage;
            } else if (scrollHeight < scrollThresholds.mediumPage) {
                totalIntervals = scrollIntervals.mediumPage;
            } else {
                totalIntervals = scrollIntervals.longPage;
            }

            const currentInterval = Math.min(
                Math.floor((scrollTop / scrollHeight) * totalIntervals),
                totalIntervals - 1 // Ensure the interval index doesn't exceed bounds
            );

            // Change image if entering a new interval
            if (currentInterval !== previousInterval) {
                overlay.style.backgroundImage = `url(${getNextImage()})`;
                previousInterval = currentInterval; // Update the last interval crossed
            }
        }, debounceTime);

        window.addEventListener("scroll", handleScroll);

        // Click-based image cycling
        document.addEventListener("click", (event) => {
            const target = event.target;
            if (target.closest("a, button, input, textarea, select")) return; // Ignore clicks on interactive elements
            overlay.style.backgroundImage = `url(${getNextImage()})`;
        });
    }

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
            siteNav.setAttribute("aria-hidden", !isOpen);
            navToggle.setAttribute("aria-expanded", isOpen);

            if (isOpen && firstLink) {
                firstLink.focus();
            }
        };

        navToggle.addEventListener("click", toggleNav);

        navToggle.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggleNav();
            }
        });

        navLinks.forEach(link => {
            link.addEventListener("click", () => {
                if (siteNav.classList.contains("open")) {
                    closeNav();
                }
            });
        });

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
                closeNav();
                navToggle.focus();
            }
        });
    }
};