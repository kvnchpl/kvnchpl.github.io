import {
    loadJSON
} from './utils.js';

import {
    applyBackgroundColor,
    updateTitle,
    insertIntro,
    renderNav,
    renderGallery
} from './dom.js';

import {
    injectPartials
} from './partials.js';

(async function () {
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