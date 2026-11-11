'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const model=path.join(root,'3d/models/tobito-v3.glb');
const world=fs.readFileSync(path.join(root,'3d/world.js'),'utf8');

test('a real self-contained GLB exists instead of an image posing as a 3D model',()=>{
  assert.ok(fs.existsSync(model),'model must be checked into GitHub');
  const b=fs.readFileSync(model);
  assert.ok(b.length>150000,'the sculpted model must contain substantial geometry');
  assert.equal(b.toString('ascii',0,4),'glTF');
  assert.equal(b.readUInt32LE(4),2);
  assert.equal(b.readUInt32LE(8),b.length);
  const jsonLength=b.readUInt32LE(12);
  assert.equal(b.toString('ascii',16,20),'JSON');
  const gltf=JSON.parse(b.subarray(20,20+jsonLength).toString('utf8'));
  assert.equal(gltf.asset.version,'2.0');
  assert.ok(gltf.meshes.length>=45,'sculpted components and details should exist');
  assert.ok(gltf.materials.length>=10,'material definition should be distinct');
  assert.ok(gltf.nodes.length>=55);
  const names=new Set(gltf.nodes.map(n=>n.name));
  for(const name of [
    'Body_Rig','Face_Gaze','Comb_Sway','Wing_Left_Pivot','Wing_Right_Pivot',
    'Leg_Left_Pivot','Leg_Right_Pivot','Eye_Left_Blink','Eye_Right_Blink'
  ])assert.ok(names.has(name),'animated rig node missing: '+name);
  assert.ok(gltf.accessors.some(a=>a.count>1500),'head and body should have smooth high-resolution topology');
  assert.equal(gltf.buffers.length,1);
  assert.equal(gltf.buffers[0].uri,undefined,'GLB must not fetch an external .bin');
  const binStart=20+jsonLength;
  assert.equal(b.toString('ascii',binStart+4,binStart+8),'BIN\0');
  assert.equal(b.readUInt32LE(binStart)+binStart+8,b.length);
});

test('GLB is the primary character asset while legacy geometry remains an offline fallback',()=>{
  assert.match(world,/new THREE\.GLTFLoader/);
  assert.match(world,/\.\/models\/tobito-v4\.glb/);
  assert.match(world,/sculpture\.gesture=/);
  assert.match(world,/tbt:opening:progress/);
  assert.match(world,/host\.dataset\.model='procedural-fallback'/);
  assert.match(world,/host\.dataset\.model='glb-v4'/);
  assert.match(world,/Rig/);
  assert.match(world,/requestAnimationFrame/);
});

test('GLB is contained to the new /3d/ experience and original games are preserved',()=>{
  const html=fs.readFileSync(path.join(root,'3d/index.html'),'utf8');
  assert.match(html,/src="https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.128\.0\/examples\/js\/loaders\/GLTFLoader\.js"/);
  assert.match(html,/src="\.\/world\.js"/);
  for(const p of ['assets/js/game.js','assets/js/yakitori-game.js','assets/js/wind-tunnel.js','legacy.html'])
    assert.ok(fs.existsSync(path.join(root,p)));
});
