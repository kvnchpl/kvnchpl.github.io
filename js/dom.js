export function applyBackgroundColor(color) {
    if (color) {
        document.body.style.backgroundColor = color;
    }
}

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