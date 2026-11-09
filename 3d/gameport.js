/**
 * Embedded original Tobito engines on the 3D homepage.
 * Only one original Three.js/game iframe exists at a time, to protect memory.
 * Never navigates to the legacy site, never alters its source.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const hosts = {
    games: document.querySelector('[data-arcade-frame="games"]'),
    wind: document.querySelector('[data-arcade-frame="wind"]')
  };
  const allowed = new Set(['flight','yakitori','wind']);
  const source = new URL('./arcade/index.html',window.location.href);
  let active = null;
  let pageVisible = true;
  let observer = null;

  function status(host,copy) {
    const el = document.querySelector('[data-arcade-status="'+host+'"]');
    if(el)el.textContent=copy;
  }

  function displaySelected(mode) {
    document.querySelectorAll('[data-arcade-mode]').forEach(button=>{
      const yes=button.dataset.arcadeMode===mode;
      button.classList.toggle('is-selected',yes);
      button.setAttribute('aria-pressed',String(yes));
    });
    const launch=document.querySelector('[data-arcade-launch="flight"]');
    if(launch)launch.textContent=mode==='yakitori'?'やきとり脱出を起動 ↗':'フライトゲームを起動 ↗';
    if(launch)launch.dataset.arcadeLaunch=mode;
  }

  function tellWorld(pause) {
    window.dispatchEvent(new CustomEvent('tbt:arcade:focus',{detail:{pause}}));
  }

  function updateFocus() {
    if(!active || !active.frame || !pageVisible)return tellWorld(false);
    const box=active.frame.getBoundingClientRect();
    const showing=box.top<window.innerHeight*.85&&box.bottom>window.innerHeight*.15;
    tellWorld(showing);
  }

  function teardown() {
    if(!active)return;
    active.frame.remove();
    const wrap=hosts[active.host];
    if(wrap){wrap.hidden=true;wrap.replaceChildren();}
    const placeholder=document.querySelector('[data-arcade-placeholder="'+active.host+'"]');
    if(placeholder)placeholder.hidden=false;
    status(active.host,'');
    active=null;
    tellWorld(false);
  }

  function focusActiveGame() {
    if(!active || active.mode === 'wind' || !active.ready) return;
    // Browser focus must enter the same-origin iframe, then its canvas.
    const frame=active.frame;
    try { frame.contentWindow?.focus(); } catch (_) { /* fallback to message */ }
    frame.contentWindow?.postMessage({type:'tbt:arcade:focus',mode:active.mode},source.origin);
  }

  function createIframe(host,mode) {
    const wrap=hosts[host];
    if(!wrap)return;
    teardown();
    const placeholder=document.querySelector('[data-arcade-placeholder="'+host+'"]');
    if(placeholder)placeholder.hidden=true;
    wrap.hidden=false;
    const frame=document.createElement('iframe');
    frame.className='arcade-iframe';
    frame.title=mode==='wind'?'元のS-320風洞シミュレーター':mode==='yakitori'?'元のやきとり脱出ゲーム':'元の3D琵琶湖フライトゲーム';
    frame.setAttribute('allow','fullscreen');
    frame.setAttribute('loading','eager');
    frame.setAttribute('referrerpolicy','same-origin');
    frame.setAttribute('tabindex','0');
    frame.height='900';
    frame.src=source.href+'?mode='+encodeURIComponent(mode);
    active={host,mode,frame,ready:false};
    wrap.appendChild(frame);
    status(host,'元のゲームプログラムを読み込んでいます…');
    frame.addEventListener('load',()=>{
      if(!active || active.frame!==frame)return;
      // The iframe's query string already selects the game. Do NOT
      // dispatch a second start during load; it duplicates the engine.
      updateFocus();
    });
    frame.addEventListener('error',()=>{
      if(active?.frame!==frame)return;
      status(host,'読み込みに失敗しました。もう一度起動してください。');
    });
    updateFocus();
  }

  function open(mode) {
    if(!allowed.has(mode))return;
    const host=mode==='wind'?'wind':'games';
    if(mode!=='wind')displaySelected(mode);
    if(active?.host===host) {
      if(active.mode===mode && active.ready) {
        focusActiveGame();
        return;
      }
      active.mode=mode;
      active.ready=false;
      active.frame.title=mode==='yakitori'?'やきとり脱出ゲーム':mode==='flight'?'琵琶湖フライトゲーム':'S-320風洞';
      active.frame.contentWindow?.postMessage({type:'tbt:arcade:switch',mode},source.origin);
      status(host,'切り替えています…');
      return;
    }
    createIframe(host,mode);
  }

  document.querySelectorAll('[data-arcade-mode]').forEach(button=>{
    button.addEventListener('click',()=>open(button.dataset.arcadeMode));
  });
  document.querySelectorAll('[data-arcade-launch]').forEach(button=>{
    button.addEventListener('click',()=>open(button.dataset.arcadeLaunch));
  });
  document.querySelectorAll('[data-arcade-focus]').forEach(button=>{
    button.addEventListener('click',focusActiveGame);
  });
  window.addEventListener('message',event=>{
    if(event.origin!==source.origin||!active||event.source!==active.frame.contentWindow)return;
    const data=event.data;
    if(data?.source!=='tbt-arcade')return;
    if(data.type==='ready'){
      active.ready=true;
      if(data.mode===active.mode){
        status(active.host,'');
        updateFocus();
        focusActiveGame();
      }
    }
    if(data.type==='focus'){
      status(active.host,data.focused?'キーボード操作が有効です。WASD・矢印キー・Spaceを使えます。':'ゲーム画面をクリックして操作を開始してください。');
    }
    if(data.type==='error'){
      status(active.host,'起動できませんでした。通信環境とWebGL対応をご確認ください。');
    }
    if(data.type==='height'){
      const pixels=Math.max(400,Math.min(4600,Number(data.height)||900));
      if(Number.isFinite(pixels)&&Math.abs(active.frame.height-pixels)>6)active.frame.style.height=pixels+'px';
    }
  });
  if('IntersectionObserver' in window) {
    observer=new IntersectionObserver(()=>{
      // Check the active frame, not only changed entries from the two hosts.
      updateFocus();
    },{threshold:0});
    Object.values(hosts).forEach(el=>{if(el)observer.observe(el.parentElement);});
  }
  window.addEventListener('scroll',updateFocus,{passive:true});
  window.addEventListener('resize',updateFocus,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    pageVisible=!document.hidden;updateFocus();
  });
  window.addEventListener('pagehide',()=>{
    tellWorld(false);
    observer?.disconnect();
  });
})();
