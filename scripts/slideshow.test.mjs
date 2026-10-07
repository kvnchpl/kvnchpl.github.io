import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('galleries can move between existing resized images and new single-file images', async () => {
    const context = vm.createContext({document: {readyState: 'loading', addEventListener() {}}});
    vm.runInContext(await readFile(new URL('../js/main.js', import.meta.url), 'utf8'), context);
    const button = () => ({events: {}, attributes: {}, addEventListener(name, handler) {this.events[name] = handler;}, setAttribute(name, value) {this.attributes[name] = value;}});
    const previous = button();
    const next = button();
    const image = {removeAttribute(name) {delete this[name];}};
    const images = [{file: 'old-image', alt: 'existing artwork'}, {src: '/img/projects/new-work/artwork.png', alt: 'new artwork'}];
    const wrapper = {
        dataset: {project: 'new-work', fullWidth: '1920', images: JSON.stringify(images)},
        querySelector(selector) {return selector === 'img' ? image : selector === '.slideshow-prev' ? previous : next;}
    };
    context.initSlideshow(wrapper);
    next.events.click();
    assert.equal(image.src, '/img/projects/new-work/artwork.png');
    assert.equal(image.srcset, undefined); // A stale srcset must not load the previous artwork.
    assert.equal(image.alt, 'new artwork');
    assert.equal(next.attributes['aria-label'], 'Next image, 2 of 2');
    next.events.click();
    assert.equal(image.src, '/img/projects/new-work/medium/old-image.webp');
    assert.match(image.srcset, /small\/old-image.webp 600w/);
    assert.match(image.srcset, /full\/old-image.webp 1920w/);
    previous.events.click();
    assert.equal(image.src, '/img/projects/new-work/artwork.png');
    assert.equal(image.srcset, undefined);
});
