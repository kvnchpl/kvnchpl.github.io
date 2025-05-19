import { generateGalleryImages, loadJSON } from './utils.js';

(async function () {
    const page = document.body.dataset.page || "index";

    try {
        const [config, navData] = await Promise.all([
            loadJSON("config.json"),
            loadJSON("nav.json")
        ]);

        const settings = config[page];

        if (!settings) {
            console.warn(`No config entry for page: ${page}`);
            return;
        }

        // Apply background color
        if (settings.backgroundColor) {
            document.body.style.backgroundColor = settings.backgroundColor;
        }

        // Set title + intro
        if (settings.title) {
            document.title = settings.title;
            document.querySelector("h1")?.textContent = settings.title;
        }
        if (settings.intro) {
            document.getElementById("intro")?.textContent = settings.intro;
        }

        // Build nav
        const nav = document.getElementById("nav");
        if (nav && navData) {
            navData.forEach(link => {
                const a = document.createElement("a");
                a.href = link.href;
                a.textContent = link.label;
                nav.appendChild(a);
            });
        }

        // Build gallery dynamically
        const gallery = document.getElementById("gallery");
        if (gallery && settings.galleryFolder && settings.imageCount) {
            const images = generateGalleryImages(
                settings.galleryFolder,
                settings.imagePrefix || "",
                settings.imageExt || ".webp",
                settings.imageCount
            );

            images.forEach(({ filename, path }) => {
                const figure = document.createElement("figure");
                const img = document.createElement("img");
                img.src = path;
                img.alt = filename;
                figure.appendChild(img);
                gallery.appendChild(figure);
            });
        }

    } catch (err) {
        console.error("Error loading config or data:", err);
    }
})();