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
    // Preserve material color rather than bleaching out the entire floor and face.
    renderer.toneMappingExposure = .88;
    if(window.innerWidth > 870){renderer.shadowMap.enabled = true;renderer.shadowMap.type = THREE.PCFSoftShadowMap;}
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
  // Frame Tobito prominently from the very first rendered frame.
  camera.position.set(.5,3.5,8.6);
  const lookAt = new THREE.Vector3(-1.45,1.72,0);
  camera.lookAt(lookAt);
  const ambient=new THREE.HemisphereLight(0xf7e5d5,0x1c2b3d,.95);
  const sun=new THREE.DirectionalLight(0xffd6a6,1.35);
  sun.position.set(-14,20,19);
  const fill=new THREE.DirectionalLight(0xaccff7,.62);
  fill.position.set(12,8,-20);
  scene.add(ambient,sun,fill);
  const rim = new THREE.DirectionalLight(0xffe7bd,.55);
  rim.position.set(6,9,-9);
  scene.add(rim);

  const mat=(color,roughness=.75,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const cream=mat(0xfffcf2),blue=mat(0x315ca7,.65),ink=mat(0x203347),red=mat(0xe53634);
  const yellow=mat(0xf5cf45),white=mat(0xfaf4dc),aluminum=mat(0x92aebb,.48,.4);
  const glass=mat(0xa6d7e4,.22,.32);
  const runwayMat=mat(0x3a4b5e,.94),stripeMat=mat(0xf8dba8,.93),groundMat=mat(0x424b56,.93);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(400,410),groundMat);
  ground.rotation.x=-Math.PI/2;ground.position.set(0,-.18,-145);ground.receiveShadow=true;scene.add(ground);
  const road=new THREE.Mesh(new THREE.PlaneGeometry(18,275),runwayMat);
  road.rotation.x=-Math.PI/2;road.position.set(0,-.15,-111);road.receiveShadow=true;scene.add(road);
  for(let z=22;z>=-236;z-=10){
    const dash=new THREE.Mesh(new THREE.PlaneGeometry(.24,3.7),stripeMat);
    dash.rotation.x=-Math.PI/2;dash.position.set(0,-.12,z);
    scene.add(dash);
  }
  const sidePaint=mat(0xf1b45a,.9);
  // Two gently bending illuminated runway lines, no hard rectangular rails.
  for(const side of [-1,1]){
    const points=[];
    for(let i=0;i<=28;i++){
      const z=24-i*9.2;
      points.push(new THREE.Vector3(side*(8.65+.08*Math.sin(i*.32)),-.105,z));
    }
    const guide=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),128,.048,8,false),sidePaint);
    scene.add(guide);
  }

  function box(parent,w,h,d,material,x=0,y=0,z=0){
    const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    o.position.set(x,y,z);parent.add(o);return o;
  }
  function ball(parent,x,y,z,scale,material){
    const m=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),material);
    m.position.set(x,y,z);m.scale.set(...scale);parent.add(m);return m;
  }
  function curvedBeam(parent,points,radius,material){
    const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)),false,'catmullrom',.35);
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,42,radius,10,false),material);
    parent.add(mesh);
    return mesh;
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

  // Sculpted, smoothly beveled official-shape companion with an animation rig.
  let sculpture = window.TobitoCharacter?.create(THREE);
  if (!sculpture) {
    renderer.dispose();
    host.removeChild(canvas);
    document.documentElement.classList.add('world-fallback');
    return;
  }
  const {walker,guideRing} = sculpture;
  let {body,face,comb,arms,legs} = sculpture;
  scene.add(walker);

  // Load the newly authored v4 mesh from a reproducible GLB generator, not the old round-cheek v3.
  // The procedural rig stays as an immediate no-network fallback. The model
  // is imported only when the visitor approaches the actual 3D experience.
  let modelRequested=false;
  let actualModel=null;
  function loadSculptedGLB() {
    if(modelRequested || typeof THREE.GLTFLoader!=='function') return;
    modelRequested=true;
    const loader=new THREE.GLTFLoader();
    loader.load('./models/tobito-v4.glb', gltf=>{
      if(!active || !gltf?.scene)return;
      const imported=gltf.scene;
      const rig=imported.getObjectByName('Body_Rig');
      const importedFace=imported.getObjectByName('Face_Gaze');
      const importedComb=imported.getObjectByName('Comb_Sway');
      const wings=[imported.getObjectByName('Wing_Left_Pivot'),imported.getObjectByName('Wing_Right_Pivot')];
      const feet=[imported.getObjectByName('Leg_Left_Pivot'),imported.getObjectByName('Leg_Right_Pivot')];
      const eyes=[imported.getObjectByName('Eye_Left_Blink'),imported.getObjectByName('Eye_Right_Blink')];
      if(!rig || !importedFace || !importedComb || [...wings,...feet,...eyes].every(Boolean)===false)return;
      imported.traverse(obj=>{
        if(obj.isMesh){obj.castShadow=renderer.shadowMap.enabled;obj.receiveShadow=renderer.shadowMap.enabled;}
      });
      const previousBody=body;
      walker.add(imported);
      walker.remove(previousBody);
      body=rig;face=importedFace;comb=importedComb;
      arms=wings.map((group,i)=>({group,side:i===0?-1:1}));
      legs=feet.map((group,i)=>({group,side:i===0?-1:1}));
      const gaitBase=rig.position.y;
      sculpture.gesture=(time,walking,flying)=>{
        const phase=time*.009,weight=walking?1:0;
        legs.forEach(({group,side})=>group.rotation.x=Math.sin(phase+side*Math.PI*.5)*.52*weight);
        arms.forEach(({group,side})=>{
          group.rotation.x=walking?Math.sin(phase+side*Math.PI*.5)*.32:Math.sin(time*.0018+side)*.04;
          group.rotation.z=side*(flying?.36+Math.sin(phase*1.2)*.20:.12+Math.abs(Math.sin(phase))*.12*weight);
        });
        body.rotation.z=walking?Math.sin(phase)*.047:Math.sin(time*.001)*.012;
        body.position.y=gaitBase+(walking?Math.abs(Math.sin(phase))*.085:Math.sin(time*.0015)*.032);
        const blink=(time*.00107+1.9)%5.6;
        for(const eye of eyes)eye.scale.y=blink<.13?Math.max(.12,Math.abs(blink-.065)/.065):1;
        comb.rotation.z=Math.sin(phase*.6)*.045;
      };
      actualModel=imported;
      host.dataset.model='glb-v4';
      renderer.render(scene,camera);
    },undefined,error=>{
      host.dataset.model='procedural-fallback';
      // No exception in the animation loop: the visitor still sees Tobito.
      console.warn('Tobito GLB unavailable, using existing character rig.',error);
    });
  }
  window.addEventListener('tbt:opening:progress',event=>{
    if(Number(event.detail?.progress)>.22)loadSculptedGLB();
  });
  if(window.location.hash && window.location.hash!=='#top')loadSculptedGLB();
  // A restrained contact shadow anchors Tobito even on low-end GPUs.
  const shadowCanvas=document.createElement('canvas');
  shadowCanvas.width=128;shadowCanvas.height=128;
  const shadowContext=shadowCanvas.getContext('2d');
  if(shadowContext){
    const grad=shadowContext.createRadialGradient(64,64,8,64,64,63);
    grad.addColorStop(0,'rgba(7,20,32,.55)');grad.addColorStop(.48,'rgba(7,20,32,.20)');grad.addColorStop(1,'rgba(7,20,32,0)');
    shadowContext.fillStyle=grad;shadowContext.fillRect(0,0,128,128);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.3,2.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    shadow.rotation.x=-Math.PI/2;shadow.position.set(0,.03,0);walker.add(shadow);
  }
  if(renderer.shadowMap.enabled){
    sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-14;sun.shadow.camera.right=14;
    sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;
    sun.shadow.camera.near=1;sun.shadow.camera.far=55;
    sun.shadow.bias=-.00035;
    walker.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
  }

  // Warm workshop near the START; metal hangar farther along the runway.
  const workshop=new THREE.Group();scene.add(workshop);
  const wallMat=mat(0x3c4859,.88),beamMat=mat(0x25394b,.76,.27);
  [-1,1].forEach(side=>{
    // Recessed walls retain structural credibility without dominating the arches.
    box(workshop,1.15,8.9,31,wallMat,side*13,4.35,1);
    for(let i=0;i<5;i++){
      const z=-13+i*7;
      const pillar=new THREE.Mesh(new THREE.CylinderGeometry(.34,.42,8.8,18),beamMat);
      pillar.position.set(side*11.75,4.4,z);workshop.add(pillar);
    }
    // Curved porthole window (SphereGeometry is supported by Three.js r128).
    ball(workshop,side*12.4,5.3,-10,[.16,1.42,.7],glass);
  });
  const roof=new THREE.Group();scene.add(roof);
  const ribMat=mat(0x718f99,.48,.29);
  const luminousRib=new THREE.MeshBasicMaterial({color:0xe8b67a,transparent:true,opacity:.56});
  for(let i=0;i<7;i++){
    const z=12-i*6;
    const arch=[[-12,0,z],[-12,5.5,z],[-10,8.6,z],[-6,10.8,z],[0,11.55,z],[6,10.8,z],[10,8.6,z],[12,5.5,z],[12,0,z]];
    curvedBeam(roof,arch,.16,ribMat);
    // A finer warm line follows the upper curvature and makes the ceiling readable.
    curvedBeam(roof,arch.slice(2,7).map(p=>[p[0],p[1]-.22,p[2]-.1]),.035,luminousRib);
    if(i===1 || i===4){
      const lamp=new THREE.PointLight(0xffd5a2,.8,18,2);
      lamp.position.set(0,9,z);roof.add(lamp);
    }
    ball(roof,0,10.5,z,[.28,.15,.28],mat(0xffd6a9,.3));
  }
  const sign=textSign('とびとくん基地','#19334b','#ffe4a0');
  sign.position.set(0,5,-23);scene.add(sign);
  // Low-contrast environmental details break up the empty game-engine runway.
  const floorStripe=mat(0x8492a0,.9);
  for(let z=-24;z<16;z+=4){
    for(const side of [-1,1])box(scene,1.5,.03,.16,floorStripe,side*7.4,-.085,z);
  }
  const crates=mat(0x977b65,.84);
  for(const side of [-1,1])for(let i=0;i<3;i++){
    const unit=new THREE.Group();
    unit.position.set(side*10.15,-.01,-10+i*6);
    const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.72,.76,1.45,28,1),crates);
    barrel.position.y=.76;unit.add(barrel);
    for(const y of [.2,1.25]){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.75,.047,8,32),beamMat);
      ring.rotation.x=Math.PI/2;ring.position.y=y;unit.add(ring);
    }
    scene.add(unit);
  }

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
  // Airfoil profile instead of a 40-metre rectangular slab. Symbolic, not exact S-320 data.
  const airfoil=new THREE.Shape();
  airfoil.moveTo(-1.45,0);
  airfoil.bezierCurveTo(-1.1,.14,-.45,.22,.12,.16);
  airfoil.bezierCurveTo(.62,.08,1.1,.045,1.45,0);
  airfoil.bezierCurveTo(.88,-.085,.2,-.12,-.48,-.07);
  airfoil.bezierCurveTo(-1.0,-.03,-1.35,-.01,-1.45,0);
  const airfoilGeometry=new THREE.ExtrudeGeometry(airfoil,{
    depth:40,steps:1,bevelEnabled:true,bevelThickness:.1,bevelSize:.10,
    bevelSegments:5,curveSegments:12
  });
  airfoilGeometry.translate(0,0,-20);
  const wing=new THREE.Mesh(airfoilGeometry,mat(0xe5e7e4,.46,.25));
  wing.rotation.y=Math.PI/2;wing.position.set(0,6,-16);
  hangar.add(wing);
  ball(hangar,-20,6,-16,[.85,.14,1.35],aluminum);
  ball(hangar,20,6,-16,[.85,.14,1.35],aluminum);
  ball(hangar,0,4.9,-17,[.72,.64,7.1],aluminum);
  ball(hangar,0,5,-23,[4,.11,.32],aluminum);
  ball(hangar,0,6.2,-23.5,[.12,1.5,.38],aluminum);
  const propeller=new THREE.Group();propeller.position.set(0,4.9,-7.1);hangar.add(propeller);
  const bladeA=ball(propeller,0,0,0,[.19,2.6,.13],aluminum);
  const bladeB=ball(propeller,0,0,0,[2.6,.19,.13],aluminum);
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
  const milestones=['prologue-section','about','poses','play','oddities','wind-lab','hangar','goods','takeoff'];
  let targetProgress=0,currentProgress=0;
  let lastPosition=0,lastWalkTime=0,flapUntil=0,extraTurn=0,lastFrame=0;
  let active=true,stopped=false,arcadePaused=false,openingPaused=document.documentElement.classList.contains('opening-at-top'),raf=0,audioOn=false,audioCtx=null,windAudio=null,windGain=null,lastFootstep=0;
  const backgrounds=[
    new THREE.Color(0x293748), new THREE.Color(0x4a5c72),
    new THREE.Color(0xc17c6c), new THREE.Color(0xb67f89),
    new THREE.Color(0x586a79), new THREE.Color(0x667f87),
    new THREE.Color(0x556774), new THREE.Color(0xc7dfcd), new THREE.Color(0x79c5ed)
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
    sculpture.gesture(time,walking&&!stopped,ending>.1||time<flapUntil);
    guideRing.rotation.z=time*.00035;
    // Transform from the garage to sunset, hangar and bright lake.
    const bg=progressPalette(p);
    const hud=document.getElementById('world-chapter-name');
    if(hud){
      const labels=['BASE / 合流地点','出発 / 工房の外へ','TRAINING / 滑走路','FIELD TEST / 追い風','LOST & FOUND / 迷子','WIND LAB / 風洞','HANGAR / 大きな翼','GOODS / 研究所','TAKEOFF / 琵琶湖'];
      const id=Math.min(labels.length-1,Math.floor(p*(labels.length-1)+.02));
      if(hud.textContent!==labels[id])hud.textContent=labels[id];
    }
    scene.background.copy(bg);scene.fog.color.copy(bg);
    scene.fog.density=smooth(.008,.0045,ease((p-.7)/.3));
    ambient.intensity=smooth(.95,1.6,ease((p-.72)/.28));
    const dusk=ease((p-.18)/.2),day=ease((p-.73)/.27);
    sun.color.set(0xffd6a6).lerp(new THREE.Color(0xeaa4ac),dusk).lerp(new THREE.Color(0xffffff),day);
    sun.intensity=smooth(1.35,2.3,day);
    lake.material.color.set(0x2679a8).lerp(new THREE.Color(0x349bcc),day);
    // Chase shot initially faces Tobito. The hangar pulls the camera back and up.
    const wingShot=ease((p-.68)/.12);
    const skyShot=ease((p-.86)/.14);
    const pointer = window.TobitoPointerState;
    const cursorX = pointer?.active ? pointer.x : 0;
    const cursorY = pointer?.active ? pointer.y : 0;
    const desiredCamX=smooth(.35,2.0,turn)+Math.sin(p*11)*.55+cursorX*.62;
    const desiredCamY=smooth(3.5,5.3,turn)+wingShot*5.5+skyShot*10.5;
    const desiredCamZ=pathZ+smooth(7.9,15.5,turn)+wingShot*15+skyShot*12;
    camera.position.lerp(new THREE.Vector3(desiredCamX,desiredCamY,desiredCamZ),Math.min(1,dt*3.4));
    const compositionalOffset = window.innerWidth < 700 ? -.55 : -1.45;
    const desiredLook=new THREE.Vector3(compositionalOffset*(1-turn)+cursorX*.48,1.75+wingShot*5+skyShot*4-cursorY*.26,pathZ-smooth(0,15,turn)-wingShot*7-skyShot*22);
    body.rotation.y = cursorX*.08;
    face.rotation.y = cursorX*.12;
    face.rotation.x = -cursorY*.09;
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
  function startLoop(){if(!raf && active && !stopped && !arcadePaused && !openingPaused && !document.hidden){lastFrame=0;raf=requestAnimationFrame(animateScene);}}
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
  // The hero is an illustration on first paint: don't burn GPU frames
  // rendering a world the visitor cannot yet see.
  window.addEventListener('tbt:opening:progress',event=>{
    const next=Number(event.detail?.progress) < .67;
    if(next===openingPaused)return;
    openingPaused=next;
    if(openingPaused){stopLoop();if(audioOn)audioCtx?.suspend();}
    else if(!stopped && !arcadePaused && !document.hidden){startLoop();if(audioOn)audioCtx?.resume();}
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
    else if(!stopped && !arcadePaused && !openingPaused){startLoop();if(audioOn)audioCtx?.resume();}
  });
  window.addEventListener('pagehide',()=>{stopLoop();if(audioCtx)audioCtx.suspend();});
  window.addEventListener('pageshow',()=>{scrollToProgress();if(!stopped && !arcadePaused && !openingPaused)startLoop();});
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
