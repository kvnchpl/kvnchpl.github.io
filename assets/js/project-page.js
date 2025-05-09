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
        project.images.forEach((img) => {
            const imgEl = createElement("img", {
                attrs: {
                    src: img,
                    alt: `${project.title} image`,
                    draggable: "false"
                }
            });

            const loadPromise = new Promise((resolve) => {
                imgEl.onload = resolve;
                imgEl.onerror = resolve;
            });
            imageLoadPromises.push(loadPromise);

            const slide = createElement("div", {
                className: "slide",
                children: [imgEl]
            });
            slidesWrapper.appendChild(slide);
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

    // Initialize slideshow
    const slides = slidesWrapper?.querySelectorAll(".slide");
    if (slides && slides.length > 0) {
        let current = 0;

        const showSlide = (index) => {
            slides.forEach((s, i) => s.classList.toggle("active", i === index));
        };

        const prevBtn = document.querySelector(".prev");
        const nextBtn = document.querySelector(".next");

        prevBtn?.addEventListener("click", () => {
            current = (current - 1 + slides.length) % slides.length;
            showSlide(current);
        });

        nextBtn?.addEventListener("click", () => {
            current = (current + 1) % slides.length;
            showSlide(current);
        });

        showSlide(current);
    }
};

window.addEventListener("config-ready", () => {
    initializeProjectPage();
});