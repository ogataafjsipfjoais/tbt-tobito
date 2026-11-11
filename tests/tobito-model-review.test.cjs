'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('review studio loads same standalone GLB as the main world',()=>{
 const html=read('3d/model-review.html'),js=read('3d/model-review.js'),world=read('3d/world.js');
 assert.match(html,/id="model-stage"/);
 assert.match(html,/id="model-status"/);
 assert.match(html,/assets\/images\/tobito_pose_airplane\.png/);
 assert.match(js,/models\/tobito-v3\.glb/);
 assert.match(world,/models\/tobito-v3\.glb/);
 assert.ok(fs.statSync(path.join(root,'3d/models/tobito-v3.glb')).size>100000);
 assert.doesNotThrow(()=>new vm.Script(js));
});
test('review studio is interactive and safe on keyboard and touch',()=>{
 const html=read('3d/model-review.html'),js=read('3d/model-review.js');
 for(const id of ['rotate-left','rotate-right','toggle-spin','reset-view'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/tabindex="0"/);
 assert.match(js,/ArrowLeft/);
 assert.match(js,/ArrowRight/);
 assert.match(js,/Home/);
 assert.match(js,/pointerdown/);
 assert.match(js,/touchAction|pointermove/);
 assert.match(js,/prefers-reduced-motion/);
 assert.match(js,/webglcontextlost/);
});
test('main character profile exposes model inspection without modifying original site',()=>{
 assert.match(read('3d/index.html'),/href="\.\/model-review\.html"/);
 assert.match(read('3d/polish.css'),/\.model-review-link/);
 assert.ok(fs.statSync(path.join(root,'legacy.html')).size>30000);
});
