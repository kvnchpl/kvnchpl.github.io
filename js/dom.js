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
 * Updates the document title and the first <h1> element's text content.
 * @param {string} title - The title to set.
 */
export function updateTitle(title) {
    if (title) {
        document.title = title;
        const h1 = document.querySelector("h1");
        if (h1) {
            const titleFragment = document.createDocumentFragment();
            const span = document.createElement("span");
            span.textContent = title;
            titleFragment.appendChild(span);
            h1.innerHTML = "";
            h1.appendChild(titleFragment);
        }
    }
}

/**
 * Inserts an introduction text into a specified element.
 * @param {string} intro - The introduction text to insert.
 * @param {string} introId - The ID of the element where the intro will be inserted.
 */
export function insertIntro(intro, introId) {
    const introElement = document.getElementById(introId);
    if (intro && introElement) {
        const introFragment = document.createDocumentFragment();
        const p = document.createElement("p");
        p.textContent = intro;
        introFragment.appendChild(p);
        introElement.innerHTML = "";
        introElement.appendChild(introFragment);
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
 * Renders a gallery of images based on provided parameters.
 * @param {string} galleryId - The ID of the gallery element.
 * @param {string} folder - The folder containing the images.
 * @param {string} prefix - The prefix for the image filenames.
 * @param {string} ext - The file extension for the images (e.g., ".jpg").
 * @param {number} count - The number of images to render.
 * @param {Object} tagNames - An object containing the tag names for the gallery item wrapper and image.
 * @param {string} basePath - The base path for the images.
 * @param {string} size - The size of the images (e.g., "large", "small").
 * @returns {object} - The gallery element.
 */
export function renderGallery(galleryId, folder, prefix, ext, count, tagNames, basePath, size) {
    const gallery = document.getElementById(galleryId);
    if (!gallery) {
        console.warn(`No gallery container found.`);
        return;
    }
    if (folder && count) {
        const path = `${basePath}/${folder}/${size}`;
        const images = Array.from({ length: count }, (_, i) => {
            const filename = `${prefix}${String(i + 1).padStart(1, "0")}${ext}`;
            return {
                filename,
                path: `${path}/${filename}`
            };
        });

        const fragment = document.createDocumentFragment();
        images.forEach(({ filename, path }) => {
            const figure = document.createElement(tagNames.galleryItemWrapper);
            const img = document.createElement(tagNames.galleryImage);
            img.src = path;
            img.alt = filename;
            figure.appendChild(img);
            fragment.appendChild(figure);
        });
        gallery.appendChild(fragment);
    }
}