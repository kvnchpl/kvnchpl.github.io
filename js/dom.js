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
 * Dynamically fetches the image list from a JSON file in the gallery folder.
 * @param {string} galleryId - The ID of the gallery element.
 * @param {string} shortTitle - The short title used to derive folder and prefix.
 * @param {Object} tagNames - An object containing the tag names for the gallery item wrapper and image.
 * @param {string} basePath - The base path for the images.
 * @param {string} size - The size of the images (e.g., "large", "small").
 * @returns {Promise<object>} - The gallery element.
 */
export async function renderGallery(galleryId, shortTitle, tagNames, basePath, size) {
    const gallery = document.getElementById(galleryId);
    if (!gallery) {
        console.warn(`No gallery container found.`);
        return;
    }
    if (shortTitle) {
        const folder = shortTitle;
        const path = `${basePath}/${folder}/${size}`;
        // Fetch the image list JSON
        try {
            const response = await fetch(`${basePath}/${folder}/images.json`);
            if (!response.ok) throw new Error("Image list not found");
            const images = await response.json();

            const fragment = document.createDocumentFragment();
            images.forEach(filename => {
                const figure = document.createElement(tagNames.galleryItemWrapper);
                const img = document.createElement(tagNames.galleryImage);
                img.src = `${path}/${filename}`;
                img.alt = filename;
                figure.appendChild(img);
                fragment.appendChild(figure);
            });
            gallery.appendChild(fragment);
        } catch (e) {
            console.warn("Could not load image list for gallery:", e);
        }
    }
}