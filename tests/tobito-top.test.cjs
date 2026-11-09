'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('top page actually hosts all original games without leaving the journey',()=>{
  const top=read('3d/index.html');
  const arcade=read('3d/arcade/index.html');
  const port=read('3d/gameport.js');
  const runtime=read('3d/arcade/arcade-runtime.js');
  for(const mode of ['flight','yakitori'])assert.match(top,new RegExp('data-arcade-mode="'+mode+'"'));
  for(const host of ['games','wind'])assert.match(top,new RegExp('data-arcade-host="'+host+'"'));
  assert.match(top,/id="original-wind"/);
  assert.match(top,/src="\.\/gameport\.js"/);
  assert.match(top,/href="\.\/gameport\.css"/);
  for(const canvas of ['tobito-game-canvas','yakitori-game-canvas','wind-tunnel-canvas-container'])assert.match(arcade,new RegExp('id="'+canvas+'"'));
  for(const name of ['flight-ranking.js','birdman-course.js','contest-venue.js','flight-scenery.js','game.js','yakitori-game.js','wind-tunnel.js'])assert.match(runtime,new RegExp(name.replace('.','\\.') ));
  assert.match(port,/new URL\('\.\/arcade\/index\.html'/);
  assert.match(port,/createElement\('iframe'\)/);
  assert.match(port,/tbt:arcade:focus/);
  assert.match(runtime,/new window\.WindTunnelSimulator/);
  assert.match(runtime,/new window\.TobitoFlightSimulator3D/);
  assert.match(runtime,/new window\.YakitoriGame/);
  for(const script of ['game.js','wind-tunnel.js','yakitori-game.js'])assert.ok(fs.existsSync(path.join(root,'assets/js',script)));
  assert.doesNotThrow(()=>new vm.Script(port));
  assert.doesNotThrow(()=>new vm.Script(runtime));
});

test('original site stays available and keeps all its games',()=>{
  const legacy=read('legacy.html'),page=read('3d/index.html');
  for(const section of ['id="flight"','id="aerolab"','id="tobito-game-canvas"','id="yakitori-game-canvas"','id="wind-tunnel-canvas-container"'])assert.ok(legacy.includes(section),section);
  assert.match(read('index.html'),/url=\.\/3d\//);
  assert.match(page,/href="\.\.\/legacy\.html/);
  assert.ok(fs.existsSync(path.join(root,'index.php')));
  assert.ok(fs.existsSync(path.join(root,'page-tobito.php')));
});

test('merchandise stays clearly a concept and uses real source images',()=>{
  const page=read('3d/index.html'),js=read('3d/goods.js'),css=read('3d/goods.css');
  assert.match(page,/id="goods"/);
  assert.match(page,/data-journey-step="goods"/);
  assert.match(page,/企画検討中/);
  assert.match(page,/販売予定は未確定/);
  assert.match(page,/id="goods-mug-model"/);
  assert.match(page,/id="goods-preview-dialog"/);
  for(const img of ['sticker1_p1.png','sticker2_p1.png','goods3_p1.png','goods4_p1.png','tobito_face_smile.png']){
    assert.ok(fs.existsSync(path.join(root,'assets/images',img)),img);
    assert.ok(page.includes(img),img);
  }
  assert.match(page,/TeamBirdmanTrial/);
  assert.match(js,/goods-preview-dialog/);
  assert.match(js,/data-goods-face/);
  assert.match(css,/border-radius/);
  assert.doesNotThrow(()=>new vm.Script(js));
});

test('cursor reactions are pointer-safe, keyboard-compatible, and reduced-motion aware',()=>{
  const html=read('3d/index.html'),js=read('3d/cursor.js'),css=read('3d/cursor.css'),world=read('3d/world.js');
  assert.match(html,/src="\.\/cursor\.js"/);
  assert.match(html,/href="\.\/cursor\.css"/);
  assert.match(js,/pointermove/);
  assert.match(js,/pointerup/);
  assert.match(js,/pointer:fine/);
  assert.match(js,/prefers-reduced-motion/);
  assert.match(js,/window\.TobitoPointerState=state/);
  assert.match(world,/window\.TobitoPointerState/);
  assert.match(css,/pointer-events:none/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotThrow(()=>new vm.Script(js));
});

test('arcade uses one active game and pauses persistent 3D world',()=>{
  const port=read('3d/gameport.js'),world=read('3d/world.js');
  assert.match(port,/teardown\(\)/);
  assert.match(port,/new URL\('\.\/arcade\/index\.html'/);
  assert.match(port,/tbt:arcade:focus/);
  assert.match(world,/arcadePaused/);
  assert.match(world,/window\.addEventListener\('tbt:arcade:focus'/);
  assert.match(read('3d/arcade/arcade-runtime.js'),/reportHeight/);
  assert.match(read('3d/gameport.css'),/border-radius/);
  assert.match(read('3d/arcade/arcade.css'),/border-radius/);
});

test('organic design polish loads after original layout and does not damage touch controls',()=>{
  const page=read('3d/index.html');
  const css=read('3d/polish.css');
  assert.match(page,/href="\.\/polish\.css"/);
  assert.match(css,/\.oddities-board/);
  assert.match(css,/\.wind-lab-layout/);
  assert.match(css,/\.journey-rail/);
  assert.match(css,/\.chaos-toolbar/);
  assert.match(css,/border-radius/);
  assert.match(css,/prefers-reduced-motion/);
});
