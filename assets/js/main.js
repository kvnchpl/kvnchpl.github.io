(async function () {
    "use strict";

    // ==========================
    // GLOBAL CONSTANTS
    // ==========================
    const isMobileDevice = () => window.innerWidth <= 768;
    let cachedViewportWidth = window.innerWidth;
    const logError = (message, context = {}) => console.error(message, context);

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

    const fetchConfigAndData = async () => {
        const config = await fetchJSON("config-data", {});
        console.log("DEBUG: Fetched config:", config); // Debugging
        if (!Object.keys(config).length) throw new Error("Missing or invalid config.");

        window.config = config;

        const metaTags = config.metaTags;
        const keysToFetch = Object.entries(metaTags).map(([key, metaName]) => [metaName, []]);
        const fetchedData = await settleFetch(keysToFetch);
        console.log("DEBUG: Fetched data keys:", Object.keys(fetchedData));

        return { metaTags, fetchedData };
    };

    const normalizePath = (permalink) => permalink.replace(/^\/|\/$/g, "") || config.indexFallbackKey;

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
        const margin = isMobileDevice()
            ? config.linkMargins.mobile
            : config.linkMargins.desktop;
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
                const leftArrow = config.arrowSymbols?.left;
                const rightArrow = config.arrowSymbols?.right;
                link.textContent = isLeftArrow ? `${leftArrow} ${originalText}` : `${originalText} ${rightArrow}`;
            }

            row.classList.add(isLeftArrow ? "left-arrow" : "right-arrow");

            if (!isMobileDevice()) {
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
    const setupOverlayImages = async (images, config = window.config) => {
        // Replace single overlay lookup with dual overlays
        const overlayA = document.getElementById("image-overlay-a");
        const overlayB = document.getElementById("image-overlay-b");
        if (!overlayA || !overlayB) {
            logError("Overlay elements not found.");
            return null;
        }

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

        if (Array.isArray(images) && images.length > 0) {
            shuffledImages = images.sort(() => Math.random() - 0.5);

            const preloadResults = await Promise.allSettled(
                shuffledImages.map((src) =>
                    preloadImage(src)
                        .then((loaded) => preloadedImages.set(loaded, true))
                        .catch((err) => logError(err))
                )
            );

            if (preloadedImages.size === 0) {
                logError("All image preloads failed.");
                if (config.debugMode) {
                    alert("Image overlay failed to load.");
                }
                return { overlayA, overlayB, getNextImage: () => null };
            }

            // For mobile: show the first image immediately
            if (isMobileDevice()) {
                const firstImage = shuffledImages.find((src) => preloadedImages.has(src));
                if (firstImage) {
                    overlayA.style.backgroundImage = `url(${firstImage})`;
                    overlayA.classList.add("visible");
                }
            }
        } else {
            logError("No overlay images defined or input is invalid.");
        }

        return { overlayA, overlayB, getNextImage };
    };

    const setupScrollBasedOverlay = (overlayA, overlayB, getNextImage) => {
        if (!isMobileDevice()) return;

        let isAVisible = true;

        // Set different starting images for overlayA and overlayB
        const firstImage = getNextImage();
        const secondImage = getNextImage();
        overlayA.style.backgroundImage = `url(${firstImage})`;
        overlayB.style.backgroundImage = `url(${secondImage})`;
        overlayA.classList.add("visible");

        setInterval(() => {
            const nextImage = getNextImage();
            if (!nextImage) return;

            const showOverlay = isAVisible ? overlayB : overlayA;
            const hideOverlay = isAVisible ? overlayA : overlayB;

            showOverlay.style.backgroundImage = `url(${nextImage})`;
            showOverlay.classList.add("visible");
            hideOverlay.classList.remove("visible");

            isAVisible = !isAVisible;
        }, config.shuffleInterval);
    };

    // ==========================
    // PAGE INITIALIZATION
    // ==========================

    const initializePage = async (path, isHomepage, config, metaTags, fetchedData) => {
        const index = fetchedData[metaTags.index];
        const sections = fetchedData[metaTags.sections];
        const images = fetchedData[metaTags.overlayImages];
        const sectionKey = isHomepage ? "index" : path;
        const collectionMeta = sections[sectionKey]?.metaName;
        const collectionData = collectionMeta ? fetchedData[collectionMeta] : [];

        const overlaySetup = await setupOverlayImages(images, config);

        console.log("DEBUG: Initializing:", { path, sectionKey, collectionMeta, fetchedData });

        if (!overlaySetup || typeof overlaySetup !== "object") {
            throw new Error("Overlay setup failed or returned invalid object.");
        }
        const { getNextImage, overlayA, overlayB } = overlaySetup;

        if (isMobileDevice()) setupScrollBasedOverlay(overlayA, overlayB, getNextImage);

        const isCollectionPage = index.some((item) => {
            const normalizedPermalink = normalizePath(item.permalink);
            return normalizedPermalink === path && item.collection !== false;
        });

        if (isCollectionPage) {
            const sectionKey = isHomepage ? "index" : path;
            // Use overlayA for hover overlays; overlayB is used for crossfade
            initializeCollectionPage(path, index, sections, getNextImage, overlayA, collectionData);
        } else {
            initializeIndividualPage(path);
        }
    };

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

        // Optionally sort by date if specified in index.json for this path
        const pageMeta = indexData.find((item) => {
            const normalizedPermalink = normalizePath(item.permalink);
            return normalizedPermalink === path;
        });

        if (pageMeta?.dateSorted) {
            collectionData.sort((a, b) => new Date(a.date) - new Date(b.date));
        }

        // Clear existing links and render new ones
        list.innerHTML = "";
        const fragment = populateLinks(collectionData, sectionsConfig[normalizePath(path)]?.format);
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

    const { pathname } = window.location;

    const { metaTags, fetchedData } = await fetchConfigAndData();
    const path = normalizePath(pathname);
    const isHomepage = path === config.indexFallbackKey;

    await initializePage(path, isHomepage, config, metaTags, fetchedData);

    // Adjust link container height on load and resize
    const adjustLinkContainerHeight = () => {
        const navBar = document.getElementById(config.navBarId);
        const titleRow = document.getElementById(config.titleRowId);
        const linkContainer = document.getElementById(config.linkContainerId);

        if (linkContainer) {
            linkContainer.style.height = `${calculateAvailableHeight(navBar, titleRow)}px`;
        }
    };

    window.addEventListener("load", adjustLinkContainerHeight);
    window.addEventListener(
        "resize",
        debounce(() => {
            cachedViewportWidth = window.innerWidth;
        }, config.debounceTime)
    );

    document.addEventListener("DOMContentLoaded", () => {
        const currentNavLink = document.querySelector("#site-nav a.current");
        if (currentNavLink) {
            const text = currentNavLink.textContent.trim();
            currentNavLink.textContent = `*${text}*`;
        }
    });
})();