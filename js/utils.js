// =========================
// DOM Manipulation Utilities
// =========================

/**
 * Sets the background color of the site, used for project and collection pages.
 */
export function applyBackgroundColor(color) {
    if (color) {
        document.body.style.backgroundColor = color;
    }
}

/**
 * Injects an HTML partial (e.g., head or footer) into a specified element or selector.
 * For <head>, parses and appends nodes for reliability.
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
 * Updates the main <h1> heading for the page.
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
 * Updates the document's <title> tag.
 */
export function updateTitle(title) {
    if (title) {
        document.title = title;
    }
}

/**
 * Updates or creates the meta description tag in the <head>.
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
 * Gets meta tag contents by name(s).
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
 * Loads a JSON file from the given URL.
 */
export async function loadJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load JSON: ${url}`);
    return await res.json();
}

/**
 * Loads multiple resources (JSON files) in parallel.
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
 * Renders the main navigation bar using nav data from nav.json.
 */
export function renderNav(navId, navData) {
    const nav = document.getElementById(navId);
    if (nav && navData) {
        const navFragment = document.createDocumentFragment();
        const filteredNavData = navData.filter(link => link.navBar);
        filteredNavData.forEach((link, idx) => {
            const a = document.createElement("a");
            a.href = link.href;
            a.textContent = link.label;
            navFragment.appendChild(a);
        });
        nav.appendChild(navFragment);
    }
}

/**
 * Renders a project page layout with images and text content.
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