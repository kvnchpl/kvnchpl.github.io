import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {projects} = JSON.parse(await readFile(path.join(root, 'project-migrations.json'), 'utf8'));
const errors = [];
const excluded = new Set(['netlify', 'scripts', 'tests', 'node_modules', 'dist']);
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (entry.name.startsWith('.') || excluded.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else files.push(full);
  }
  return files;
}
function checkReference(value, base, source) {
  if (!value || /^(?:data:|blob:|mailto:|javascript:|tel:|#)/i.test(value) || value.includes('${')) return;
  const url = new URL(value.replaceAll('&amp;', '&'), base);
  if (url.origin !== 'https://kvnchpl.com') return;
  const file = path.join(root, decodeURIComponent(url.pathname));
  const candidates = url.pathname.endsWith('/') ? [path.join(file, 'index.html')] : [file, `${file}.html`, path.join(file, 'index.html')];
  if (!candidates.some(existsSync)) errors.push(`${source}: missing ${url.pathname}`);
}
let count = 0;
const index = await readFile(path.join(root, 'index.html'), 'utf8');
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
const nav = await readFile(path.join(root, 'json/nav.json'), 'utf8');
for (const project of projects) {
  assert.ok(existsSync(path.join(root, project.directory, 'index.html')), `${project.directory}: missing entry point`);
  if (project.visibility === 'unlisted') {
    for (const [source, content] of [['index.html', index], ['sitemap.xml', sitemap], ['json/nav.json', nav]]) {
      if (content.includes(`/${project.directory}/`)) errors.push(`${source}: lists unfinished ${project.directory}`);
    }
  }
  for (const file of await walk(path.join(root, project.directory))) {
    const source = path.relative(root, file);
    if (!/\.(?:html|css|js)$/.test(file) || /(?:\.min\.js|\.framework\.js|\.loader\.js|vendor\/)/.test(source)) continue;
    const content = await readFile(file, 'utf8');
    const url = new URL(source, 'https://kvnchpl.com/');
    if (file.endsWith('.html')) {
      count++;
      if (project.visibility === 'unlisted' && !/<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(content)) errors.push(`${source}: missing noindex`);
      const base = new URL(content.match(/<base\s+href=["']([^"']+)/i)?.[1] || url.href, url);
      for (const match of content.matchAll(/(?:src|href|poster)\s*=\s*["']([^"']*)["']/g)) checkReference(match[1], base, source);
    } else if (file.endsWith('.css')) {
      for (const match of content.matchAll(/url\(\s*["']?([^\s"')]+)/g)) checkReference(match[1], url, source);
    } else {
      for (const match of content.matchAll(/(?:from\s*|import\s*)["'](\.[^"']+)["']/g)) checkReference(match[1], url, source);
      // fetch paths resolve against the document, not the JavaScript module.
      for (const match of content.matchAll(/fetch\(\s*["']([^"']+)["']/g)) checkReference(match[1], new URL(`/${project.directory}/`, url), source);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log(`Checked ${projects.length} projects and ${count} HTML pages: local links, assets, and unlisted visibility are valid.`);
