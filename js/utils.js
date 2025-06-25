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
            console.warn('Element not found for partial injection:', target);
        }
    } catch (err) {
        console.error('Error injecting partial:', url, err);
    }
}

/**
 * Updates the main page heading (<h1>) with provided text.
 * @param {string} heading - The text to set as the main heading.
 * @param {Object} siteConfig - The site configuration object.
 */
export function updateMainHeading(heading, siteConfig) {
    const h1 = document.getElementById(siteConfig.elementIds.mainHeading);
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
    return {
        isHomePage,
        isCollectionPage,
        isContentPage
    };
}

/**
 * Returns subtitle text, falling back to formatted metadata based on type.
 * @param {Object} data - The page or project data object.
 * @param {Object} siteConfig - The site configuration object, used for monthOrder.
 * @returns {string|null} - Subtitle string or null if no fallback available.
 */
export function formatSubtitle(data, siteConfig) {
    if (typeof data.subtitle === "string" && data.subtitle.trim() !== "") {
        return data.subtitle;
    }

    const getMonthYear = () => {
        if (data.year) {
            if (typeof data.month === "number") {
                return new Date(data.year, data.month - 1).toLocaleString('en', {
                    month: 'long',
                    year: 'numeric'
                });
            } else if (typeof data.month === "string" && data.month.trim() !== "") {
                return `${data.month} ${data.year}`;
            }
        }
        return null;
    };

    const monthYear = getMonthYear();

    if (data.type === "reading") {
        const parts = [];
        if (data.author) parts.push(`by ${data.author}`);
        if (data.publication) parts.push(data.publication);
        if (data.issue) parts.push(data.issue);
        if (monthYear) parts.push(`(${monthYear})`);
        return parts.length > 0 ? parts.join(', ') : null;
    }

    // Default for projects, writings, etc.
    return monthYear;
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
 * @param {Object} siteConfig - The site configuration object.
 */
export function updateSubtitle(subtitle, siteConfig) {
    const subtitleEl = document.getElementById(siteConfig.elementIds.subtitle);
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
        console.error('Failed to load JSON from', url, err);
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
        entries.map(async ([key, url]) => {
            try {
                return [key, url ? await loadJSON(url) : undefined];
            } catch (err) {
                console.error(`Failed to load resource for ${key}:`, err);
                return [key, undefined];
            }
        })
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
            a.textContent = (link.label.toLowerCase() === currentPage) ?
                `*${link.label}*` :
                link.label;
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
export function renderProjectLayout(container, pageData, tagNames, basePath, size, imageExt, siteConfig) {
    if (!container || !pageData) return;
    const collection = Object.values(siteConfig.collections).find(c => c.type === pageData.type);
    const collectionPath = collection ? collection.basePath.replace(/^\/|\/$/g, '') : '';

    const galleryEl = container.querySelector(`#${siteConfig.elementIds.galleryContainer}`);
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
        const effectiveSize = size;
        img.src = `/${basePath}/${collectionPath}/${pageData.key}/${effectiveSize}/${imagesArr[0]}${imageExt}`;
        img.alt = imagesArr[0];
        img.onerror = () => {
            if (effectiveSize !== size) {
                img.src = `/${basePath}/${collectionPath}/${pageData.key}/${size}/${imagesArr[0]}${imageExt}`;
            }
        };

        const isSingleImage = imagesArr.length === 1;

        const inner = document.createElement("div");
        inner.className = "slideshow-inner";

        if (!isSingleImage) {
            const prevBtn = document.createElement("button");
            prevBtn.textContent = "<";
            prevBtn.className = "slideshow-prev";

            const nextBtn = document.createElement("button");
            nextBtn.textContent = ">";
            nextBtn.className = "slideshow-next";

            prevBtn.addEventListener("click", () => showImage((currentIndex - 1 + imagesArr.length) % imagesArr.length));
            nextBtn.addEventListener("click", () => showImage((currentIndex + 1) % imagesArr.length));

            inner.appendChild(prevBtn);
            inner.appendChild(img);
            inner.appendChild(nextBtn);
        } else {
            inner.appendChild(img);
        }

        wrapper.appendChild(inner);

        function showImage(index) {
            if (index >= 0 && index < imagesArr.length) {
                const effectiveSize = size;
                img.src = `/${basePath}/${collectionPath}/${pageData.key}/${effectiveSize}/${imagesArr[index]}${imageExt}`;
                img.alt = imagesArr[index];
                img.onerror = () => {
                    if (effectiveSize !== size) {
                        img.src = `/${basePath}/${collectionPath}/${pageData.key}/${size}/${imagesArr[index]}${imageExt}`;
                    }
                };
                currentIndex = index;
            }
        }

        return wrapper;
    }

    // Render paragraph block into content area
    function renderContentBlock(text) {
        const wrapper = document.createElement("div");
        text.split(/\n+/).forEach(line => {
            const p = document.createElement("p");
            p.textContent = line.trim();
            if (p.textContent) wrapper.appendChild(p);
        });
        return wrapper;
    }

    // Clear previous content
    galleryEl.innerHTML = "";

    if (Array.isArray(layout) && layout.length > 0) {
        layout.forEach(entry => {
            const entries = Array.isArray(entry) ? entry : [entry];
            const pairWrapper = document.createElement("div");
            pairWrapper.className = "slideshow-content-pair";

            entries.forEach(item => {
                let type, indexStr, modifier;
                if (typeof item === "string") {
                    const match = item.match(/^(images|content)-(\d+)(?:-(full|left|right))?$/);
                    if (match) {
                        [, type, indexStr, modifier] = match;
                        const index = parseInt(indexStr, 10) - 1;

                        if (type === "images" && images[index]) {
                            const slideshow = renderSlideshow(images[index]);
                            if (modifier === "full") {
                                slideshow.classList.add("slideshow-full");
                                galleryEl.appendChild(slideshow);
                            } else {
                                slideshow.classList.add("slideshow-half");
                                if (modifier === "right") {
                                    pairWrapper.appendChild(document.createElement("div")); // left placeholder
                                    pairWrapper.appendChild(slideshow);
                                } else {
                                    pairWrapper.appendChild(slideshow);
                                }
                            }
                        }

                        if (type === "content" && content[index]) {
                            const contentBlock = renderContentBlock(content[index]);
                            const contentWrapper = document.createElement("div");
                            contentWrapper.className = modifier === "full" ? "content-full" : "content-half";
                            contentWrapper.appendChild(contentBlock);

                            if (modifier === "full") {
                                galleryEl.appendChild(contentWrapper);
                            } else {
                                if (modifier === "right") {
                                    pairWrapper.appendChild(document.createElement("div")); // left placeholder
                                    pairWrapper.appendChild(contentWrapper);
                                } else {
                                    pairWrapper.appendChild(contentWrapper);
                                }
                            }
                        }
                    }
                }
            });

            if (pairWrapper.childNodes.length > 0) {
                galleryEl.appendChild(pairWrapper);
            }
        });
    } else if (!layout) {
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
 * Creates a .page-link element for use in dynamic link rendering.
 * @param {Object} params - Parameters for the link.
 * @param {string} params.href - The link target URL.
 * @param {string} params.thumbnail - Optional thumbnail image URL.
 * @param {string} params.title - The title for the page.
 * @param {string} params.subtitle - Optional subtitle.
 * @param {boolean} params.isExternal - Whether the link is external.
 * @param {string} params.key - The unique key for the page/content.
 * @param {string} params.collectionKey - The collection key if applicable.
 * @param {Object} siteConfig - The site configuration object.
 * @param {Function} getNextSkyImage - Function to get the next sky image URL.
 * @returns {HTMLElement} - The constructed .page-link element.
 */
function createPageLink({ href, thumbnail, title, subtitle, isExternal, key, collectionKey }, siteConfig, getNextSkyImage) {
    const pageLink = document.createElement("a");
    pageLink.className = "page-link";
    pageLink.href = href;
    if (isExternal) {
        pageLink.target = "_blank";
        pageLink.rel = "noopener";
    }

    const img = document.createElement("img");
    img.alt = title || "Sky";

    if (thumbnail) {
        img.src = thumbnail;
    } else if (key && collectionKey && siteConfig.collections?.[collectionKey]?.thumbnailPathTemplate) {
        // Use template from collection config
        const template = siteConfig.collections[collectionKey].thumbnailPathTemplate;
        if (template && typeof template === "string") {
            const basePath = template.replaceAll("{key}", key);
            const baseThumbBase = basePath.replace(/\.(webp|gif)$/i, '');
            const webpURL = `${baseThumbBase}.webp`;
            const gifURL = `${baseThumbBase}.gif`;
            // Try webp, fallback to gif, fallback to sky image if both fail
            fetch(webpURL, { method: "HEAD" }).then(res => {
                if (res.ok) {
                    img.src = webpURL;
                } else {
                    // Try gif
                    fetch(gifURL, { method: "HEAD" }).then(res2 => {
                        if (res2.ok) {
                            img.src = gifURL;
                        } else {
                            img.src = getNextSkyImage();
                        }
                    }).catch(() => {
                        img.src = getNextSkyImage();
                    });
                }
            }).catch(() => {
                // On error, try gif
                fetch(gifURL, { method: "HEAD" }).then(res2 => {
                    if (res2.ok) {
                        img.src = gifURL;
                    } else {
                        img.src = getNextSkyImage();
                    }
                }).catch(() => {
                    img.src = getNextSkyImage();
                });
            });
        } else {
            // No template, fallback to sky
            img.src = getNextSkyImage();
        }
    } else {
        img.src = getNextSkyImage();
    }
    pageLink.appendChild(img);

    const textBlock = document.createElement("div");
    textBlock.className = "text-block";

    const titleP = document.createElement("p");
    titleP.className = "page-title";
    titleP.textContent = title;
    textBlock.appendChild(titleP);

    if (subtitle) {
        const subtitleP = document.createElement("p");
        subtitleP.className = "page-subtitle";
        subtitleP.textContent = subtitle;
        textBlock.appendChild(subtitleP);
    }

    pageLink.appendChild(textBlock);

    return pageLink;
}

/**
 * Dynamically renders .page-link elements for home or collection pages.
 * @param {string} page - The current page identifier (e.g. "home", "collection").
 * @param {Object} siteConfig - The site configuration object containing element IDs and collection data.
 * @param {Array} navData - The navigation data array containing link information.
 * @param {Object} pages - The pages data object containing content for each page.
 */
export function renderDynamicLinks(page, siteConfig, navData, pages) {
    const isHomePage = page === "home";
    const isCollectionPage = siteConfig.collections?.[page];

    const skyImages = getShuffledSkyImages(siteConfig);
    let skyIndex = 0;

    const getNextSkyImage = () =>
        skyImages.length > 0
            ? skyImages[skyIndex++ % skyImages.length]
            : "/img/home/sky_1.jpg";

    if (isHomePage) {
        const container = document.getElementById(siteConfig.elementIds.linkContainer);
        if (!container || !Array.isArray(navData)) return;

        navData
            .filter(link => link.homePage)
            .forEach((link, index) => {
                const pageLink = createPageLink({
                    href: link.href,
                    thumbnail: link.thumbnail,
                    title: link.title || link.key,
                    subtitle: link.subtitle,
                    isExternal: link.href.startsWith("http"),
                    key: link.key,
                    collectionKey: page
                }, siteConfig, getNextSkyImage);
                if (index % 2 === 1) pageLink.classList.add("reverse");
                container.appendChild(pageLink);
            });
    }
    else if (isCollectionPage) {
        const collectionKey = page;
        const collectionObj = siteConfig.collections[collectionKey];
        const { type, basePath } = collectionObj;
        const container = document.getElementById(siteConfig.elementIds.linkContainer);
        if (!container || !type) return;

        Object.values(pages)
            .filter(data => data.type === type)
            .sort((a, b) => {
                const toDateValue = (entry) => {
                    const year = typeof entry.year === "number" ? entry.year : 0;

                    let month = 0;
                    if (typeof entry.month === "number") {
                        month = entry.month - 1;
                    } else if (typeof entry.month === "string" && siteConfig.monthOrder) {
                        const index = siteConfig.monthOrder.indexOf(entry.month);
                        month = index >= 0 ? index : 0;
                    }

                    const day = typeof entry.day === "number" ? entry.day : 1;

                    return new Date(year, month, day).getTime();
                };

                return toDateValue(b) - toDateValue(a); // descending order
            })
            .forEach((data, index) => {
                const subtitleText = formatSubtitle(data, siteConfig);
                let href = "#";
                let isExternal = false;

                if (data.external === true) {
                    if (data.permalink) {
                        href = data.permalink;
                    } else if (data.originalUrl) {
                        href = data.originalUrl;
                    }
                    isExternal = true;
                } else {
                    if (data.permalink) {
                        href = data.permalink;
                    } else {
                        href = `${basePath}${data.key}`;
                    }
                    isExternal = false;
                }

                const pageLink = createPageLink({
                    href,
                    thumbnail: data.thumbnail,
                    title: data.title,
                    subtitle: subtitleText,
                    isExternal,
                    key: data.key,
                    collectionKey
                }, siteConfig, getNextSkyImage);
                if (index % 2 === 1) pageLink.classList.add("reverse");
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
        console.warn('Missing or incomplete page data for:', page);
        return;
    }

    const {
        backgroundColor,
        title,
        description
    } = pageContent;
    const {
        elementIds,
        tagNames,
        galleryBasePath,
        defaultImageSize,
        imageExt
    } = siteConfig;

    if (!elementIds.content || !elementIds.nav || !elementIds.gallery ||
        !tagNames.galleryItemWrapper || !tagNames.galleryImage) {
        console.error('Missing required config values for rendering content pages');
        return;
    }

    applyBackgroundColor(backgroundColor);
    updateTitle(title);
    updateDescription(description);
    updateMainHeading(title, siteConfig);

    const subtitleText = formatSubtitle(pageContent, siteConfig);
    updateSubtitle(subtitleText, siteConfig);

    const main = document.querySelector('main');
    renderProjectLayout(
        main,
        pageContent,
        tagNames,
        galleryBasePath,
        defaultImageSize,
        imageExt,
        siteConfig
    );
}