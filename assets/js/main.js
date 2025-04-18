window.onload = async () => {
    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // Utility function for centralized error logging
    const logError = (message) => console.error(`DEBUG: ${message}`);

    // Utility function to fetch JSON data from a URL
    const fetchJSON = async (metaName) => {
        const url = document.querySelector(`meta[name='${metaName}']`)?.content;
        if (!url) {
            logError(`Meta tag with name '${metaName}' not found`);
            return null;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch data from ${url}`);
            return await response.json();
        } catch (error) {
            logError(`Error loading ${metaName}: ${error.message}`);
            return null;
        }
    };

    // Utility function to generate a random position for links
    const generateRandomPosition = (linkWidth, viewportWidth) => {
        const baseMargin = viewportWidth < 768 ? 40 : 80;
        const safeMin = baseMargin;
        const safeMax = viewportWidth - baseMargin - linkWidth;
        return Math.max(safeMin, Math.min(Math.random() * (safeMax - safeMin) + safeMin, safeMax));
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

    // Enable hover effects for links
    const enableHoverEffect = (rows, getNextImage, overlay) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector(".link-wrapper");
            if (!linkWrapper) return;

            linkWrapper.addEventListener("pointerenter", () => {
                if (isMobile) return; // Disable overlay functionality on mobile

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
            });

            linkWrapper.addEventListener("pointerleave", () => {
                if (isMobile) return; // Disable overlay functionality on mobile

                rows.forEach((otherRow, otherIndex) => {
                    if (otherIndex === index) return;

                    const otherLinkWrapper = otherRow.querySelector(".link-wrapper");
                    if (!otherLinkWrapper) return;

                    const linkWidth = otherLinkWrapper.offsetWidth;
                    const viewportWidth = window.innerWidth;

                    if (viewportWidth === 0 || linkWidth === 0) {
                        logError("Invalid viewport or link width:", { viewportWidth, linkWidth });
                        return;
                    }

                    // Randomize the position of other links
                    const newLeft = generateRandomPosition(linkWidth, viewportWidth);
                    otherLinkWrapper.style.left = `${newLeft}px`;
                });

                // Hide the image overlay
                overlay.classList.remove("visible");
            });
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

        const overlayImages = await fetchJSON("overlay-images-data");
        if (overlayImages && Array.isArray(overlayImages) && overlayImages.length > 0) {
            shuffledImages = overlayImages.sort(() => Math.random() - 0.5);
            shuffledImages.forEach((image) => {
                const img = new Image();
                img.src = image;
            });

            if (isMobile) {
                overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
                overlay.classList.add("visible");
            }
        } else {
            logError("DEBUG: No valid overlay images found in sky_images.json or the file is empty.");
        }

        return { overlay, getNextImage };
    };

    // Dynamically fetch sections.json via meta tag
    const fetchSectionsConfig = async () => {
        return await fetchJSON("section-data");
    };

    // Utility function to format dates
    const formatDate = (month) => {
        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        if (typeof month === "number" && month >= 1 && month <= 12) {
            return monthNames[month - 1]; // Convert numeric month to name
        }
        return month; // Return non-numeric values (e.g., "Fall") as-is
    };

    // Format subtitles dynamically based on available properties
    const formatSubtitle = (item, format) => {
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
            link.href = item.href;
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

    // Initialize a page by rendering links and applying behaviors
    const initializePage = async (sectionKey, sectionsConfig, overlaySetup) => {
        const section = sectionsConfig[sectionKey];
        if (!section) {
            console.error(`No configuration found for section: ${sectionKey}`);
            return;
        }

        const { metaName, containerId, isListPage, format } = section;
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container with ID '${containerId}' not found`);
            return;
        }

        const list = container.querySelector("ul");
        const data = await fetchJSON(metaName);
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.error(`No valid data found for meta tag '${metaName}'`);
            return;
        }

        if (isListPage && list) {
            const fragment = renderLinks(data, format);
            list.appendChild(fragment);

            const rows = Array.from(list.children);
            randomizeLinks(rows);
            enableHoverEffect(rows, overlaySetup.getNextImage, overlaySetup.overlay);
        }
    };

    // Main logic
    const sectionsConfig = await fetchSectionsConfig();
    if (!sectionsConfig) {
        logError("Failed to load sections configuration.");
        return;
    }

    const overlaySetup = await setupOverlayImages();

    const currentPath = window.location.pathname;

    // Dynamically determine the section based on the URL
    const sectionKey = Object.keys(sectionsConfig).find((key) => {
        if (key === "index" && currentPath === "/") return true;
        return currentPath.startsWith(`/${key}/`);
    });

    if (sectionKey) {
        await initializePage(sectionKey, sectionsConfig, overlaySetup);
    } else {
        console.error(`No matching section found for path: ${currentPath}`);
    }

    const adjustLinkContainerHeight = () => {
        const navBar = document.getElementById("site-nav");
        const titleRow = document.querySelector(".title-row");
        const linkContainer = document.getElementById("link-container");

        if (!linkContainer) return;

        const navHeight = navBar ? navBar.offsetHeight : 0;
        const titleHeight = titleRow ? titleRow.offsetHeight : 0;

        // Calculate the available height for the link container
        const availableHeight = window.innerHeight - (navHeight + titleHeight);

        // Set the height of the link container
        linkContainer.style.height = `${availableHeight}px`;
    };

    // Adjust the height on page load and window resize
    window.addEventListener("load", adjustLinkContainerHeight);
    window.addEventListener("resize", adjustLinkContainerHeight);
};