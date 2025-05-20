import {
    loadJSON,
    getMetaContent,
    loadResources
} from './utils.js';

import {
    applyBackgroundColor,
    updateTitle,
    updateDescription,
    updateMainHeading,
    renderNav,
    renderHomeLinks,
    injectHead,
    injectFooter,
    renderProjectLayout
} from './dom.js';

(async function () {
    const page = document.body.dataset.page || "index";
    if (page === "404" || page === "index") return;

    // Load config first to get metaTag names and collections
    const configPath = getMetaContent("config-data");
    if (!configPath) {
        console.error('Missing meta tag: config-data');
        return;
    }
    const siteConfig = await loadJSON(configPath);

    // Validate required config values early
    if (!siteConfig.elementIds || !siteConfig.tagNames) {
        console.error("Missing required config values in config.json");
        return;
    }

    const collectionPages = Object.keys(siteConfig.collections);

    // Get partials' paths from meta tags using config
    const headPartialPath = getMetaContent(siteConfig.metaTags.head);
    const footerPartialPath = getMetaContent(siteConfig.metaTags.footer);

    await injectHead(headPartialPath);
    await injectFooter(footerPartialPath);

    try {
        // Dynamically determine which data file to load for collection pages
        let pagesMetaTag = collectionPages.includes(page)
            ? siteConfig.metaTags[page]
            : siteConfig.metaTags.projects;

        const resources = await loadResources({
            pages: pagesMetaTag,
            navData: siteConfig.metaTags.nav
        });
        const { pages, navData } = resources;

        // Expose globally for other scripts (like collections.js)
        window.siteConfig = siteConfig;
        window.pages = pages;
        window.navData = navData;

        // Always render nav if nav element exists
        if (siteConfig.elementIds.nav) {
            renderNav(siteConfig.elementIds.nav, navData);
        }

        if (page === "home") {
            renderHomeLinks(navData, document.getElementById(siteConfig.elementIds.homeLinks));
            return;
        }

        if (collectionPages.includes(page)) return;

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

        const {
            imageExt,
            defaultImageSize,
            galleryBasePath,
            elementIds,
            tagNames
        } = siteConfig;

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