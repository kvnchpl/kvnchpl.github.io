import { logError, isMobileDevice, normalizePath, createElement } from './utils.js';

const initializeProjectPage = () => {
    const rawPath = normalizePath(window.location.pathname);
    const project = window.config.projects.find(
        (p) => normalizePath(p.permalink) === rawPath
    );

    if (!project) {
        logError("Project not found for path:", rawPath);
        return;
    }

    // Populate title
    document.getElementById("project-title").textContent = project.title;

    // Populate slideshow
    const slidesWrapper = document.getElementById("project-slides");
    const imageLoadPromises = [];
    if (Array.isArray(project.images)) {
        const basePath = `${config.imageBasePath}/${normalizePath(project.permalink).split("/").pop()}`;

        project.images.forEach((group, groupIndex) => {
            const groupWrapper = createElement("div", {
                className: "slides-wrapper"
            });

            group.forEach((imgBase, index) => {
                const filename = `${imgBase}.webp`;
                const altText = imgBase;
                const src = `${basePath}/${config.defaultImageFallbackSize}/${filename}`;
                const srcset = Object.entries(config.imageFolders)
                    .map(([size, folder]) => `${basePath}/${folder}/${filename} ${config.imageSizes[size]}`)
                    .join(", ");

                const imgEl = createElement("img", {
                    attrs: {
                        src,
                        alt: altText,
                        draggable: "false",
                        srcset,
                        sizes: config.imageSizesHint || "(max-width: 768px) 90vw, 60vw"
                    }
                });

                const loadPromise = new Promise((resolve) => {
                    imgEl.onload = () => {
                        if (groupIndex === 0 && index === 0 && imgEl.naturalWidth && imgEl.naturalHeight) {
                            const percent = (imgEl.naturalHeight / imgEl.naturalWidth) * 100;
                            groupWrapper.style.paddingTop = `${percent}%`;
                            groupWrapper.style.position = "relative";
                            groupWrapper.classList.add("image-loaded");
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

            slidesWrapper.appendChild(groupWrapper);

            const slides = groupWrapper.querySelectorAll(".slide");
            if (slides.length > 0) {
                let current = 0;

                const showSlide = (index) => {
                    slides.forEach((s, i) => s.classList.toggle("active", i === index));
                };

                const prevBtn = createElement("button", {
                    className: "prev",
                    children: ["←"]
                });
                const nextBtn = createElement("button", {
                    className: "next",
                    children: ["→"]
                });

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

                showSlide(current);
            }
        });
        Promise.all(imageLoadPromises).then(() => {
            slidesWrapper.closest(".slideshow")?.classList.add("visible");
        });
    }

    // Disable context menu on slideshow
    slidesWrapper?.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    // Populate date
    const dateEl = document.getElementById("project-date");
    if (dateEl && project.month && project.year && Array.isArray(window.config?.monthNames)) {
        const monthName = window.config.monthNames[project.month - 1] || project.month;
        dateEl.textContent = `—${monthName} ${project.year}`;
    }
};

window.addEventListener("config-ready", () => {
    initializeProjectPage();
});