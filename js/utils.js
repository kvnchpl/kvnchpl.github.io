// =========================
// DOM Manipulation Utilities
// =========================

/**
 * Sets the background color of the site, commonly used on project and collection pages.
 * @param {string} color - The color to set as the background (e.g. "#f0f0f0", "lightblue").
 */
export function applyBackgroundColor(color) {
    if (color) {
        document.body.style.backgroundColor = color;
    }
}

/**
 * Loads and injects an external HTML partial into the page.
 * Supports <head> content and body elements.
 * @param {string} url - The URL of the HTML partial to inject.
 * @param {string|HTMLElement} target - The CSS selector or element to inject into.
 * @param {string} position - The position to insert the HTML (default: 'beforeend').
 */
export async function injectPartial(url, target, position = 'beforeend') {
    try {
        const res = await fetch(url);
        const html = await res.text();
        let el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            if (el.tagName === 'HEAD') {
                const temp = document.createElement('div');
                temp.innerHTML = html;
                Array.from(temp.children).forEach(node => {
                    el.appendChild(node);
                });
            } else {
                el.insertAdjacentHTML(position, html);
            }
        } else {
            console.warn(`Element not found for partial injection: ${target}`);
        }
    } catch (err) {
        console.error(`Error injecting partial (${url}):`, err);
    }
}

/**
 * Updates the main page heading (<h1>) with provided text.
 * @param {string} heading - The text to set as the main heading.
 */
export function updateMainHeading(heading) {
    const h1 = document.getElementById('mainHeading')
    if (h1 && heading) {
        h1.textContent = heading;
    }
}

// =========================
// Metadata Utilities
// =========================

/**
 * Returns page type flags based on current page identifier and siteConfig collections.
 * @param {string} page - The current page identifier (e.g. "home", "thoughts").
 * @param {Object} collections - The collections object from siteConfig.
 * @return {Object} - An object with flags: isHomePage, isCollectionPage, isContentPage.
 */
export function getPageType(page, collections) {
    const isHomePage = page === "home";
    const isCollectionPage = Object.keys(collections).includes(page);
    const isContentPage = !(isHomePage || isCollectionPage || page === "index");
    return { isHomePage, isCollectionPage, isContentPage };
}

/**
 * Updates the document's <title> element.
 * @param {string} title - The new title for the document.
 */
export function updateTitle(title) {
    if (title) {
        document.title = title;
    }
}

/**
 * Updates or inserts the meta description tag with the provided content.
 * @param {string} description - The content for the meta description tag.
 */
export function updateDescription(description) {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
    }
    meta.content = description || "Default site description.";
}

/**
 * Returns a mapping of keys to meta tag content values.
 * @param {Object} names - {key: metaTagName}
 */
export function getMetaContents(names) {
    const result = {};
    for (const [key, metaName] of Object.entries(names)) {
        const meta = document.querySelector(`meta[name="${metaName}"]`);
        result[key] = meta ? meta.content : undefined;
    }
    return result;
}

// =========================
// Data Loading Utilities
// =========================

/**
 * Loads and parses JSON from a given URL.
 * @param {string} url - The URL to fetch JSON data from.
 */
export async function loadJSON(url) {
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return await res.json();
    } catch (err) {
        console.error(`Failed to load JSON from ${url}`, err);
        return null;
    }
}

/**
 * Loads multiple JSON resources in parallel based on provided meta tag names.
 * @param {Object} metaTags - An object mapping keys to meta tag names.
 */
export async function loadResources(metaTags) {
    const metaContents = getMetaContents(metaTags);
    const entries = Object.entries(metaContents);
    const results = await Promise.all(
        entries.map(async ([key, url]) => [key, url ? await loadJSON(url) : undefined])
    );
    return Object.fromEntries(results);
}

// =========================
// Rendering Utilities
// =========================

/**
 * Conditionally renders the site navigation bar based on page type and path logic.
 * @param {string} page - The current page identifier (e.g. "home", "thoughts").
 * @param {string} navId - The ID of the navigation element to render into.
 * @param {Array} navData - The navigation data array containing link objects.
 * @param {string} siteBaseUrl - The base URL for the site, used for absolute links.
 */
export function checkRenderNav(page, navId, navData, siteBaseUrl) {
    if (!navId) return;
    const useAbsolutePaths = (page === "thoughts");
    renderNav(navId, navData, useAbsolutePaths, siteBaseUrl);
}

/**
 * Renders the main navigation bar using nav data and highlights the current page.
 * @param {string} navId - The ID of the navigation element to render into.
 * @param {Array} navData - The navigation data array containing link objects.
 * @param {boolean} useAbsolutePaths - Whether to use absolute URLs for links.
 * @param {string} siteBaseUrl - The base URL for the site, used for absolute links.
 */
export function renderNav(navId, navData, useAbsolutePaths = false, siteBaseUrl = "") {
    const nav = document.getElementById(navId);
    if (nav && navData) {
        const navFragment = document.createDocumentFragment();
        const currentPage = document.body.getAttribute('data-page');
        const filteredNavData = navData.filter(link => link.navBar);

        filteredNavData.forEach(link => {
            const a = document.createElement("a");
            const isAbsolute = link.href.startsWith("http://") || link.href.startsWith("https://");
            a.href = useAbsolutePaths && !isAbsolute ? `${siteBaseUrl}${link.href}` : link.href;
            a.textContent = (link.label.toLowerCase() === currentPage)
                ? `*${link.label}*`
                : link.label;
            navFragment.appendChild(a);
        });

        nav.appendChild(navFragment);
    }
}

/**
 * Renders a project or content page layout using provided data and configuration.
 * @param {HTMLElement} container - The main container element to render into.
 * @param {Object} pageData - The data object containing images, content, and layout structure.
 * @param {Object} tagNames - An object mapping custom tag names for gallery items and images.
 * @param {string} basePath - The base path for image URLs.
 * @param {string} size - The image size to use in URLs (e.g. "large", "medium").
 * @param {string} imageExt - The file extension for images (e.g. ".jpg", ".png").
 */
export function renderProjectLayout(container, pageData, tagNames, basePath, size, imageExt) {
    if (!container || !pageData) return;

    const galleryEl = container.querySelector('#gallery');
    const contentEl = container.querySelector('#content');
    if (!galleryEl || !contentEl) return;

    const images = pageData.images || [];
    const content = pageData.content || [];
    const layout = pageData.layout;

    // Render block of images into gallery
    function renderImagesBlock(imagesArr) {
        const fragment = document.createDocumentFragment();
        imagesArr.forEach(filename => {
            const figure = document.createElement(tagNames.galleryItemWrapper);
            const img = document.createElement(tagNames.galleryImage);
            img.src = `/${basePath}/${pageData.shortTitle}/${size}/${filename}${imageExt}`;
            img.alt = filename;
            figure.appendChild(img);
            fragment.appendChild(figure);
        });
        return fragment;
    }

    // Render paragraph block into content area
    function renderContentBlock(text) {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
    }

    // Clear previous content
    galleryEl.innerHTML = "";
    contentEl.innerHTML = "";

    // Render layout using provided structure, or fallback to default
    if (Array.isArray(layout) && layout.length > 0) {
        layout.forEach(item => {
            const [type, idxStr] = item.split("-");
            const idx = parseInt(idxStr, 10) - 1;
            if (type === "images" && images[idx]) {
                galleryEl.appendChild(renderImagesBlock(images[idx]));
            } else if (type === "content" && content[idx]) {
                contentEl.appendChild(renderContentBlock(content[idx]));
            }
        });
    } else {
        images.forEach(imgArr => {
            galleryEl.appendChild(renderImagesBlock(imgArr));
        });
        content.forEach(text => {
            contentEl.appendChild(renderContentBlock(text));
        });
    }
}

/**
 * Dynamically renders .page-link elements for home or collection pages.
 * @param {string} page - The current page identifier (e.g. "home", "collection").
 * @param {Object} siteConfig - The site configuration object containing element IDs and collection data.
 * @param {Array} navData - The navigation data array containing link information.
 * @param {Object} pages - The pages data object containing content for each page.
 * @param {string} siteBaseUrl - The base URL for the site, used for absolute links.
 */
export function renderDynamicLinks(page, siteConfig, navData, pages) {
    console.log("[DEBUG] renderDynamicLinks:");
    console.log("  page:", page);
    console.log("  isHomePage:", isHomePage);
    console.log("  navData:", navData);
    console.log("  siteConfig.elementIds.linkContainer:", siteConfig.elementIds.linkContainer);

    const isHomePage = page === "home";
    const isCollectionPage = siteConfig.collections?.[page];

    if (isHomePage) {
        const container = document.querySelector(siteConfig.elementIds.linkContainer);
        if (!container || !Array.isArray(navData)) return;

        navData.filter(link => link.navBar).forEach(link => {
            const pageLink = document.createElement("div");
            pageLink.className = "page-link";

            const img = document.createElement("img");
            img.src = link.thumbnail || "/img/index/sky-1.jpg";
            img.alt = "Sky";
            pageLink.appendChild(img);

            const a = document.createElement("a");
            a.href = link.href;
            if (link.href.startsWith("http")) {
                a.target = "_blank";
                a.rel = "noopener";
            }

            const p = document.createElement("p");
            p.textContent = link.title;
            a.appendChild(p);
            pageLink.appendChild(a);

            container.appendChild(pageLink);
        });
    } else if (isCollectionPage) {
        const { type, basePath } = siteConfig.collections[page];
        const container = document.getElementById(siteConfig.elementIds.linkContainer);
        if (!container || !type) return;

        Object.entries(pages).forEach(([slug, data]) => {
            if (data.type === type) {
                const pageLink = document.createElement("div");
                pageLink.className = "page-link";

                const img = document.createElement("img");
                img.src = data.thumbnail || "/img/index/sky-1.jpg";
                img.alt = data.title || slug;
                pageLink.appendChild(img);

                const a = document.createElement("a");
                a.href = `${basePath}${slug}.html`;

                const p = document.createElement("p");
                p.textContent = data.title || slug;
                a.appendChild(p);

                pageLink.appendChild(a);
                container.appendChild(pageLink);
            }
        });
    }
}

/**
 * Renders a standard content page with background, metadata, and layout.
 * @param {string} page - The page identifier (e.g. "writings", "readings").
 * @param {Object} pages - The pages data object containing content for each page.
 * @param {Object} siteConfig - The site configuration object containing element IDs and other settings.
 */
export function renderContentPage(page, pages, siteConfig) {
    const pageContent = pages[page];
    if (!pageContent || !pageContent.shortTitle) {
        console.warn(`Missing or incomplete page data for: ${page}`);
        return;
    }

    const { backgroundColor, title, description } = pageContent;
    const { elementIds, tagNames, galleryBasePath, defaultImageSize, imageExt } = siteConfig;

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
}