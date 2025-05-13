import {
    logError,
    isMobileDevice,
    normalizePath,
    createElement,
    getProjectBasePath,
    addSwipeNavigation
} from './utils.js';

(() => {

    const main = document.getElementById("main-content");

    let imageLoadPromises = [];

    const createTitleElement = (title) => {
        if (!main) {
            logError("Missing #main-content element in DOM.");
            return;
        }
        const titleEl = createElement("h1", {
            attrs: { id: "project-title" },
            children: [title]
        });
        main.appendChild(titleEl);
    };

    const createContentWrapper = () => {
        if (!main) {
            logError("Missing #main-content element in DOM.");
            return null;
        }
        const wrapper = createElement("div", { attrs: { id: "content-wrapper" } });
        main.appendChild(wrapper);
        return wrapper;
    };

    const renderSlideshowGroup = (images, basePath, groupIndex) => {
        const groupWrapper = createElement("div", { className: "slides-wrapper" });

        images.forEach((imgBase, index) => {
            const extension = config.imageExtension;
            const filename = `${imgBase}.${extension}`;
            const altText = imgBase;
            const fallbackSize = isMobileDevice() ? "small" : config.defaultImageFallbackSize;
            const src = `${basePath}/${fallbackSize}/${filename}`;
            const srcset = Object.entries(config.imageFolders)
                .map(([size, folder]) => `${basePath}/${folder}/${filename} ${config.imageSizes[size]}`)
                .join(", ");

            const imgEl = createElement("img", {
                attrs: {
                    src,
                    alt: altText,
                    draggable: "false",
                    srcset,
                    sizes: config.imageSizesHint
                }
            });

            const loadPromise = new Promise((resolve) => {
                imgEl.onload = () => {
                    if (groupIndex === 0 && index === 0 && imgEl.naturalWidth && imgEl.naturalHeight) {
                        const percent = (imgEl.naturalHeight / imgEl.naturalWidth) * 100;
                        groupWrapper.style.setProperty('--aspect-ratio', `${percent}%`);
                        groupWrapper.style.position = "relative";
                        groupWrapper.style.removeProperty("padding-top");
                    }
                    resolve();
                };
                imgEl.onerror = resolve;
            });
            imageLoadPromises.push(loadPromise);

            const slide = createElement("div", {
                className: "slide",
                children: [imgEl]
            });
            groupWrapper.appendChild(slide);
        });

        const slides = groupWrapper.querySelectorAll(".slide");
        let current = 0;
        const showSlide = (index) => {
            slides.forEach((s, j) => s.classList.toggle("active", j === index));
        };

        if (slides.length > 1) {
            const prevBtn = createElement("button", { className: "prev", children: ["←"] });
            const nextBtn = createElement("button", { className: "next", children: ["→"] });

            prevBtn.addEventListener("click", () => {
                current = (current - 1 + slides.length) % slides.length;
                showSlide(current);
            });

            nextBtn.addEventListener("click", () => {
                current = (current + 1) % slides.length;
                showSlide(current);
            });

            groupWrapper.appendChild(prevBtn);
            groupWrapper.appendChild(nextBtn);

            // Swipe gesture support
            if (isMobileDevice()) {
                addSwipeNavigation(
                    groupWrapper,
                    () => { current = (current + 1) % slides.length; showSlide(current); },
                    () => { current = (current - 1 + slides.length) % slides.length; showSlide(current); }
                );
            }
        }
        // Always show first slide
        showSlide(0);

        return groupWrapper;
    };

    const renderDescriptionBlock = (content) => {
        return createElement("p", { className: "content", children: [document.createTextNode(content)] });
    };

    const renderLayoutSequence = (layoutSequence, contentBlocks, imageGroups, basePath, contentWrapper) => {
        layoutSequence.forEach((block) => {
            const [type, indexStr] = block.split("-");
            const index = parseInt(indexStr, 10) - 1;

            if (type === "slideshow") {
                if (imageGroups[index]) {
                    const groupWrapper = renderSlideshowGroup(imageGroups[index], basePath, index);
                    contentWrapper.appendChild(groupWrapper);
                } else {
                    logError(`Layout reference error: slideshow index ${index + 1} out of range.`);
                }
            } else if (type === "description") {
                if (contentBlocks[index]) {
                    const p = renderDescriptionBlock(contentBlocks[index]);
                    contentWrapper.appendChild(p);
                } else {
                    logError(`Layout reference error: description index ${index + 1} out of range.`);
                }
            }
        });
    };

    const renderDefaultLayout = (maxBlocks, contentBlocks, imageGroups, basePath, contentWrapper) => {
        for (let i = 0; i < maxBlocks; i++) {
            if (imageGroups[i]) {
                const groupWrapper = renderSlideshowGroup(imageGroups[i], basePath, i);
                contentWrapper.appendChild(groupWrapper);
            }
            if (contentBlocks[i]) {
                const p = renderDescriptionBlock(contentBlocks[i]);
                contentWrapper.appendChild(p);
            }
        }
    };

    const appendProjectDate = (project, contentWrapper) => {
        if (project.month && project.year && Array.isArray(window.config?.monthNames)) {
            const monthName = window.config.monthNames[project.month - 1] || project.month;
            const dateEl = createElement("p", {
                className: "project-date",
                attrs: { id: "project-date" },
                children: [`—${monthName} ${project.year}`]
            });
            contentWrapper.appendChild(dateEl);
        }
    };

    const initializeProjectPage = () => {
        imageLoadPromises = [];
        const rawPath = normalizePath(window.location.pathname);
        const project = window.config.projects.find(
            (p) => normalizePath(p.permalink) === rawPath
        );

        if (!project) {
            logError("Project not found for path:", rawPath);
            return;
        }

        createTitleElement(project.title);

        const contentWrapper = createContentWrapper();
        if (!contentWrapper) {
            return;
        }

        const basePath = getProjectBasePath(project.permalink);
        const contentBlocks = project.content || [];
        const imageGroups = project.images || [];

        const maxBlocks = Math.max(contentBlocks.length, imageGroups.length);

        const layoutSequence = (project.layout || "")
            .split(",")
            .map(part => part.trim())
            .filter(Boolean);

        if (layoutSequence.length > 0) {
            renderLayoutSequence(layoutSequence, contentBlocks, imageGroups, basePath, contentWrapper);
        } else {
            renderDefaultLayout(maxBlocks, contentBlocks, imageGroups, basePath, contentWrapper);
        }

        Promise.all(imageLoadPromises).then(() => {
            document.querySelectorAll(".slides-wrapper").forEach(wrapper => {
                // Removed outdated .slideshow visibility line
            });
            if (main) {
                main.classList.add("ready");
            }
        });

        // Disable context menu on slideshow
        contentWrapper?.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        appendProjectDate(project, contentWrapper);
    };

    window.addEventListener("config-ready", initializeProjectPage);
})();