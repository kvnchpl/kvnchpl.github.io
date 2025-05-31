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

    // Retrieve path to config.json from the appropriate meta tag
    const metaTagNames = {
        configPath: "config-data"
    };
    const { configPath } = getMetaContents(metaTagNames);

    // Abort if config meta tag is missing
    if (!configPath) {
        console.error('Missing meta tag: config-data');
        return;
    }

    // Load global site configuration (site-wide settings and metaTag names)
    const siteConfig = await loadJSON(configPath);
    const { siteBaseUrl = "" } = siteConfig;

    // Cache commonly accessed properties for clarity
    const { elementIds, tagNames, metaTags, collections, imageExt, defaultImageSize, galleryBasePath } = siteConfig;

    // Abort if critical config values are missing
    if (!elementIds || !tagNames) {
        console.error("Missing required config values in config.json");
        return;
    }

    // Determine the current logical page type
    const page = document.body.dataset.page;
    const { isHomePage, isCollectionPage, isContentPage } = getPageType(page, collections);

    try {
        // Find the metaTag (data file) for this page type, falling back to first matching collection if needed
        let pagesMetaTag = metaTags[page];
        if (!pagesMetaTag && isContentPage) {
            for (const [collectionKey, collection] of Object.entries(collections)) {
                const basePath = collection.basePath.replace(/^\//, "").replace(/\/$/, "");
                if (window.location.pathname.includes(basePath)) {
                    pagesMetaTag = metaTags[collectionKey];
                    break;
                }
            }
        }

        // Warn if a content page is missing a corresponding metaTag (likely misconfiguration)
        if (!pagesMetaTag && isContentPage) {
            console.warn(`No pages metaTag found for page: ${page}`);
        }

        // Load page-specific data and navigation structure
        const resources = await loadResources({
            pages: pagesMetaTag,
            navData: metaTags.nav
        });
        const { pages, navData } = resources;


        // Expose loaded config and data to global scope for other scripts (e.g. collections.js)
        window.siteConfig = siteConfig;
        window.pages = pages;
        window.navData = navData;

        if (!(isHomePage || page === "index" || page === "404")) {
            checkRenderNav(page, elementIds.nav, navData, siteBaseUrl);
        }

        if (isHomePage || isCollectionPage) {
            renderDynamicLinks(page, siteConfig, navData, pages);
            return;
        }

        if (!isContentPage || page === "thoughts" || page === "contact" || page === "404") {
            return;
        }

        const pageContent = Array.isArray(pages)
            ? pages.find(p => p.key === page)
            : null;

        if (!pageContent) {
            console.warn(`No page data found for "${page}". Skipping content rendering.`);
            return;
        }

        renderContentPage(pageContent, siteConfig);

    } catch (err) {
        // Catch-all for errors in loading or rendering
        console.error("Error loading site data:", err);
    }
})();