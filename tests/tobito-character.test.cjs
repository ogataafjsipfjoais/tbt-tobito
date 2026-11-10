'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('homepage loads new sculpted Tobito before cinematic scene starts',()=>{
  const html=read('3d/index.html');
  const character=html.indexOf('src="./tobito-character.js"');
  const world=html.indexOf('src="./world.js"');
  assert.ok(character>0 && world>character);
  const js=read('3d/world.js');
  assert.match(js,/TobitoCharacter\?\.create\(THREE\)/);
  assert.doesNotMatch(js,/const headBack=extrude\(body/);
});
test('model follows an organic face silhouette without a forced square head',()=>{
  const model=read('3d/tobito-character.js');
  assert.match(model,/function softHead\(/);
  assert.match(model,/new THREE\.SphereGeometry\(1,56,40\)/);
  assert.match(model,/const cheek=Math\.exp/);
  assert.doesNotMatch(model,/roundBox\(body,1\.74,1\.56/);
  assert.doesNotMatch(model,/head recognizably square/);
  assert.match(model,/bevelSegments:5/);
  assert.match(model,/quadraticCurveTo/);
  assert.match(model,/Tobito \| face and gaze/);
  assert.match(model,/sleepy lids/);
  assert.match(model,/const arms=\[\],legs=\[\]/);
  assert.match(model,/function gesture\(/);
  assert.doesNotThrow(()=>new vm.Script(model));
});
test('original games remain untouched and integrated into the homepage',()=>{
  const html=read('3d/index.html');
  for(const id of ['arcade-showcase','original-wind','goods']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(read('3d/arcade/index.html'),/id="tobito-game-canvas"/);
  assert.match(read('3d/arcade/index.html'),/id="wind-tunnel-canvas-container"/);
  assert.match(read('3d/arcade/index.html'),/id="yakitori-game-canvas"/);
});

test('visible character descriptions do not impose a square head on Tobito',()=>{
  const html=read('3d/index.html');
  const chaos=read('3d/chaos.js');
  assert.doesNotMatch(html,/四角い顔|四角い頭/);
  assert.doesNotMatch(chaos,/四角い白い頭/);
  assert.match(html,/赤いトサカ/);
  const world=read('3d/world.js');
  assert.match(world,/curvedBeam/);
  assert.match(world,/airfoilGeometry/);
  assert.doesNotMatch(world,/new THREE\.CapsuleGeometry/);
});
