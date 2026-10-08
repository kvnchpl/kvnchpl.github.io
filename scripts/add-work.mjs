import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createField, categories } from './field.mjs';
import { workPage } from './work-page.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const help = `Add a work without copying page templates or editing the atlas.

node scripts/add-work.mjs project key "Title" [--image FILE --alt "Description"] [--date YYYY-MM-DD]
node scripts/add-work.mjs writing key "Title" --body FILE.txt [--date YYYY-MM-DD]
node scripts/add-work.mjs project|writing key "Title" --url /assets/file.pdf|https://example.com/ [--date YYYY-MM-DD]

--category image|space|interface|writing sets the browsing category.
--tags belief,desire,truth,fire,free is required; choose one or more collection tags.

Then edit the catalog record or writing body, and run:
node scripts/build-site.mjs
node --test scripts/*.test.mjs
node scripts/check-site.mjs
`;

export async function addWork(options, root = ROOT) {
    const {type, key, title, image, alt, body, url} = options;
    if (!['project', 'writing'].includes(type) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key || '') || !title?.trim()) throw new Error('Use project or writing, a lowercase hyphenated key, and a title.');
    if (type === 'writing' && !url && !body) throw new Error('A writing needs --body FILE.txt or --url to a PDF or website.');
    if (type === 'writing' && image) throw new Error('--image is for projects; writings use --body or --url.');
    if (url && body) throw new Error('Use either --body or --url.');
    if (image && !alt?.trim()) throw new Error('An image needs --alt "Description".');
    const date = options.date || new Date().toISOString().slice(0, 10);
    const parsedDate = new Date(`${date}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) throw new Error('Use a valid --date YYYY-MM-DD.');
    const [year, month, day] = date.split('-').map(Number);
    const [projects, writings, config] = await Promise.all(['projects', 'writings', 'field'].map(async (name) => JSON.parse(await readFile(path.join(root, `json/${name}.json`), 'utf8'))));
    const collection = type === 'project' ? projects : writings;
    const page = `${type}s/${key}.html`;
    const mediaDirectory = 'assets';
    if (collection.some((work) => work.key === key) || existsSync(path.join(root, page))) throw new Error(`Already exists: ${key}. Nothing was overwritten.`);
    const category = options.category || (type === 'writing' ? 'writing' : 'image');
    if (!categories.includes(category)) throw new Error(`Use --category ${categories.join(', ')}.`);
    const record = {type, title, key, year, month, day, category};
    if (options.tags !== undefined) record.tags = options.tags.split(',').map((tag) => tag.trim());
    let imageDestination;
    if (image) {
        const extension = path.extname(image).toLowerCase();
        if (!['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif', '.svg'].includes(extension)) throw new Error('Use a WebP, JPEG, PNG, GIF, AVIF, or SVG image.');
        await readFile(image); // Verify all inputs before making changes.
        imageDestination = `${mediaDirectory}/${key}-artwork${extension}`;
        if (existsSync(path.join(root, imageDestination))) throw new Error(`Already exists: ${imageDestination}. Nothing was overwritten.`);
        record.thumbnail = `/${imageDestination}`;
    }
    if (type === 'project') {
        record.description = title;
        record.sections = image ? [{images: [{src: `/${imageDestination}`, alt}]}] : [];
    }
    if (url) {
        if (url.startsWith('/') && !existsSync(path.join(root, url.slice(1)))) throw new Error(`Missing local destination: ${url}`);
        record.external = true;
        record.permalink = url;
    }
    const text = body ? await readFile(body, 'utf8') : '';
    collection.push(record);
    createField(projects, writings, config);
    if (imageDestination) {
        await mkdir(path.join(root, mediaDirectory), {recursive: true});
        await copyFile(image, path.join(root, imageDestination));
    }
    if (!url) {
        await mkdir(path.join(root, `${type}s`), {recursive: true});
        await writeFile(path.join(root, page), workPage(type, key, text), {flag: 'wx'});
    }
    await writeFile(path.join(root, `json/${type}s.json`), JSON.stringify(collection, null, 4) + '\n');
    return {record, page: url ? null : page};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (!args.length || args.includes('--help')) console.log(help);
    else {
        try {
            const [type, key, title, ...flags] = args;
            const options = {type, key, title};
            const allowed = new Set(['image', 'alt', 'body', 'url', 'date', 'category', 'tags']);
            for (let i = 0; i < flags.length; i += 2) {
                const name = flags[i].slice(2);
                if (!flags[i].startsWith('--') || !allowed.has(name) || flags[i + 1] === undefined || Object.hasOwn(options, name)) throw new Error(`Invalid option: ${flags[i]}. See --help.`);
                options[name] = flags[i + 1];
            }
            const result = await addWork(options);
            console.log(`Added ${result.record.type}: ${result.record.key}.`);
            console.log(result.page ? `Edit json/${type}s.json${type === 'writing' ? ` and ${result.page}` : ''}, then run node scripts/build-site.mjs.` : 'Run node scripts/build-site.mjs.');
        } catch (error) {
            console.error(error.message);
            process.exitCode = 1;
        }
    }
}
