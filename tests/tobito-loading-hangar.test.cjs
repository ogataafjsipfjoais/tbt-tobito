'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('loading overlay remains visible through game and wind model initialization',()=>{
  const parent=read('3d/gameport.js');
  const child=read('3d/arcade/arcade-runtime.js');
  assert.match(parent,/function setBusy\(host,mode,busy,failed=false\)/);
  assert.match(parent,/setBusy\(host,mode,true\)/);
  assert.match(parent,/setBusy\(active.host,active.mode,false\)/);
  assert.match(parent,/setBusy\(active.host,active.mode,false,true\)/);
  assert.match(parent,/if\(data.mode!==active.mode\)return/);
  assert.match(parent,/aria-live/);
  assert.match(parent,/もう一度起動する/);
  assert.match(child,/async function waitForRenderable/);
  assert.match(child,/await waitForRenderable\(mode,instance,token\)/);
  assert.match(child,/\.querySelector\('\.s320-status'\)/);
  assert.match(child,/25000/);
  assert.doesNotThrow(()=>new vm.Script(parent));
  assert.doesNotThrow(()=>new vm.Script(child));
});

test('spinner and retry controls are styled with accessible reduced motion behavior',()=>{
  const css=read('3d/gameport.css');
  assert.match(css,/\.arcade-loading-overlay\[hidden\]/);
  assert.match(css,/\.arcade-loading-spinner/);
  assert.match(css,/\.arcade-loading-retry/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('background hangar loads real source S-320 instead of presenting generic wing as actual aircraft',()=>{
  const world=read('3d/world.js');
  const html=read('3d/index.html');
  assert.match(html,/src="\.\.\/assets\/js\/s320-model\.js"/);
  assert.match(world,/window\.TBTS320\.create\(\{span:40,groundY:0\}\)/);
  assert.match(world,/placeholderAircraft\.visible=false/);
  assert.match(world,/host\.dataset\.aircraft='s320-original'/);
  assert.match(world,/s320Request/);
  assert.match(world,/catwalk/);
  assert.match(world,/trolley/);
  assert.match(world,/curvedBeam\(hangar/);
  assert.match(world,/host\.dataset\.aircraft='fallback-silhouette'/);
  assert.doesNotThrow(()=>new vm.Script(world));
});

test('original games and wind tunnel remain independent of visual upgrades',()=>{
  const arcade=read('3d/arcade/index.html');
  assert.match(arcade,/id="tobito-game-canvas"/);
  assert.match(arcade,/id="yakitori-game-canvas"/);
  assert.match(arcade,/id="wind-tunnel-canvas-container"/);
  assert.match(read('legacy.html'),/id="tobito-game-canvas"/);
});
