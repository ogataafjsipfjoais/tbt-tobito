/**
 * Tobito, character sculpture v2.
 *
 * Keeps the documented visual vocabulary without treating any particular
 * head geometry as mandatory: soft white face, red comb, sleepy eyes,
 * small golden beak, blue workwear and dark shoes.
 * Built as a small rig with smooth bevels, rounded seams and moving joints.
 * No external assets, character-texture network requests, or fake GLB claims.
 */
(function (root) {
  'use strict';
  function create(THREE) {
    if (!THREE) throw new Error('Three.js is required to sculpt Tobito');
    const skin = new THREE.MeshPhysicalMaterial({color:0xfffcf0,roughness:.83,clearcoat:.08,clearcoatRoughness:.8});
    const edge = new THREE.MeshStandardMaterial({color:0xe3ddd2,roughness:.89});
    const uniform = new THREE.MeshStandardMaterial({color:0x2d5ca1,roughness:.79});
    const seam = new THREE.MeshStandardMaterial({color:0x244982,roughness:.86});
    const shoes = new THREE.MeshStandardMaterial({color:0x222b38,roughness:.7});
    const combRed = new THREE.MeshPhysicalMaterial({color:0xe9423b,roughness:.48,clearcoat:.3,clearcoatRoughness:.34});
    const beakYellow = new THREE.MeshStandardMaterial({color:0xf5be41,roughness:.65});
    const eyeBlack = new THREE.MeshStandardMaterial({color:0x202b34,roughness:.58});
    const highlight = new THREE.MeshBasicMaterial({color:0xffffff});
    const metal = new THREE.MeshStandardMaterial({color:0xbfc9ca,metalness:.48,roughness:.42});

    const walker = new THREE.Group();
    walker.name = 'Tobito | sculpted companion';
    const body = new THREE.Group();
    body.name='Tobito | animation rig';
    walker.add(body);

    function oval(parent,x,y,z,sx,sy,sz,material) {
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),material);
      mesh.position.set(x,y,z);
      mesh.scale.set(sx,sy,sz);
      parent.add(mesh);
      return mesh;
    }
    function roundBox(parent,w,h,d,r,material,x,y,z) {
      const shape=new THREE.Shape(), left=-w/2,right=w/2,top=h/2,bottom=-h/2;
      const radius=Math.min(r,w/2-.01,h/2-.01);
      shape.moveTo(left+radius,bottom);
      shape.lineTo(right-radius,bottom);
      shape.quadraticCurveTo(right,bottom,right,bottom+radius);
      shape.lineTo(right,top-radius);
      shape.quadraticCurveTo(right,top,right-radius,top);
      shape.lineTo(left+radius,top);
      shape.quadraticCurveTo(left,top,left,top-radius);
      shape.lineTo(left,bottom+radius);
      shape.quadraticCurveTo(left,bottom,left+radius,bottom);
      const depth=Math.max(.04,d-.13);
      const geometry=new THREE.ExtrudeGeometry(shape,{
        steps:1,depth,
        bevelEnabled:true,bevelSegments:5,
        bevelSize:.065,bevelThickness:.065,
        curveSegments:9
      });
      geometry.translate(0,0,-depth/2);
      geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material);
      mesh.position.set(x,y,z);
      parent.add(mesh);
      return mesh;
    }
    function tube(parent,points,radius,material,segments=24){
      const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
      const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,radius,8,false),material);
      parent.add(mesh);return mesh;
    }
    // Use a continuous organic head silhouette, NOT a predetermined box.
    // The official 2D artwork is the source of identity; its outline can vary
    // across poses. A deformable egg/cheek volume reads naturally in 3D.
    function softHead(parent, width, height, depth, material, centerY, centerZ) {
      const geometry=new THREE.SphereGeometry(1,56,40);
      const position=geometry.attributes.position;
      for(let i=0;i<position.count;i++){
        const x=position.getX(i), y=position.getY(i), z=position.getZ(i);
        const cheek=Math.exp(-Math.pow((y+.33)/.34,2));
        const upper=Math.exp(-Math.pow((y-.78)/.28,2));
        // Lower cheeks are fuller, forehead is smooth, chin gently tapers.
        const widthAtY=1+.085*cheek-.08*upper-.025*Math.max(0,-y-.7);
        const softenedZ=Math.sign(z)*Math.pow(Math.abs(z),.78);
        position.setXYZ(i,x*width*widthAtY,y*height,softenedZ*depth);
      }
      position.needsUpdate=true;
      geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material);
      mesh.position.set(0,centerY,centerZ);
      parent.add(mesh);
      return mesh;
    }
    softHead(body,.90,.81,.49,edge,1.21,-.065);
    softHead(body,.88,.79,.49,skin,1.25,.005);
    // Raised soft cheeks merge visually into the head rather than forming
    // a pair of bolted-on oval blocks.
    oval(body,-.53,.96,.39,.28,.24,.16,skin);
    oval(body,.53,.96,.39,.28,.24,.16,skin);
    const face = new THREE.Group();
    face.name='Tobito | face and gaze';
    body.add(face);

    // The eyes have the character's iconic relaxed, slightly narrowed expression.
    const eyes=[];
    for(const side of [-1,1]){
      const eye=new THREE.Group();
      eye.position.set(side*.37,1.33,.493);
      oval(eye,0,0,0,.122,.159,.03,eyeBlack);
      oval(eye,-.026,.052,.029,.029,.035,.012,highlight);
      oval(eye,0,.123,.037,.145,.077,.06,skin); // sleepy lids
      tube(eye,[[-.17,.145,.055],[-.04,.175,.068],[.15,.14,.055]],.016,edge,12);
      face.add(eye);eyes.push(eye);
    }
    // Soft, separate upper/lower beak volumes; no sharp low-poly triangles.
    oval(face,0,1.055,.55,.21,.105,.20,beakYellow);
    const tip=oval(face,0,1.024,.69,.145,.076,.123,beakYellow);
    tip.rotation.x=-.18;
    oval(face,0,.965,.58,.14,.048,.14,beakYellow);
    // Red comb with three plump lobes, never a jagged polygon.
    const comb=new THREE.Group();
    comb.position.set(0,2.02,-.04);
    body.add(comb);
    oval(comb,-.26,.065,0,.2,.35,.16,combRed).rotation.z=-.32;
    oval(comb,-.04,.21,0,.24,.43,.19,combRed).rotation.z=-.12;
    oval(comb,.23,.065,0,.2,.30,.16,combRed).rotation.z=.35;
    oval(comb,.04,-.07,0,.44,.12,.15,combRed);

    // Workwear is a rounded fabric-like shape with hand-placed seams.
    const torso=roundBox(body,1.24,1.13,.82,.39,uniform,0,-.027,-.04);
    oval(body,0,.48,-.06,.47,.19,.32,skin);
    const bib=roundBox(body,.76,.60,.14,.22,uniform,0,.23,.40);
    tube(body,[[-.31,.41,.45],[-.32,.12,.475],[-.29,-.24,.47]],.025,seam,13);
    tube(body,[[.31,.41,.45],[.32,.12,.475],[.29,-.24,.47]],.025,seam,13);
    tube(body,[[-.31,.08,.485],[.0,.03,.485],[.31,.08,.485]],.017,seam,15);
    // Tiny pocket and metallic snap buttons; intentionally restrained detail.
    roundBox(body,.35,.24,.045,.11,seam,.0,.05,.494);
    for(const x of [-.31,.31])oval(body,x,.36,.485,.045,.045,.018,metal);

    const arms=[],legs=[];
    for(const side of [-1,1]){
      const arm=new THREE.Group();
      arm.position.set(side*.58,.31,-.05);
      arm.name=side<0?'Tobito | left wing':'Tobito | right wing';
      body.add(arm);
      const upper=oval(arm,side*.36,-.055,0,.51,.21,.29,uniform);
      upper.rotation.z=-side*.12;
      oval(arm,side*.75,-.065,.055,.29,.19,.21,skin);
      // Feather-like digits in their proper orientation, not cuboid hands.
      oval(arm,side*.93,-.014,.055,.18,.065,.09,skin).rotation.z=side*.19;
      oval(arm,side*.92,-.12,.065,.15,.052,.086,skin).rotation.z=-side*.10;
      arms.push({group:arm,side});
      const leg=new THREE.Group();
      leg.position.set(side*.33,-.48,-.04);
      body.add(leg);
      oval(leg,0,-.25,0,.23,.43,.24,uniform);
      oval(leg,side*.045,-.70,.18,.33,.17,.36,shoes);
      oval(leg,side*.07,-.75,.37,.29,.11,.20,shoes);
      legs.push({group:leg,side});
    }

    // Tail tucked behind the suit; becomes visible during the walk-away shot.
    for(const x of [-.29,0,.29]){
      oval(body,x,-.02,-.48,.21,.34,.23,skin).rotation.z=x*1.3;
    }

    // Place the shoes on the runway. Previous rig floated noticeably above it.
    body.position.y=1.28;
    walker.scale.setScalar(1);
    const guideRing=new THREE.Mesh(
      new THREE.TorusGeometry(1.03,.018,6,68),
      new THREE.MeshBasicMaterial({color:0xffdf9e,transparent:true,opacity:.25,depthWrite:false})
    );
    guideRing.rotation.x=Math.PI/2;
    guideRing.position.y=.02;
    walker.add(guideRing);

    // Directional gaze and controlled gestures, applied from the world camera.
    function gesture(elapsed,walking,flying,cursorX=0,cursorY=0) {
      const phase=elapsed*.009;
      const weight=walking?1:0;
      legs.forEach(({group,side})=>{
        group.rotation.x=Math.sin(phase+side*Math.PI*.5)*.53*weight;
      });
      arms.forEach(({group,side})=>{
        group.rotation.x=walking?Math.sin(phase+side*Math.PI*.5)*.35:Math.sin(elapsed*.0018+side)*.035;
        group.rotation.z=side*(flying ? 0.4+Math.sin(phase*1.2)*.24 : .12+Math.abs(Math.sin(phase))*.1*weight);
      });
      body.rotation.z=walking?Math.sin(phase)*.052:Math.sin(elapsed*.001)*.014;
      body.position.y=1.28+(walking?Math.abs(Math.sin(phase))*.09:Math.sin(elapsed*.0016)*.035);
      face.rotation.y=cursorX*.085;
      face.rotation.x=-cursorY*.065;
      // A short, infrequent blink. The face stays alive even when idle.
      const blinkPhase=(elapsed*.00107+1.9)%5.6;
      const blink=blinkPhase<.13 ? Math.max(.10,Math.abs(blinkPhase-.065)/.065) : 1;
      eyes.forEach(eye=>{eye.scale.y=blink;});
      comb.rotation.z=Math.sin(phase*.65)*.05;
    }
    return {walker,body,face,comb,arms,legs,guideRing,gesture,eyes,torso,bib};
  }
  root.TobitoCharacter={create};
})(typeof window!=='undefined'?window:globalThis);
