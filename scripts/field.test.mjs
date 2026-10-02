import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createField, renderField, renderWorkPassages } from './field.mjs';

const read = async (name) => JSON.parse(await readFile(new URL(`../json/${name}.json`, import.meta.url), 'utf8'));
const [projects, writings, config] = await Promise.all(['projects', 'writings', 'field'].map(read));
const field = createField(projects, writings, config);

test('every catalog entry is reachable in both views, including PDF and external destinations', () => {
    const html = renderField(field);
    assert.equal(field.nodes.size, projects.length + writings.length);
    assert.equal((html.match(/data-field-node=/g) || []).length, field.nodes.size);
    assert.equal((html.match(/data-index-node=/g) || []).length, field.nodes.size);
    for (const node of field.nodes.values()) {
        assert.ok(html.includes(`id="${node.anchor}"`));
        assert.ok(html.includes(`href="${node.href}"`));
        assert.ok(renderWorkPassages(field, node.id).includes(node.anchor));
    }
});
test('filtered indexes preserve passages to the full field', () => {
    for (const [type, count] of [['project', projects.length], ['writing', writings.length]]) {
        const html = renderField(field, type);
        assert.equal((html.match(/data-index-node=/g) || []).length, count);
        assert.equal((html.match(/data-field-node=/g) || []).length, field.nodes.size);
    }
});
test('invalid relationship data fails before any generated HTML is written', () => {
    for (const mutate of [
        (c) => c.nodes.pop(),
        (c) => c.nodes.push(c.nodes[0]),
        (c) => { c.nodes[0].mark = 'unknown'; },
        (c) => { c.nodes[0].accountSections = [999]; },
        (c) => { c.start = 'missing'; },
        (c) => { c.connections[0].to = 'missing'; },
        (c) => { c.connections[0].to = c.connections[0].from; },
        (c) => c.connections.push({...c.connections[0], from: c.connections[0].to, to: c.connections[0].from}),
        (c) => { c.connections[0].phrase = ''; }
    ]) {
        const broken = structuredClone(config);
        mutate(broken);
        assert.throws(() => createField(projects, writings, broken));
    }
});
test('authored copy is escaped, and missing notes need no placeholder caption', () => {
    const changed = structuredClone(config);
    changed.nodes[0].note = '<script>"test"</script>';
    const html = renderField(createField(projects, writings, changed));
    assert.ok(html.includes('&lt;script&gt;&quot;test&quot;&lt;/script&gt;'));
    assert.ok(!html.includes('<script>"test"</script>'));
    assert.equal(field.nodes.get('project:triptych').note, undefined);
});
