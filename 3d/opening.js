/**
 * A crafted opening sequence: illustrated mascot, interactive secret, camera parallax.
 * Stays independent of the WebGL world and never intercepts game keyboard controls.
 */
(() => {
  'use strict';
  const section = document.getElementById('prologue-section');
  const opening = document.getElementById('opening-sticky');
  const mascot = document.getElementById('opening-tobito');
  const speech = document.getElementById('opening-tobito-speech');
  const secret = document.getElementById('opening-secret');
  const announcement = document.getElementById('opening-secret-status');
  if (!section || !opening) return;

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;
  const phrases = [
    '見つかっちゃった！',
    'え、ラーメン飛んでる？',
    'ここで働いてるよ。',
    '空を飛びたいんだ。',
    'ネジ、知らない？',
    'ついてきて！'
  ];
  let phraseIndex = 0;
  let scrollTick = 0;
  let motionTick = 0;
  let lastX = 0, lastY = 0, surpriseTimer = 0;
  let discoveryCount = 0;

  function applyScroll() {
    scrollTick = 0;
    const progressRange = Math.max(1,section.offsetHeight-window.innerHeight);
    const fraction = Math.min(1,Math.max(0,-section.getBoundingClientRect().top/progressRange));
    opening.style.setProperty('--opening-progress',String(fraction.toFixed(3)));
    document.documentElement.classList.toggle('opening-at-top',fraction < .82);
    window.dispatchEvent(new CustomEvent('tbt:opening:progress',{detail:{progress:fraction}}));
    // Never keep a visible decorative message over the game area.
    if(fraction >= .82 && speech) speech.textContent='ついてきて！';
  }

  function onScroll() {
    if (!scrollTick) scrollTick=window.requestAnimationFrame(applyScroll);
  }

  function onPointerMove(event) {
    if (reduced || !finePointer) return;
    const rect = opening.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    lastX = (event.clientX/Math.max(1,rect.width) -.5)*26;
    lastY = (event.clientY/Math.max(1,rect.height)-.5)*13;
    if(motionTick) return;
    motionTick=window.requestAnimationFrame(()=>{
      motionTick=0;
      opening.style.setProperty('--hero-pointer-x',lastX.toFixed(1)+'px');
      opening.style.setProperty('--hero-pointer-y',lastY.toFixed(1)+'px');
    });
  }

  mascot?.addEventListener('click',()=>{
    if(speech) {
      phraseIndex=(phraseIndex+1)%phrases.length;
      speech.textContent=phrases[phraseIndex];
      speech.setAttribute('aria-hidden','false');
      window.clearTimeout(surpriseTimer);
      surpriseTimer=window.setTimeout(()=>speech?.setAttribute('aria-hidden','true'),3200);
    }
    mascot.classList.remove('is-surprised');
    void mascot.offsetWidth;
    mascot.classList.add('is-surprised');
    window.setTimeout(()=>mascot.classList.remove('is-surprised'),1100);
    announcement.textContent='とびと君：「'+phrases[phraseIndex]+'」';
    window.Tobito3D?.flap?.();
  });

  secret?.addEventListener('click',()=>{
    discoveryCount++;
    secret.innerHTML='<span aria-hidden="true">✓</span><small>発見！</small>';
    secret.setAttribute('aria-label','隠しネジを発見済み。もう一度押すと新しい反応が起こります');
    announcement.textContent=discoveryCount===1
      ? '隠しネジを発見！ とびと君が探していたネジかもしれません。'
      : 'ネジをまた拾いました。ここの床には一体いくつ落ちているのでしょう。';
    if(speech) speech.textContent=discoveryCount===1?'ぼくのネジだ！':'また見つけたの？';
    if(!reduced) {
      const trigger=document.getElementById('chaos-trigger');
      trigger?.click();
    }
  });

  document.addEventListener('pointermove',onPointerMove,{passive:true});
  window.addEventListener('scroll',onScroll,{passive:true});
  window.addEventListener('resize',onScroll,{passive:true});
  window.addEventListener('pageshow',applyScroll);
  window.addEventListener('pagehide',()=>{
    window.cancelAnimationFrame(scrollTick);
    window.cancelAnimationFrame(motionTick);
    window.clearTimeout(surpriseTimer);
  });
  applyScroll();
})();
