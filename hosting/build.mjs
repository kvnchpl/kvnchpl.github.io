// Package existing public files for Netlify; never render or edit source pages.
import {copyFile, lstat, mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises';
import {matchesGlob, resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {legacyPages, normalizeSiteUrl} from '../js/navigation.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const publishDirectory = resolve(root, '.netlify/portfolio');
const publicFolders = new Set(['0', 'a', 'css', 'js', 'json', 'specter', 'jungle', 'each-all', 'exp', 'trellis', 'desire-path', 'ephemeris', 'homestuck-book-club']);
const publicRootFiles = new Set(['index.html', '404.html', 'favicon.ico', 'robots.txt', 'sitemap.xml']);

// _config.yml deliberately uses only an exclude list of scalar path patterns.
// Fail closed if that format changes, rather than silently widening publication.
export function readExclusions(config) {
    const exclusions = [];
    let inList = false;
    for (const line of config.split(/\r?\n/)) {
        if (!line.trim() || line.trimStart().startsWith('#')) continue;
        if (line === 'exclude:' && !inList) { inList = true; continue; }
        const match = inList && line.match(/^  - (?:"([^"\\]*)"|'([^']*)'|([A-Za-z0-9_./*-]+))\s*$/);
        if (!match) throw new Error(`Unsupported publishing configuration: ${line}`);
        exclusions.push(match[1] ?? match[2] ?? match[3]);
    }
    if (!exclusions.length) throw new Error('Missing publishing exclusions');
    return exclusions;
}

export function isPublicFile(file, exclusions) {
    const parts = file.split('/');
    if (parts.some(part => part.startsWith('.') || part === '..')) return false;
    if (!(publicRootFiles.has(file) || (parts.length > 1 && publicFolders.has(parts[0])))) return false;
    return !parts.some((_, index) => {
        const ancestor = parts.slice(0, index + 1).join('/');
        return exclusions.some(pattern => matchesGlob(ancestor, pattern)
            || (!pattern.includes('/') && matchesGlob(parts[index], pattern)));
    });
}

export function redirectRules(works, mediaNames) {
    // _redirects runs before netlify.toml: canonical hosts must precede rewrites.
    const lines = [
        '# Canonical hosts must precede the extensionless work rewrites.',
        'https://kvnchpl-portfolio.netlify.app/* https://kvnchpl.com/:splat 301!',
        'https://kvnchpl-portfolio-preview.netlify.app/* https://kvnchpl.com/:splat 301!',
        'https://www.kvnchpl.com/* https://kvnchpl.com/:splat 301!',
        '', '# HTTP migration redirects. Sources: js/navigation.js, js/redirect.js, a/.'
    ];
    const add = (from, to, query = '') => lines.push(`${from}${query ? ` ${query}` : ''} ${to} 301!`);
    // Match supported filter combinations before each page's general rule.
    // Netlify matches query parameters independently of their order.
    const categories = ['image', 'images', 'spaces', 'space', 'interfaces', 'interface', 'writing'];
    const tags = ['belief', 'desire', 'truth', 'fire', 'free'];
    for (const page of Object.keys(legacyPages)) {
        for (const from of [`/${page}`, `/${page.replace(/\.html$/, '')}`]) {
            const collection = /\/(?:projects|writings)(?:\.html)?$/.test(from);
            const queries = collection ? [
                ...categories.flatMap(category => tags.map(tag => new URLSearchParams({category, tag}))),
                ...categories.map(category => new URLSearchParams({category})),
                ...tags.map(tag => new URLSearchParams({tag}))
            ] : [];
            for (const query of [...queries, new URLSearchParams()]) {
                const target = normalizeSiteUrl(`https://kvnchpl.com${from}?${query}`);
                add(from, target.pathname + target.search, [...query].map(([key, value]) => `${key}=${value}`).join(' '));
            }
        }
    }
    for (const [from, to] of Object.entries(works)) {
        if (!/^\/(?:projects|writings)\/[a-z0-9-]+$/.test(from) || !/^\/0\/[a-z0-9-]+$/.test(to)) throw new Error('Invalid legacy work mapping');
        add(from, to);
        add(`${from}.html`, to);
    }
    // Only known files get aliases. Removed reading PDFs continue to return 404.
    for (const name of mediaNames.sort()) {
        if (!/^[A-Za-z0-9_.-]+$/.test(name)) throw new Error(`Unsupported media filename: ${name}`);
        add(`/assets/${name}`, `/a/${name}`);
        if (name.endsWith('.pdf')) add(`/pdf/${name}`, `/a/${name}`);
    }
    lines.push('', '# Serve extensionless work URLs without changing the address.');
    for (const to of new Set(Object.values(works))) lines.push(`${to} ${to}.html 200`);
    return `${lines.join('\n')}\n`;
}

export function headerRules(environment = process.env) {
    const lines = [];
    const isProduction = environment.CONTEXT === 'production' && environment.URL?.replace(/\/$/, '') === 'https://kvnchpl.com';
    if (!isProduction) lines.push('/*', '  X-Robots-Tag: noindex, nofollow', '');
    for (const folder of ['exp', 'trellis', 'desire-path', 'ephemeris']) {
        lines.push(`/${folder}`, '  X-Robots-Tag: noindex, nofollow', '', `/${folder}/*`, '  X-Robots-Tag: noindex, nofollow', '');
    }
    return `${lines.join('\n')}\n`;
}

// Netlify's static redirect matcher normalizes trailing slashes. A small edge
// redirect preserves directory-relative links without altering any HTML files.
export function bookClubDirectoryRedirect(files) {
    const paths = files.filter(file => file.startsWith('homestuck-book-club/') && file.endsWith('/index.html'))
        .map(file => `/${file.slice(0, -11)}`).sort();
    if (!paths.includes('/homestuck-book-club')) throw new Error('Missing book-club entry point');
    return `// Generated from the published book-club directory indexes. No content proxy.\nconst directories = new Set(${JSON.stringify(paths)});\nexport default function handler(request) {\n    const url = new URL(request.url);\n    if (!['GET', 'HEAD'].includes(request.method) || !directories.has(url.pathname)) return;\n    url.pathname += '/';\n    return new Response(null, {status: 301, headers: {Location: url.href}});\n}\nexport const config = {path: [...directories]};\n`;
}

export async function buildPortfolio() {
    const exclusions = readExclusions(await readFile(resolve(root, '_config.yml'), 'utf8'));
    const redirectSource = await readFile(resolve(root, 'js/redirect.js'), 'utf8');
    const match = redirectSource.match(/^const legacyWorks = (\{[^\n]+\});$/m);
    if (!match) throw new Error('Missing generated legacy work map in js/redirect.js');
    const works = JSON.parse(match[1]);
    const files = [];
    async function collect(directory = '') {
        for (const entry of await readdir(resolve(root, directory), {withFileTypes: true})) {
            const file = directory ? `${directory}/${entry.name}` : entry.name;
            if (entry.name.startsWith('.')) continue;
            if (entry.isDirectory()) {
                if (publicFolders.has(file) || (directory && isPublicFile(`${file}/placeholder`, exclusions))) await collect(file);
            } else if (isPublicFile(file, exclusions)) {
                if (!entry.isFile()) throw new Error(`Refusing non-file publishing input: ${file}`);
                files.push(file);
            }
        }
    }
    await collect();
    for (const to of Object.values(works)) {
        if (!files.includes(`${to.slice(1)}.html`)) throw new Error(`Missing redirect destination: ${to}`);
    }
    const mediaNames = files.filter(file => /^a\/[^/]+$/.test(file)).map(file => file.slice(2));
    const staging = `${publishDirectory}-staging`;
    if ((await lstat(staging).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)))?.isSymbolicLink()) throw new Error('Refusing linked staging directory');
    await rm(staging, {recursive: true, force: true});
    await mkdir(staging, {recursive: true});
    for (const file of files) {
        const destination = resolve(staging, file);
        await mkdir(dirname(destination), {recursive: true});
        await copyFile(resolve(root, file), destination);
    }
    await writeFile(resolve(staging, '_redirects'), redirectRules(works, mediaNames));
    await writeFile(resolve(staging, '_headers'), headerRules());
    const edgeDirectory = resolve(root, '.netlify/portfolio-edge-functions');
    if ((await lstat(edgeDirectory).catch(error => error.code === 'ENOENT' ? null : Promise.reject(error)))?.isSymbolicLink()) throw new Error('Refusing linked edge directory');
    await mkdir(edgeDirectory, {recursive: true});
    await writeFile(resolve(edgeDirectory, 'book-club-slashes.js'), bookClubDirectoryRedirect(files));
    await rm(publishDirectory, {recursive: true, force: true});
    await rename(staging, publishDirectory);
    console.log(`Packaged ${files.length} public files and ${Object.keys(works).length} legacy work destinations in .netlify/portfolio.`);
    console.log('Source pages and media were copied without modification. Preview hosts are marked noindex.');
    return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await buildPortfolio();
