import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const localOnly = new Set(['node_modules', 'artifacts', 'qa', 'test-results', 'playwright-report', 'coverage', 'private', 'vendor']);

function hash(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 10);
}

async function filesIn(directory = ROOT) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name.startsWith('_') || localOnly.has(entry.name)) continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            if (path.relative(ROOT, fullPath).split(path.sep).length > 1) errors.push(`${path.relative(ROOT, fullPath)}: nested source folders are not allowed`);
            files.push(...await filesIn(fullPath));
        }
        if (entry.isFile()) files.push(fullPath);
    }

    return files;
}

const allFiles = await filesIn();
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
function checkReference(url, source) {
    if (!url.startsWith('/') || url === '/' || url.startsWith('//')) return;
    const pathname = url.split(/[?#]/)[0];
    if (/^\/(?:img|vid|pdf|fonts)\//.test(pathname)) errors.push(`${source}: outdated media path ${pathname}`);
    const localPath = pathname.slice(1);
    const candidates = [path.join(ROOT, localPath), path.join(ROOT, `${localPath}.html`), path.join(ROOT, localPath, 'index.html')];
    if (!candidates.some(existsSync)) errors.push(`${source}: missing ${pathname}`);
}
for (const file of allFiles) {
    const relativePath = path.relative(ROOT, file);
    if (relativePath.split(path.sep).length > 2) errors.push(`${relativePath}: files must be at the root or in one top-level folder`);
    if (file.endsWith('.css')) {
        const css = await readFile(file, 'utf8');
        for (const match of css.matchAll(/url\(\s*["']?(\/[^\s"')]+)/g)) checkReference(match[1], relativePath);
    }
    if (file.endsWith('.js')) {
        const js = await readFile(file, 'utf8');
        for (const match of js.matchAll(/["'](\/assets\/[^"']+)["']/g)) checkReference(match[1], relativePath);
    }
}
function checkCatalog(value, source) {
    if (typeof value === 'string' && value.startsWith('/')) checkReference(value, source);
    else if (Array.isArray(value)) value.forEach((item) => checkCatalog(item, source));
    else if (value && typeof value === 'object') Object.values(value).forEach((item) => checkCatalog(item, source));
}
for (const name of ['projects', 'writings', 'field']) checkCatalog(JSON.parse(await readFile(path.join(ROOT, `json/${name}.json`), 'utf8')), `json/${name}.json`);
const versions = new Map([
    ['/css/fonts.css', hash(await readFile(path.join(ROOT, 'css/fonts.css')))],
    ['/css/main.css', hash(await readFile(path.join(ROOT, 'css/main.css')))],
    ['/js/main.js', hash(await readFile(path.join(ROOT, 'js/main.js')))],
    ['/css/field.css', hash(await readFile(path.join(ROOT, 'css/field.css')))],
    ['/js/field.js', hash(await readFile(path.join(ROOT, 'js/field.js')))]
]);

for (const file of htmlFiles) {
    const relativePath = path.relative(ROOT, file);
    const html = await readFile(file, 'utf8');

    const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1].trim();
    if (!title) {
        errors.push(`${relativePath}: missing title`);
    } else {
        if (title.includes(' | Kevin Cunanan Chappelle')) {
            errors.push(`${relativePath}: title includes the site-name affix`);
        }
        const visibleTitle = title.replaceAll(/&[^;]+;/g, '');
        if (!title.includes('{') && visibleTitle !== visibleTitle.toLocaleUpperCase('en-US')) {
            errors.push(`${relativePath}: title is not uppercase`);
        }
    }

    if (relativePath === 'thoughts.html') continue;

    for (const [asset, expectedVersion] of versions) {
        if (!html.includes(asset)) continue;
        if (!html.includes(`${asset}?v=${expectedVersion}`)) {
            errors.push(`${relativePath}: stale or missing version for ${asset}`);
        }
    }

    for (const match of html.matchAll(/(?:src|href|poster)=["'](\/[^"'#? ]+)/g)) {
        checkReference(match[1], relativePath);
    }
    for (const match of html.matchAll(/srcset=["']([^"']+)["']/g)) {
        for (const candidate of match[1].split(',')) checkReference(candidate.trim().split(/\s+/)[0], relativePath);
    }
    for (const match of html.matchAll(/https:\/\/kvnchpl\.com(\/assets\/[^"'<>\s]+)/g)) checkReference(match[1], relativePath);
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Checked ${htmlFiles.length} HTML files; local references and asset versions are valid. Folder depth, responsive images, fonts, runtime assets, and catalog paths are valid.`);
}
