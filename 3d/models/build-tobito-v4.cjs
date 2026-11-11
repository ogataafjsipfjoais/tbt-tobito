'use strict';
/** Reproducible source: run `node 3d/models/build-tobito-v4.cjs` */
const fs=require('node:fs');
const buildV4=function buildV4() {
  const version="v4.0";
  const byteParts=[], views=[],accessors=[],meshes=[],nodes=[],roots=[];
  const materials=[
    ["Feather porcelain", [0.955,.968,.950,1],.91,0],
    ["Feather shadow", [.823,.868,.872,1],.93,0],
    ["Workwear indigo", [.075,.265,.455,1],.88,0],
    ["Cloth piping", [.027,.143,.266,1],.92,0],
    ["Coral comb", [.91,.13,.105,1],.60,0],
    ["Ochre beak", [.985,.70,.17,1],.76,0],
    ["Beak underside", [.79,.47,.10,1],.85,0],
    ["Ink sleepy eyes", [.026,.041,.058,1],.49,0],
    ["Small eye shine", [.988,.993,.99,1],.3,0],
    ["Charcoal soles", [.039,.063,.079,1],.83,0],
    ["Nickel clasps", [.65,.75,.77,1],.46,.16],
    ["Blue stitch", [.18,.40,.59,1],.93,0],
    ["Feather featherlights", [.984,.993,.96,1],.95,0],
    ["Cloth pocket", [.058,.206,.361,1],.96,0]
  ].map(([name,color,rough,metal])=>({
    name, pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:metal,roughnessFactor:rough},doubleSided:true
  }));
  function appendBuffer(data,target) {
    let offset=byteParts.length;while(byteParts.length%4){byteParts.push(0);offset++;}
    const bytes=new Uint8Array(data.buffer,data.byteOffset,data.byteLength);
    for(let i=0;i<bytes.length;i++)byteParts.push(bytes[i]);
    return views.push({buffer:0,byteOffset:offset,byteLength:bytes.length,target})-1;
  }
  function makeNormals(p,idx) {
    const norm=Array(p.length).fill(0);
    for(let i=0;i<idx.length;i+=3){
      const a=idx[i]*3,b=idx[i+1]*3,c=idx[i+2]*3;
      const ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2];
      const vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];
      const x=uy*vz-uz*vy,y=uz*vx-ux*vz,z=ux*vy-uy*vx;
      for(const j of [a,b,c]){norm[j]+=x;norm[j+1]+=y;norm[j+2]+=z;}
    }
    for(let i=0;i<norm.length;i+=3){
      const inv=1/(Math.hypot(norm[i],norm[i+1],norm[i+2])||1);
      norm[i]*=inv;norm[i+1]*=inv;norm[i+2]*=inv;
    }
    return norm;
  }
  function emit(parent,name,material,p,idx) {
    if(p.length/3>65535)throw Error("Too many vertices: "+name);
    const normals=makeNormals(p,idx);
    const pv=appendBuffer(new Float32Array(p),34962);
    const nv=appendBuffer(new Float32Array(normals),34962);
    const iv=appendBuffer(new Uint16Array(idx),34963);
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<p.length;i+=3)for(let j=0;j<3;j++){
      lo[j]=Math.min(lo[j],p[i+j]); hi[j]=Math.max(hi[j],p[i+j]);
    }
    const pi=accessors.push({bufferView:pv,componentType:5126,count:p.length/3,type:"VEC3",min:lo,max:hi})-1;
    const ni=accessors.push({bufferView:nv,componentType:5126,count:p.length/3,type:"VEC3"})-1;
    const ii=accessors.push({bufferView:iv,componentType:5123,count:idx.length,type:"SCALAR"})-1;
    const mi=meshes.push({name,primitives:[{attributes:{POSITION:pi,NORMAL:ni},indices:ii,material}]})-1;
    const id=nodes.push({name,mesh:mi})-1;
    if(parent===null) roots.push(id); else nodes[parent].children.push(id);
    return id;
  }
  function group(name,pos=[0,0,0],parent=null) {
    const id=nodes.push({name,translation:pos,children:[]})-1;
    if(parent===null)roots.push(id);else nodes[parent].children.push(id);
    return id;
  }
  const signpow=(v,e)=>Math.sign(v)*Math.pow(Math.abs(v),e);
  function paramSurface(parent,name,material,rows,cols,evalP){
    const p=[],idx=[];
    for(let i=0;i<=rows;i++)for(let j=0;j<=cols;j++)p.push(...evalP(i/rows,j/cols));
    const stride=cols+1;
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
      const a=i*stride+j,b=a+stride;
      idx.push(a,b,a+1,b,b+1,a+1);
    }
    return emit(parent,name,material,p,idx);
  }
  function sculptLoft(parent,name,material,opts){
    const {center=[0,0,0],radius=[.3,.4,.3],facePower=2,rings=30,segments=44,
      profile=(c,s)=>[s,s,s],front=.5,shift=[0,0,0]}=opts;
    return paramSurface(parent,name,material,rings,segments,(u,v)=>{
      const a=Math.PI*u,s=Math.sin(a),ct=Math.cos(a),t=2*Math.PI*v;
      const shape=profile(ct,s),cross=2/facePower;
      const xx=signpow(Math.cos(t),cross),zz=signpow(Math.sin(t),cross);
      return [
        center[0]+shift[0]*ct+radius[0]*shape[0]*xx,
        center[1]+radius[1]*ct,
        center[2]+shift[2]*ct+radius[2]*shape[2]*zz*(zz>0?1:front)
      ];
    });
  }
  function oval(parent,name,mat,c,r,seg=34,ring=24,exp=2) {
    return sculptLoft(parent,name,mat,{center:c,radius:r,segments:seg,rings:ring,facePower:exp});
  }
  function closeTube(parent,name,mat,points,rad=.02,segments=9) {
    // Three.js-style Catmull-Rom interpolation to avoid angular seams.
    const sample=[];
    for(let i=0;i<points.length-1;i++){
      const a=points[Math.max(0,i-1)],b=points[i],c=points[i+1],d=points[Math.min(points.length-1,i+2)];
      for(let j=0;j<7;j++){
        const t=j/7;
        const p=[0,1,2].map(k=>{
          const m0=(c[k]-a[k])*.5,m1=(d[k]-b[k])*.5;
          return (2*t**3-3*t*t+1)*b[k]+(t**3-2*t*t+t)*m0+(-2*t**3+3*t*t)*c[k]+(t**3-t*t)*m1;
        });
        sample.push(p);
      }
    }
    sample.push(points[points.length-1]);
    const p=[],idx=[],div=segments;
    for(let i=0;i<sample.length;i++){
      const next=sample[Math.min(sample.length-1,i+1)],prev=sample[Math.max(0,i-1)];
      const vx=next[0]-prev[0],vy=next[1]-prev[1],vz=next[2]-prev[2];
      const len=Math.hypot(vx,vy,vz)||1,tx=vx/len,ty=vy/len,tz=vz/len;
      let ax=tz,ay=0,az=-tx;
      if(Math.hypot(ax,ay,az)<.01){ax=1;ay=0;az=0;}
      const al=Math.hypot(ax,ay,az);ax/=al;az/=al;
      let bx=ty*az-tz*ay,by=tz*ax-tx*az,bz=tx*ay-ty*ax;
      const bl=Math.hypot(bx,by,bz)||1;bx/=bl;by/=bl;bz/=bl;
      for(let j=0;j<=div;j++){
        const ang=2*Math.PI*j/div,cos=Math.cos(ang),sin=Math.sin(ang);
        p.push(sample[i][0]+rad*(cos*ax+sin*bx),sample[i][1]+rad*(cos*ay+sin*by),sample[i][2]+rad*(cos*az+sin*bz));
      }
    }
    for(let i=0;i<sample.length-1;i++)for(let j=0;j<div;j++){
      const a=i*(div+1)+j,b=a+div+1;idx.push(a,b,a+1,b,b+1,a+1);
    }
    return emit(parent,name,mat,p,idx);
  }
  function triangleBeak(parent,name,material,points) {
    const p=points.flat(),idx=[0,1,3,1,2,3,2,0,3,0,2,1];
    emit(parent,name,material,p,idx);
  }
  function combSurface(parent) {
    const p=[],idx=[],count=96;
    const outline=[];
    const top =x=>2.115 +
      .31*Math.exp(-Math.pow((x+.285)/.132,2)) +
      .50*Math.exp(-Math.pow((x-.012)/.166,2)) +
      .31*Math.exp(-Math.pow((x-.307)/.142,2));
    for(let j=0;j<=count;j++){
      const x=-.50+j/count*1.01;
      outline.push([x,top(x)]);
    }
    for(let j=count;j>=0;j--){
      const x=-.50+j/count*1.01;
      outline.push([x,2.045-.028*Math.cos(Math.PI*(j/count-.5))]);
    }
    const cx=outline.reduce((v,q)=>v+q[0],0)/outline.length;
    const cy=outline.reduce((v,q)=>v+q[1],0)/outline.length;
    const n=outline.length;
    for(const zz of [.145,-.145])for(const q of outline)p.push(q[0],q[1],zz);
    p.push(cx,cy,.146,cx,cy,-.146);
    const frontCenter=n*2,backCenter=n*2+1;
    for(let i=0;i<n;i++){
      const next=(i+1)%n;
      idx.push(frontCenter,i,next,backCenter,n+next,n+i);
      idx.push(i,n+i,next,next,n+i,n+next);
    }
    emit(parent,"Comb | single scalloped silhouette",4,p,idx);
  }
  function sleeve(parent,side,name,from,to,material) {
    return paramSurface(parent,name,material,34,32,(u,v)=>{
      const x=from+(to-from)*u;
      const yy=-.12-.025*u+.025*Math.sin(Math.PI*u);
      const zz=.03+.055*u;
      const taper=(1-.42*u);
      return [side*x, yy+(.235*taper)*Math.cos(v*Math.PI*2),zz+(.25*taper)*Math.sin(v*Math.PI*2)];
    });
  }
  // Rig names kept compatible with existing scroll/pose controls.
  const root=group("TOBITO | V4 / art-directed silhouette");
  const body=group("Body_Rig",[0,1.27,0],root);
  const face=group("Face_Gaze",[0,0,0],body);
  const comb=group("Comb_Sway",[0,0,-.015],body);
  const left=group("Wing_Left_Pivot",[-.56,.31,-.06],body);
  const right=group("Wing_Right_Pivot",[.56,.31,-.06],body);
  const legLeft=group("Leg_Left_Pivot",[-.32,-.51,0],body);
  const legRight=group("Leg_Right_Pivot",[.32,-.51,0],body);

  // The v3 "round cheek balls" have been removed completely. Head is ONE loft.
  sculptLoft(face,"Head | tapered soft squoval, flat facial plane",0,{
    center:[0,1.19,-.005],radius:[.835,.875,.535],rings:57,segments:84,
    facePower:3.65,front:.80,profile:(ct,s)=>{
      // wide upper temples, narrowing toward chin, without a sharp box corner
      const lower=Math.max(0,-ct),upper=Math.max(0,ct);
      return [
        Math.pow(s,.59)*(1+.075*upper-.16*Math.pow(lower,1.6)),
        1,
        Math.pow(s,.64)*(1-.06*lower+.04*upper)
      ];
    }
  });
  // Head back feather cap follows the same contour, slightly offset along Z.
  oval(body,"Nape | tucked feather shape",0,[0,.72,-.40],[.47,.34,.19],36,26,2.6);

  // Small, wider-spaced sleepy eyes; no eyebrow arches painted as round cheeks.
  for(const side of [-1,1]){
    const eye=group(side<0?"Eye_Left_Blink":"Eye_Right_Blink",[side*.357,1.28,.544],face);
    oval(eye,"Eye | narrow ink "+side,7,[0,0,.021],[.067,.108,.029],28,20,2.6);
    oval(eye,"Eye | micro-glint "+side,8,[-.014,.040,.049],[.016,.023,.008],18,12);
    closeTube(eye,"Eyelid | rested gaze "+side,1,
      [[-.081,.099,.053],[-.043,.115,.053],[0,.117,.055],[.057,.103,.051],[.085,.075,.043]],.018);
  }
  // Separate upper and lower sections are angular wedges, never a round nose.
  triangleBeak(face,"Beak | subtle wedge upper",5,[
    [-.153,1.095,.558],[.153,1.095,.558],[0,.967,.599],[0,1.035,.835]
  ]);
  triangleBeak(face,"Beak | thin lower",6,[
    [-.107,.973,.575],[.107,.973,.575],[0,.897,.595],[0,.968,.717]
  ]);
  combSurface(comb);

  // Suit is one tailor-shaped shell, not a ball with disconnected oval plates.
  sculptLoft(body,"Jumpsuit | tapered tailored volume",2,{
    center:[0,-.075,-.065],radius:[.635,.67,.424],rings:42,segments:58,facePower:3,
    profile:(ct,s)=>[
      Math.pow(s,.72)*(1-.12*Math.max(0,ct)),
      1,
      Math.pow(s,.72)*(1-.06*Math.max(0,ct))
    ]
  });
  oval(body,"White collar | plumage",0,[0,.468,.003],[.445,.185,.325],44,24,2.6);
  sculptLoft(body,"Bib | continuous overalls panel",2,{
    center:[0,.18,.380],radius:[.408,.36,.103],rings:28,segments:48,facePower:3.2,
    profile:(c,s)=>[Math.pow(s,.60),1,Math.pow(s,.72)]
  });
  closeTube(body,"Left suspender seam",11,[[-.321,.433,.416],[-.33,.28,.47],[-.317,.07,.483]],.014);
  closeTube(body,"Right suspender seam",11,[[.321,.433,.416],[.33,.28,.47],[.317,.07,.483]],.014);
  closeTube(body,"Pocket seam",11,[[-.187,.025,.493],[-.11,-.075,.510],[0,-.098,.515],[.12,-.075,.510],[.188,.025,.493]],.012);
  for(const side of [-1,1])oval(body,"Nickel suspender stud "+side,10,[side*.312,.389,.482],[.033,.032,.018],20,14);

  for(const side of [-1,1]){
    const arm=side<0?left:right,leg=side<0?legLeft:legRight;
    sleeve(arm,side,"Wing sleeve | tapered cloth "+side,.0,.78,2);
    sleeve(arm,side,"Wing feathers | unified pale silhouette "+side,.72,1.17,0);
    // three fine sculpted feather tips, little enough not to read as mittens
    for(let k=0;k<3;k++){
      closeTube(arm,"Feather score "+side+" / "+k,1,
        [[side*.925,-.19+k*.065,.145],[side*1.01,-.19+k*.065,.164],[side*1.10,-.20+k*.064,.159]],.007);
    }
    sculptLoft(leg,"Leg cloth | custom tapered "+side,2,{
      center:[side*.012,-.275,.005],radius:[.22,.395,.225],rings:30,segments:36,facePower:2.8,
      profile:(c,s)=>[Math.pow(s,.8)*(1+.03*c),1,Math.pow(s,.77)]
    });
    // Sole and toe are ONE elongated footwear silhouette, not black sphere feet.
    sculptLoft(leg,"Shoe | elongated low-profile "+side,9,{
      center:[side*.028,-.695,.195],radius:[.31,.145,.385],rings:25,segments:40,facePower:2.6,
      profile:(c,s)=>[Math.pow(s,.55),1,Math.pow(s,.65)]
    });
    closeTube(leg,"Toe highlight "+side,3,
      [[side*.20,-.66,.49],[side*.045,-.64,.52],[-side*.19,-.66,.49]],.012);
  }
  for(const dx of [-.18,0,.18]){
    oval(body,"Tail | feathered back "+dx,0,[dx,-.20,-.416],[.20,.26,.18],32,23,2.4);
  }
  const gltf={
    asset:{version:"2.0",generator:"TBT original Tobito v4 silhouette-focused GLB generator"},
    scene:0,scenes:[{name:"Tobito v4",nodes:roots}],nodes,meshes,materials,
    buffers:[{byteLength:byteParts.length}],bufferViews:views,accessors,
    extras:{version,design:"Small sleepy eyes / thin wedge beak / unified comb / tapered non-spherical head / no rosy cheek spheres",
      rig:"Body_Rig, Face_Gaze, Comb_Sway, Wing_Left_Pivot, Wing_Right_Pivot, Leg_Left_Pivot, Leg_Right_Pivot, Eye_Left_Blink, Eye_Right_Blink",
      authoredAs:"independent glTF binary with individual authored loft topology; not a screenshot"}
  };
  function utf8(str){const out=[];for(let i=0;i<str.length;i++){const code=str.charCodeAt(i);
    if(code<128)out.push(code);
    else if(code<2048)out.push(192|(code>>6),128|(code&63));
    else out.push(224|(code>>12),128|((code>>6)&63),128|(code&63));
  }return out;}
  const j= utf8(JSON.stringify(gltf));while(j.length%4)j.push(32);
  const bin=byteParts;while(bin.length%4)bin.push(0);
  const output=new Uint8Array(12+8+j.length+8+bin.length);
  const dv=new DataView(output.buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,output.byteLength,true);
  dv.setUint32(12,j.length,true);dv.setUint32(16,0x4e4f534a,true);
  output.set(j,20);
  const off=20+j.length;dv.setUint32(off,bin.length,true);dv.setUint32(off+4,0x004e4942,true);output.set(bin,off+8);
  return {output,report:{
    fileBytes:output.length,meshes:meshes.length,vertices:accessors.filter(a=>a.type==="VEC3").filter((a,i)=>i%2===0).reduce((s,x)=>s+x.count,0),
    nodes:nodes.length,materials:materials.length, binaryBytes:bin.length,headRows:57,headColumns:84,
    hasNoseBall:meshes.some(m=>/round nose|cheek ball/i.test(m.name))
  },json:gltf};
};
const built=buildV4();
fs.writeFileSync(require('node:path').join(__dirname,'tobito-v4.glb'),built.output);
console.log(JSON.stringify(built.report,null,2));
