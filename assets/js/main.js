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

                row.classList.add("randomized");
                row.style.left = initialLeft;

                initialPositions[index] = randomPercent;
            }

            row.classList.add("visible");
        });
    };

    // Enable hover effects with debounced handlers
    const enableHoverEffect = (rows) => {
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

        const debouncedHoverHandler = debounce((row, isLeftArrow, hoveredLeft) => {
            const nextImage = getNextImage();
            overlay.style.backgroundImage = `url(${nextImage})`;
            overlay.classList.add("visible-overlay");

            rows.forEach((otherRow) => {
                if (otherRow !== row) {
                    const otherLinkWidth = otherRow.offsetWidth;
                    otherRow.style.left = isLeftArrow
                        ? `${hoveredLeft}px`
                        : `${hoveredLeft + row.offsetWidth - otherLinkWidth}px`;

                    otherRow.classList.add("transition");
                }
            });
        }, debounceTime);

        const debouncedLeaveHandler = debounce(() => {
            rows.forEach((row, index) => {
                row.style.left = `calc(${initialPositions[index]}% - ${row.offsetWidth / 2}px)`;
                row.classList.add("transition");
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
                    const hoveredLeft = parseFloat(window.getComputedStyle(row).left);
                    debouncedHoverHandler(row, isLeftArrow, hoveredLeft);
                }
            });

            row.addEventListener("mouseleave", () => {
                if (!isMobile) {
                    debouncedLeaveHandler();
                }
            });
        });

        rows.forEach((row, index) => {
            console.log(`DEBUG: Row ${index} styles`, {
                position: row.style.position,
                left: row.style.left,
                classes: row.classList.toString(),
            });
        });
    };

    // Fetch and process overlay images
    const skyImages = await fetchJSON("sky-images-data");
    if (skyImages && Array.isArray(skyImages) && skyImages.length > 0) {
        shuffledImages = skyImages.sort(() => Math.random() - 0.5);
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