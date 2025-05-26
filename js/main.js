import {
    applyBackgroundColor,
    updateMainHeading,

    updateTitle,
    updateDescription,
    getMetaContents,

    loadJSON,
    loadResources,

    renderNav,
    renderProjectLayout,
    renderDynamicLinks
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
    const collectionPages = Object.keys(collections);
    const isCollectionPage = collectionPages.includes(page);
    const isHomePage = page === "home";
    const isContentPage = !(isHomePage || isCollectionPage || page === "index");

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

            if (elementIds.nav) {
                const useAbsolutePaths = (page === "thoughts");
                renderNav(elementIds.nav, navData, useAbsolutePaths, siteBaseUrl);
            }

            return; // Nothing else to do for home or collection pages
        }

        if (!isContentPage || page === "thoughts" || page === "404") {
            if (elementIds.nav) {
                const useAbsolutePaths = (page === "thoughts");
                renderNav(elementIds.nav, navData, useAbsolutePaths, siteBaseUrl);
            }
            return;
        }

        // Render content page
        const pageContent = pages[page];
        if (!pageContent || !pageContent.shortTitle) {
            console.warn(`Missing or incomplete page data for: ${page}`);
            return;
        }

        const { backgroundColor, title, description } = pageContent;

        if (!elementIds.content || !elementIds.nav || !elementIds.gallery ||
            !tagNames.galleryItemWrapper || !tagNames.galleryImage) {
            console.error("Missing required config values for rendering content pages");
            return;
        }

        applyBackgroundColor(backgroundColor);
        updateTitle(title);
        updateDescription(description);
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