import {
    loadJSON,
    getMetaContent
} from './utils.js';

import {
    applyBackgroundColor,
    updateTitle,
    updateDescription,
    updateMainHeading,
    renderNav,
    injectHead,
    injectFooter,
    renderProjectLayout // <-- add this import
} from './dom.js';

(async function () {
    await injectHead('/partials/head.html');
    await injectFooter('/partials/footer.html');

    const page = document.body.dataset.page || "index";

    try {
        const [siteConfig, pages, navData] = await Promise.all([
            loadJSON(getMetaContent("config-data")),
            loadJSON(getMetaContent("pages-data")),
            loadJSON(getMetaContent("nav-data"))
        ]);

        if (page === "index") {
            return;
        }

        if (page === "home") {
            // Render links from navData into #homeLinks
            const homeLinksSection = document.getElementById("homeLinks");
            if (homeLinksSection && Array.isArray(navData)) {
                const ul = document.createElement("ul");
                navData.forEach(link => {
                    // Only include links you want on the home page
                    // Here, we include all links with a label (customize as needed)
                    if (link.label) {
                        const li = document.createElement("li");
                        const a = document.createElement("a");
                        a.href = link.href;
                        a.textContent = link.label;
                        if (link.newTab) {
                            a.target = "_blank";
                            a.rel = "noopener";
                        }
                        li.appendChild(a);
                        ul.appendChild(li);
                    }
                });
                homeLinksSection.appendChild(ul);
            }
            return;
        }

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

        // Validate required config values
        if (!elementIds || !elementIds.content || !elementIds.nav || !elementIds.gallery) {
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
        updateMainHeading(title);
        renderNav(elementIds.nav, navData);

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