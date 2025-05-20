/**
 * Sets the background color of the site, used for project and collection pages.
 * @param {string} color - Hex or CSS color string (e.g., "#ff0000").
 */
export function applyBackgroundColor(color) {
    if (color) {
        document.body.style.backgroundColor = color;
    }
}

/**
 * Injects an HTML partial (e.g., head or footer) into a specified element or selector.
 * For <head>, parses and appends nodes for reliability.
 * @param {string} url - The URL of the partial HTML file.
 * @param {string|HTMLElement} target - CSS selector or DOM element to inject into.
 * @param {'beforeend'|'afterbegin'} position - Where to insert the HTML in the target.
 */
export async function injectPartial(url, target, position = 'beforeend') {
    try {
        const res = await fetch(url);
        const html = await res.text();
        let el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            if (el.tagName === 'HEAD') {
                // Parse and append each node for <head>
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
 * Updates the document's <title> tag, used for dynamic page titles on project/content pages.
 * @param {string} title - The new page title.
 */
export function updateTitle(title) {
    if (title) {
        document.title = title;
    }
}

/**
 * Updates or creates the meta description tag in the <head>.
 * Used for SEO and sharing, set per project/content page.
 * @param {string} description - The meta description text.
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
 * Updates the main <h1> heading for the page, typically the project or collection title.
 * @param {string} heading - The text to set in the main heading.
 */
export function updateMainHeading(heading) {
    const h1 = document.getElementById('mainHeading')
    if (h1 && heading) {
        h1.textContent = heading;
    }
}

/**
 * Renders the main navigation bar using nav data from nav.json.
 * Populates the <nav> element with links for site navigation.
 * @param {string} navId - The ID of the <nav> element.
 * @param {Array} navData - Array of nav link objects ({ href, label, ... }).
 */
export function renderNav(navId, navData) {
    const nav = document.getElementById(navId);
    if (nav && navData) {
        const navFragment = document.createDocumentFragment();
        navData.forEach(link => {
            const a = document.createElement("a");
            a.href = link.href;
            a.textContent = link.label;
            navFragment.appendChild(a);
        });
        nav.appendChild(navFragment);
    }
}

/**
 * Renders the home page links section using nav data.
 * Populates the #homeLinks section with a list of navigation links.
 * @param {Array} navData - Array of nav link objects ({ href, label, ... }).
 * @param {HTMLElement} homeLinksSection - The section element to render links into.
 */
export function renderHomeLinks(navData, homeLinksSection) {
    if (homeLinksSection && Array.isArray(navData)) {
        const ul = document.createElement("ul");
        navData.forEach(link => {
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
}

/**
 * Renders a project page layout with images and text content.
 * Populates #gallery with images and #content with text, using layout from projects.json.
 * @param {HTMLElement} container - The <main> element to render into.
 * @param {Object} pageData - The project data object.
 * @param {Object} tagNames - Tag names from config.json (e.g., galleryItemWrapper, galleryImage).
 * @param {string} basePath - Base path for images (from config).
 * @param {string} size - Image size (e.g., "medium").
 * @param {string} imageExt - Image file extension (e.g., ".webp").
 */
export function renderProjectLayout(container, pageData, tagNames, basePath, size, imageExt) {
    if (!container || !pageData) return;

    const galleryEl = container.querySelector('#gallery');
    const contentEl = container.querySelector('#content');
    if (!galleryEl || !contentEl) return;

    const images = pageData.images || [];
    const content = pageData.content || [];
    const layout = pageData.layout;

    // Helper to render a block of images for the gallery
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

    // Helper to render a block of text content
    function renderContentBlock(text) {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
    }

    // Clear previous content
    while (galleryEl.firstChild) {
        galleryEl.removeChild(galleryEl.firstChild);
    }
    while (contentEl.firstChild) {
        contentEl.removeChild(contentEl.firstChild);
    }

    // If a custom layout is specified, alternate blocks as defined in layout array
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
        // Default: all images in gallery, all text in content
        images.forEach(imgArr => {
            galleryEl.appendChild(renderImagesBlock(imgArr));
        });
        content.forEach(text => {
            contentEl.appendChild(renderContentBlock(text));
        });
    }
}

/**
 * Loads a JSON file from the given URL.
 * @param {string} url - The URL to fetch.
 * @returns {Promise<any>} - The parsed JSON.
 */
export async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load JSON: ${url}`);
    return await res.json();
}

/**
 * Gets meta tag contents by name(s).
 * @param {Object} names - Object with keys as desired return keys and values as meta tag names.
 * @returns {Object} - Object with keys and meta content values.
 */
export function getMetaContents(names) {
    const result = {};
    for (const [key, metaName] of Object.entries(names)) {
        const meta = document.querySelector(`meta[name="${metaName}"]`);
        result[key] = meta ? meta.content : undefined;
    }
    return result;
}

/**
 * Loads multiple resources (JSON files) in parallel.
 * @param {Object} metaTags - Object with keys and meta tag names.
 * @returns {Promise<Object>} - Object with keys and loaded JSON data.
 */
export async function loadResources(metaTags) {
    const metaContents = getMetaContents(metaTags);
    const entries = Object.entries(metaContents);
    const results = await Promise.all(
        entries.map(async ([key, url]) => [key, url ? await loadJSON(url) : undefined])
    );
    return Object.fromEntries(results);
}