import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createField, renderField, renderWorkReturn, renderIdentity, renderAbout } from './field.mjs';
import { workPage } from './work-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_ORIGIN = 'https://kvnchpl.com';
const SITE_NAME = 'Kevin Cunanan Chappelle';
const DEFAULT_IMAGE = '/img/projects/truth-visions/full/truth-visions_1.webp';
const DEFAULT_IMAGE_ALT = 'Truth Visions installation by Kevin Cunanan Chappelle';
const changedFiles = new Set();

const pageConfigs = {
    'index.html': {
        title: 'KEVIN CUNANAN CHAPPELLE',
        description: 'Images and texts by Kevin Cunanan Chappelle. An artist working with mediation, memory, desire, and uncertainty.',
        canonicalPath: '/',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'home.html': {
        title: 'KEVIN CUNANAN CHAPPELLE',
        description: 'Explore the projects and writings of Brooklyn-based artist Kevin Cunanan Chappelle, and learn more about their practice.',
        canonicalPath: '/home',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'projects.html': {
        title: 'Projects',
        description: 'Selected digital art, installations, performance, and experimental projects by Brooklyn-based artist Kevin Cunanan Chappelle.',
        canonicalPath: '/projects',
        image: '/img/projects/compiler-buddha/buddha-site-demo.png',
        imageAlt: 'Compiler Buddha by Kevin Cunanan Chappelle'
    },
    'writings.html': {
        title: 'Writings',
        description: 'Poetry and creative writing by Brooklyn-based artist Kevin Cunanan Chappelle.',
        canonicalPath: '/writings',
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT
    },
    'about.html': {
        title: 'About',
        description: 'About Kevin Cunanan Chappelle, a Brooklyn-based artist working across digital, physical, and spiritual spaces.',
        canonicalPath: '/about',
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

function metadataTitle(value) {
    const siteSuffix = ` | ${SITE_NAME}`;
    const title = value.endsWith(siteSuffix)
        ? value.slice(0, -siteSuffix.length)
        : value;
    return title.toLocaleUpperCase('en-US');
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
    const title = metadataTitle(config.title);
    const lines = [
        `    <title>${escapeHtml(title)}</title>`,
        `    <meta name="description" content="${escapeAttribute(config.description)}" />`,
        `    <meta name="author" content="${SITE_NAME}" />`,
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        `    <link rel="canonical" href="${escapeAttribute(canonical)}" />`,
        `    <meta property="og:type" content="${config.ogType || 'website'}" />`,
        `    <meta property="og:site_name" content="${SITE_NAME}" />`,
        `    <meta property="og:title" content="${escapeAttribute(title)}" />`,
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
        `    <meta name="twitter:title" content="${escapeAttribute(title)}" />`,
        `    <meta name="twitter:description" content="${escapeAttribute(config.description)}" />`,
        `    <meta name="twitter:image" content="${escapeAttribute(image)}" />`,
        `    <meta name="twitter:image:alt" content="${escapeAttribute(imageAlt)}" />`
    );

    return generatedBlock('seo', lines.join('\n'), '    ');
}

function renderNav() {
    const nav = `<div class="screen-chrome work-chrome">${renderIdentity()}<nav id="nav" aria-label="primary"><a href="/">k / c / c</a><a href="/projects">(project)s</a><a href="/about">a(bout)</a><a href="https://kvnchpl-thoughts.tumblr.com/">&amp;&amp;&amp;</a></nav></div>`;
    return generatedBlock('nav', nav, '    ');
}

function renderPageHeader(work) {
    const title = metadataTitle(work.displayTitle || work.title);
    const longestWord = Math.max(...title.split(/\s+/).map((word) => word.length));
    const category = field.nodes.get(`${work.type}:${work.key}`).category;
    const heading = `<header class="room-heading" style="--title-length:${longestWord}"><h1 id="main-heading">${escapeHtml(title).replaceAll('\n', '<br>')}</h1><p id="subtitle">${escapeHtml(monthYear(work) || '')} / ${category}</p></header>`;
    return generatedBlock('page-header', `        ${heading}`, '        ');
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
        if ((!image.file && !image.src) || !image.alt?.trim()) throw new Error(`Missing image file or alt text: ${project.key}`);
        if (image.src) {
            if (!image.src.startsWith('/img/')) throw new Error(`Invalid image path: ${project.key}`);
            assertLocalAsset(image.src);
        } else {
            for (const size of ['small', 'medium', 'full']) assertLocalAsset(imageUrl(project.key, image.file, size));
        }
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
        `                        <img src="${escapeAttribute(firstImage.src || imageUrl(project.key, firstImage.file))}"${firstImage.src ? '' : ` srcset="${imageSrcset(project, firstImage.file)}" sizes="(max-width: 600px) 100vw, (max-width: 1280px) 80vw, 60vw"`} alt="${escapeAttribute(firstImage.alt)}" loading="${loading}" decoding="async" />`
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
    const note = project.note?.trim();
    return project.sections
        .map((section, index) => {
            const lines = ['            <section class="project-section">'];

            if (Array.isArray(section.images) && section.images.length) {
                lines.push(renderSlideshow(project, section.images, index));
            }

            if (section.text?.trim() || (index === 0 && note)) {
                const paragraphs = (section.text || '')
                    .split(/\n+/)
                    .map((line) => line.trim())
                    .filter(Boolean);

                lines.push('                <div class="project-copy">');
                if (index === 0 && note && !paragraphs.includes(note)) lines.push(`                    <p class="project-note">${escapeHtml(note)}</p>`);
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
    return firstImage ? firstImage.src || imageUrl(project.key, firstImage.file, 'full') : project.thumbnail || DEFAULT_IMAGE;
}

function removeRuntimeDataMeta(html) {
    return html.replace(/\n\s*<meta name="(?:nav-data|projects-data|writings-data)" content="[^"]*" \/>/g, '');
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
        if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
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
    urls.push('/about');

    const uniqueUrls = [...new Set(urls.map(absoluteUrl))];
    const body = uniqueUrls
        .map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`)
        .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by scripts/build-site.mjs. -->\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const [projects, writings, fieldConfig] = await Promise.all([
    readJson('json/projects.json'),
    readJson('json/writings.json'),
    readJson('json/field.json')
]);
const field = createField(projects, writings, fieldConfig);
assertLocalAsset(field.landing.image);
// About remains authored in its standalone page; the popup shares that copy.
const aboutPage = await readFile(rootPath('about.html'), 'utf8');
const aboutCopy = aboutPage.match(/<p class="contact-text">[\s\S]*?<\/p>/)?.[0];
if (!aboutCopy) throw new Error('Missing about copy');
const aboutPopup = aboutCopy;

const initialSeoPattern = /    <title>[\s\S]*?    <meta name="twitter:image:alt" content="[^"]*" \/>/;
const initialNavPattern = /    <nav id="nav"><\/nav>/;
const initialHeaderPattern = /        <h1 id="main-heading">[\s\S]*?        <h2 id="subtitle">[^<]*<\/h2>/;

for (const [file, config] of Object.entries(pageConfigs)) {
    await updateHtml(file, (original) => {
        const seo = renderSeo(config);
        let html = replaceGeneratedBlock(original, 'seo', seo, initialSeoPattern);
        if (file === 'about.html') {
            html = html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/, `<main class="field-main about-main">${renderAbout(aboutCopy)}</main>`);
            html = html.replace(/<body[^>]*>/, '<body data-page="about" class="field-page">');
            html = html.replace(markerPattern('nav'), '');
        }
        if (['index.html', 'home.html', 'projects.html', 'writings.html'].includes(file)) {
            const filter = file === 'projects.html' ? 'catalog' : file === 'writings.html' ? 'writing' : 'all';
            html = replaceGeneratedBlock(html, 'field', generatedBlock('field', renderField(field, filter, aboutPopup), '        '));
        }
        return removeRuntimeDataMeta(html);
    });
}

for (const project of projects.filter((entry) => !entry.external)) {
    const file = `projects/${project.key}.html`;
    if (!existsSync(rootPath(file))) {
        await writeFile(rootPath(file), workPage('project', project.key));
        changedFiles.add(file);
    }
    const image = projectSocialImage(project);
    assertLocalAsset(image);
    const config = {
        title: project.title,
        description: field.nodes.get(`project:${project.key}`)?.note || project.description,
        canonicalPath: `/projects/${project.key}`,
        image,
        imageAlt: project.socialImageAlt || project.sections.flatMap((section) => section.images || [])[0]?.alt || `${project.title} by ${SITE_NAME}`
    };

    await updateHtml(file, (original) => {
        let html = replaceGeneratedBlock(original, 'seo', renderSeo(config), initialSeoPattern);
        html = html.replace(/<body([^>]*?)>/, (match, attrs) => `<body${attrs.replace(/ data-category="[^"]*"/, '')} data-category="${field.nodes.get(`project:${project.key}`).category}">`);
        html = replaceGeneratedBlock(html, 'nav', renderNav(), initialNavPattern);
        html = replaceGeneratedBlock(html, 'page-header', renderPageHeader(project), initialHeaderPattern);
        html = replaceContainerBlock(html, 'project', 'content-page-container', renderProjectSections(project));
        html = replaceGeneratedBlock(html, 'return', generatedBlock('return', renderWorkReturn(`project:${project.key}`), '        '));
        return removeRuntimeDataMeta(html);
    });
}

for (const writing of writings.filter((entry) => !entry.external)) {
    const file = `writings/${writing.key}.html`;
    const config = {
        title: writing.title,
        description: `${writing.title} is a work of creative writing by Brooklyn-based artist ${SITE_NAME}.`,
        canonicalPath: `/writings/${writing.key}`,
        image: DEFAULT_IMAGE,
        imageAlt: DEFAULT_IMAGE_ALT,
        ogType: 'article',
        publishedTime: publishedDate(writing)
    };

    await updateHtml(file, (original) => {
        let html = replaceGeneratedBlock(original, 'seo', renderSeo(config), initialSeoPattern);
        html = replaceGeneratedBlock(html, 'nav', renderNav(), initialNavPattern);
        html = replaceGeneratedBlock(html, 'page-header', renderPageHeader(writing), initialHeaderPattern);
        html = replaceGeneratedBlock(html, 'return', generatedBlock('return', renderWorkReturn(`writing:${writing.key}`), '        '));
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
const fontsVersion = hash(await readFile(rootPath('css/fonts.css')));
const jsVersion = hash(await readFile(rootPath('js/main.js')));
const fieldCssVersion = hash(await readFile(rootPath('css/field.css')));
const fieldJsVersion = hash(await readFile(rootPath('js/field.js')));

for (const htmlPath of await htmlFiles()) {
    const relativePath = path.relative(ROOT, htmlPath);
    if (relativePath === 'thoughts.html') continue;
    await updateHtml(relativePath, (original) => original
        .replace(/(\/css\/fonts\.css)(?:\?v=[^"']+)?/g, `$1?v=${fontsVersion}`)
        .replace(/(\/css\/main\.css)\?v=[^"']+/g, `$1?v=${cssVersion}`)
        .replace(/(\/js\/main\.js)\?v=[^"']+/g, `$1?v=${jsVersion}`));
    await updateHtml(relativePath, (original) => original
        .replace(/(\/css\/field\.css)(?:\?v=[^"']+)?/g, `$1?v=${fieldCssVersion}`)
        .replace(/(\/js\/field\.js)(?:\?v=[^"']+)?/g, `$1?v=${fieldJsVersion}`));
}

console.log(`Built ${projects.length} projects and ${writings.length} writings.`);
console.log(`${changedFiles.size} file${changedFiles.size === 1 ? '' : 's'} updated.`);
