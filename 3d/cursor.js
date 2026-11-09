/* Curious Tobito cursor: pupil tracking, tiny wind trails, click surprises.
   Enabled only on fine-pointer, non-reduced-motion devices.
   Touch clicks still trigger a tiny burst. Pointer events never blocked. */
(() => {
  'use strict';
  const reduced = window.matchMedia?.('(prefers-reduced-motion:reduce)').matches ?? false;
  if(reduced)return;
  const fine = window.matchMedia?.('(hover:hover) and (pointer:fine)').matches ?? false;
  const symbols=['✦','✳','∴','➶','↑','🐔','✈','？','風','卵'];
  let count=0,seen=0,lastX=0,lastY=0,lastTrail=0,raf=0;
  const pos={x:0,y:0},smooth={x:-130,y:-130};
  const state={x:0,y:0,active:false};window.TobitoPointerState=state;
  let cursor;
  function makeCursor(){
    cursor=document.createElement('div');
    cursor.className='tobito-cursor';cursor.setAttribute('aria-hidden','true');
    cursor.innerHTML='<i class="tobito-cursor-ring"></i><i class="tobito-cursor-comb"></i><i class="tobito-cursor-eye"></i><i class="tobito-cursor-beak"></i><span class="tobito-cursor-caption">いっしょに？</span>';
    document.body.appendChild(cursor);
  }
  if(fine)makeCursor();
  function cap(n,a,b){return Math.min(b,Math.max(a,n));}
  function draw(){
    raf=0;
    if(!fine || !state.active || !cursor)return;
    smooth.x+=(pos.x-smooth.x)*.28;
    smooth.y+=(pos.y-smooth.y)*.28;
    cursor.style.transform='translate3d('+(smooth.x-37)+'px,'+(smooth.y-37)+'px,0)';
    cursor.style.setProperty('--cursor-eye-x',(state.x*3).toFixed(2)+'px');
    cursor.style.setProperty('--cursor-eye-y',(state.y*3).toFixed(2)+'px');
    document.documentElement.style.setProperty('--look-x',(state.x*4).toFixed(2));
    document.documentElement.style.setProperty('--look-y',(state.y*4).toFixed(2));
    if(Math.abs(pos.x-smooth.x)+Math.abs(pos.y-smooth.y)>0.5)raf=requestAnimationFrame(draw);
  }
  function trail(x,y){
    if(count>=25)return;
    const el=document.createElement('span');
    el.className='cursor-wind-trail';
    el.style.setProperty('--trail-x',x+'px');
    el.style.setProperty('--trail-y',y+'px');
    document.body.appendChild(el);count++;
    el.addEventListener('animationend',()=>{el.remove();count--;},{once:true});
    window.setTimeout(()=>{if(el.isConnected){el.remove();count=Math.max(0,count-1);}},1100);
  }
  function spark(x,y,total=7){
    const n=Math.min(total,10);
    for(let i=0;i<n;i++){
      const el=document.createElement('span');el.className='cursor-burst';el.setAttribute('aria-hidden','true');
      el.textContent=symbols[(seen+i*3)%symbols.length];
      el.style.setProperty('--burst-x',x+'px');el.style.setProperty('--burst-y',y+'px');
      el.style.setProperty('--burst-dx',Math.round(Math.cos(i/n*Math.PI*2)*(33+i*4))+'px');
      el.style.setProperty('--burst-dy',Math.round(Math.sin(i/n*Math.PI*2)*(33+i*4))+'px');
      el.style.setProperty('--burst-spin',Math.round(Math.random()*480-240)+'deg');
      document.body.appendChild(el);
      window.setTimeout(()=>el.remove(),1000);
    }
    seen++;
  }
  function interactive(el){
    return el?.closest('a,button,input,select,textarea,[role="button"],[data-goods-preview]');
  }
  document.addEventListener('pointermove',e=>{
    if(!fine || e.pointerType==='touch')return;
    pos.x=e.clientX;pos.y=e.clientY;
    state.x=cap(e.clientX/Math.max(1,window.innerWidth)*2-1,-1,1);
    state.y=cap(e.clientY/Math.max(1,window.innerHeight)*2-1,-1,1);
    state.active=true;cursor.classList.add('is-visible');
    const target=interactive(e.target);
    cursor.classList.toggle('is-action',!!target);
    const label=cursor.querySelector('.tobito-cursor-caption');
    if(label)label.textContent=target?.matches?.('[data-goods-preview]')?'めくる！':target?.closest?.('.arcade-showcase')?'遊ぶ！':target?.closest?.('#wind-lab')?'飛ぶ？':target?'押すトビ！':'こっちだよ';
    const dist=Math.hypot(e.clientX-lastX,e.clientY-lastY);
    if(dist>19 && performance.now()-lastTrail>44){trail(e.clientX,e.clientY);lastTrail=performance.now();lastX=e.clientX;lastY=e.clientY;}
    if(!raf)raf=requestAnimationFrame(draw);
  },{passive:true});
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse' && fine)cursor?.classList.add('is-down');
  },{passive:true});
  document.addEventListener('pointerup',e=>{
    if(e.pointerType==='mouse' && fine)cursor?.classList.remove('is-down');
    if(e.target.closest('input,textarea,select'))return;
    spark(e.clientX,e.clientY,e.pointerType==='touch'?3:6);
    const el=e.target.closest('.goods-print');
    if(el){el.classList.remove('cursor-secret-shiver');void el.offsetWidth;el.classList.add('cursor-secret-shiver');}
  },{passive:true});
  document.addEventListener('pointercancel',()=>cursor?.classList.remove('is-down'),{passive:true});
  document.addEventListener('pointerleave',()=>{state.active=false;cursor?.classList.remove('is-visible');},{passive:true});
  window.addEventListener('blur',()=>{state.active=false;cursor?.classList.remove('is-visible');});
})();
