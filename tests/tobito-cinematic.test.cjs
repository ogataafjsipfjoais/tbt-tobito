'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('one fixed WebGL scene replaces the boxed Three.js hero on the 3D site',()=>{
  const html=read('3d/index.html');
  const css=read('3d/cinematic.css');
  const js=read('3d/world.js');
  assert.match(html,/id="journey-world"/);
  assert.match(html,/src="\.\/world\.js"/);
  assert.doesNotMatch(html,/src="\.\.\/assets\/js\/tobito-3d-world\.js"/);
  assert.match(css,/\.journey-world\{position:fixed;inset:0/);
  assert.match(css,/\.world-active \.hero/);
  assert.match(js,/new THREE\.WebGLRenderer/);
  assert.match(js,/scrollToProgress/);
  assert.match(js,/scene\.background\.copy\(bg\)/);
  assert.match(js,/camera\.position\.lerp/);
  assert.match(js,/walker\.rotation\.y/);
  assert.doesNotThrow(()=>new vm.Script(js));
});

test('travelling character, real physics game links and cinematic worlds are retained',()=>{
  const html=read('3d/index.html');
  const js=read('3d/world.js');
  for(const name of ['prologue-section','poses','play','oddities','wind-lab','hangar','takeoff']){
    assert.match(html,new RegExp('id="'+name+'"'));
  }
  for(const name of ['workshop','runway','hangar','lake','clouds','propeller']){
    assert.ok(js.toLowerCase().includes(name));
  }
  assert.match(html,/href="\.\.\/legacy\.html#flight"/);
  assert.match(html,/href="\.\.\/legacy\.html\?game=yakitori#flight"/);
  assert.match(html,/href="\.\.\/legacy\.html#aerolab"/);
  assert.match(html,/src="\.\/play\.js"/);
});

test('chaos playground is complete and hidden-object game has six unique finds',()=>{
  const html=read('3d/index.html');
  const css=read('3d/chaos.css');
  const js=read('3d/chaos.js');
  for(const n of ['find-art','find-list','find-share','find-zoom-in','find-hint','find-hits','wind-object-choices','absurd-speed','absurd-fire','chaos-trigger','chaos-toggle']){
    assert.match(html,new RegExp('id="'+n+'"'));
  }
  assert.match(html,/href="\.\/chaos\.css"/);
  assert.match(html,/src="\.\/chaos\.js"/);
  assert.match(js,/const targets = \[/);
  const targetSection=js.slice(js.indexOf('const targets = ['),js.indexOf('  ];',js.indexOf('const targets = [')));
  assert.equal((targetSection.match(/id:'/g)||[]).length,6);
  assert.match(js,/navigator\.share/);
  assert.match(js,/aria-label/); // Targets are named for assistive technologies.
  assert.match(css,/\.find-hit:focus-visible/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotThrow(()=>new vm.Script(js));
});

test('audio is opt-in, motion can be stopped, WebGL degrades safely',()=>{
  const html=read('3d/index.html'),js=read('3d/world.js'),css=read('3d/cinematic.css');
  assert.match(html,/id="world-motion"/);
  assert.match(html,/id="world-sound"/);
  assert.match(js,/soundButton\?\.addEventListener\('click'/);
  assert.match(js,/motionButton\?\.addEventListener\('click'/);
  assert.match(js,/webglcontextlost/);
  assert.match(js,/prefers-reduced-motion/);
  assert.match(css,/world-fallback/);
});

test('all newly added standalone scripts, css and public assets exist',()=>{
  const html=read('3d/index.html');
  for(const file of ['world.js','cinematic.css','chaos.js','chaos.css','journey.js','journey.css','play.js','play.css','studio.js','studio.css']){
    assert.ok(fs.existsSync(path.join(root,'3d',file)),file);
    assert.ok(html.includes('./'+file),file);
  }
  assert.match(read('legacy.html'),/id="tobito-game-canvas"/);
  assert.match(read('legacy.html'),/id="yakitori-game-canvas"/);
});


test('the WebGL scene, not marketing blocks, occupies the visible journey',()=>{
  const css=read('3d/cinematic.css');
  const html=read('3d/index.html');
  assert.match(css,/\.journey-world\{position:fixed;inset:0/);
  assert.match(css,/html\.world-active #about\{min-height:/);
  assert.match(css,/html\.world-active #poses\{min-height:/);
  assert.match(css,/html\.world-active #hangar\{min-height:/);
  assert.match(css,/#journey-buddy\{display:none!important\}/);
  assert.match(css,/#tobito-3d-controls\{display:none!important\}/);
  assert.match(css,/html\.world-active #prologue-section \.hero-stage\{display:none!important\}/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(html,/ギィ……格納庫のシャッターが開く/);
  assert.doesNotMatch(html,/これは、とびとくんとあなたの空を目指す旅/);
});

test('the large search game and the absurd wind lab remain playable in the journey',()=>{
  const html=read('3d/index.html');
  const js=read('3d/chaos.js');
  for(const id of ['find-viewport','find-hits','find-list','find-zoom-in','find-hint','find-restart','find-share','wind-object-choices','absurd-speed','absurd-fire','absurd-reset']){
    assert.match(html,new RegExp('id="'+id+'"'));
  }
  assert.match(js,/pointerdown/);
  assert.match(js,/navigator\.share/);
  assert.match(js,/prefers-reduced-motion/);
  assert.match(html,/href="\.\.\/legacy\.html#aerolab"/);
});
