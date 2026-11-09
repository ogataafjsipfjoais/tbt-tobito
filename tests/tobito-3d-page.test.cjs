'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const get = p => fs.readFileSync(path.join(root, p), 'utf8');

test('3D page includes all interactive sections and fallback art', () => {
  const html = get('3d/index.html');
  for (const anchor of ['prologue-section', 'tobito-3d-stage', 'tobito-3d-controls', 'about', 'poses', 'hangar', 's320-viewport', 's320-load', 'pose-next']) {
    assert.match(html, new RegExp('id="' + anchor + '"'), anchor);
  }
  assert.match(html, /tobito_pose_airplane\.png/);
  assert.match(html, /assets\/js\/tobito-3d-world\.js/);
  assert.match(html, /assets\/js\/s320-model\.js/);
});

test('3D page references existing local assets', () => {
  const html = get('3d/index.html');
  const matches = [...html.matchAll(/(?:src|href)="(\.\.\/assets\/[^"?]+)"/g)];
  assert.ok(matches.length >= 8);
  for (const m of matches) {
    const target = path.resolve(root, '3d', m[1]);
    assert.ok(fs.existsSync(target), 'Missing ' + m[1]);
  }
});

test('3D page CSS and JS are valid and accessible', () => {
  assert.doesNotThrow(() => new vm.Script(get('3d/studio.js')));
  const html = get('3d/index.html');
  const css = get('3d/studio.css');
  const js = get('3d/studio.js');
  assert.match(html, /class="skip"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /loadAircraft/);
  assert.match(js, /THREE\.WebGLRenderer/);
});

test('Pages workflow includes 3D directory and generated preview', () => {
  const workflow = get('.github/workflows/pages.yml');
  assert.match(workflow, /cp -R 3d _site\/3d/);
  assert.match(workflow, /test -s _site\/3d\/index\.html/);
});
