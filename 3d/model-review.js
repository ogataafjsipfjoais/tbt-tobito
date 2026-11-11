(() => {
  'use strict';
  const stage=document.getElementById('model-stage'),status=document.getElementById('model-status');
  if(!stage)return;
  if(!window.THREE || !THREE.GLTFLoader || !window.WebGLRenderingContext){
    status.textContent='この環境では3D表示に対応していません。原画とGLBファイルは確認できます。';return;
  }
  const reduced=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches??false;
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}
  catch(e){status.textContent='3D描画を開始できませんでした。';return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.03;
  stage.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden','true');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(34,1,.1,100);
  const hemi=new THREE.HemisphereLight(0xf9f2df,0x243f56,1.55);
  const key=new THREE.DirectionalLight(0xffeed1,2.2);key.position.set(-4,8,8);
  const fill=new THREE.DirectionalLight(0x9bdbee,1.0);fill.position.set(5,4,-6);
  scene.add(hemi,key,fill);
  const root=new THREE.Group();scene.add(root);
  const ground=new THREE.Mesh(new THREE.CircleGeometry(2.7,80),new THREE.MeshBasicMaterial({color:0xbed6cd,transparent:true,opacity:.15}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.02;scene.add(ground);
  const loader=new THREE.GLTFLoader();
  let model=null,yaw=0,targetYaw=0,zoom=7.6,drag=false,lastX=0,pointer=0,spinning=false,frame=0,last=0,visible=true;
  const models={v4:'./models/tobito-v4.glb',v3:'./models/tobito-v3.glb'};
  const cache=new Map();
  let modelRequest=0;
  const animate=(time)=>{
    frame=0;if(document.hidden||!visible)return;
    if(time-last>=20){
      last=time;
      if(spinning)targetYaw+=.007;
      yaw+=(targetYaw-yaw)*.12;root.rotation.y=yaw;
      camera.position.set(0,2.2,zoom);camera.lookAt(0,1.88,0);
      renderer.render(scene,camera);
    }
    frame=requestAnimationFrame(animate);
  };
  function start(){if(!frame&&!document.hidden&&visible)frame=requestAnimationFrame(animate);}
  function resize(){
    const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    renderer.render(scene,camera);
  }
  function showVersion(version) {
    if(!Object.prototype.hasOwnProperty.call(models,version))return;
    const request=++modelRequest;
    document.querySelectorAll('[data-model-version]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.modelVersion===version));
    });
    status.textContent=version==='v4'?'新しいv4モデルを読み込み中…':'以前のv3モデルを読み込み中…';
    function present(sceneObject){
      if(request!==modelRequest)return;
      if(model)root.remove(model);
      model=sceneObject;root.add(model);
      targetYaw=0;yaw=0;
      status.textContent=(version==='v4'?'NEW v4':'OLD v3')+'：ドラッグ・左右キーで360°確認できます。';
      resize();start();
    }
    if(cache.has(version)){present(cache.get(version));return;}
    loader.load(models[version],gltf=>{
      if(!gltf?.scene){if(request===modelRequest)status.textContent='モデルが空でした。';return;}
      cache.set(version,gltf.scene);
      present(gltf.scene);
    },undefined,()=>{
      if(request===modelRequest)status.textContent='GLBを読み込めませんでした。通信環境をご確認ください。';
    });
  }
  document.querySelectorAll('[data-model-version]').forEach(button=>{
    button.addEventListener('click',()=>showVersion(button.dataset.modelVersion));
  });
  const requestedVersion=new URLSearchParams(window.location.search).get('model');
  showVersion(Object.prototype.hasOwnProperty.call(models,requestedVersion)?requestedVersion:'v4');
  stage.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag=true;pointer=e.pointerId;lastX=e.clientX;stage.setPointerCapture?.(pointer);stage.focus({preventScroll:true});});
  stage.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==pointer)return;targetYaw+=(e.clientX-lastX)*.012;lastX=e.clientX;});
  const release=()=>{drag=false;pointer=0;};
  stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);stage.addEventListener('lostpointercapture',release);
  stage.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.min(11,Math.max(5.3,zoom+Math.sign(e.deltaY)*.38));},{passive:false});
  stage.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();targetYaw+=e.key==='ArrowLeft'?-.23:.23;start();}
    if(e.key==='Home'){e.preventDefault();targetYaw=0;spinning=false;}
  });
  document.getElementById('rotate-left')?.addEventListener('click',()=>{targetYaw-=Math.PI/4;start();});
  document.getElementById('rotate-right')?.addEventListener('click',()=>{targetYaw+=Math.PI/4;start();});
  document.getElementById('reset-view')?.addEventListener('click',()=>{targetYaw=0;zoom=7.6;spinning=false;document.getElementById('toggle-spin').setAttribute('aria-pressed','false');document.getElementById('toggle-spin').textContent='自動回転する';start();});
  document.getElementById('toggle-spin')?.addEventListener('click',e=>{spinning=!spinning;e.currentTarget.setAttribute('aria-pressed',String(spinning));e.currentTarget.textContent=spinning?'回転を止める':'自動回転する';start();});
  if(reduced)document.getElementById('toggle-spin').title='動きを減らす設定が有効です。手動で操作できます。';
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(stage);else window.addEventListener('resize',resize);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);if(visible)start();else if(frame){cancelAnimationFrame(frame);frame=0;}}).observe(stage);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();else if(frame){cancelAnimationFrame(frame);frame=0;}});
  stage.addEventListener('webglcontextlost',e=>{e.preventDefault();visible=false;if(frame)cancelAnimationFrame(frame);frame=0;status.textContent='3D描画が停止しました。ページを再読み込みしてください。';});
  window.addEventListener('pagehide',()=>{if(frame)cancelAnimationFrame(frame);renderer.dispose();});
  resize();
})();