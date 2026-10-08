import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../js/field.js', import.meta.url), 'utf8');

function collection(url) {
    const element = (dataset = {}) => ({
        dataset, attributes: {},
        setAttribute(key, value) {this.attributes[key] = value;},
        addEventListener(name, handler) {this[name] = handler;},
        matches(selectors) {
            return selectors.split(',').some((selector) => ({
                '[data-category-filter]': 'categoryFilter', '[data-tag-filter]': 'tagFilter',
                '[data-atlas-open]': 'atlasOpen', '[data-about-open]': 'aboutOpen'
            })[selector.trim()] in this.dataset);
        }
    });
    const categories = ['all', 'image', 'space', 'interface', 'writing'].map((categoryFilter) => element({categoryFilter}));
    const tags = ['belief', 'desire', 'truth', 'fire', 'free'].map((tagFilter) => element({tagFilter}));
    const nodes = [
        {id: 'image-desire', dataset: {category: 'image', tags: 'desire'}},
        {id: 'image-belief', dataset: {category: 'image', tags: 'belief truth'}},
        {id: 'space-truth', dataset: {category: 'space', tags: 'truth'}},
        {id: 'writing-belief', dataset: {category: 'writing', tags: 'belief'}},
        {id: 'untagged', dataset: {category: 'image', tags: ''}}
    ];
    const dialog = () => ({...element(), open: false, scrollTop: 10,
        showModal() {this.open = true;}, close() {this.open = false;},
        querySelector() {return this.control;}, control: element()
    });
    const browser = dialog();
    const about = dialog();
    const announcement = {};
    const atlas = element({atlasOpen: ''});
    const shell = {...element({defaultView: 'atlas', defaultCategory: 'all'}),
        querySelector(selector) {return {'[data-field-browser]': browser, '[data-about-popup]': about, '[data-field-announcement]': announcement}[selector];},
        querySelectorAll(selector) {return {'[data-map-node]': nodes, '[data-category-filter]': categories, '[data-tag-filter]': tags, '[data-color-composition]': [], '[data-about-open], [data-atlas-open]': [atlas]}[selector];}
    };
    const location = {href: url};
    const window = element();
    vm.runInNewContext(source, {
        URL, location, window, HTMLDialogElement: function () {},
        document: {querySelector() {return shell;}, documentElement: {classList: {toggle() {}}}},
        history: {replaceState(_state, _title, next) {location.href = String(next);}, pushState(_state, _title, next) {location.href = String(next);}}
    });
    function click(link, modifiers = {}) {
        let prevented = false;
        shell.click({button: 0, target: {closest() {return link;}}, preventDefault() {prevented = true;}, ...modifiers});
        return prevented;
    }
    return {categories, tags, nodes, location, window, browser, announcement, atlas, click, visible: () => nodes.filter((node) => !node.hidden).map((node) => node.id)};
}

test('category and tag filters combine, clear, preserve link destinations, and restore through history', () => {
    const page = collection('http://localhost/projects?category=image&tag=desire');
    const tag = (name) => page.tags.find((link) => link.dataset.tagFilter === name);
    const category = (name) => page.categories.find((link) => link.dataset.categoryFilter === name);
    assert.deepEqual(page.visible(), ['image-desire']);
    assert.equal(tag('desire').attributes['aria-current'], 'page');
    page.click(tag('truth'));
    assert.deepEqual(page.visible(), ['image-belief']);
    assert.equal(new URL(category('space').href).searchParams.get('tag'), 'truth');
    assert.equal(page.click(category('space'), {ctrlKey: true}), false);
    assert.deepEqual(page.visible(), ['image-belief']);
    page.click(category('space'));
    assert.deepEqual(page.visible(), ['space-truth']);
    assert.equal(new URL(tag('belief').href).searchParams.get('category'), 'space');
    assert.equal(new URL(tag('truth').href).searchParams.has('tag'), false);
    const filteredUrl = page.location.href;
    page.click(tag('truth')); // Selecting the active tag clears only the tag.
    assert.equal(new URL(page.location.href).searchParams.has('tag'), false);
    assert.deepEqual(page.visible(), ['space-truth']);
    page.click(tag('belief'));
    assert.deepEqual(page.visible(), []);
    assert.match(page.announcement.textContent, /#belief, 0 works/);
    page.click(category('all'));
    assert.deepEqual(page.visible(), ['image-belief', 'writing-belief']);
    page.click(tag('belief'));
    assert.equal(page.visible().length, 5); // Untagged works remain available without a tag filter.
    page.location.href = filteredUrl;
    page.window.popstate();
    assert.deepEqual(page.visible(), ['space-truth']);
    page.browser.control.click();
    assert.equal(new URL(page.location.href).searchParams.has('tag'), false);
    page.click(page.atlas);
    assert.equal(page.visible().length, 5);
});

test('unknown category and tag URLs fall back to the entire collection', () => {
    const page = collection('http://localhost/projects?category=unknown&tag=unknown');
    assert.equal(page.visible().length, 5);
    assert.ok(page.tags.every((link) => link.attributes['aria-current'] === 'false'));
});
