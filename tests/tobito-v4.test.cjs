'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const full=p=>path.join(root,p);
test('v4 is a standalone indexed-mesh GLB, not the old sphere-based v3',()=>{
 const file=fs.readFileSync(full('3d/models/tobito-v4.glb'));
 assert.ok(file.length>300000&&file.length<3*1024*1024,'bounded model download');
 assert.equal(file.toString('ascii',0,4),'glTF');
 assert.equal(file.readUInt32LE(4),2);
 assert.equal(file.readUInt32LE(8),file.length);
 const len=file.readUInt32LE(12);
 const gltf=JSON.parse(file.subarray(20,20+len).toString('utf8'));
 assert.equal(gltf.asset.version,'2.0');
 assert.ok(gltf.meshes.length>=30);
 assert.ok(gltf.materials.length>=10);
 assert.ok(gltf.accessors.some(a=>a.count>4000),'high-detail head mesh');
 assert.equal(gltf.buffers.length,1);
 assert.equal(gltf.buffers[0].uri,undefined);
 assert.equal(file.toString('ascii',20+len+4,20+len+8),'BIN\0');
 assert.equal(file.readUInt32LE(20+len)+20+len+8,file.length);
 const meshNames=gltf.meshes.map(m=>m.name);
 assert.ok(meshNames.some(m=>m.includes('tapered soft squoval')));
 assert.ok(meshNames.some(m=>m.includes('single scalloped silhouette')));
 assert.ok(meshNames.some(m=>m.includes('subtle wedge upper')));
 assert.ok(!meshNames.some(m=>/Cheek feather|Blush|Beak root|round nose|Cheek warmth/i.test(m)),'old rosy-cheek / round nose shapes may not return');
 for(const key of ['Body_Rig','Face_Gaze','Comb_Sway','Wing_Left_Pivot','Wing_Right_Pivot','Leg_Left_Pivot','Leg_Right_Pivot','Eye_Left_Blink','Eye_Right_Blink'])
   assert.ok(gltf.nodes.some(n=>n.name===key),'missing rig: '+key);
 for(const m of gltf.meshes)for(const prim of m.primitives){
   const ai=gltf.accessors[prim.attributes.POSITION],ni=gltf.accessors[prim.attributes.NORMAL],ii=gltf.accessors[prim.indices];
   assert.equal(ai.count,ni.count,'normals and positions must align');
   assert.equal(ii.count%3,0,'indexed triangle list required');
 }
});
test('v4 generator is checked in, and both world and review use v4 first',()=>{
 const builder=fs.readFileSync(full('3d/models/build-tobito-v4.cjs'),'utf8');
 assert.match(builder,/const buildV4=/);
 assert.match(builder,/function buildV4/);
 assert.match(builder,/tobito-v4\.glb/);
 assert.doesNotThrow(()=>new vm.Script(builder));
 const world=fs.readFileSync(full('3d/world.js'),'utf8');
 const review=fs.readFileSync(full('3d/model-review.js'),'utf8');
 const html=fs.readFileSync(full('3d/model-review.html'),'utf8');
 assert.match(world,/tobito-v4\.glb/);
 assert.match(world,/glb-v4/);
 assert.match(review,/v4:'\.\/models\/tobito-v4\.glb'/);
 assert.match(review,/v3:'\.\/models\/tobito-v3\.glb'/);
 assert.match(html,/data-model-version="v4" aria-pressed="true"/);
 assert.match(html,/data-model-version="v3" aria-pressed="false"/);
});
test('legacy files are preserved and not replaced with the v4 model',()=>{
 for(const f of ['legacy.html','assets/js/game.js','assets/js/yakitori-game.js','assets/js/wind-tunnel.js','3d/models/tobito-v3.glb'])
 assert.ok(fs.existsSync(full(f)),f);
});
