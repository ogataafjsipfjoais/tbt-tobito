'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {planMount}=require('../3d/aircraft-mount.js');

test('the measured fuselage rests exactly on the padded maintenance saddle',()=>{
  const cases=[
    {fuselageMinY:-1.15,aircraftMinY:-1.8},
    {fuselageMinY:0,aircraftMinY:0},
    {fuselageMinY:2.1,aircraftMinY:1.7},
    {fuselageMinY:-3.4,aircraftMinY:-3.4}
  ];
  for(const input of cases){
    const plan=planMount({...input,floorY:-.14,preferredDeckY:1.95,minClearance:.12});
    assert.ok(Math.abs(input.fuselageMinY+plan.elevation-plan.deckY)<1e-9);
    assert.ok(input.aircraftMinY+plan.elevation>=-.02-1e-9);
    assert.ok(plan.deckY>=1.95-1e-9);
    assert.ok(plan.clearance>=.12-1e-9);
  }
});

test('floor clearance increases the stand height when lower aircraft parts would hit the floor',()=>{
  const plan=planMount({
    fuselageMinY:0,aircraftMinY:-5.1,floorY:-.14,preferredDeckY:1.95,minClearance:.12
  });
  assert.ok(plan.deckY>1.95);
  assert.ok(Math.abs(plan.clearance-.12)<1e-9);
  assert.ok(Math.abs(plan.elevation-plan.deckY)<1e-9);
});

test('invalid geometry cannot silently put the aircraft through the hangar floor',()=>{
  assert.throws(()=>planMount({fuselageMinY:Infinity,aircraftMinY:0}),TypeError);
  assert.throws(()=>planMount({fuselageMinY:0,aircraftMinY:NaN}),TypeError);
  assert.throws(()=>planMount({fuselageMinY:0,aircraftMinY:0,preferredDeckY:-1}),RangeError);
});

test('the original S-320 is measured after rotation and grounded on two physical cradles',()=>{
  const world=read('3d/world.js');
  const html=read('3d/index.html');
  assert.ok(html.indexOf('src="./aircraft-mount.js"')>=0);
  assert.ok(html.indexOf('src="./aircraft-mount.js"')<html.indexOf('src="./world.js"'));
  assert.match(world,/window\.TBTS320\.create\(\{span:40,groundY:0\}\)/);
  assert.match(world,/model\.rotation\.y=Math\.PI/);
  assert.match(world,/new THREE\.Box3\(\)\.setFromObject\(fuselage\)/);
  assert.match(world,/new THREE\.Box3\(\)\.setFromObject\(model\)/);
  assert.match(world,/mounting\.planMount\(\{/);
  assert.match(world,/model\.position\.y\+=plan\.elevation/);
  assert.match(world,/rebuildMaintenanceCradles\(plan\.deckY\)/);
  assert.match(world,/const z of \[-22\.3,-9\.8\]/);
  assert.match(world,/const standX=5\.5/);
  assert.match(world,/new THREE\.PlaneGeometry\(28,14\)/);
  assert.match(world,/host\.dataset\.support='maintenance-stand'/);
  assert.doesNotMatch(world,/model\.position\.set\(0,1\.15,-16\)/);
  assert.doesNotThrow(()=>new vm.Script(world));
  assert.doesNotThrow(()=>new vm.Script(read('3d/aircraft-mount.js')));
});

test('the player passage, 3D gallery and untouched original games remain available',()=>{
  const html=read('3d/index.html');
  const world=read('3d/world.js');
  assert.match(world,/const desiredCamZ=passage\.cameraZ/);
  for(const id of ['arcade-showcase','original-wind','goods','hangar','takeoff'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(read('legacy.html'),/id="tobito-game-canvas"/);
  assert.match(read('legacy.html'),/id="yakitori-game-canvas"/);
});
