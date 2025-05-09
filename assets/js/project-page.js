import { logError, isMobileDevice } from './utils.js';

const initializeProjectPage = () => {
    const rawPath = window.location.pathname.replace(/^\/+|\/+$/g, "");
    console.log("Normalized current path:", rawPath);
    console.log("Available project permalinks:", window.config.projects.map(p => p.permalink));

    const project = window.config.projects.find(
        (p) => p.permalink.replace(/^\/+|\/+$/g, "") === rawPath
    );

    if (!project) {
        logError("Project not found for path:", rawPath);
        return;
    }

    // Populate title
    document.getElementById("project-title").textContent = project.title;

    // Populate slideshow
    const slidesWrapper = document.getElementById("project-slides");
    if (Array.isArray(project.images)) {
        project.images.forEach((img) => {
            const slide = document.createElement("div");
            slide.classList.add("slide");
            slide.innerHTML = `<img src="${img}" alt="${project.title} image">`;
            slidesWrapper.appendChild(slide);
        });
    }

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

document.addEventListener("DOMContentLoaded", () => {
    if (window.config?.projects) {
        initializeProjectPage();
    } else {
        logError("window.config.projects not available at DOMContentLoaded.");
    }
});