import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {palette} from './field.mjs';

test('swatches toggle independently, retain one color, and preserve other rectangles when toggled', async () => {
    const buttons = palette.map(([name, color]) => ({
        dataset: {color}, attributes: {'aria-pressed': String(name === 'blue')},
        getAttribute(key) {return this.attributes[key];},
        setAttribute(key, value) {this.attributes[key] = value;},
        addEventListener(name, handler) {this[name] = handler;}
    }));
    const artifacts = {children: [], replaceChildren(...children) {this.children = children;}, append(child) {this.children.push(child); child.remove = () => {this.children = this.children.filter((item) => item !== child);};}};
    const composition = {querySelectorAll() {return buttons;}, querySelector() {return artifacts;}};
    const context = vm.createContext({document: {querySelector() {return null;}, createElement() {return {style: {}};}}});
    vm.runInContext(await readFile(new URL('../js/field.js', import.meta.url), 'utf8'), context);
    const reset = context.initColorPalette(composition);
    const active = () => buttons.filter((button) => button.attributes['aria-pressed'] === 'true');
    assert.equal(active().length, 1);
    const initialRectangle = artifacts.children[0];
    const initialPosition = {...initialRectangle.style};
    buttons[4].click(); // The sole selected swatch moves its rectangle without deselecting.
    assert.equal(artifacts.children.length, 1);
    assert.equal(artifacts.children[0], initialRectangle);
    assert.equal(initialRectangle.style.width, initialPosition.width);
    assert.equal(initialRectangle.style.height, initialPosition.height);
    assert.notDeepEqual(initialRectangle.style, initialPosition);
    assert.equal(active().length, 1);
    const blueRectangle = artifacts.children[0];
    const bluePosition = {...blueRectangle.style};
    buttons.filter((button) => button !== buttons[4]).forEach((button) => button.click());
    assert.equal(artifacts.children.find((rectangle) => rectangle.style.background === '#0000ff'), blueRectangle);
    assert.deepEqual(blueRectangle.style, bluePosition);
    assert.equal(active().length, 8);
    assert.deepEqual(artifacts.children.map((rectangle) => rectangle.style.background).sort(), palette.map(([, color]) => color).sort());
    for (const {style} of artifacts.children) {
        assert.ok(parseFloat(style.left) >= 0 && parseFloat(style.left) + parseFloat(style.width) <= 100);
        assert.ok(parseFloat(style.top) >= 18 && parseFloat(style.top) + parseFloat(style.height) <= 86);
    }
    const unchanged = artifacts.children.filter((rectangle) => rectangle.style.background !== '#000000');
    buttons[0].click();
    assert.equal(active().length, 7);
    assert.deepEqual(artifacts.children, unchanged);
    const positions = unchanged.map((rectangle) => ({...rectangle.style}));
    buttons[0].click(); // Re-enabled black receives a new rectangle; the others stay put.
    assert.deepEqual(artifacts.children.slice(0, 7), unchanged);
    assert.deepEqual(unchanged.map((rectangle) => rectangle.style), positions);
    buttons[0].click();
    buttons.slice(1, 7).forEach((button) => button.click());
    assert.equal(active().length, 1);
    buttons[7].click();
    assert.equal(active().length, 1);
    reset(); // Returning to the screen restores blue only, with a fresh rectangle.
    assert.equal(active().length, 1);
    assert.equal(active()[0].dataset.color, '#0000ff');
    assert.equal(artifacts.children.length, 1);
    assert.equal(artifacts.children[0].style.background, '#0000ff');
    assert.notEqual(artifacts.children[0], blueRectangle);
});
