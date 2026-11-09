'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('embedded game buttons retain a visible way to recover keyboard control',()=>{
  const html=read('3d/index.html'),parent=read('3d/gameport.js');
  assert.match(html,/data-arcade-focus/);
  assert.match(html,/data-arcade-mode="flight"/);
  assert.match(html,/data-arcade-mode="yakitori"/);
  assert.match(parent,/function focusActiveGame\(\)/);
  assert.match(parent,/frame\.contentWindow\?\.focus\(\)/);
  assert.match(parent,/tbt:arcade:focus/);
  assert.match(parent,/addEventListener\('click',focusActiveGame\)/);
  assert.doesNotThrow(()=>new vm.Script(parent));
});

test('iframe loads the game from route only once, not on iframe load and route together',()=>{
  const parent=read('3d/gameport.js'),child=read('3d/arcade/arcade-runtime.js');
  const handler=parent.match(/frame\.addEventListener\('load',\(\)=>\{([\s\S]*?)\n    \}\);/);
  assert.ok(handler,'iframe load handler');
  assert.doesNotMatch(handler[1],/tbt:arcade:switch/);
  assert.match(child,/const initialized = new Set\(\)/);
  assert.match(child,/if \(initialized\.has\(mode\)\)/);
  assert.match(child,/if \(loadingMode === mode\) return/);
  assert.match(child,/if \(token !== ticket\) return/);
  assert.match(child,/function focusGame\(/);
  assert.match(child,/el\.focus\(\{preventScroll:true\}\)/);
  assert.match(child,/loaded\.delete\(path\)/);
  assert.doesNotThrow(()=>new vm.Script(child));
});

test('the old flight and Yakitori games still focus only their own canvas, with keyboard control intact',()=>{
  const flight=read('assets/js/game.js'),yakitori=read('assets/js/yakitori-game.js');
  assert.match(flight,/window\.addEventListener\('keydown'/);
  assert.match(flight,/this\.canvas\.parentElement\.contains\(document\.activeElement\)/);
  assert.match(yakitori,/document\.activeElement !== this\.canvas/);
  assert.match(flight,/this\.canvas\.focus\(\{ preventScroll: true \}\)/);
  assert.match(yakitori,/this\.canvas\.focus\(\{ preventScroll: true \}\)/);
  for(const id of ['tobito-game-canvas','yakitori-game-canvas','wind-tunnel-canvas-container'])
    assert.ok(read('3d/arcade/index.html').includes('id="'+id+'"'),id);
});

test('first 3D scene prioritizes readable material and grounded mascot',()=>{
  const world=read('3d/world.js'),character=read('3d/tobito-character.js');
  assert.match(world,/toneMappingExposure = \.88/);
  assert.match(world,/ground\.receiveShadow=true/);
  assert.match(world,/road\.receiveShadow=true/);
  assert.match(world,/TobitoCharacter\?\.create\(THREE\)/);
  assert.match(world,/new THREE\.CanvasTexture\(shadowCanvas\)/);
  assert.match(character,/body\.position\.y=1\.28/);
  assert.doesNotThrow(()=>new vm.Script(world));
  assert.doesNotThrow(()=>new vm.Script(character));
});

test('the original site remains intact, and flight, survival and wind stay in the 3D homepage',()=>{
  const homepage=read('3d/index.html');
  for(const id of ['arcade-showcase','original-wind','oddities','goods'])
    assert.ok(homepage.includes('id="'+id+'"'),id);
  for(const mode of ['flight','yakitori','wind'])
    assert.ok(read('3d/arcade/arcade-runtime.js').includes("mode === '"+mode+"'"),mode);
  assert.match(read('legacy.html'),/id="tobito-game-canvas"/);
  assert.match(read('legacy.html'),/id="yakitori-game-canvas"/);
  assert.match(read('legacy.html'),/id="wind-tunnel-canvas-container"/);
});
