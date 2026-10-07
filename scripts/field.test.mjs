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
    assert.equal((html.match(/data-map-node=/g) || []).length, field.nodes.size);
    assert.equal((html.match(/data-map-edge=/g) || []).length, config.connections.length);
    for (const node of field.nodes.values()) {
        assert.ok(html.includes(`id="${node.anchor}"`));
        assert.ok(html.includes(`href="${node.href}"`));
        assert.ok(renderWorkPassages(field, node.id).includes(node.anchor));
        assert.ok(html.includes(`style="left:${node.position[0]}%;top:${node.position[1]}%;--node-size:${node.size}px;--node-tilt:${node.tilt}deg"`));
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
        (c) => { c.nodes[0].position = [101, 50]; },
        (c) => { c.nodes[0].position = ['50', 50]; },
        (c) => { delete c.nodes[0].position; },
        (c) => { c.nodes[0].size = 500; },
        (c) => { c.nodes[0].size = '120'; },
        (c) => { c.nodes[0].tilt = 90; },
        (c) => { c.nodes[0].echo = 'yes'; },
        (c) => { c.nodes[0].accountSections = [999]; },
        (c) => { c.start = 'missing'; },
        (c) => { c.inscription = 'missing'; },
        (c) => { c.inscription = c.start; },
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
test('map lines connect the authored positions and carry both endpoint identities', () => {
    const html = renderField(field);
    for (const edge of config.connections) {
        const a = field.nodes.get(edge.from);
        const b = field.nodes.get(edge.to);
        assert.ok(html.includes(`data-map-edge="${a.anchor} ${b.anchor}" x1="${a.position[0]}%" y1="${a.position[1]}%" x2="${b.position[0]}%" y2="${b.position[1]}%"`));
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
