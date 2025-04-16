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
        const safeMin = baseMargin + linkWidth / 2;
        const safeMax = viewportWidth - baseMargin - linkWidth / 2;
        return Math.random() * (safeMax - safeMin) + safeMin - linkWidth / 2;
    };

    // Randomize link positions for desktop and alternate positions for mobile
    const randomizeLinks = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector(".link-wrapper");
            if (!linkWrapper) {
                console.error(`No .link-wrapper found in row ${index}`);
                return;
            }

            const link = linkWrapper.querySelector("a");
            if (!link) {
                console.error(`No <a> element found in .link-wrapper for row ${index}`);
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
                    console.error("Invalid viewport or link width:", { viewportWidth, linkWidth });
                    return;
                }

                const initialLeft = generateRandomPosition(linkWidth, viewportWidth);
                console.log(`Setting initial left position for row ${index}:`, initialLeft);
                linkWrapper.classList.add("randomized");
                linkWrapper.style.left = `${initialLeft}px`;
            }

            linkWrapper.classList.add("visible");
        });
    };

    // Enable hover effects for links
    const enableHoverEffect = (rows) => {
        rows.forEach((row, index) => {
            const linkWrapper = row.querySelector(".link-wrapper");
            if (!linkWrapper) return;

            linkWrapper.addEventListener("pointerenter", () => {
                if (isMobile) return; // Disable sliding functionality on mobile

                console.log(`Pointer entered row ${index}`);

                const hoveredRect = linkWrapper.getBoundingClientRect();
                const containerRect = linkWrapper.offsetParent.getBoundingClientRect(); // Get the parent container's position
                const hoveredLeft = hoveredRect.left - containerRect.left; // Relative to the parent container
                const hoveredRight = hoveredRect.right - containerRect.left; // Relative to the parent container

                console.log(`Hovered link left: ${hoveredLeft}, right: ${hoveredRight}`);

                rows.forEach((otherRow, otherIndex) => {
                    if (otherIndex === index) return;

                    const otherLinkWrapper = otherRow.querySelector(".link-wrapper");
                    if (!otherLinkWrapper) return;

                    const otherLinkWidth = otherLinkWrapper.offsetWidth;

                    // Treat title-row as a left-arrow row
                    if (row.classList.contains("left-arrow") || row.classList.contains("title-row")) {
                        otherLinkWrapper.style.left = `${hoveredLeft}px`;
                        console.log(`Aligning left-arrow row ${otherIndex} to ${hoveredLeft}`);
                    } else if (row.classList.contains("right-arrow")) {
                        otherLinkWrapper.style.left = `${hoveredRight - otherLinkWidth}px`;
                        console.log(`Aligning right-arrow row ${otherIndex} to ${hoveredRight - otherLinkWidth}`);
                    }
                });
            });

            linkWrapper.addEventListener("pointerleave", () => {
                if (isMobile) return; // Disable sliding functionality on mobile

                console.log(`Pointer left row ${index}`);

                rows.forEach((otherRow, otherIndex) => {
                    if (otherIndex === index) return;

                    const otherLinkWrapper = otherRow.querySelector(".link-wrapper");
                    if (!otherLinkWrapper) return;

                    const linkWidth = otherLinkWrapper.offsetWidth;
                    const viewportWidth = window.innerWidth;

                    if (viewportWidth === 0 || linkWidth === 0) {
                        console.error("Invalid viewport or link width:", { viewportWidth, linkWidth });
                        return;
                    }

                    // Randomize the position of other links
                    const newLeft = generateRandomPosition(linkWidth, viewportWidth);
                    otherLinkWrapper.style.left = `${newLeft}px`;
                });
            });
        });
    };

    // Preload images
    const preloadImages = (images) => {
        images.forEach((image) => {
            const img = new Image();
            img.src = image;
        });
    };

    // Fetch and process overlay images
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
        preloadImages(shuffledImages);

        if (isMobile) {
            overlay.style.backgroundImage = `url(${shuffledImages[0]})`;
            overlay.classList.add("visible");
        }
    } else {
        logError("DEBUG: No valid overlay images found in sky_images.json or the file is empty.");
    }

    // Apply behavior to pages with #link-container
    const linkContainer = document.getElementById("link-container");
    if (linkContainer) {
        const linkList = linkContainer.querySelector("ul");
        if (!linkList) {
            logError("No <ul> found inside #link-container");
            return;
        }

        let rows = Array.from(linkList.children);

        // If on the homepage, fetch links from index.json
        if (window.location.pathname === "/") {
            const indexLinks = await fetchJSON("index-links-data");
            if (indexLinks && Array.isArray(indexLinks) && indexLinks.length > 0) {
                rows = indexLinks.map((linkItem) => {
                    const row = document.createElement("li");
                    row.classList.add("row");

                    if (linkItem.isTitle) {
                        // Handle the title row
                        row.classList.add("title-row");

                        const linkWrapper = document.createElement("div");
                        linkWrapper.className = "link-wrapper";

                        const link = document.createElement("a");
                        link.href = linkItem.href;
                        link.textContent = linkItem.label;

                        linkWrapper.appendChild(link);
                        row.appendChild(linkWrapper);
                    } else {
                        // Handle regular rows
                        const linkWrapper = document.createElement("div");
                        linkWrapper.className = "link-wrapper";

                        const link = document.createElement("a");
                        link.href = linkItem.href;
                        link.textContent = linkItem.label;

                        if (linkItem.newTab === false) {
                            link.target = "_self";
                        } else if (linkItem.href.startsWith("http")) {
                            link.target = "_blank";
                            link.rel = "noopener noreferrer";
                        }

                        linkWrapper.appendChild(link);
                        row.appendChild(linkWrapper);
                    }

                    if (linkItem.subtitle) {
                        const subtitle = document.createElement("span");
                        subtitle.className = "subtitle";
                        subtitle.textContent = linkItem.subtitle;
                        row.querySelector(".link-wrapper").appendChild(subtitle);
                    }

                    linkList.appendChild(row);
                    return row;
                });
            } else {
                logError("DEBUG: No valid links found in index.json or the file is empty.");
            }
        }

        randomizeLinks(rows);
        enableHoverEffect(rows);
    }
};