'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const route=require('../3d/flight-path.js');

test('the camera always moves forward, without teleporting or reversing at chapter boundaries',()=>{
  let prev=Infinity;
  for(let i=0;i<=4000;i++){
    const point=route.sample(i/4000);
    assert.ok(Number.isFinite(point.z) && Number.isFinite(point.cameraZ));
    assert.ok(point.cameraZ <= prev + 1e-8,'camera reversed at '+i/4000);
    assert.equal(point.cameraZ - point.z,9.5);
    prev=point.cameraZ;
  }
  assert.equal(route.pathZ(0),0);
  assert.equal(route.pathZ(1),-275);
});

test('both Tobito and the camera go through the same 3D hangar, beneath the wing, then out to the lake',()=>{
  const {entrance,wing,exit,lake}=route.landmarks;
  assert.ok(entrance>wing && wing>exit && exit>lake);
  const samples=Array.from({length:5001},(_,i)=>route.sample(i/5000));
  const firstCameraCross=z=>samples.findIndex(s=>s.cameraZ<=z);
  const firstTobitoCross=z=>samples.findIndex(s=>s.z<=z);
  const crossings=[entrance,wing,exit,lake].map(firstCameraCross);
  assert.ok(crossings.every(i=>i>=0));
  assert.ok(crossings.every((v,i)=>i===0||v>crossings[i-1]),'camera must cross entrance, wing, exit, lake in that order');
  for(const z of [entrance,wing,exit])assert.ok(firstTobitoCross(z)>=0);
  const atWing=samples[crossings[1]];
  assert.ok(atWing.cameraY<6,'camera must remain below the wing instead of flying above it');
  assert.equal(atWing.walkerY,0,'Tobito must still be walking while crossing the wing');
  assert.ok(samples[samples.length-1].cameraY>10,'the exit should open into sky');
});

test('the active Three.js camera uses the sampled route, not old hangar pullback shots',()=>{
  const html=read('3d/index.html');
  const world=read('3d/world.js');
  assert.ok(html.indexOf('src="./flight-path.js"')<html.indexOf('src="./world.js"'));
  assert.match(world,/const passage=flightPath.sample\(p\)/);
  assert.match(world,/const desiredCamZ=passage.cameraZ/);
  assert.match(world,/const desiredCamY=passage.cameraY/);
  assert.match(world,/passage.lookZ/);
  assert.match(world,/passage.walkerY/);
  assert.doesNotMatch(world,/const wingShot=/);
  assert.match(world,/const entranceZ=\[22,9,-4,-17,-30,-38\]/);
  assert.match(world,/curvedBeam\(hangar,arch/);
  assert.match(world,/host.dataset.passage=passagePhase/);
  assert.doesNotThrow(()=>new vm.Script(world));
  assert.doesNotThrow(()=>new vm.Script(read('3d/flight-path.js')));
});

test('original games, actual wind tunnel, model gallery and reduced-motion fallback are preserved',()=>{
  const html=read('3d/index.html');
  const world=read('3d/world.js');
  for(const id of ['arcade-showcase','original-wind','oddities','goods','takeoff'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/data-arcade-mode="yakitori"/);
  assert.match(html,/data-arcade-host="wind"/);
  assert.match(world,/prefers-reduced-motion/);
  assert.match(world,/world-fallback/);
  assert.match(read('legacy.html'),/id="tobito-game-canvas"/);
});
