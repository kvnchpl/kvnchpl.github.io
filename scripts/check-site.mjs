import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

function hash(value) {
    return createHash('sha256').update(value).digest('hex').slice(0, 10);
}

async function filesIn(directory = ROOT) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name === '.git' || entry.name === '_site') continue;
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await filesIn(fullPath));
        if (entry.isFile()) files.push(fullPath);
    }

    return files;
}

const allFiles = await filesIn();
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
const versions = new Map([
    ['/css/fonts.css', hash(await readFile(path.join(ROOT, 'css/fonts.css')))],
    ['/css/main.css', hash(await readFile(path.join(ROOT, 'css/main.css')))],
    ['/js/main.js', hash(await readFile(path.join(ROOT, 'js/main.js')))]
]);

for (const file of htmlFiles) {
    const relativePath = path.relative(ROOT, file);
    const html = await readFile(file, 'utf8');

    for (const [asset, expectedVersion] of versions) {
        if (!html.includes(asset)) continue;
        if (!html.includes(`${asset}?v=${expectedVersion}`)) {
            errors.push(`${relativePath}: stale or missing version for ${asset}`);
        }
    }

    if (relativePath === 'thoughts.html') continue;

    for (const match of html.matchAll(/(?:src|href|poster)=["'](\/[^"'#? ]+)/g)) {
        const url = match[1];
        if (url === '/' || url.startsWith('//')) continue;

        const localPath = url.slice(1);
        const candidates = [
            path.join(ROOT, localPath),
            path.join(ROOT, `${localPath}.html`),
            path.join(ROOT, localPath, 'index.html')
        ];

        if (!candidates.some(existsSync)) errors.push(`${relativePath}: missing ${url}`);
    }
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Checked ${htmlFiles.length} HTML files; local references and asset versions are valid.`);
}
