/**
 * Tobito Flight World — one continuous WebGL journey, not a hero widget.
 * Three.js r128; procedural cartoon mascot, runway, hangar, S-320-inspired
 * silhouette (NOT an exact airframe model), lake, whimsical flying debris.
 * Existing exact S-320 GLB viewer remains separate and loads on visitor request.
 */
(() => {
  'use strict';
  const host = document.getElementById('journey-world');
  const motionButton = document.getElementById('world-motion');
  const soundButton = document.getElementById('world-sound');
  const sectionHero = document.getElementById('prologue-section');
  const rotateButton = document.getElementById('tobito-3d-rotate');
  const flapButton = document.getElementById('tobito-3d-flap');
  const resetButton = document.getElementById('tobito-3d-reset');
  if (!host || !sectionHero) return;
  const prefersLess = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
  if (prefersLess || lowMemory || !window.THREE || !window.WebGLRenderingContext) {
    document.documentElement.classList.add('world-fallback');
    if (motionButton) motionButton.textContent = '2D表示中';
    return;
  }
  const THREE = window.THREE;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({antialias:window.innerWidth>700,alpha:false,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,window.innerWidth<760?1.25:1.55));
    renderer.setSize(Math.max(1,window.innerWidth),Math.max(1,window.innerHeight));
    renderer.setClearColor(0x293d52,1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.23;
  } catch (error) {
    document.documentElement.classList.add('world-fallback');
    return;
  }
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden','true');
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x293748);
  scene.fog = new THREE.FogExp2(0x293748,.008);
  const camera = new THREE.PerspectiveCamera(48,window.innerWidth/window.innerHeight,.12,520);
  camera.position.set(1.0,3.3,16);
  const lookAt = new THREE.Vector3(0,1.8,0);
  camera.lookAt(lookAt);
  const ambient=new THREE.HemisphereLight(0xf6dac3,0x2a354b,1.25);
  const sun=new THREE.DirectionalLight(0xffd6a6,2.3);
  sun.position.set(-14,20,19);
  const fill=new THREE.DirectionalLight(0xaccff7,.85);
  fill.position.set(12,8,-20);
  scene.add(ambient,sun,fill);

  const mat=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const cream=mat(0xfffcf2),blue=mat(0x315ca7,.65),ink=mat(0x203347),red=mat(0xe53634);
  const yellow=mat(0xf5cf45),white=mat(0xfaf4dc),aluminum=mat(0x92aebb,.48,.4);
  const glass=mat(0xa6d7e4,.22,.32);
  const runwayMat=mat(0x68777f,.94),stripeMat=mat(0xe8e0bc,.93),groundMat=mat(0x82827a,.93);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,410),groundMat);
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-.18,-145);scene.add(ground);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(18,275),runwayMat);
  road.rotation.x=-Math.PI/2;road.position.set(0,-.15,-111);scene.add(road);
  for(let z=22;z>=-236;z-=10){
    const dash=new THREE.Mesh(new THREE.PlaneGeometry(.24,3.7),stripeMat);
    dash.rotation.x=-Math.PI/2;dash.position.set(0,-.12,z);
    scene.add(dash);
  }
  const sidePaint=mat(0xc5a965,.9);
  [-8.7,8.7].forEach(x=>{
    const edge=new THREE.Mesh(new THREE.BoxGeometry(.12,.028,265),sidePaint);
    edge.position.set(x,-.115,-108);scene.add(edge);
  });

  function box(parent,w,h,d,material,x=0,y=0,z=0){
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    o.position.set(x,y,z);parent.add(o);return o;
  }
  function ball(parent,x,y,z,scale,material){
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,15,12),material);
    m.position.set(x,y,z);m.scale.set(...scale);parent.add(m);return m;
  }
  function extrude(parent,points,material,depth=.3,z=0){
    const shape=new THREE.Shape();
    points.forEach((p,i)=>i?shape.lineTo(p[0],p[1]):shape.moveTo(p[0],p[1]));
    shape.closePath();
    const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.035,bevelThickness:.025,steps:1}),material);
    mesh.position.z=z;parent.add(mesh);return mesh;
  }
  function textSign(message,fg='#153b5d',bg='#fff3c7'){
    const cv=document.createElement('canvas');cv.width=512;cv.height=144;
    const c=cv.getContext('2d');
    c.fillStyle=bg;c.fillRect(0,0,512,144);
    c.strokeStyle=fg;c.lineWidth=10;c.strokeRect(4,4,504,136);
    c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font='bold 48px sans-serif';
    c.fillText(message,256,72,470);
    const texture=new THREE.CanvasTexture(cv);
    const m=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true});
    return new THREE.Mesh(new THREE.PlaneGeometry(5.1,1.4),m);
  }

  // Continuous 3D mascot. Every limb is independently rigged and animated.
  const walker=new THREE.Group();scene.add(walker);
  const body=new THREE.Group();walker.add(body);
  const headBack=extrude(body,[[-.77,.49],[.77,.49],[.82,1.7],[-.82,1.7]],ink,.58,-.19);
  const head=extrude(body,[[-.72,.54],[.72,.54],[.76,1.64],[-.76,1.64]],cream,.58,-.125);
  const comb=extrude(body,[[-.22,1.69],[-.3,2.05],[-.05,2.45],[.16,2.53],[.42,2.35],[.3,2.18],[.5,2.03],[.28,1.88],[.04,1.84]],red,.25,-.07);
  const faceFront=.47;
  [-.35,.35].forEach(x=>{
    ball(body,x,1.27,faceFront,[.074,.16,.04],ink);
    ball(body,x-.025,1.31,faceFront+.035,[.025,.045,.015],white);
    const brow=box(body,.3,.045,.06,ink,x,1.55,.45);
    brow.rotation.z=x>0?-.2:.2;
  });
  ball(body,0,1.03,.5,[.18,.115,.07],ink);
  ball(body,0,1.045,.55,[.145,.073,.05],yellow);
  ball(body,.065,.94,.54,[.09,.043,.03],yellow);
  // Blue engineering suit extends below head.
  box(body,1.05,.96,.64,ink,0,.05,-.21);
  box(body,.98,.89,.67,blue,0,.05,-.17);
  box(body,.035,.72,.05,ink,0,.02,.20);
  box(body,.28,.16,.055,cream,.29,.19,.24);
  const collar=box(body,.58,.16,.1,blue,0,.52,.05);collar.rotation.z=.03;

  const arms=[],legs=[];
  [-1,1].forEach(side=>{
    const arm=new THREE.Group();arm.position.set(side*.57,.40,-.19);body.add(arm);
    const sleeve=box(arm,.9,.26,.34,blue,side*.45,0,0);sleeve.rotation.z=-side*.04;
    ball(arm,side*.99,-.005,.05,[.22,.12,.15],cream);arms.push({group:arm,side});
    const leg=new THREE.Group();leg.position.set(side*.3,-.43,-.13);body.add(leg);
    box(leg,.31,.67,.36,blue,0,-.33,0);
    box(leg,.45,.20,.42,ink,side*.05,-.69,.13);legs.push({group:leg,side});
  });
  body.position.y=1.64;
  const originalX=0;
  walker.scale.setScalar(1.0);
  // An energetic pilot scarf makes turns visible from behind.
  extrude(body,[[-.26,.35],[.24,.34],[.08,.22],[-.11,.19]],red,.09,-.57);
  const guideRing=new THREE.Mesh(new THREE.TorusGeometry(1.28,.017,6,65),new THREE.MeshBasicMaterial({color:0xffc85e,transparent:true,opacity:.48}));
  guideRing.rotation.x=Math.PI/2;guideRing.position.set(0,.02,0);walker.add(guideRing);

  // Warm workshop near the START; metal hangar farther along the runway.
  const workshop=new THREE.Group();scene.add(workshop);
  const wallMat=mat(0x455465,.87),beamMat=mat(0x33404d,.75,.22);
  [-1,1].forEach(side=>{
    box(workshop,3.2,9,32,wallMat,side*13,4.35,1);
    for(let i=0;i<5;i++)box(workshop,.28,10,.35,beamMat,side*11.4,5,-13+i*7);
    const windowPane=box(workshop,.07,2.4,2.8,glass,side*11.31,5.3,-11);
    windowPane.rotation.y=0;
  });
  const roof=new THREE.Group();scene.add(roof);
  for(let i=0;i<7;i++){
    const z=12-i*6;
    box(roof,30,.28,.35,beamMat,0,9,z);
    if(i===1 || i===4){
      const lamp=new THREE.PointLight(0xffd5a2,1.3,20,2);
      lamp.position.set(0,8.1,z);roof.add(lamp);
    }
    ball(roof,0,8.1,z,[.48,.13,.48],mat(0xffd6a9,.3));
  }
  const sign=textSign('とびとくん基地','#19334b','#ffe4a0');
  sign.position.set(0,5,-23);scene.add(sign);

  // Several absurd props float over the runway and respond to the camera.
  const props=[];
  function sillyProp(i){
    const grp=new THREE.Group();
    const z=-38-i*14;
    grp.position.set(i%2?-13:13,3+(i%3)*1.7,z);
    if(i%3===0){
      // Ramen bowl with absurd wings.
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.78,.52,.55,18),mat(0xffe0a6));
      grp.add(bowl);ball(grp,0,.31,0,[.7,.13,.7],mat(0xe4b74a));
      box(grp,2.4,.08,.55,cream,0,.12,0);
    } else if(i%3===1){
      // Floating refrigerator.
      box(grp,1.5,2.8,1.3,mat(0xd5e8eb),0,0,0);
      box(grp,.1,.35,.15,ink,.48,.32,.74);
      box(grp,2.2,.12,.7,cream,0,1.2,0);
    } else {
      // Giant screw.
      const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1.8,12),aluminum);
      grp.add(shaft);box(grp,.9,.2,.9,aluminum,0,1,0);
    }
    scene.add(grp);props.push(grp);
  }
  for(let i=0;i<10;i++)sillyProp(i);

  // The hangar contains a symbolic 40m-scale wing; the original GLB is in the clickable viewer.
  const hangar=new THREE.Group();hangar.position.z=-155;scene.add(hangar);
  const hangarFloor=new THREE.Mesh(new THREE.PlaneGeometry(66,64),mat(0x445564,.85));
  hangarFloor.rotation.x=-Math.PI/2;hangarFloor.position.y=-.14;hangar.add(hangarFloor);
  [-30,30].forEach(x=>{
    box(hangar,.85,18,.9,aluminum,x,9,-5);
    box(hangar,.85,18,.9,aluminum,x,9,14);
  });
  box(hangar,63,.8,.8,beamMat,0,18,-5);box(hangar,63,.8,.8,beamMat,0,18,14);
  for(let i=0;i<6;i++)box(hangar,63,.18,.15,aluminum,0,17.5,-12+i*6);
  const wing=box(hangar,40,.19,2.3,mat(0xe5e7e4,.46,.25),0,6,-16);
  box(hangar,1.0,1.1,18,aluminum,0,4.9,-17);
  box(hangar,8,.08,.6,aluminum,0,5,-23);
  box(hangar,.15,3,.8,aluminum,0,6.1,-23.5);
  const propeller=new THREE.Group();propeller.position.set(0,4.9,-7.1);hangar.add(propeller);
  box(propeller,.22,5.1,.18,aluminum);box(propeller,5.1,.22,.18,aluminum);
  const wingSign=textSign('S-320 / ちょっと点検','#19334b','#dbecf4');
  wingSign.position.set(-15,11,13);hangar.add(wingSign);
  const hangarLamps=[];
  [-16,16].forEach(x=>{
    const lamp=new THREE.PointLight(0xd7edff,1.1,38,2);lamp.position.set(x,15,0);
    hangar.add(lamp);hangarLamps.push(lamp);
  });

  // The sky and the lake: the runway finally gives way to open water.
  const lakeMat=mat(0x2679a8,.37,.18);
  const lake=new THREE.Mesh(new THREE.PlaneGeometry(450,255,1,1),lakeMat);
  lake.rotation.x=-Math.PI/2;lake.position.set(0,-.07,-327);scene.add(lake);
  const cloudMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:.88});
  const clouds=[];
  for(let i=0;i<20;i++){
    const g=new THREE.Group();
    g.position.set((i%5-2)*30+(i%2)*11,22+(i%4)*4,-187-Math.floor(i/5)*35);
    for(let c=0;c<4;c++)ball(g,c*2.9-4.4,Math.sin(c)*.5,0,[3.9,1.0+(c%2),1.9],cloudMat);
    scene.add(g);clouds.push(g);
  }

  // Long camera choreography: looking back at Tobito -> chase view -> huge wing -> lake.
  const milestones=['prologue-section','about','poses','play','oddities','wind-lab','hangar','takeoff'];
  let targetProgress=0,currentProgress=0;
  let lastPosition=0,lastWalkTime=0,flapUntil=0,extraTurn=0,lastFrame=0;
  let active=true,stopped=false,arcadePaused=false,raf=0,audioOn=false,audioCtx=null,windAudio=null,windGain=null,lastFootstep=0;
  const backgrounds=[
    new THREE.Color(0x293748), new THREE.Color(0x4a5c72),
    new THREE.Color(0xc17c6c), new THREE.Color(0xb67f89),
    new THREE.Color(0x586a79), new THREE.Color(0x667f87),
    new THREE.Color(0x556774), new THREE.Color(0x79c5ed)
  ];
  function smooth(a,b,t){return a+(b-a)*t;}
  function ease(t){t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);}
  function scrollToProgress(){
    const y=window.scrollY;
    const positions=milestones.map(id=>{
      const el=document.getElementById(id);
      return el?el.offsetTop:0;
    });
    // The last scene should progress into the lake as the visitor reaches the pass.
    positions[positions.length-1]+=(document.getElementById('takeoff')?.offsetHeight||1000)*.5;
    let a=0;
    for(let i=0;i<positions.length-1;i++){
      if(y>=positions[i]){
        const length=Math.max(1,positions[i+1]-positions[i]);
        const fractional=Math.max(0,Math.min(1,(y-positions[i])/length));
        a=(i+fractional)/(positions.length-1);
      }
    }
    targetProgress=Math.max(0,Math.min(1,a));
  }
  function progressPalette(p){
    const scaled=p*(backgrounds.length-1);
    const ix=Math.min(backgrounds.length-2,Math.floor(scaled));
    return backgrounds[ix].clone().lerp(backgrounds[ix+1],ease(scaled-ix));
  }

  function animateScene(time){
    if(!active)return;
    if(document.hidden){raf=requestAnimationFrame(animateScene);return;}
    if(time-lastFrame<28){raf=requestAnimationFrame(animateScene);return;}
    const dt=Math.min(.08,Math.max(.014,(time-lastFrame)/1000||.033));lastFrame=time;
    const ratio=stopped?1:Math.min(1,dt*4.8);
    currentProgress=smooth(currentProgress,targetProgress,ratio);
    const p=currentProgress;
    const pathZ=-173*ease(p);
    const delta=Math.abs(pathZ-lastPosition);
    const walking=delta>.045 && p>.02 && p<.85;
    if(walking)lastWalkTime=time;
    lastPosition=pathZ;
    walker.position.z=pathZ;
    walker.position.x=Math.sin(p*22)*.43;
    const ending=ease((p-.88)/.12);
    walker.position.y=ending*9;
    const turn=ease(p/.105);
    walker.rotation.y=smooth(0,Math.PI,turn)+extraTurn;
    const cycle=time*.009;
    const stride=walking && !stopped?Math.sin(cycle)*.55:0;
    legs.forEach(({group,side})=>group.rotation.x=stride*side);
    arms.forEach(({group,side})=>{
      const flying=ending>.1||time<flapUntil;
      group.rotation.z=side*(flying?Math.sin(cycle*1.8)*.47:.15+Math.abs(stride)*.12);
      group.rotation.x=flying?.25:stride*.35;
    });
    body.rotation.z=walking?Math.sin(cycle)*.05:Math.sin(time*.001)*.015;
    body.position.y=1.64+(walking?Math.abs(Math.sin(cycle))*.08:Math.sin(time*.0015)*.035);
    guideRing.rotation.z=time*.00035;
    // Transform from the garage to sunset, hangar and bright lake.
    const bg=progressPalette(p);
    const hud=document.getElementById('world-chapter-name');
    if(hud){
      const labels=['BASE / 合流地点','出発 / 工房の外へ','TRAINING / 滑走路','FIELD TEST / 追い風','LOST & FOUND / 迷子','WIND LAB / 風洞','HANGAR / 大きな翼','TAKEOFF / 琵琶湖'];
      const id=Math.min(labels.length-1,Math.floor(p*(labels.length-1)+.02));
      if(hud.textContent!==labels[id])hud.textContent=labels[id];
    }
    scene.background.copy(bg);scene.fog.color.copy(bg);
    scene.fog.density=smooth(.008,.0045,ease((p-.7)/.3));
    ambient.intensity=smooth(1.05,2.0,ease((p-.72)/.28));
    const dusk=ease((p-.18)/.2),day=ease((p-.73)/.27);
    sun.color.set(0xffd6a6).lerp(new THREE.Color(0xeaa4ac),dusk).lerp(new THREE.Color(0xffffff),day);
    sun.intensity=smooth(2.0,3.2,day);
    lake.material.color.set(0x2679a8).lerp(new THREE.Color(0x349bcc),day);
    // Chase shot initially faces Tobito. The hangar pulls the camera back and up.
    const wingShot=ease((p-.68)/.12);
    const skyShot=ease((p-.86)/.14);
    const pointer = window.TobitoPointerState;
    const cursorX = pointer?.active ? pointer.x : 0;
    const cursorY = pointer?.active ? pointer.y : 0;
    const desiredCamX=smooth(.35,2.0,turn)+Math.sin(p*11)*.55+cursorX*.62;
    const desiredCamY=smooth(3.25,5.3,turn)+wingShot*5.5+skyShot*10.5;
    const desiredCamZ=pathZ+smooth(15,18,turn)+wingShot*15+skyShot*12;
    camera.position.lerp(new THREE.Vector3(desiredCamX,desiredCamY,desiredCamZ),Math.min(1,dt*3.4));
    const desiredLook=new THREE.Vector3(cursorX*.48,1.8+wingShot*5+skyShot*4-cursorY*.26,pathZ-smooth(0,15,turn)-wingShot*7-skyShot*22);
    body.rotation.y = cursorX*.08;
    lookAt.lerp(desiredLook,Math.min(1,dt*3.5));camera.lookAt(lookAt);
    propeller.rotation.z+=dt*2.3;
    props.forEach((g,i)=>{
      g.rotation.z=Math.sin(time*.0007+i)*.11;
      g.rotation.y+=dt*.08*(i%2?1:-1);
      g.position.y=(3+(i%3)*1.7)+Math.sin(time*.0012+i)*.35;
    });
    clouds.forEach((g,i)=>g.position.x+=Math.sin(time*.0005+i)*dt*.025);
    if(audioOn && windGain){
      windGain.gain.setTargetAtTime(smooth(.005,.022,ease(p)),audioCtx.currentTime,.12);
      if(walking && time-lastFootstep>240){footstep();lastFootstep=time;}
    }
    renderer.render(scene,camera);
    raf=requestAnimationFrame(animateScene);
  }
  function startLoop(){if(!raf && active && !stopped && !arcadePaused){lastFrame=0;raf=requestAnimationFrame(animateScene);}}
  function stopLoop(){if(raf)cancelAnimationFrame(raf);raf=0;}
  function resize(){
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    camera.aspect=w/h;camera.fov=w<680?59:48;camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,w<760?1.25:1.55));
    renderer.setSize(w,h,false);
    if(stopped && !arcadePaused)renderer.render(scene,camera);
  }
  function flap(){flapUntil=performance.now()+1600;if(stopped){stopped=false;motionButton?.setAttribute('aria-pressed','true');startLoop();}}
  rotateButton?.addEventListener('click',()=>{extraTurn+=Math.PI/2;flap();});
  flapButton?.addEventListener('click',flap);
  resetButton?.addEventListener('click',()=>{extraTurn=0;flap();});
  motionButton?.addEventListener('click',()=>{
    stopped=!stopped;
    motionButton.setAttribute('aria-pressed',String(!stopped));
    motionButton.textContent=stopped?'動きを再開':'動きを止める';
    if(stopped){stopLoop();renderer.render(scene,camera);}else startLoop();
  });
  function initAudio(){
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)return false;
    audioCtx=new Context();
    // Filtered pink-ish noise at very low level. No sound without explicit click.
    const buf=audioCtx.createBuffer(1,audioCtx.sampleRate*2,audioCtx.sampleRate);
    const data=buf.getChannelData(0);
    let prev=0;
    for(let i=0;i<data.length;i++){prev=.985*prev+.015*(Math.random()*2-1);data[i]=prev*.6;}
    windAudio=audioCtx.createBufferSource();windAudio.buffer=buf;windAudio.loop=true;
    const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=380;
    windGain=audioCtx.createGain();windGain.gain.value=0.006;
    windAudio.connect(filter);filter.connect(windGain);windGain.connect(audioCtx.destination);
    windAudio.start();
    return true;
  }
  function footstep(){
    if(!audioCtx||audioCtx.state!=='running')return;
    const sound=audioCtx.createOscillator();
    const gain=audioCtx.createGain();
    sound.type='sine';sound.frequency.setValueAtTime(120,audioCtx.currentTime);
    sound.frequency.exponentialRampToValueAtTime(55,audioCtx.currentTime+.085);
    gain.gain.setValueAtTime(.018,audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.095);
    sound.connect(gain);gain.connect(audioCtx.destination);
    sound.start();sound.stop(audioCtx.currentTime+.1);
  }
  soundButton?.addEventListener('click',async()=>{
    if(!audioCtx&&!initAudio()){soundButton.textContent='音声非対応';return;}
    audioOn=!audioOn;
    if(audioOn)await audioCtx.resume();
    else await audioCtx.suspend();
    soundButton.setAttribute('aria-pressed',String(audioOn));
    soundButton.textContent=audioOn?'音を消す':'音を鳴らす';
  });
  window.addEventListener('tbt:arcade:focus',event=>{
    const pause = !!event.detail?.pause;
    if(pause===arcadePaused)return;
    arcadePaused=pause;
    if(arcadePaused){stopLoop();if(audioOn)audioCtx?.suspend();}
    else if(!stopped && !document.hidden){startLoop();if(audioOn)audioCtx?.resume();}
  });
  window.addEventListener('scroll',scrollToProgress,{passive:true});
  window.addEventListener('resize',()=>{scrollToProgress();resize();},{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stopLoop();if(audioOn)audioCtx?.suspend();}
    else if(!stopped && !arcadePaused){startLoop();if(audioOn)audioCtx?.resume();}
  });
  window.addEventListener('pagehide',()=>{stopLoop();if(audioCtx)audioCtx.suspend();});
  window.addEventListener('pageshow',()=>{scrollToProgress();if(!stopped && !arcadePaused)startLoop();});
  canvas.addEventListener('webglcontextlost',event=>{
    event.preventDefault();active=false;stopLoop();
    document.documentElement.classList.remove('world-active');
    document.documentElement.classList.add('world-fallback');
    host.hidden=true;
  });
  scrollToProgress();
  resize();
  renderer.render(scene,camera);
  document.documentElement.classList.add('world-active');
  sectionHero.classList.add('tobito-3d-ready');
  if(motionButton)motionButton.setAttribute('aria-pressed','true');
  if(soundButton)soundButton.setAttribute('aria-pressed','false');
  window.Tobito3D={flap,reset(){extraTurn=0;flap();}};
  startLoop();
})();
