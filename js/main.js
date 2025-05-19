import {
    loadJSON,
    getMetaContent,
    injectPartials
} from './utils.js';

import {
    applyBackgroundColor,
    updateTitle,
    updateDescription,
    insertIntro,
    renderNav,
    renderGallery
} from './dom.js';

(async function () {
    await injectPartials({
        head: '/partials/head.html',
        '#nav': '/partials/nav.html',
        '#footer': '/partials/footer.html'
    });

    const page = document.body.dataset.page || "index";

    try {
        const [siteConfig, pages, navData] = await Promise.all([
            loadJSON(getMetaContent("config-data")),
            loadJSON(getMetaContent("pages-data")),
            loadJSON(getMetaContent("nav-data"))
        ]);

        const pageContent = pages[page];
        if (!pageContent) {
            console.warn(`No page data found for: ${page}`);
            return;
        }

        const {
            backgroundColor,
            title,
            intro,
            shortTitle
        } = pageContent;

        const {
            imageExt,
            defaultImageSize,
            galleryBasePath,
            elementIds,
            tagNames
        } = siteConfig;

        // Validate required config values
        if (!elementIds || !elementIds.intro || !elementIds.nav || !elementIds.gallery) {
            console.error("Missing required elementIds in config.json");
            return;
        }

        if (!tagNames || !tagNames.galleryItemWrapper || !tagNames.galleryImage) {
            console.error("Missing required tagNames in config.json");
            return;
        }

        if (!shortTitle) {
            console.error(`Missing shortTitle for page: ${page}`);
            return;
        }

        applyBackgroundColor(backgroundColor);
        updateTitle(title);
        updateDescription(pageContent.description);
        insertIntro(intro, elementIds.intro);
        renderNav(elementIds.nav, navData);
        renderGallery(
            elementIds.gallery,
            shortTitle,
            tagNames,
            galleryBasePath,
            defaultImageSize
        );

    } catch (err) {
        console.error("Error loading site data:", err);
    }
})();