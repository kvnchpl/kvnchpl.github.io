import { generateGalleryImages, loadJSON } from './utils.js';

(async function () {
    const page = document.body.dataset.page || "index";

    try {
        const [siteConfig, pages, navData] = await Promise.all([
            loadJSON("config.json"),
            loadJSON("pages.json"),
            loadJSON("nav.json")
        ]);

        const content = pages[page];
        if (!content) {
            console.warn(`No page data found for: ${page}`);
            return;
        }

        const {
            backgroundColor,
            title,
            intro,
            galleryFolder,
            imagePrefix,
            imageCount
        } = content;

        const {
            imageExt,
            defaultImageSize,
            galleryBasePath
        } = siteConfig;

        if (backgroundColor) {
            document.body.style.backgroundColor = backgroundColor;
        }

        if (title) {
            document.title = title;
            document.querySelector("h1")?.textContent = title;
        }

        if (intro) {
            document.getElementById("intro")?.textContent = intro;
        }

        // Navigation
        const nav = document.getElementById("nav");
        if (nav && navData) {
            navData.forEach(link => {
                const a = document.createElement("a");
                a.href = link.href;
                a.textContent = link.label;
                nav.appendChild(a);
            });
        }

        // Gallery
        const gallery = document.getElementById("gallery");
        if (gallery && galleryFolder && imageCount) {
            const path = `${galleryBasePath}/${galleryFolder}/${defaultImageSize}`;
            const images = generateGalleryImages(
                path,
                imagePrefix,
                imageExt,
                imageCount
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
        console.error("Error loading site data:", err);
    }
})();