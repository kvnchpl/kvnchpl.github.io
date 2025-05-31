// =========================
// DOM Manipulation Utilities
// =========================

/**
 * Returns a shuffled copy of the sky images array from the site config.
 * @param {Object} siteConfig - The site configuration object.
 * @returns {Array} - A new shuffled array of sky image URLs.
 */
function getShuffledSkyImages(siteConfig) {
    const images = siteConfig.skyImages ? [...siteConfig.skyImages] : [];
    for (let i = images.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [images[i], images[j]] = [images[j], images[i]];
    }
    return images;
}

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
    const h1 = document.getElementById('main-heading')
    if (h1 && heading) {
        h1.textContent = `*${heading}*`;
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
 * Updates the subtitle <h2> element with provided text.
 * @param {string} subtitle - The subtitle text to display.
 */
export function updateSubtitle(subtitle) {
    const subtitleEl = document.getElementById('subtitle');
    if (subtitleEl) {
        subtitleEl.textContent = subtitle;
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

    const galleryEl = container.querySelector('#content-page-container');
    if (!galleryEl) return;

    const images = pageData.images || [];
    const content = pageData.content || [];
    const layout = pageData.layout;

    // Render block of images into gallery
    function renderSlideshow(imagesArr) {
        const wrapper = document.createElement("div");
        wrapper.className = "slideshow-wrapper";

        let currentIndex = 0;

        const img = document.createElement(tagNames.galleryImage);
        img.src = `/${basePath}/${pageData.key}/${size}/${imagesArr[0]}${imageExt}`;
        img.alt = imagesArr[0];

        const prevBtn = document.createElement("button");
        prevBtn.textContent = "<";
        prevBtn.className = "slideshow-prev";
        const nextBtn = document.createElement("button");
        nextBtn.textContent = ">";
        nextBtn.className = "slideshow-next";

        const inner = document.createElement("div");
        inner.className = "slideshow-inner";
        inner.appendChild(prevBtn);
        inner.appendChild(img);
        inner.appendChild(nextBtn);

        wrapper.appendChild(inner);

        function showImage(index) {
            if (index >= 0 && index < imagesArr.length) {
                img.src = `/${basePath}/${pageData.key}/${size}/${imagesArr[index]}${imageExt}`;
                img.alt = imagesArr[index];
                currentIndex = index;
            }
        }

        prevBtn.addEventListener("click", () => showImage((currentIndex - 1 + imagesArr.length) % imagesArr.length));
        nextBtn.addEventListener("click", () => showImage((currentIndex + 1) % imagesArr.length));

        return wrapper;
    }

    // Render paragraph block into content area
    function renderContentBlock(text) {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
    }

    // Clear previous content
    galleryEl.innerHTML = "";

    if (Array.isArray(layout) && layout.length > 0) {
        for (let i = 0; i < layout.length; i += 2) {
            const item1 = layout[i];
            const item2 = layout[i + 1];

            const pairWrapper = document.createElement("div");
            pairWrapper.className = "slideshow-content-pair";

            const [type1, idxStr1] = item1.split("-");
            const idx1 = parseInt(idxStr1, 10) - 1;
            if (type1 === "images" && images[idx1]) {
                const slideshow = renderSlideshow(images[idx1]);
                slideshow.classList.add("slideshow-half");
                pairWrapper.appendChild(slideshow);
            }

            const [type2, idxStr2] = item2 ? item2.split("-") : [null, null];
            const idx2 = item2 ? parseInt(idxStr2, 10) - 1 : null;
            if (type2 === "content" && content[idx2]) {
                const contentBlock = renderContentBlock(content[idx2]);
                const contentWrapper = document.createElement("div");
                contentWrapper.className = "content-half";
                contentWrapper.appendChild(contentBlock);
                pairWrapper.appendChild(contentWrapper);
            }

            galleryEl.appendChild(pairWrapper);
        }
    } else if (layout === "default" || !layout) {
        images.forEach((imgArr, idx) => {
            const pairWrapper = document.createElement("div");
            pairWrapper.className = "slideshow-content-pair";

            const slideshow = renderSlideshow(imgArr);
            slideshow.classList.add("slideshow-half");
            pairWrapper.appendChild(slideshow);

            if (content[idx]) {
                const contentBlock = renderContentBlock(content[idx]);
                const contentWrapper = document.createElement("div");
                contentWrapper.className = "content-half";
                contentWrapper.appendChild(contentBlock);
                pairWrapper.appendChild(contentWrapper);
            }

            galleryEl.appendChild(pairWrapper);
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
    const isHomePage = page === "home";
    const isCollectionPage = siteConfig.collections?.[page];

    if (isHomePage) {
        const container = document.getElementById(siteConfig.elementIds.linkContainer);

        if (!container) {
            console.warn(`No link container found with selector: ${siteConfig.elementIds.linkContainer}`);
            return;
        }
        if (!Array.isArray(navData)) {
            console.warn("navData is not an array, expected an array of link objects.");
            return;
        }

        navData.filter(link => link.homePage).forEach(link => {
            const pageLink = document.createElement("div");
            pageLink.className = "page-link";

            const img = document.createElement("img");
            let skyImages = getShuffledSkyImages(siteConfig);
            let skyIndex = 0;
            const nextSkyImage = skyImages.length > 0
                ? skyImages[skyIndex % skyImages.length]
                : "/img/home/sky_1.jpg";
            skyIndex++;
            img.src = link.thumbnail || nextSkyImage;
            img.alt = "Sky";
            pageLink.appendChild(img);

            const a = document.createElement("a");
            a.href = link.href;
            if (link.href.startsWith("http")) {
                a.target = "_blank";
                a.rel = "noopener";
            }

            const titleP = document.createElement("p");
            titleP.textContent = link.title || link.key;
            a.appendChild(titleP);

            if (link.subtitle) {
                const subtitleP = document.createElement("p");
                subtitleP.textContent = link.subtitle;
                a.appendChild(subtitleP);
            }
            pageLink.appendChild(a);

            container.appendChild(pageLink);
        });
    } else if (isCollectionPage) {
        const { type, basePath } = siteConfig.collections[page];
        const container = document.getElementById(siteConfig.elementIds.linkContainer);
        if (!container || !type) return;

        Object.values(pages)
            .filter(data => data.type === type)
            .sort((a, b) => {
                if (b.year !== a.year) return b.year - a.year;
                return (b.month || 0) - (a.month || 0);
            })
            .forEach(data => {
                const pageLink = document.createElement("div");
                pageLink.className = "page-link";

                const img = document.createElement("img");
                let skyImages = getShuffledSkyImages(siteConfig);
                const randomSkyImage = skyImages.length > 0
                    ? skyImages[Math.floor(Math.random() * skyImages.length)]
                    : "/img/home/sky_1.jpg";
                img.src = data.thumbnail || randomSkyImage;
                img.alt = data.title || data.key;
                pageLink.appendChild(img);

                const a = document.createElement("a");
                a.href = data.external && data.permalink ? data.permalink : `${basePath}${data.key}`;
                if (data.external && data.permalink) {
                    a.target = "_blank";
                    a.rel = "noopener";
                }

                const p = document.createElement("p");
                p.textContent = data.title || data.key;
                a.appendChild(p);

                pageLink.appendChild(a);
                container.appendChild(pageLink);
            });
    }
}

/**
 * Renders a standard content page with background, metadata, and layout.
 * @param {string} page - The page identifier (e.g. "writings", "readings").
 * @param {Object} pages - The pages data object containing content for each page.
 * @param {Object} siteConfig - The site configuration object containing element IDs and other settings.
 */
export function renderContentPage(pageContent, siteConfig) {
    if (!pageContent || !pageContent.key) {
        console.warn(`Missing or incomplete page data for: ${page}`);
        return;
    }

    const { backgroundColor, title, description, subtitle } = pageContent;
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

    let subtitleText = subtitle;
    if (!subtitleText) {
        const date = new Date(pageContent.year, pageContent.month - 1);
        subtitleText = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    updateSubtitle(subtitleText);

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