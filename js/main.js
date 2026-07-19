const SITE_ORIGIN = 'https://kvnchpl.com';
const IMAGE_SIZE = 'medium';
const IMAGE_EXT = '.webp';
const SKY_COUNT = 22;

const collections = {
    projects: {
        type: 'project',
        basePath: '/projects/',
        metaName: 'projects-data',
        thumbnailBase: '/img/projects/{key}/thumbnail/{key}_thumbnail'
    },
    readings: {
        type: 'reading',
        basePath: '/readings/',
        metaName: 'readings-data'
    },
    writings: {
        type: 'writing',
        basePath: '/writings/',
        metaName: 'writings-data'
    }
};

const monthNames = [
    null,
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

const monthOrder = [
    'Winter',
    'January',
    'February',
    'March',
    'Spring',
    'April',
    'May',
    'June',
    'Summer',
    'July',
    'August',
    'September',
    'Autumn',
    'Fall',
    'October',
    'November',
    'December'
];

function metaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.content : undefined;
}

function replaceContent(container, fragment) {
    container.textContent = '';
    container.appendChild(fragment);
}

async function loadJSON(url) {
    if (!url) return undefined;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Could not load ${url}: ${response.status}`);
    }

    return response.json();
}

function localUrl(href, forceAbsolute = false) {
    const isAbsolute = href.startsWith('http://') || href.startsWith('https://');
    return forceAbsolute && !isAbsolute ? `${SITE_ORIGIN}${href}` : href;
}

function renderNav(navData, page) {
    const nav = document.getElementById('nav');
    if (!nav || !Array.isArray(navData)) return;

    const useAbsolutePaths = page === 'thoughts';
    const fragment = document.createDocumentFragment();

    navData
        .filter((link) => link.navBar)
        .forEach((link) => {
            const a = document.createElement('a');
            a.href = localUrl(link.href, useAbsolutePaths);
            a.textContent = link.label.toLowerCase() === page ? `*${link.label}*` : link.label;
            fragment.appendChild(a);
        });

    replaceContent(nav, fragment);
}

function shuffledSkyImages() {
    const images = Array.from({ length: SKY_COUNT }, (_, index) => `/img/home/sky_${index + 1}.webp`);

    for (let index = images.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [images[index], images[swapIndex]] = [images[swapIndex], images[index]];
    }

    return images;
}

function skyImage(index, images) {
    return images[index % images.length];
}

function setImageSrc(img, urls) {
    const candidates = urls.filter(Boolean);
    let index = 0;

    img.onerror = () => {
        index += 1;
        if (candidates[index]) {
            img.src = candidates[index];
        } else {
            img.onerror = null;
        }
    };

    img.src = candidates[0];
}

function dateValue(entry) {
    const year = typeof entry.year === 'number' ? entry.year : 0;
    const day = typeof entry.day === 'number' ? entry.day : 1;
    let month = 0;

    if (typeof entry.month === 'number') {
        month = entry.month - 1;
    } else if (typeof entry.month === 'string') {
        const index = monthOrder.indexOf(entry.month);
        month = index >= 0 ? index : 0;
    }

    return new Date(year, month, day).getTime();
}

function monthYear(entry) {
    if (!entry.year) return null;
    if (typeof entry.month === 'number') return `${monthNames[entry.month]} ${entry.year}`;
    if (typeof entry.month === 'string' && entry.month.trim()) return `${entry.month} ${entry.year}`;
    return `${entry.year}`;
}

function subtitleFor(entry) {
    if (typeof entry.subtitle === 'string' && entry.subtitle.trim()) {
        return entry.subtitle;
    }

    const date = monthYear(entry);

    if (entry.type !== 'reading') return date;

    const parts = [];
    if (entry.author) parts.push(`by ${entry.author}`);
    if (entry.publication) parts.push(entry.publication);
    if (entry.issue) parts.push(entry.issue);
    if (date) parts.push(`(${date})`);

    if (!parts.length) return null;

    const last = parts.pop();
    return parts.length ? `${parts.join(', ')} ${last}` : last;
}

function pageHref(entry, collection) {
    if (entry.external) {
        return entry.permalink || entry.originalUrl || '#';
    }

    return entry.permalink || `${collection.basePath}${entry.key}`;
}

function linkThumbnail(entry, collection, index, skyImages) {
    const fallback = skyImage(index, skyImages);

    if (entry.thumbnail) {
        return [entry.thumbnail, fallback];
    }

    if (!collection.thumbnailBase || !entry.key) {
        return [fallback];
    }

    const base = collection.thumbnailBase.split('{key}').join(entry.key);
    return [`${base}.webp`, `${base}.gif`, fallback];
}

function pageLink({ href, title, subtitle, external, thumbnails, reverse }) {
    const link = document.createElement('a');
    link.className = reverse ? 'page-link reverse' : 'page-link';
    link.href = href;

    if (external) {
        link.target = '_blank';
        link.rel = 'noopener';
    }

    const img = document.createElement('img');
    img.alt = title || '';
    setImageSrc(img, thumbnails);
    link.appendChild(img);

    const text = document.createElement('div');
    text.className = 'text-block';

    const titleEl = document.createElement('p');
    titleEl.className = 'page-title';
    titleEl.textContent = title;
    text.appendChild(titleEl);

    if (subtitle) {
        const subtitleEl = document.createElement('p');
        subtitleEl.className = 'page-subtitle';
        subtitleEl.textContent = subtitle;
        text.appendChild(subtitleEl);
    }

    link.appendChild(text);
    return link;
}

function renderHomeLinks(navData) {
    const container = document.getElementById('link-container');
    if (!container || !Array.isArray(navData)) return;

    const fragment = document.createDocumentFragment();
    const skyImages = shuffledSkyImages();

    navData
        .filter((link) => link.homePage)
        .forEach((link, index) => {
            fragment.appendChild(pageLink({
                href: link.href,
                title: link.title || link.label,
                subtitle: link.subtitle,
                external: link.external === true,
                thumbnails: link.thumbnail ? [link.thumbnail, skyImage(index, skyImages)] : [skyImage(index, skyImages)],
                reverse: index % 2 === 1
            }));
        });

    replaceContent(container, fragment);
}

function renderCollectionLinks(page, items) {
    const container = document.getElementById('link-container');
    const collection = collections[page];
    if (!container || !collection || !Array.isArray(items)) return;

    const fragment = document.createDocumentFragment();
    const skyImages = shuffledSkyImages();

    items
        .filter((entry) => entry.type === collection.type)
        .sort((a, b) => dateValue(b) - dateValue(a))
        .forEach((entry, index) => {
            fragment.appendChild(pageLink({
                href: pageHref(entry, collection),
                title: entry.title,
                subtitle: subtitleFor(entry),
                external: entry.external === true,
                thumbnails: linkThumbnail(entry, collection, index, skyImages),
                reverse: index % 2 === 1
            }));
        });

    replaceContent(container, fragment);
}

function updatePageHeader(entry) {
    const title = entry.title || '';
    const heading = document.getElementById('main-heading');
    const subtitle = document.getElementById('subtitle');

    if (title) document.title = `${title} | Kevin Cunanan Chappelle`;
    if (heading) heading.textContent = `*${title}*`;
    if (subtitle) subtitle.textContent = subtitleFor(entry) || '';
}

function imageUrl(project, image, size = IMAGE_SIZE) {
    return `/img/projects/${project.key}/${size}/${image}${IMAGE_EXT}`;
}

function imageSrcset(project, image) {
    return [
        `${imageUrl(project, image, 'small')} 600w`,
        `${imageUrl(project, image, 'medium')} 1280w`,
        `${imageUrl(project, image, 'full')} 1920w`
    ].join(', ');
}

function projectImages(project, names) {
    const wrapper = document.createElement('div');
    wrapper.className = 'slideshow-wrapper';

    const inner = document.createElement('div');
    inner.className = 'slideshow-inner';

    const img = document.createElement('img');
    img.sizes = '(max-width: 600px) 100vw, (max-width: 1280px) 80vw, 60vw';

    let currentIndex = 0;
    let previousButton;
    let nextButton;

    function showImage(index) {
        currentIndex = (index + names.length) % names.length;
        const name = names[currentIndex];
        img.src = imageUrl(project, name);
        img.srcset = imageSrcset(project, name);
        img.alt = `${project.title}, image ${currentIndex + 1} of ${names.length}`;

        if (previousButton && nextButton) {
            previousButton.setAttribute('aria-label', `Previous image, ${currentIndex + 1} of ${names.length}`);
            nextButton.setAttribute('aria-label', `Next image, ${currentIndex + 1} of ${names.length}`);
        }
    }

    if (names.length > 1) {
        previousButton = document.createElement('button');
        previousButton.type = 'button';
        previousButton.className = 'slideshow-control slideshow-prev';
        previousButton.textContent = '<';
        previousButton.addEventListener('click', () => showImage(currentIndex - 1));

        nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'slideshow-control slideshow-next';
        nextButton.textContent = '>';
        nextButton.addEventListener('click', () => showImage(currentIndex + 1));

        inner.appendChild(previousButton);
    }

    inner.appendChild(img);

    if (nextButton) {
        inner.appendChild(nextButton);
    }

    showImage(0);

    wrapper.appendChild(inner);
    return wrapper;
}

function projectText(text) {
    const wrapper = document.createElement('div');
    wrapper.className = 'project-copy';

    text.split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
            const p = document.createElement('p');
            p.textContent = line;
            wrapper.appendChild(p);
        });

    return wrapper;
}

function projectSection(project, imageNames, text) {
    const section = document.createElement('section');
    section.className = 'project-section';

    if (imageNames) {
        section.appendChild(projectImages(project, imageNames));
    }

    if (text) {
        section.appendChild(projectText(text));
    }

    return section;
}

function renderProject(project) {
    const container = document.getElementById('content-page-container');
    if (!container || project.type !== 'project') return;

    const imageGroups = (project.images || []).filter((group) => Array.isArray(group) && group.length);
    const textBlocks = (project.content || []).filter((text) => typeof text === 'string' && text.trim());
    const fragment = document.createDocumentFragment();

    if (imageGroups.length && imageGroups.length === textBlocks.length) {
        imageGroups.forEach((group, index) => {
            fragment.appendChild(projectSection(project, group, textBlocks[index]));
        });
    } else {
        imageGroups.forEach((group) => {
            fragment.appendChild(projectSection(project, group));
        });
        textBlocks.forEach((text) => {
            fragment.appendChild(projectSection(project, null, text));
        });
    }

    replaceContent(container, fragment);
}

function contentCollectionForPage(page) {
    return Object.values(collections).find((collection) => Boolean(metaContent(collection.metaName)));
}

async function init() {
    const page = document.body.dataset.page;
    if (!page || page === 'index' || page === '404') return;

    const contentCollection = contentCollectionForPage(page);
    const navPromise = loadJSON(metaContent('nav-data') || '/json/nav.json');
    const pagePromise = contentCollection
        ? loadJSON(metaContent(contentCollection.metaName))
        : Promise.resolve(undefined);

    try {
        const navData = await navPromise;
        renderNav(navData, page);
        window.navData = navData;

        if (page === 'home') {
            renderHomeLinks(navData);
            return;
        }
    } catch (error) {
        console.error('Error loading navigation:', error);
    }

    try {
        const pageData = await pagePromise;
        window.pages = pageData;

        if (collections[page]) {
            renderCollectionLinks(page, pageData);
            return;
        }

        if (!Array.isArray(pageData)) return;

        const entry = pageData.find((item) => item.key === page);
        if (!entry) return;

        updatePageHeader(entry);
        renderProject(entry);
    } catch (error) {
        console.error('Error loading page content:', error);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}
