import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://kvnchpl.com';
const SITE_NAME = 'Kevin Cunanan Chappelle';
const DEFAULT_IMAGE = '/img/projects/truth-visions/full/truth-visions_1.webp';
const DEFAULT_IMAGE_ALT = 'Truth Visions installation by Kevin Cunanan Chappelle';
const SKY_COUNT = 22;
const changedFiles = new Set();

const pageConfigs = {
    'index.html': {
        title: 'Kevin Cunanan Chappelle | Brooklyn Artist',
        description: 'Official website of Kevin Cunanan Chappelle, a Brooklyn-based artist exploring how digital technologies reshape perception and presence.',
        canonicalPath: '/',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'home.html': {
        title: 'Home | Kevin Cunanan Chappelle',
        description: 'Explore the projects, writings, reading list, and contact information of Brooklyn-based artist Kevin Cunanan Chappelle.',
        canonicalPath: '/home',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'projects.html': {
        title: 'Projects | Kevin Cunanan Chappelle',
        description: 'Selected digital art, installations, performance, and experimental projects by Brooklyn-based artist Kevin Cunanan Chappelle.',
        canonicalPath: '/projects',
        image: '/img/projects/compiler-buddha/buddha-site-demo.png',
        imageAlt: 'Compiler Buddha by Kevin Cunanan Chappelle'
    },
    'writings.html': {
        title: 'Writings | Kevin Cunanan Chappelle',
        description: 'Poetry and creative writing by Brooklyn-based artist Kevin Cunanan Chappelle.',
        canonicalPath: '/writings',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'readings.html': {
        title: 'Reading List | Kevin Cunanan Chappelle',
        description: 'A reading list of essays, criticism, poetry, and books selected by artist Kevin Cunanan Chappelle.',
        canonicalPath: '/readings',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'contact.html': {
        title: 'About and Contact | Kevin Cunanan Chappelle',
        description: 'About and contact information for Kevin Cunanan Chappelle, a Brooklyn-based artist working across digital, physical, and spiritual spaces.',
        canonicalPath: '/contact',
        image: '/img/contact/self_portrait.webp',
        imageAlt: 'Kevin Cunanan Chappelle',
        ogType: 'profile',
        twitterCard: 'summary'
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

function rootPath(relativePath) {
    return path.join(ROOT, relativePath);
}

async function readJson(relativePath) {
    return JSON.parse(await readFile(rootPath(relativePath), 'utf8'));
}

function escapeHtml(value = '') {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function escapeAttribute(value = '') {
    return escapeHtml(value)
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function absoluteUrl(value) {
    return new URL(value, SITE_ORIGIN).href;
}

function assertLocalAsset(url) {
    if (!url?.startsWith('/')) return;
    if (!existsSync(rootPath(url.slice(1)))) {
        throw new Error(`Missing local asset: ${url}`);
    }
}

function hash(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 10);
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

function publishedDate(entry) {
    if (!entry.year || typeof entry.month !== 'number' || typeof entry.day !== 'number') return null;
    return [entry.year, String(entry.month).padStart(2, '0'), String(entry.day).padStart(2, '0')].join('-');
}

function subtitleFor(entry) {
    if (typeof entry.subtitle === 'string' && entry.subtitle.trim()) return entry.subtitle;

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

function pageHref(entry, basePath) {
    return entry.permalink || entry.originalUrl || `${basePath}${entry.key}`;
}

function markerPattern(name) {
    return new RegExp(`[ \\t]*<!-- generated:${name}:start -->[\\s\\S]*?[ \\t]*<!-- generated:${name}:end -->`);
}

function generatedBlock(name, content, indentation) {
    return `${indentation}<!-- generated:${name}:start -->\n${content}\n${indentation}<!-- generated:${name}:end -->`;
}

function replaceGeneratedBlock(html, name, block, initialPattern) {
    const generatedPattern = markerPattern(name);
    if (generatedPattern.test(html)) return html.replace(generatedPattern, block);
    if (!initialPattern.test(html)) throw new Error(`Could not place generated ${name} block`);
    return html.replace(initialPattern, block);
}

function replaceContainerBlock(html, name, containerId, content) {
    const block = generatedBlock(name, content, '        ');
    const generatedPattern = markerPattern(name);

    if (generatedPattern.test(html)) return html.replace(generatedPattern, block);

    const emptyContainer = `        <div id="${containerId}" class="${containerId === 'link-container' ? 'container' : 'project-content'}"></div>`;
    if (!html.includes(emptyContainer)) throw new Error(`Could not place generated ${name} container`);

    return html.replace(
        emptyContainer,
        `        <div id="${containerId}" class="${containerId === 'link-container' ? 'container' : 'project-content'}">\n${block}\n        </div>`
    );
}

function renderSeo(config) {
    const canonical = absoluteUrl(config.canonicalPath);
    const image = absoluteUrl(config.image || DEFAULT_IMAGE);
    const imageAlt = config.imageAlt || DEFAULT_IMAGE_ALT;
    const lines = [
        `    <title>${escapeHtml(config.title)}</title>`,
        `    <meta name="description" content="${escapeAttribute(config.description)}" />`,
        `    <meta name="author" content="${SITE_NAME}" />`,
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `    <link rel="canonical" href="${escapeAttribute(canonical)}" />`,
        `    <meta property="og:type" content="${config.ogType || 'website'}" />`,
        `    <meta property="og:site_name" content="${SITE_NAME}" />`,
        `    <meta property="og:title" content="${escapeAttribute(config.title)}" />`,
        `    <meta property="og:description" content="${escapeAttribute(config.description)}" />`,
        `    <meta property="og:url" content="${escapeAttribute(canonical)}" />`,
        `    <meta property="og:image" content="${escapeAttribute(image)}" />`,
        `    <meta property="og:image:alt" content="${escapeAttribute(imageAlt)}" />`
    ];

    if (config.publishedTime) {
        lines.push(`    <meta property="article:published_time" content="${config.publishedTime}" />`);
    }

    lines.push(
        `    <meta name="twitter:card" content="${config.twitterCard || 'summary_large_image'}" />`,
        `    <meta name="twitter:title" content="${escapeAttribute(config.title)}" />`,
        `    <meta name="twitter:description" content="${escapeAttribute(config.description)}" />`,
        `    <meta name="twitter:image" content="${escapeAttribute(image)}" />`,
        `    <meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}" />`
    );

    return generatedBlock('seo', lines.join('\n'), '    ');
}

function linkAttributes(newTab) {
    return newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function renderNav(navData, pageId) {
    const links = navData
        .filter((link) => link.navBar)
        .map((link) => {
            const label = link.label.toLowerCase() === pageId ? `*${link.label}*` : link.label;
            return `        <a href="${escapeAttribute(link.href)}"${linkAttributes(link.newTab)}>${escapeHtml(label)}</a>`;
        });

    const nav = [
        '    <nav id="nav" aria-label="Primary">',
        ...links,
        '    </nav>'
    ].join('\n');

    return generatedBlock('nav', nav, '    ');
}

function renderPageLink({ href, title, subtitle, thumbnail, newTab, reverse, skyIndex, index }) {
    const usesSky = !thumbnail;
    const image = thumbnail || `/img/home/sky_${(skyIndex % SKY_COUNT) + 1}.webp`;
    assertLocalAsset(image);

    const linkClass = reverse ? 'page-link reverse' : 'page-link';
    const skyAttribute = usesSky ? ' data-sky-image' : '';
    const loading = index < 4 ? 'eager' : 'lazy';
    const lines = [
        `            <a class="${linkClass}" href="${escapeAttribute(href)}"${linkAttributes(newTab)}>`,
        `                <img src="${escapeAttribute(image)}" alt="${escapeAttribute(title)}" loading="${loading}" decoding="async"${skyAttribute} />`,
        '                <div class="text-block">',
        `                    <p class="page-title">${escapeHtml(title)}</p>`
    ];

    if (subtitle) lines.push(`                    <p class="page-subtitle">${escapeHtml(subtitle)}</p>`);

    lines.push(
        '                </div>',
        '            </a>'
    );

    return lines.join('\n');
}

function renderCollection(items, basePath) {
    return items
        .slice()
        .sort((a, b) => dateValue(b) - dateValue(a))
        .map((entry, index) => renderPageLink({
            href: pageHref(entry, basePath),
            title: entry.title,
            subtitle: subtitleFor(entry),
            thumbnail: entry.thumbnail,
            newTab: entry.newTab === true,
            reverse: index % 2 === 1,
            skyIndex: index,
            index
        }))
        .join('\n');
}

function renderHome(navData) {
    return navData
        .filter((link) => link.homePage)
        .map((link, index) => renderPageLink({
            href: link.href,
            title: link.title || link.label,
            subtitle: link.subtitle,
            thumbnail: link.thumbnail,
            newTab: link.newTab === true,
            reverse: index % 2 === 1,
            skyIndex: index,
            index
        }))
        .join('\n');
}

function imageUrl(projectKey, image, size = 'medium') {
    return `/img/projects/${projectKey}/${size}/${image}.webp`;
}

function imageSrcset(project, image) {
    const fullWidth = project.fullWidth;
    const candidates = [
        `${imageUrl(project.key, image, 'small')} 600w`,
        `${imageUrl(project.key, image, 'medium')} 1280w`
    ];

    if (!Number.isInteger(fullWidth) || fullWidth < 1) {
        throw new Error(`Invalid fullWidth for project: ${project.key}`);
    }
    if (fullWidth > 1280) candidates.push(`${imageUrl(project.key, image, 'full')} ${fullWidth}w`);

    return candidates.join(', ');
}

function renderSlideshow(project, images, sectionIndex) {
    for (const image of images) {
        for (const size of ['small', 'medium', 'full']) assertLocalAsset(imageUrl(project.key, image, size));
    }

    const firstImage = images[0];
    const count = images.length;
    const loading = sectionIndex === 0 ? 'eager' : 'lazy';
    const data = count > 1
        ? ` data-slideshow data-project="${escapeAttribute(project.key)}" data-images="${escapeAttribute(JSON.stringify(images))}" data-full-width="${project.fullWidth}"`
        : '';
    const lines = [
        `                <div class="slideshow-wrapper"${data}>`,
        '                    <div class="slideshow-inner">'
    ];

    if (count > 1) {
        lines.push(`                        <button type="button" class="slideshow-control slideshow-prev" aria-label="Previous image, 1 of ${count}">&lt;</button>`);
    }

    lines.push(
        `                        <img src="${imageUrl(project.key, firstImage)}" srcset="${imageSrcset(project, firstImage)}" sizes="(max-width: 600px) 100vw, (max-width: 1280px) 80vw, 60vw" alt="${escapeAttribute(`${project.title}, image 1 of ${count}`)}" loading="${loading}" decoding="async" />`
    );

    if (count > 1) {
        lines.push(`                        <button type="button" class="slideshow-control slideshow-next" aria-label="Next image, 1 of ${count}">&gt;</button>`);
    }

    lines.push(
        '                    </div>',
        '                </div>'
    );

    return lines.join('\n');
}

function renderProjectSections(project) {
    return project.sections
        .map((section, index) => {
            const lines = ['            <section class="project-section">'];

            if (Array.isArray(section.images) && section.images.length) {
                lines.push(renderSlideshow(project, section.images, index));
            }

            if (typeof section.text === 'string' && section.text.trim()) {
                const paragraphs = section.text
                    .split(/\n+/)
                    .map((line) => line.trim())
                    .filter(Boolean);

                lines.push('                <div class="project-copy">');
                for (const paragraph of paragraphs) {
                    lines.push(`                    <p>${escapeHtml(paragraph)}</p>`);
                }
                lines.push('                </div>');
            }

            lines.push('            </section>');
            return lines.join('\n');
        })
        .join('\n');
}

function projectSocialImage(project) {
    if (project.socialImage) return project.socialImage;
    const firstImage = project.sections.flatMap((section) => section.images || [])[0];
    return firstImage ? imageUrl(project.key, firstImage, 'full') : project.thumbnail || DEFAULT_IMAGE;
}

function removeRuntimeDataMeta(html) {
    return html.replace(/\n\s*<meta name="(?:nav-data|projects-data|writings-data|readings-data)" content="[^"]*" \/>/g, '');
}

async function updateHtml(relativePath, transform) {
    const absolutePath = rootPath(relativePath);
    const original = await readFile(absolutePath, 'utf8');
    const updated = transform(original);
    if (updated === original) return false;
    await writeFile(absolutePath, updated.endsWith('\n') ? updated : `${updated}\n`);
    changedFiles.add(relativePath);
    return true;
}

async function htmlFiles(directory = ROOT) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name === '.git') continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await htmlFiles(fullPath));
        if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
    }

    return files;
}

function sitemapXml(projects, writings) {
    const urls = ['/', '/home', '/projects'];

    for (const project of projects) {
        if (!project.external) urls.push(`/projects/${project.key}`);
        if (project.sitemap && project.permalink) urls.push(project.permalink);
    }

    urls.push('/writings');
    for (const writing of writings) {
        if (!writing.external) urls.push(`/writings/${writing.key}`);
        if (writing.permalink?.startsWith('/')) urls.push(writing.permalink);
    }
    urls.push('/readings', '/contact');

    const uniqueUrls = [...new Set(urls.map(absoluteUrl))];
    const body = uniqueUrls
        .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by scripts/build-site.mjs. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const [navData, projects, readings, writings] = await Promise.all([
    readJson('json/nav.json'),
    readJson('json/projects.json'),
    readJson('json/readings.json'),
    readJson('json/writings.json')
]);

const initialSeoPattern = /    <title>[\s\S]*?    <meta name="twitter:image:alt" content="[^"]*" \/>/;
const initialNavPattern = /    <nav id="nav"><\/nav>/;
const initialHeaderPattern = /        <h1 id="main-heading">[\s\S]*?        <h2 id="subtitle">[^<]*<\/h2>/;

for (const [file, config] of Object.entries(pageConfigs)) {
    await updateHtml(file, (original) => {
        const seo = renderSeo(config);
        let html = replaceGeneratedBlock(original, 'seo', seo, initialSeoPattern);
        if (['projects.html', 'writings.html', 'readings.html', 'contact.html'].includes(file)) {
            const pageId = file.replace('.html', '');
            html = replaceGeneratedBlock(html, 'nav', renderNav(navData, pageId), initialNavPattern);
        }
        if (file === 'home.html') html = replaceContainerBlock(html, 'collection', 'link-container', renderHome(navData));
        if (file === 'projects.html') html = replaceContainerBlock(html, 'collection', 'link-container', renderCollection(projects, '/projects/'));
        if (file === 'writings.html') html = replaceContainerBlock(html, 'collection', 'link-container', renderCollection(writings, '/writings/'));
        if (file === 'readings.html') html = replaceContainerBlock(html, 'collection', 'link-container', renderCollection(readings, '/readings/'));
        return removeRuntimeDataMeta(html);
    });
}

for (const project of projects.filter((entry) => !entry.external)) {
    const file = `projects/${project.key}.html`;
    const image = projectSocialImage(project);
    assertLocalAsset(image);
    const config = {
        title: `${project.title} | ${SITE_NAME}`,
        description: project.description,
        canonicalPath: `/projects/${project.key}`,
        image,
        imageAlt: `${project.title} by ${SITE_NAME}`
    };

    await updateHtml(file, (original) => {
        let html = replaceGeneratedBlock(original, 'seo', renderSeo(config), initialSeoPattern);
        html = replaceGeneratedBlock(html, 'nav', renderNav(navData, project.key), initialNavPattern);
        const header = generatedBlock(
            'page-header',
            `        <h1 id="main-heading">*${escapeHtml(project.title)}*</h1>\n        <h2 id="subtitle">${escapeHtml(monthYear(project) || '')}</h2>`,
            '        '
        );
        html = replaceGeneratedBlock(html, 'page-header', header, initialHeaderPattern);
        html = replaceContainerBlock(html, 'project', 'content-page-container', renderProjectSections(project));
        return removeRuntimeDataMeta(html);
    });
}

for (const writing of writings.filter((entry) => !entry.external)) {
    const file = `writings/${writing.key}.html`;
    const config = {
        title: `${writing.title} | ${SITE_NAME}`,
        description: `${writing.title} is a work of creative writing by Brooklyn-based artist ${SITE_NAME}.`,
        canonicalPath: `/writings/${writing.key}`,
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT,
        ogType: 'article',
        publishedTime: publishedDate(writing)
    };

    await updateHtml(file, (original) => {
        let html = replaceGeneratedBlock(original, 'seo', renderSeo(config), initialSeoPattern);
        html = replaceGeneratedBlock(html, 'nav', renderNav(navData, writing.key), initialNavPattern);
        const header = generatedBlock(
            'page-header',
            `        <h1 id="main-heading">*${escapeHtml(writing.title)}*</h1>\n        <h2 id="subtitle">${escapeHtml(monthYear(writing) || '')}</h2>`,
            '        '
        );
        html = replaceGeneratedBlock(html, 'page-header', header, initialHeaderPattern);
        return removeRuntimeDataMeta(html);
    });
}

const nextSitemap = sitemapXml(projects, writings);
const currentSitemap = await readFile(rootPath('sitemap.xml'), 'utf8');
if (nextSitemap !== currentSitemap) {
    await writeFile(rootPath('sitemap.xml'), nextSitemap);
    changedFiles.add('sitemap.xml');
}

const cssVersion = hash(await readFile(rootPath('css/main.css')));
const jsVersion = hash(await readFile(rootPath('js/main.js')));

for (const htmlPath of await htmlFiles()) {
    const relativePath = path.relative(ROOT, htmlPath);
    await updateHtml(relativePath, (original) => original
        .replace(/(\/css\/main\.css)\?v=[^"']+/g, `$1?v=${cssVersion}`)
        .replace(/(\/js\/main\.js)\?v=[^"']+/g, `$1?v=${jsVersion}`));
}

console.log(`Built ${projects.length} projects, ${writings.length} writings, and ${readings.length} readings.`);
console.log(`${changedFiles.size} file${changedFiles.size === 1 ? '' : 's'} updated.`);
