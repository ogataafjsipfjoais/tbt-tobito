'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function file(name) { return fs.readFileSync(path.join(root, name), 'utf8'); }

test('3D hero preserves the illustrated fallback', () => {
    const html = file('index.php');
    assert.match(html, /id="prologue-giant-tobito"/);
    assert.match(html, /id="tobito-3d-stage"/);
    assert.match(html, /id="tobito-3d-controls"/);
    assert.match(html, /id="tobito-3d-rotate"/);
    assert.match(html, /id="tobito-3d-flap"/);
    assert.match(html, /id="tobito-3d-reset"/);
    assert.match(html, /assets\/js\/tobito-3d-world\.js/);
    assert.match(html, /assets\/css\/tobito-3d-world\.css/);
});

test('WordPress page retains the 3D feature', () => {
    const page = file('page-tobito.php');
    assert.match(page, /id="tobito-3d-stage"/);
    assert.match(page, /assets\/js\/tobito-3d-world\.js/);
});

test('3D scene JavaScript parses and has low-motion fallback', () => {
    const js = file('assets/js/tobito-3d-world.js');
    assert.doesNotThrow(() => new vm.Script(js));
    assert.match(js, /prefers-reduced-motion: reduce/);
    assert.match(js, /webglcontextlost/);
    assert.match(js, /IntersectionObserver/);
    assert.match(js, /visibilitychange/);
});

test('3D CSS does not replace the existing hero or intercept the whole page', () => {
    const css = file('assets/css/tobito-3d-world.css');
    assert.match(css, /#tobito-3d-stage/);
    assert.match(css, /touch-action:\s*pan-y/);
    assert.match(css, /\.tobito-3d-ready:not\(\.tobito-3d-fallback\)/);
    assert.match(css, /prefers-reduced-motion/);
});
