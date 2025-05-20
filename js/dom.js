/**
 * Applies a background color to the document body.
 * @param {string} color - The color to apply (e.g., "#ff0000").
 */
export function applyBackgroundColor(color) {
    if (color) {
        document.body.style.backgroundColor = color;
    }
}

/**
 * Injects HTML from a partial into a specified element or selector.
 * @param {string} url - The URL of the partial HTML.
 * @param {string|HTMLElement} target - A CSS selector or an element.
 * @param {'beforeend'|'afterbegin'} position - Where to insert the HTML.
 */
export async function injectPartial(url, target, position = 'beforeend') {
    try {
        const res = await fetch(url);
        const html = await res.text();
        let el = typeof target === 'string' ? document.querySelector(target) : target;
        if (el) {
            el.insertAdjacentHTML(position, html);
        } else {
            console.warn(`Element not found for partial injection: ${target}`);
        }
    } catch (err) {
        console.error(`Error injecting partial (${url}):`, err);
    }
}

/**
 * Updates the document title.
 * @param {string} title - The title to set.
 */
export function updateTitle(title) {
    if (title) {
        document.title = title;
    }
}

/**
 * Updates or inserts a meta description tag in the document head.
 * @param {string} description - The meta description text to insert.
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
 * Updates the main heading element with the page title.
 * @param {string} title - The title to set in the main heading.
 */
export function updateMainHeading(heading) {
    const h1 = document.getElementById('mainHeading')
    if (h1 && heading) {
        h1.textContent = heading;
    }
}

/**
 * Renders a navigation menu based on provided data.
 * @param {string} navId - The ID of the navigation element.
 * @param {Array} navData - An array of objects containing href and label for each link.
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
 * Renders home links in a specified section.
 * @param {Array} navData - An array of objects containing href and label for each link.
 * @param {HTMLElement} homeLinksSection - The section to render the links into.
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
 * Renders a project page layout using images and content arrays from projects.json.
 * Images go to #gallery, text goes to #content.
 * @param {HTMLElement} container - The main element to render into.
 * @param {Object} pageData - The project data from projects.json.
 * @param {Object} tagNames - Tag names from config.
 * @param {string} basePath - Base path for images.
 * @param {string} size - Image size.
 * @param {string} imageExt - Image file extension.
 */
export function renderProjectLayout(container, pageData, tagNames, basePath, size, imageExt) {
    if (!container || !pageData) return;

    const galleryEl = container.querySelector('#gallery');
    const contentEl = container.querySelector('#content');
    if (!galleryEl || !contentEl) return;

    const images = pageData.images || [];
    const content = pageData.content || [];
    const layout = pageData.layout;

    // Helper to render an image gallery block
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

    // Helper to render a content block
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

    // If custom layout, respect it (alternating blocks)
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