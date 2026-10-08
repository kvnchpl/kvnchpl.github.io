import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createField, renderField, renderWorkReturn, palette, categories, categoryLabel, formatWorkDate, navCodes } from './field.mjs';

const read = async (name) => JSON.parse(await readFile(new URL(`../json/${name}.json`, import.meta.url), 'utf8'));
const [projects, writings, config] = await Promise.all(['projects', 'writings', 'field'].map(read));
const field = createField(projects, writings, config);

test('navigation codes use only the allowed symbols and are unique for every label', () => {
    const codes = Object.values(navCodes);
    const allowed = new Set('[]*!+?:=>');
    for (const code of codes) {
        assert.equal(code.length, 3);
        assert.ok([...code].every((symbol) => allowed.has(symbol)), code);
    }
    assert.equal(new Set(codes).size, codes.length);
});

test('every work links directly from the atlas, including PDF and external destinations', () => {
    const html = renderField(field);
    assert.ok(!html.includes('data-index-node'));
    assert.ok(!html.includes('field-mark'));
    assert.ok(!html.includes('map-text-number'));
    assert.ok(!html.includes('index-number'));
    assert.equal((html.match(/data-map-node=/g) || []).length, projects.length + writings.length);
    for (const node of field.nodes.values()) {
        assert.ok(html.includes(`id="${node.anchor}" data-map-node="${node.anchor}" href="${node.href}"`));
        assert.ok(renderWorkReturn(node.id).includes(node.anchor));
    }
    assert.ok(!html.includes('data-field-preview'));
    assert.ok(!html.includes('data-field-popup'));
    assert.ok(!html.includes('passages'));
    assert.ok(!html.includes('data-map-edge'));
    assert.equal((html.match(/<dialog/g) || []).length, 2); // Catalog and about only.
});
test('all four categories appear in the unified catalog, including the writing collection', () => {
    assert.deepEqual(categories, ['image', 'space', 'interface', 'writing']);
    for (const category of categories) {
        assert.ok([...field.nodes.values()].some((node) => node.category === category));
        assert.ok(renderField(field).includes(`data-category-filter="${category}"`));
    }
    const html = renderField(field, 'writing');
    assert.match(html, /data-default-view="atlas" data-default-category="writing"/);
    assert.equal((html.match(/data-map-node=/g) || []).length, field.nodes.size);
});
test('a growing catalog needs no manual map records and keeps stable identities and categories', () => {
    const additions = Array.from({length: 101}, (_, i) => ({type: 'project', key: `future-${i}`, title: `future ${i}`, year: 2027, sections: []}));
    const expanded = createField([...projects, ...additions], writings, config);
    const html = renderField(expanded);
    assert.equal((html.match(/data-map-node=/g) || []).length, field.nodes.size + additions.length);
    for (const node of field.nodes.values()) {
        assert.equal(expanded.nodes.get(node.id).anchor, node.anchor);
        assert.equal(expanded.nodes.get(node.id).category, node.category);
    }
    assert.equal(new Set([...expanded.nodes.values()].map((node) => node.anchor)).size, expanded.nodes.size);
});
test('invalid content fails validation', () => {
    for (const changes of [
        {key: '../escape'}, {title: ''}, {category: 'unknown'}, {displayTitle: ''}, {note: 1},
        {permalink: 'javascript:alert(1)'}, {permalink: '//example.com'}, {external: true, permalink: undefined}
    ]) {
        assert.throws(() => createField([{...projects[0], ...changes}], [], {}));
    }
    assert.throws(() => createField([projects[0], projects[0]], [], {}));
    assert.throws(() => createField(projects, writings, {landing: {work: 'missing'}}));
});
test('palette contains exactly the eight requested colors', () => {
    assert.deepEqual(palette.map(([name]) => name), ['black', 'white', 'red', 'green', 'blue', 'cyan', 'magenta', 'yellow']);
    assert.ok(palette.every(([, color]) => /^#(?:00|ff){3}$/.test(color)));
});
test('titles and destinations are escaped', () => {
    const html = renderField(createField([{...projects[0], title: '<script>"test"</script>'}], [], {}));
    assert.ok(html.includes('&lt;script&gt;&quot;test&quot;&lt;/script&gt;'));
    assert.ok(!html.includes('<script>"test"</script>'));
});

test('catalog dates use the same year.month notation as work pages', () => {
    assert.equal(formatWorkDate({year: 2025, month: 5}), '2025.05');
    assert.equal(formatWorkDate({year: 2024, month: 12}), '2024.12');
    assert.equal(formatWorkDate({year: 2027}), '2027');
    assert.equal(formatWorkDate({}), 'undated');
    const html = renderField(field);
    for (const node of field.nodes.values()) {
        assert.match(formatWorkDate(node), /^\d{4}\.\d{2}$/);
        assert.ok(html.includes(`${categoryLabel(node.category)} / ${formatWorkDate(node)}`));
    }
});
test('atlas color artifacts belong to the screen and each composition has its own palette', () => {
    const html = renderField(field);
    assert.ok(!html.includes('map-block'));
    assert.equal((html.match(/class="atlas-artifacts"/g) || []).length, 1);
    assert.equal((html.match(/data-color-composition/g) || []).length, 2);
    assert.equal((html.match(/class="color-palette"/g) || []).length, 2);
    assert.equal((html.match(/data-color="/g) || []).length, 16);
});
