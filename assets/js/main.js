window.onload = async () => {
    console.log("DEBUG: main.js loaded");

    // Utility function to check if the device is mobile
    const isMobile = () => /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Utility function for centralized error logging
    const logError = (message) => console.error(`DEBUG: ${message}`);

    // Fetch configuration from config.json
    const configUrl = "/assets/data/config.json";
    let config = {};
    try {
        const response = await fetch(configUrl);
        if (!response.ok) throw new Error("Failed to fetch config.json");
        config = await response.json();
    } catch (error) {
        logError(`Error loading config.json: ${error.message}`);
        return;
    }

    // Extract configuration values
    const debounceTime = config.debounceTime || 200;
    const linkContainerId = config.linkContainerId || "link-container";
    const imageOverlayId = config.imageOverlayId || "image-overlay";
    const scrollThresholds = config.scrollThresholds || { shortPage: 800, mediumPage: 1600 };
    const scrollIntervals = config.scrollIntervals || { shortPage: 2, mediumPage: 3, longPage: 4 };

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
            img.onload = () => console.log(`DEBUG: Image preloaded: ${src}`);
            img.onerror = () => logError(`Failed to preload image: ${src}`);
            img.src = src;
        });
    };

    // Randomize link positions and apply classes
    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const link = row.querySelector("a");
            if (!link) {
                logError(`No <a> element found in row ${index}`);
                return;
            }

            const isLeftArrow = index % 2 === 0;
            row.classList.add(isLeftArrow ? "left-arrow" : "right-arrow");

            const originalText = link.textContent.trim();
            link.setAttribute("aria-label", originalText);

            link.textContent = isLeftArrow ? `←${originalText}` : `${originalText}→`;

            if (!isMobile()) {
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
                row.style.position = "absolute";
                row.style.left = initialLeft;
            }

            row.classList.add("transition");
            row.style.visibility = "visible";
            console.log(`DEBUG: Row ${index} made visible`);
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

            overlay.style.opacity = "0";
        }, debounceTime);

        rows.forEach((row) => {
            const isLeftArrow = row.classList.contains("left-arrow");
            if (!isLeftArrow && !row.classList.contains("right-arrow")) {
                console.warn(`DEBUG: Row ${row} has no arrow class, skipping hover effect`);
                return;
            }

            row.addEventListener("mouseenter", () => {
                if (!isMobile()) {
                    const hoveredLeft = parseFloat(window.getComputedStyle(row).left);
                    debouncedHoverHandler(row, isLeftArrow, hoveredLeft);
                }
            });

            row.addEventListener("mouseleave", () => {
                if (!isMobile()) {
                    debouncedLeaveHandler();
                }
            });
        });
    };

    // Fetch and process overlay images
    fetch(document.querySelector("meta[name='sky-images-data']").content)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch overlay images");
            }
            return response.json();
        })
        .then((imageList) => {
            if (!Array.isArray(imageList) || imageList.length === 0) {
                console.warn("DEBUG: No valid images found in sky_images.json");
                return;
            }

            shuffledImages = imageList.sort(() => Math.random() - 0.5);
            preloadImages(shuffledImages);

            if (!shuffledImages || shuffledImages.length === 0) {
                logError("DEBUG: No images found in shuffledImages");
                return;
            }

            if (isMobile()) {
                overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
                overlay.classList.add("visible-overlay");
            }
        })
        .catch((error) => logError(`Error loading overlay images: ${error.message}`));

    // Fetch and process homepage links
    fetch(document.querySelector("meta[name='index-links-data']").content)
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch homepage links");
            }
            return response.json();
        })
        .then((linkData) => {
            if (!Array.isArray(linkData) || linkData.length === 0) {
                console.warn("DEBUG: No valid links found in index.json");
                return;
            }

            const rows = linkData.map((linkItem) => {
                const row = document.createElement("li");
                row.className = "row";

                const link = document.createElement("a");
                link.href = linkItem.href;
                link.textContent = linkItem.label;

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

                linkContainer.querySelector("ul").appendChild(row);

                return row;
            });

            console.log("DEBUG: Rows created:", rows);
            randomizeLinks(rows);
            enableHoverEffect(rows);
        })
        .catch((error) => logError(`Error loading homepage links: ${error.message}`));

    if (isMobile()) {
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
            navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");

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