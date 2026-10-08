import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, symlink, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { addWork } from './add-work.mjs';

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('new categorized works build into the atlas and pages with visible copy and preserved poetry', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'kvn-content-workflow-'));
    await Promise.all(['json', 'scripts', 'css', 'js', 'assets', 'projects', 'writings'].map((dir) => mkdir(path.join(root, dir))));
    for (const dir of ['scripts', 'css', 'js']) {
        for (const file of await readdir(path.join(source, dir))) await copyFile(path.join(source, dir, file), path.join(root, dir, file));
    }
    for (const name of ['index.html', 'home.html', 'projects.html', 'writings.html', 'about.html', 'sitemap.xml', 'favicon.ico']) await copyFile(path.join(source, name), path.join(root, name));
    await copyFile(path.join(source, 'json/nav.json'), path.join(root, 'json/nav.json'));
    // These metadata and profile assets remain read-only; no fixture writes reach the repository.
    for (const file of await readdir(path.join(source, 'assets'))) {
        await symlink(path.join(source, 'assets', file), path.join(root, 'assets', file));
    }
    await Promise.all(['projects', 'writings'].map((name) => writeFile(path.join(root, `json/${name}.json`), '[]\n')));
    await writeFile(path.join(root, 'json/field.json'), '{}\n');
    const text = 'a line with <angles> & symbols\nKEEP This Casing\n  and this indentation.\n';
    const bodyFile = path.join(root, 'poem.txt');
    await writeFile(bodyFile, text);
    const inputImage = path.join(source, 'assets/triptych_1--small.webp');
    await writeFile(path.join(root, 'assets/occupied-artwork.webp'), 'existing asset');
    await assert.rejects(addWork({type: 'project', key: 'occupied', title: 'occupied', tags: 'free', image: inputImage, alt: 'image'}, root), /Already exists/);
    assert.equal(await readFile(path.join(root, 'assets/occupied-artwork.webp'), 'utf8'), 'existing asset');
    await addWork({type: 'project', key: 'future-project', title: 'future project', date: '2026-10-07', category: 'space', tags: 'belief,free', image: inputImage, alt: 'a new image'}, root);
    await addWork({type: 'writing', key: 'future-writing', title: 'future writing', date: '2026-10-07', tags: 'truth', body: bodyFile}, root);
    const projectRecord = JSON.parse(await readFile(path.join(root, 'json/projects.json'), 'utf8'));
    projectRecord[0].note = 'A legacy project note that should not appear.';
    projectRecord[0].sections[0].text = 'The entire description.\nA second paragraph with <angles>.';
    await writeFile(path.join(root, 'json/projects.json'), JSON.stringify(projectRecord));
    const jsonBefore = await readFile(path.join(root, 'json/projects.json'), 'utf8');
    await assert.rejects(addWork({type: 'project', key: 'future-project', title: 'overwrite'}, root), /Already exists/);
    await assert.rejects(addWork({type: 'writing', key: 'missing-body', title: 'missing body'}, root), /needs --body/);
    await assert.rejects(addWork({type: 'project', key: 'bad-date', title: 'bad date', date: '2026-02-30'}, root), /valid --date/);
    await assert.rejects(addWork({type: 'project', key: 'invalid-category', title: 'invalid category', category: 'unknown'}, root), /--category/);
    await assert.rejects(addWork({type: 'project', key: 'invalid-tags', title: 'invalid tags', tags: 'unknown'}, root), /Invalid tags/);
    await assert.rejects(addWork({type: 'writing', key: 'untagged-writing', title: 'untagged writing', body: bodyFile}, root), /Assign at least one/);
    assert.equal(await readFile(path.join(root, 'json/projects.json'), 'utf8'), jsonBefore);
    const run = (script) => execFileSync(process.execPath, [path.join(root, 'scripts', script)], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});
    assert.match(run('build-site.mjs'), /Built 1 projects and 1 writings/);
    const project = await readFile(path.join(root, 'projects/future-project.html'), 'utf8');
    const writing = await readFile(path.join(root, 'writings/future-writing.html'), 'utf8');
    const home = await readFile(path.join(root, 'home.html'), 'utf8');
    assert.match(project, /data-category="space"/);
    assert.match(project, /<p id="subtitle">2026\.10<\/p>/);
    assert.ok(!project.includes('project-note'));
    assert.ok(!project.includes(projectRecord[0].note));
    assert.ok(!project.includes('data-tags'));
    assert.ok(!project.includes('#belief'));
    assert.match(project, /<p>The entire description.<\/p>/);
    assert.match(project, /<p>A second paragraph with &lt;angles&gt;.<\/p>/);
    assert.ok(!project.includes('<details'));
    assert.match(project, /src="\/assets\/future-project-artwork.webp"/);
    assert.deepEqual(await readFile(path.join(root, 'assets/future-project-artwork.webp')), await readFile(inputImage));
    assert.ok((await readdir(path.join(root, 'assets'), {withFileTypes: true})).every((entry) => !entry.isDirectory()));
    assert.match(writing, /<p id="subtitle">2026\.10<\/p>/);
    assert.match(writing, /a line with &lt;angles&gt; &amp; symbols\nKEEP This Casing\n  and this indentation./);
    assert.match(home, /data-map-node="work-project-future-project" href="\/projects\/future-project"/);
    assert.match(home, /data-category="space" data-tags="belief free"/);
    assert.match(home, /data-map-node="work-writing-future-writing" href="\/writings\/future-writing"/);
    assert.ok(!home.includes('data-field-popup'));
    assert.match(await readFile(path.join(root, 'sitemap.xml'), 'utf8'), /\/writings\/future-writing/);
    assert.match(run('build-site.mjs'), /0 files updated/);
    assert.match(run('check-site.mjs'), /references and asset versions are valid/);
    // The validator must catch paths that the visible first gallery frame does not request.
    await writeFile(path.join(root, 'projects/future-project.html'), project.replace('src="/assets/future-project-artwork.webp"', 'src="/assets/future-project-artwork.webp" srcset="/assets/missing.webp 600w"'));
    assert.throws(() => run('check-site.mjs'), /missing \/assets\/missing.webp/);
    await writeFile(path.join(root, 'projects/future-project.html'), project);
    await mkdir(path.join(root, 'assets/nested'));
    assert.throws(() => run('check-site.mjs'), /nested source folders/);
});
