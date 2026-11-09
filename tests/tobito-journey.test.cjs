'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('the 3D site progresses through the four promised checkpoints', () => {
  const html = read('3d/index.html');
  const points = ['prologue-section', 'poses', 'hangar', 'takeoff'];
  const offsets = points.map(id => html.indexOf('id="' + id + '"'));
  assert.ok(offsets.every(n => n >= 0), 'all checkpoints exist');
  assert.ok(offsets.every((n, i) => i === 0 || n > offsets[i - 1]), 'checkpoints follow the journey order');
  for (const key of ['start', 'practice', 'hangar', 'takeoff']) {
    assert.match(html, new RegExp('data-journey-step="' + key + '"'));
    assert.match(html, new RegExp('data-rail-step="' + key + '"'));
  }
});

test('the two-person journey keeps games accessible without redirecting the 3D page', () => {
  const html = read('3d/index.html');
  const offsets = ['id="poses"', 'id="play"', 'id="hangar"'].map(v => html.indexOf(v));
  assert.ok(offsets[0] < offsets[1] && offsets[1] < offsets[2]);
  assert.match(html, /href="\.\.\/legacy\.html#flight"/);
  assert.match(html, /href="\.\.\/legacy\.html\?game=yakitori#flight"/);
  assert.match(html, /id="wind-start"/);
});

test('walking companion has a keyboard-accessible interaction and reduced-motion mode', () => {
  const html = read('3d/index.html');
  const css = read('3d/journey.css');
  const js = read('3d/journey.js');
  assert.match(html, /id="journey-buddy"/);
  assert.match(html, /<button[^>]+id="buddy-hello"/);
  assert.match(html, /id="buddy-live"[^>]+aria-live="polite"/);
  assert.match(css, /\.journey-buddy\.is-walking/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /scroll/);
  assert.doesNotThrow(() => new vm.Script(js));
});

test('boarding pass is generated in-browser, can be saved as PNG, and remains a keepsake', () => {
  const html = read('3d/index.html');
  const js = read('3d/journey.js');
  for (const id of ['boarding-form', 'crew-name', 'boarding-ticket', 'boarding-actions', 'ticket-download']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(js, /localStorage|canvas\.toBlob/);
  assert.match(js, /canvas\.toBlob/);
  assert.match(js, /ticketName\.textContent = nameValue/);
  assert.match(html, /記念品です/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon/);
});

test('CSS and JavaScript for the journey are explicitly linked in the HTML', () => {
  const html = read('3d/index.html');
  assert.match(html, /href="\.\/journey\.css"/);
  assert.match(html, /src="\.\/journey\.js"/);
  assert.ok(fs.existsSync(path.join(root, '3d/journey.css')));
  assert.ok(fs.existsSync(path.join(root, '3d/journey.js')));
});
