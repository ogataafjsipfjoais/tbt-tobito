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
  assert.match(html, /src="\.\/world\.js"/);
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
  assert.match(workflow, /test -s 3d\/index\.html/);
  assert.match(workflow, /php index\.php > legacy\.html/);
});

test('site root launches the cinematic world while keeping the original playable page', () => {
  const entry = get('index.html');
  const workflow = get('.github/workflows/pages.yml');
  const build = get('scripts/build.sh');
  assert.match(entry, /url=\.\/3d\//);
  assert.match(entry, /href="\.\/legacy\.html#flight/);
  assert.match(entry, /href="\.\/3d\//);
  assert.match(workflow, /git add -- legacy\.html/);
  assert.match(workflow, /php index\.php > legacy\.html/);
  assert.match(build, /preview\.html/);
  assert.doesNotMatch(build, /mv "\$preview_file" index\.html/);
});

test('3D world restores old game entries and includes playable challenge', () => {
  const page = get('3d/index.html');
  const js = get('3d/play.js');
  const css = get('3d/play.css');
  assert.match(page, /id="play"/);
  assert.match(page, /id="wind-start"/);
  assert.match(page, /id="wind-result"/);
  assert.match(page, /href="\.\.\/legacy\.html#flight"/);
  assert.match(page, /href="\.\.\/legacy\.html\?game=yakitori#flight"/);
  assert.match(page, /href="\.\.\/legacy\.html#aerolab"/);
  assert.match(page, /src="\.\/play\.js"/);
  assert.match(page, /href="\.\/play\.css"/);
  assert.match(js, /const GOAL = 100/);
  assert.match(js, /localStorage/);
  assert.match(js, /turbulence/);
  assert.match(css, /\.gust-turbulence/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotThrow(() => new vm.Script(js));
});

test('Original website keeps both playable games and 3D-world shortcut', () => {
  const site = get('index.php');
  const wp = get('page-tobito.php');
  for (const source of [site, wp]) {
    assert.match(source, /id="tobito-game-canvas"/);
    assert.match(source, /id="yakitori-game-canvas"/);
    assert.match(source, /class="tobito-world-shortcuts"/);
    assert.match(source, /assets\/js\/tobito-play-links\.js/);
  }
  assert.doesNotThrow(() => new vm.Script(get('assets/js/tobito-play-links.js')));
});
