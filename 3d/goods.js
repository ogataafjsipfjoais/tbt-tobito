/* Merchandise concept lab: locally preview mascot artwork. No commerce or orders. */
(() => {
'use strict';
const mug=document.getElementById('goods-hero-visual');
const face=document.getElementById('goods-mug-face');
const buttons=[...document.querySelectorAll('[data-goods-face]')];
const variants={smile:'tobito_face_smile.png',angry:'tobito_face_angry.png',cry:'tobito_face_cry.png'};
for(const b of buttons)b.addEventListener('click',()=>{
  const asset=variants[b.dataset.goodsFace];
  if(!asset)return;
  face.src='../assets/images/'+asset;
  buttons.forEach(x=>{let yes=x===b;x.classList.toggle('is-active',yes);x.setAttribute('aria-pressed',String(yes));});
});
let raf=0;
if(mug && window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion:reduce)').matches){
  mug.addEventListener('pointermove',e=>{
    const r=mug.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/r.width,y=(e.clientY-r.top-r.height/2)/r.height;
    if(raf)return;
    raf=requestAnimationFrame(()=>{
      mug.style.setProperty('--goods-x',String(Math.max(-90,Math.min(90,x*100))));
      mug.style.setProperty('--goods-y',String(Math.max(-90,Math.min(90,y*100))));
      raf=0;
    });
  },{passive:true});
  mug.addEventListener('pointerleave',()=>{mug.style.setProperty('--goods-x','0');mug.style.setProperty('--goods-y','0');});
}
const dialog=document.getElementById('goods-preview-dialog');
const picture=document.getElementById('goods-preview-img');
const caption=document.getElementById('goods-preview-caption');
const close=document.getElementById('goods-preview-close');
let previous=null;
const shut=()=>{
  if(!dialog||dialog.hidden)return;
  dialog.hidden=true;
  document.body.classList.remove('goods-dialog-open');
  previous?.focus({preventScroll:true});
};
for(const b of document.querySelectorAll('[data-goods-preview]')){
  b.addEventListener('click',()=>{
    previous=b;
    picture.src=b.dataset.goodsPreview;
    picture.alt=b.dataset.goodsCaption||'とびとくん画像の拡大表示';
    caption.textContent=b.dataset.goodsCaption||'';
    dialog.hidden=false;
    close?.focus({preventScroll:true});
  });
}
close?.addEventListener('click',shut);
dialog?.addEventListener('click',e=>{if(e.target===dialog)shut();});
document.addEventListener('keydown',e=>{
  if(!dialog?.hidden && e.key==='Escape')shut();
  if(!dialog?.hidden && e.key==='Tab'){
    e.preventDefault();close?.focus({preventScroll:true});
  }
});
})();
