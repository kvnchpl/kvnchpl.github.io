import {
    getPageType,
    getMetaContents,
    loadJSON,
    loadResources,
    checkRenderNav,  
    renderDynamicLinks,
    renderContentPage
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
    const { siteBaseUrl = "" } = siteConfig;

    // Cache frequently used properties from siteConfig
    const { elementIds, tagNames, metaTags, collections, imageExt, defaultImageSize, galleryBasePath } = siteConfig;

    // Early return if required config values are missing
    if (!elementIds || !tagNames) {
        console.error("Missing required config values in config.json");
        return;
    }

    const page = document.body.dataset.page;
    const { isHomePage, isCollectionPage, isContentPage } = getPageType(page, collections);

    try {
        // Dynamically determine which data file to load for collection pages or project subpages
        let pagesMetaTag = metaTags[page];
        if (!pagesMetaTag) {
            // Try to find which collection this page belongs to
            for (const [collectionKey, collection] of Object.entries(collections)) {
                if (metaTags[collectionKey]) {
                    // Check if this page exists in the collection's data file
                    // Use the metaTag if the collection type matches
                    pagesMetaTag = metaTags[collectionKey];
                    break;
                }
            }
        }

        if (!pagesMetaTag && isContentPage) {
            console.warn(`No pages metaTag found for page: ${page}`);
        }

        const resources = await loadResources({
            pages: pagesMetaTag,
            navData: metaTags.nav
        });
        const { pages, navData } = resources;

        // Expose globally for other scripts (like collections.js)
        window.siteConfig = siteConfig;
        window.pages = pages;
        window.navData = navData;

        if (isHomePage || isCollectionPage) {
            renderDynamicLinks(page, siteConfig, navData, pages);
            checkRenderNav(page, elementIds.nav, navData, siteBaseUrl);
            return; // Nothing else to do for home or collection pages
        }

        if (!isContentPage || page === "thoughts" || page === "404") {
            checkRenderNav(page, elementIds.nav, navData, siteBaseUrl);
            return;
        }

        // Render content page
        renderContentPage(page, pages, siteConfig);

    } catch (err) {
        console.error("Error loading site data:", err);
    }
})();