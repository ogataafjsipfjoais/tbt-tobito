'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename),'utf8');

test('opening is an art-directed scene with the original Tobito drawing, not a boxed 3D viewer', () => {
  const html = read('3d/index.html');
  assert.match(html, /id="prologue-section"[^>]*hero-opening-scene/);
  assert.match(html, /id="opening-sticky"/);
  assert.match(html, /id="opening-tobito"/);
  assert.match(html, /assets\/images\/tobito_pose_airplane\.png/);
  assert.match(html, /fetchpriority="high"/);
  assert.match(html, /<h1 id="hero-title"/);
  assert.match(html, /基地に潜入する/);
  assert.match(html, /ゲームから始める/);
  assert.match(html, /href="#play"/);
  assert.match(html, /id="opening-secret"/);
  assert.match(html, /id="opening-secret-status" role="status" aria-live="polite"/);
});

test('opening remains usable while Three.js is unavailable and provides keyboard access', () => {
  const html = read('3d/index.html');
  const css = read('3d/opening.css');
  const js = read('3d/opening.js');
  assert.match(html, /href="\.\/opening\.css"/);
  assert.match(html, /src="\.\/opening\.js"/);
  assert.match(html, /class="opening-at-top"/);
  assert.match(html, /<button class="opening-tobito"/);
  assert.match(css, /opening-sticky/);
  assert.match(css, /position:sticky/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /max-width:650px/);
  assert.match(css, /opening-tobito img/);
  assert.match(js, /requestAnimationFrame\(applyScroll\)/);
  assert.match(js, /pointermove/);
  assert.doesNotThrow(() => new vm.Script(js));
});

test('hero overlays retreat to reveal the continuous WebGL world after scrolling', () => {
  const css=read('3d/opening.css'),js=read('3d/opening.js'),html=read('3d/index.html');
  assert.match(css, /opening-transition/);
  assert.match(css, /--opening-progress/);
  assert.match(js, /classList\.toggle\('opening-at-top'/);
  assert.match(js, /getBoundingClientRect\(\)/);
  assert.match(html, /id="journey-world"/);
  assert.match(html, /src="\.\/world\.js"/);
  for (const anchor of ['play','wind-lab','hangar','goods','takeoff']) {
    assert.match(html, new RegExp('id="'+anchor+'"'));
  }
  assert.match(read('legacy.html'), /id="tobito-game-canvas"/);
});

test('the invisible WebGL world does not keep drawing behind the opening sequence',()=>{
  const opening=read('3d/opening.js');
  const world=read('3d/world.js');
  assert.match(opening,/tbt:opening:progress/);
  assert.match(world,/openingPaused/);
  assert.match(world,/!arcadePaused && !openingPaused/);
  assert.match(world,/window\.addEventListener\('tbt:opening:progress'/);
  assert.doesNotThrow(()=>new vm.Script(world));
});
