import { generateGalleryImages, loadJSON } from './utils.js';

(async function () {
    async function injectPartials(partials) {
        try {
            const entries = Object.entries(partials);
            const fetches = await Promise.all(entries.map(([_, url]) =>
                fetch(url).then(res => res.text())
            ));

            entries.forEach(([selector, _], i) => {
                const html = fetches[i];
                const target = selector === 'head'
                    ? document.head
                    : document.querySelector(selector);
                if (target) {
                    target.insertAdjacentHTML('beforeend', html);
                } else {
                    console.warn(`Target "${selector}" not found for partial.`);
                }
            });
        } catch (err) {
            console.error("Error injecting partials:", err);
        }
    }

    function applyBackgroundColor(color) {
        if (color) {
            document.body.style.backgroundColor = color;
        }
    }

    function updateTitle(title) {
        if (title) {
            document.title = title;
            const h1 = document.querySelector("h1");
            if (h1) {
                const titleFragment = document.createDocumentFragment();
                const span = document.createElement("span");
                span.textContent = title;
                titleFragment.appendChild(span);
                h1.innerHTML = "";
                h1.appendChild(titleFragment);
            }
        }
    }

    function insertIntro(intro, introId) {
        const introElement = document.getElementById(introId);
        if (intro && introElement) {
            const introFragment = document.createDocumentFragment();
            const p = document.createElement("p");
            p.textContent = intro;
            introFragment.appendChild(p);
            introElement.innerHTML = "";
            introElement.appendChild(introFragment);
        }
    }

    function renderNav(navId, navData) {
        const nav = document.getElementById(navId);
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
    }

    function renderGallery(galleryId, folder, prefix, ext, count, tagNames, basePath, size) {
        const gallery = document.getElementById(galleryId);
        if (!gallery) {
            console.warn(`No gallery container found.`);
            return;
        }
        if (folder && count) {
            const path = `${basePath}/${folder}/${size}`;
            const images = generateGalleryImages(path, prefix, ext, count);
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
    }

    await injectPartials({
        head: '/partials/head.html',
        '#nav': '/partials/nav.html',
        body: '/partials/footer.html'
    });

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

        applyBackgroundColor(backgroundColor);
        updateTitle(title);
        insertIntro(intro, elementIds.intro);
        renderNav(elementIds.nav, navData);
        renderGallery(
            elementIds.gallery,
            galleryFolder,
            imagePrefix,
            imageExt,
            imageCount,
            tagNames,
            galleryBasePath,
            defaultImageSize
        );

    } catch (err) {
        console.error("Error loading site data:", err);
    }
})();