(async function () {
    "use strict";

    // ==========================
    // GLOBAL CONSTANTS
    // ==========================
    const isMobileDevice = () => window.matchMedia("(max-width: 768px)").matches;
    let cachedViewportWidth = window.innerWidth;
    const logError = (message, context = {}) => console.error(`DEBUG: ${message}`, context);

    // ==========================
    // UTILITY FUNCTIONS
    // ==========================

    const fetchJSON = async (key, fallback = null) => {
        const url = document.querySelector(`meta[name='${key}']`)?.content;
        if (!url) {
            logError(`Meta tag with name '${key}' not found`);
            return fallback;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch data from ${url}`);
            return await response.json();
        } catch (error) {
            logError(`Error loading '${key}': ${error.message}`);
            return fallback;
        }
    };

    const settleFetch = async (entries) => {
        const results = await Promise.allSettled(
            entries.map(([key, fallback]) => fetchJSON(key, fallback))
        );

        return entries.reduce((acc, [key, fallback], i) => {
            acc[key] = results[i].status === "fulfilled" ? results[i].value : fallback;
            return acc;
        }, {});
    };

    const debounce = (func, delay) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    // Utility function to generate a random position for links
    const generateRandomPosition = (linkWidth, viewportWidth) => {
        if (viewportWidth <= 0 || linkWidth <= 0) {
            logError("Invalid dimensions for random position generation.");
            return 0;
        }
        const margin = isMobileDevice() ? config.linkMargins.mobile : config.linkMargins.desktop;
        const minPosition = margin;
        const maxPosition = viewportWidth - margin - linkWidth;
        return Math.random() * (maxPosition - minPosition) + minPosition;
    };

    // Utility function to update the position of a link
    const updateLinkPosition = (linkWrapper, linkWidth, viewportWidth) => {
        const newLeft = generateRandomPosition(linkWidth, viewportWidth);
        linkWrapper.style.left = `${newLeft}px`;
    };

    // Format subtitle based on the provided format
    const formatSubtitle = (item, format) => {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const formatDate = (month) => {
            if (typeof month === "number" && month >= 1 && month <= 12) {
                return monthNames[month - 1];
            }
            return month;
        };

        if (format === "detailed" && item.subtitle && item.publication && item.year) {
            const formattedMonth = item.month ? formatDate(item.month) : null;
            return `—${item.subtitle}, ${item.publication}, ${formattedMonth || ""} ${item.year}`.trim();
        } else if (item.subtitle) {
            return item.subtitle;
        }
        return null;
    };

    const calculateAvailableHeight = (navBar, titleRow) => {
        const navHeight = navBar ? navBar.offsetHeight : 0;
        const titleHeight = titleRow ? titleRow.offsetHeight : 0;
        return window.innerHeight - (navHeight + titleHeight);
    };

    // ==========================
    // LINK MANAGEMENT
    // ==========================

    // Randomize link positions for desktop and alternate positions for mobile
    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector(`.${config.linkWrapperClass}`);
            if (!linkWrapper) {
                logError(`No .link-wrapper found in row ${index}`);
                return;
            }

            const link = linkWrapper.querySelector("a");
            if (!link) {
                logError(`No <a> element found in .link-wrapper for row ${index}`);
                return;
            }

            const originalText = link.textContent.trim();
            link.setAttribute("aria-label", originalText);

            // Treat title-row as a left-arrow row but skip appending the arrow
            const isTitleRow = row.id === config.titleRowId;
            const isLeftArrow = isTitleRow || index % 2 === 0;
            if (!isTitleRow) {
                link.textContent = isLeftArrow ? `← ${originalText}` : `${originalText} →`;
            }

            row.classList.add(isLeftArrow ? "left-arrow" : "right-arrow");

            if (!isMobile) {
                const linkWidth = link.offsetWidth;
                const viewportWidth = window.innerWidth;

                if (viewportWidth === 0 || linkWidth === 0) {
                    logError("Invalid viewport or link width:", { viewportWidth, linkWidth });
                    return;
                }

                updateLinkPosition(linkWrapper, linkWidth, viewportWidth);
                linkWrapper.classList.add("randomized", "visible");
            }
        });
    };

    // Reset link positions to their original state
    const resetLinkPositions = (rows) => {
        rows.forEach((row) => {
            const linkWrapper = row.querySelector(".link-wrapper");
            if (!linkWrapper) return;

            const linkWidth = linkWrapper.offsetWidth;
            const viewportWidth = window.innerWidth;

            if (viewportWidth === 0 || linkWidth === 0) {
                logError("Invalid viewport or link width:", { viewportWidth, linkWidth });
                return;
            }

            updateLinkPosition(linkWrapper, linkWidth, viewportWidth);
        });
    };

    const handlePointerEnter = (linkWrapper, rows, index, getNextImage, overlay) => {
        if (isMobileDevice()) return; // Disable overlay functionality on mobile

        const hoveredRect = linkWrapper.getBoundingClientRect();
        const containerRect = linkWrapper.offsetParent.getBoundingClientRect(); // Get the parent container's position
        const hoveredLeft = hoveredRect.left - containerRect.left; // Relative to the parent container
        const hoveredRight = hoveredRect.right - containerRect.left; // Relative to the parent container

        // Get the row element for this linkWrapper
        const row = linkWrapper.closest("li");
        const isTitleRow = row && row.id === config.titleRowId;

        rows.forEach((otherRow, otherIndex) => {
            if (otherIndex === index) return;

            const otherLinkWrapper = otherRow.querySelector(`.${config.linkWrapperClass}`);
            if (!otherLinkWrapper) return;

            const otherLinkWidth = otherLinkWrapper.offsetWidth;

            // Treat title-row as a left-arrow row
            if ((row && row.classList.contains("left-arrow")) || isTitleRow) {
                otherLinkWrapper.style.left = `${hoveredLeft}px`;
            } else if (row && row.classList.contains("right-arrow")) {
                otherLinkWrapper.style.left = `${hoveredRight - otherLinkWidth}px`;
            }
        });

        // Show the image overlay
        const image = getNextImage();
        if (image) {
            overlay.style.backgroundImage = `url(${image})`;
            overlay.classList.add("visible");
        }
    };

    const handlePointerLeave = (rows, overlay) => {
        if (isMobileDevice()) return;
        resetLinkPositions(rows);
        overlay.classList.remove("visible");
    };

    // Enable hover effects for links
    const enableHoverEffect = (rows, getNextImage, overlay) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector(`.${config.linkWrapperClass}`);
            if (!linkWrapper) return;

            linkWrapper.addEventListener("pointerenter", () => handlePointerEnter(linkWrapper, rows, index, getNextImage, overlay));
            linkWrapper.addEventListener("pointerleave", () => handlePointerLeave(rows, overlay));
        });
    };

    // ==========================
    // OVERLAY IMAGE HANDLING
    // ==========================

    // Modularized overlay image handling
    const setupOverlayImages = async () => {
        const overlay = document.getElementById(config.imageOverlayId);
        let shuffledImages = [];
        const preloadedImages = new Map();

        const preloadImage = (src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = () => resolve(src);
                img.onerror = () => reject(`Failed to preload image: ${src}`);
            });
        };

        const getNextImage = (() => {
            let index = 0;
            return () => {
                if (shuffledImages.length === 0) {
                    logError("No images available for overlay.");
                    return null;
                }
                const image = shuffledImages[index];
                index = (index + 1) % shuffledImages.length;
                return image;
            };
        })();

        const fadeInOverlay = (element, duration = config.fadeDuration) => {
            let opacity = 0;
            const startTime = performance.now(); // Use high-resolution timer for accuracy

            const animate = (currentTime) => {
                const elapsedTime = currentTime - startTime;
                opacity = Math.min(elapsedTime / duration, 1); // Calculate opacity based on elapsed time
                element.style.opacity = opacity;

                if (opacity < 1) {
                    requestAnimationFrame(animate); // Continue animation until fully visible
                }
            };

            requestAnimationFrame(animate); // Start the animation
        };

        if (images && Array.isArray(images) && images.length > 0) {
            shuffledImages = images.sort(() => Math.random() - 0.5);

            // Preload all images and store successful ones in the map
            await Promise.allSettled(
                shuffledImages.map((image) =>
                    preloadImage(image)
                        .then((src) => preloadedImages.set(src, true))
                        .catch((error) => logError(error))
                )
            );

            if (isMobileDevice() && shuffledImages.length > 0) {
                const firstImage = shuffledImages[0];
                if (preloadedImages.has(firstImage)) {
                    overlay.style.backgroundImage = `url(${firstImage})`;
                    fadeInOverlay(overlay); // Use requestAnimationFrame for fade-in
                    overlay.classList.add("visible");
                } else {
                    logError("First image failed to preload, skipping overlay display.");
                }
            }
        } else {
            logError("No valid overlay images found or the file is empty.");
        }

        return { overlay, getNextImage };
    };

    const setupScrollBasedOverlay = (overlay, getNextImage, config) => {
        const { scrollThresholds, scrollIntervals } = config;
        const pageHeight = document.body.scrollHeight;
        const viewportHeight = window.innerHeight;

        // Determine page type based on height
        let pageType = "longPage";
        if (pageHeight <= scrollThresholds.shortPage) {
            pageType = "shortPage";
        } else if (pageHeight <= scrollThresholds.mediumPage) {
            pageType = "mediumPage";
        }

        // Calculate the number of intervals and interval height
        const intervals = scrollIntervals[pageType];
        const intervalHeight = pageHeight / intervals;

        let currentInterval = 0;

        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const newInterval = Math.floor(scrollTop / intervalHeight);

            if (newInterval !== currentInterval) {
                currentInterval = newInterval;

                // Change the overlay image
                const nextImage = getNextImage();
                if (nextImage) {
                    overlay.style.backgroundImage = `url(${nextImage})`;
                    overlay.classList.add("visible");
                }
            }
        };

        // Attach the scroll event listener
        window.addEventListener("scroll", handleScroll);
    };

    // ==========================
    // PAGE INITIALIZATION
    // ==========================

    // Function to initialize a collection page (e.g., /projects/, /writings/, or the homepage)
    const initializeCollectionPage = async (path, indexData, sectionsConfig, getNextImage, overlay, collectionData) => {
        console.log(`DEBUG: Initializing collection page: ${path}`);

        const container = document.getElementById(config.linkContainerId);
        if (!container) {
            logError(`No link-container found for collection page: ${path}`);
            return;
        }

        const list = container.querySelector("ul");
        if (!list) {
            logError(`No <ul> element found in link-container for path: ${path}`);
            return;
        }

        if (!collectionData.length) {
            logError(`Invalid or missing data for collection page: ${path}`);
            return;
        }

        // Clear existing links and render new ones
        list.innerHTML = "";
        const fragment = populateLinks(collectionData, sectionsConfig[path.replace(/^\/|\/$/g, "")]?.format);
        list.appendChild(fragment);

        const rows = Array.from(list.children);
        randomizeLinks(rows);
        enableHoverEffect(rows, getNextImage, overlay);
    };

    // Function to initialize an individual page (e.g., /projects/shed-your-skin/)
    const initializeIndividualPage = (path) => {
        console.log(`DEBUG: Initializing individual page: ${path}`);
        // Add any specific logic for individual pages here (if needed)
    };

    // Render links dynamically
    const populateLinks = (data, format) => {
        const fragment = document.createDocumentFragment();

        data.forEach((item) => {
            const row = document.createElement("li");

            if (item.isTitle) {
                row.id = config.titleRowId;
            } else {
                row.classList.add(config.rowClass);
            }

            const linkWrapper = document.createElement("div");
            linkWrapper.className = config.linkWrapperClass;

            const link = document.createElement("a");
            link.href = item.permalink;
            link.textContent = item.title;

            if (item.external) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            } else if (item.newTab === false) {
                link.target = "_self";
            }

            linkWrapper.appendChild(link);

            const subtitleText = formatSubtitle(item, format);
            if (subtitleText) {
                const subtitle = document.createElement("span");
                subtitle.className = config.subtitleClass;
                subtitle.textContent = subtitleText;
                linkWrapper.appendChild(subtitle);
            }

            row.appendChild(linkWrapper);
            fragment.appendChild(row);
        });

        return fragment;
    };

    // ==========================
    // MAIN INITIALIZATION
    // ==========================

    const config = await fetchJSON("config-data", {});
    if (!Object.keys(config).length) {
        logError("Missing or invalid config.");
        return;
    }

    // Prepare dynamic keys based on config
    const keysToFetch = [
        ["index-data", []],
        ["section-data", {}],
        ["overlay-images-data", []],
    ];

    if (config.sectionConfig?.metaName) {
        keysToFetch.push([config.sectionConfig.metaName, []]);
    }

    // Settle all at once and map results by key
    const fetchedData = await settleFetch(keysToFetch);

    // Destructure the result map
    const index = fetchedData["index-data"];
    const sections = fetchedData["section-data"];
    const images = fetchedData["overlay-images-data"];
    const collectionData = config.sectionConfig?.metaName ? fetchedData[config.sectionConfig.metaName] : [];

    const overlaySetup = await setupOverlayImages();
    if (!overlaySetup) {
        logError("Failed to set up overlay images.");
        return;
    }

    const { getNextImage, overlay } = overlaySetup;

    // Setup scroll-based overlay for mobile
    if (isMobileDevice()) setupScrollBasedOverlay(overlay, getNextImage, config);

    const currentPath = window.location.pathname.replace(/^\/|\/$/g, "");
    const isCollectionPage = index.some((item) => item.permalink === currentPath);

    if (isCollectionPage) {
        initializeCollectionPage(currentPath, index, sections, getNextImage, overlay, collectionData);
    } else {
        initializeIndividualPage(currentPath);
    }

    const adjustLinkContainerHeight = () => {
        const navBar = document.getElementById(config.navBarId);
        const titleRow = document.getElementById(config.titleRowId);
        const linkContainer = document.getElementById(config.linkContainerId);

        if (!linkContainer) return;

        linkContainer.style.height = `${calculateAvailableHeight(navBar, titleRow)}px`;
    };

    // Adjust the height on page load and window resize
    window.addEventListener("load", adjustLinkContainerHeight);
    window.addEventListener("resize", debounce(() => {
        cachedViewportWidth = window.innerWidth;
    }, config.debounceTime));
})();