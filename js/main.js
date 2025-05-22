import {
    applyBackgroundColor,
    updateMainHeading,

    updateTitle,
    updateDescription,
    getMetaContents,

    loadJSON,
    loadResources,

    renderNav,
    renderHomeLinks,
    renderProjectLayout
} from './utils.js';

(async function () {

    // Load config first to get metaTag names and collections
    const metaTagNames = {
        configPath: "config-data"
    };
    const { configPath } = getMetaContents(metaTagNames);

    if (!configPath) {
        console.error('Missing meta tag: config-data');
        return;
    }
    const siteConfig = await loadJSON(configPath);

    // Cache frequently used properties from siteConfig
    const { elementIds, tagNames, metaTags, collections, imageExt, defaultImageSize, galleryBasePath } = siteConfig;

    // Early return if required config values are missing
    if (!elementIds || !tagNames) {
        console.error("Missing required config values in config.json");
        return;
    }

    const page = document.body.dataset.page || "index";
    const collectionPages = Object.keys(collections);
    const isCollectionPage = collectionPages.includes(page);

    // Always load resources and set globals for all pages
    try {
        // Dynamically determine which data file to load for collection pages
        let pagesMetaTag = metaTags[page];

        const resources = await loadResources({
            pages: pagesMetaTag,
            navData: metaTags.nav
        });
        const { pages, navData } = resources;

        // Expose globally for other scripts (like collections.js)
        window.siteConfig = siteConfig;
        window.pages = pages;
        window.navData = navData;

        // Always render nav if nav element exists
        if (elementIds.nav) {
            renderNav(elementIds.nav, navData);
        }

        // Early return for collection/index/404 pages after globals are set
        if (isCollectionPage || page === "404" || page === "index") return;

        if (page === "home") {
            renderHomeLinks(navData, document.getElementById(elementIds.homeLinks));
            return;
        }

        // Render project or content page
        const pageContent = pages[page];
        if (!pageContent) {
            console.warn(`No page data found for: ${page}`);
            return;
        }

        const {
            backgroundColor,
            title,
            content,
            shortTitle
        } = pageContent;

        if (!elementIds.content || !elementIds.nav || !elementIds.gallery) {
            console.error("Missing required elementIds in config.json");
            return;
        }
        if (!tagNames.galleryItemWrapper || !tagNames.galleryImage) {
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
        updateMainHeading(title);

        const main = document.querySelector('main');
        renderProjectLayout(
            main,
            pageContent,
            tagNames,
            galleryBasePath,
            defaultImageSize,
            imageExt
        );

    } catch (err) {
        console.error("Error loading site data:", err);
    }
})();