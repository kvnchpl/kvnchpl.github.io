import { generateGalleryImages, loadJSON } from './utils.js';

(async function () {
    async function injectPartials() {
        try {
            const [headPartial, footerPartial] = await Promise.all([
                fetch('/partials/head.html').then(res => res.text()),
                fetch('/partials/footer.html').then(res => res.text())
            ]);

            document.head.insertAdjacentHTML('beforeend', headPartial);

            const footerContainer = document.createElement('div');
            footerContainer.innerHTML = footerPartial;
            document.body.appendChild(footerContainer);
        } catch (err) {
            console.error("Error injecting partials:", err);
        }
    }

    await injectPartials();

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
            galleryBasePath,
            elementIds,
            tagNames
        } = siteConfig;

        if (backgroundColor) {
            document.body.style.backgroundColor = backgroundColor;
        }

        if (title) {
            document.title = title;
            document.querySelector("h1")?.textContent = title;
        }

        if (intro) {
            const introElement = document.getElementById(elementIds.intro);
            if (introElement) {
                const introFragment = document.createDocumentFragment();
                const p = document.createElement("p");
                p.textContent = intro;
                introFragment.appendChild(p);
                introElement.innerHTML = "";
                introElement.appendChild(introFragment);
            }
        }

        // Navigation
        const nav = document.getElementById(elementIds.nav);
        if (nav && navData) {
            const navFragment = document.createDocumentFragment();
            navData.forEach(link => {
                const a = document.createElement("a");
                a.href = link.href;
                a.textContent = link.label;
                navFragment.appendChild(a);
            });
            nav.appendChild(navFragment);
        }

        // Gallery
        const gallery = document.getElementById(elementIds.gallery);
        if (!gallery) {
            console.warn(`No gallery container found for page: ${page}`);
        }
        if (gallery && galleryFolder && imageCount) {
            const path = `${galleryBasePath}/${galleryFolder}/${defaultImageSize}`;
            const images = generateGalleryImages(
                path,
                imagePrefix,
                imageExt,
                imageCount
            );

            const fragment = document.createDocumentFragment();
            images.forEach(({ filename, path }) => {
                const figure = document.createElement(tagNames.galleryItemWrapper);
                const img = document.createElement(tagNames.galleryImage);
                img.src = path;
                img.alt = filename;
                figure.appendChild(img);
                fragment.appendChild(figure);
            });
            gallery.appendChild(fragment);
        }

    } catch (err) {
        console.error("Error loading site data:", err);
    }
})();