(async function () {
    "use strict";

    const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Utility function for centralized error logging
    const logError = (message) => console.error(`DEBUG: ${message}`);

    // Utility function to fetch JSON data from a URL
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

    const [indexData, sectionsConfig, overlayImages] = await Promise.allSettled([
        fetchJSON("index-data"),
        fetchJSON("section-data"),
        fetchJSON("overlay-images-data"),
    ]);

    if (indexData.status !== "fulfilled") logError("Failed to load index-data.");
    if (sectionsConfig.status !== "fulfilled") logError("Failed to load section-data.");
    if (overlayImages.status !== "fulfilled") logError("Failed to load overlay-images-data.");

    if (indexData.status !== "fulfilled" || sectionsConfig.status !== "fulfilled" || overlayImages.status !== "fulfilled") {
        logError("Skipping initialization due to missing data.");
        return;
    }

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
        const margin = viewportWidth < 768 ? 40 : 80;
        const minPosition = margin;
        const maxPosition = viewportWidth - margin - linkWidth;
        return Math.random() * (maxPosition - minPosition) + minPosition;
    };

    // Randomize link positions for desktop and alternate positions for mobile
    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector(".link-wrapper");
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
            const isLeftArrow = row.classList.contains("title-row") || index % 2 === 0;
            if (!row.classList.contains("title-row")) {
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

                const initialLeft = Math.round(generateRandomPosition(linkWidth, viewportWidth));
                linkWrapper.classList.add("randomized");
                linkWrapper.style.left = `${initialLeft}px`;
            }

            linkWrapper.classList.add("visible");
        });
    };


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

            const newLeft = generateRandomPosition(linkWidth, viewportWidth);
            linkWrapper.style.left = `${newLeft}px`;
        });
    };

    const handlePointerEnter = (linkWrapper, rows, index, getNextImage, overlay) => {
        if (isMobileDevice()) return; // Disable overlay functionality on mobile

        const hoveredRect = linkWrapper.getBoundingClientRect();
        const containerRect = linkWrapper.offsetParent.getBoundingClientRect(); // Get the parent container's position
        const hoveredLeft = hoveredRect.left - containerRect.left; // Relative to the parent container
        const hoveredRight = hoveredRect.right - containerRect.left; // Relative to the parent container

        rows.forEach((otherRow, otherIndex) => {
            if (otherIndex === index) return;

            const otherLinkWrapper = otherRow.querySelector(".link-wrapper");
            if (!otherLinkWrapper) return;

            const otherLinkWidth = otherLinkWrapper.offsetWidth;

            // Treat title-row as a left-arrow row
            if (row.classList.contains("left-arrow") || row.classList.contains("title-row")) {
                otherLinkWrapper.style.left = `${hoveredLeft}px`;
            } else if (row.classList.contains("right-arrow")) {
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
            const linkWrapper = row.querySelector(".link-wrapper");
            if (!linkWrapper) return;

            linkWrapper.addEventListener("pointerenter", () => handlePointerEnter(linkWrapper, rows, index, getNextImage, overlay));
            linkWrapper.addEventListener("pointerleave", () => handlePointerLeave(rows, overlay));
        });
    };

    // Modularized overlay image handling
    const setupOverlayImages = async () => {
        const overlay = document.getElementById("image-overlay");
        let shuffledImages = [];
        const getNextImage = (() => {
            let index = 0;
            return () => {
                if (shuffledImages.length === 0) return "";
                const image = shuffledImages[index];
                index = (index + 1) % shuffledImages.length;
                return image;
            };
        })();

        if (overlayImages && Array.isArray(overlayImages) && overlayImages.length > 0) {
            shuffledImages = overlayImages.sort(() => Math.random() - 0.5);
            shuffledImages.forEach((image) => {
                const img = new Image();
                img.src = image;
                img.onerror = () => logError(`Failed to preload image: ${image}`);
            });

            if (isMobileDevice()) {
                overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
                overlay.classList.add("visible");
            }
        } else {
            logError("No valid overlay images found or the file is empty.");
        }

        return { overlay, getNextImage };
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

    // Render links dynamically
    const renderLinks = (data, format) => {
        const fragment = document.createDocumentFragment();

        data.forEach((item) => {
            const row = document.createElement("li");

            if (item.isTitle) {
                row.classList.add("title-row");
            } else {
                row.classList.add("row");
            }

            const linkWrapper = document.createElement("div");
            linkWrapper.className = "link-wrapper";

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
                subtitle.className = "subtitle";
                subtitle.textContent = subtitleText;
                linkWrapper.appendChild(subtitle);
            }

            row.appendChild(linkWrapper);
            fragment.appendChild(row);
        });

        return fragment;
    };

    // Function to initialize a collection page (e.g., /projects/, /writings/, or the homepage)
    const initializeCollectionPage = async (path, indexData, sectionsConfig, getNextImage, overlay) => {
        console.log(`DEBUG: Initializing collection page: ${path}`);

        const container = document.getElementById("link-container");
        if (!container) {
            console.warn(`No link-container found for collection page: ${path}`);
            return;
        }

        const list = container.querySelector("ul");
        if (!list) {
            console.warn(`No <ul> element found in link-container for path: ${path}`);
            return;
        }

        const normalizedPath = path.replace(/^\/|\/$/g, "");
        const sectionConfig = sectionsConfig[normalizedPath];

        if (!sectionConfig) {
            logError(`No section configuration found for path: ${path}`);
            return;
        }

        const collectionData = await fetchJSON(sectionConfig.metaName);
        if (!collectionData || collectionData.length === 0) {
            logError(`Invalid or missing data for collection page: ${path}`);
            return;
        }

        // Clear existing links and render new ones
        list.innerHTML = "";
        const fragment = renderLinks(collectionData, sectionConfig.format);
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

    // Main logic
    const overlaySetup = await setupOverlayImages();
    if (!overlaySetup) {
        logError("Failed to set up overlay images.");
        return;
    }

    const { getNextImage, overlay } = overlaySetup;

    // Get the current path and normalize it
    let currentPath = window.location.pathname.replace(/\/$/, ""); // Remove trailing slash
    if (currentPath === "") currentPath = "/"; // Set homepage path to "/"

    console.log(`DEBUG: Sections configuration:`, sectionsConfig);

    // Check if the current path is a collection page
    const isCollectionPage = indexData.some((item) => item.permalink === currentPath);

    if (isCollectionPage) {
        initializeCollectionPage(currentPath, indexData, sectionsConfig, getNextImage, overlay);
    } else {
        initializeIndividualPage(currentPath);
    }

    const calculateAvailableHeight = (navBar, titleRow) => {
        const navHeight = navBar ? navBar.offsetHeight : 0;
        const titleHeight = titleRow ? titleRow.offsetHeight : 0;
        return window.innerHeight - (navHeight + titleHeight);
    };

    const adjustLinkContainerHeight = () => {
        const navBar = document.getElementById("site-nav");
        const titleRow = document.querySelector(".title-row");
        const linkContainer = document.getElementById("link-container");

        if (!linkContainer) return;

        linkContainer.style.height = `${calculateAvailableHeight(navBar, titleRow)}px`;
    };

    // Adjust the height on page load and window resize
    window.addEventListener("load", adjustLinkContainerHeight);
    window.addEventListener("resize", debounce(adjustLinkContainerHeight, 200));
})();