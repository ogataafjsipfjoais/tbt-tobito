/**
 * Standalone port of the legacy engines.
 * This file belongs to /3d/arcade/ only. None of the original files change.
 * One engine is loaded at a time after explicit visitor interaction.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const valid = ['flight', 'yakitori', 'wind'];
  const params = new URLSearchParams(window.location.search);
  let selected = valid.includes(params.get('mode')) ? params.get('mode') : 'flight';
  const loaded = new Map();
  const ready = $('arcade-loading');
  const games = $('arcade-games');
  const wind = $('arcade-airflow');
  const status = $('arcade-mode-caption');
  const names = { flight:'琵琶湖フライト', yakitori:'やきとり脱出', wind:'S-320 / 風洞実験' };
  function script(path) {
    if (loaded.has(path)) return loaded.get(path);
    const promise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = path;
      el.async = false;
      el.onload = resolve;
      el.onerror = () => reject(new Error(path + ' を読み込めませんでした'));
      document.head.appendChild(el);
    });
    loaded.set(path, promise);
    return promise;
  }
  async function loadSeries(paths) {
    for (const p of paths) await script('assets/js/' + p);
  }
  function notifyParent(message) {
    try { window.parent.postMessage({source:'tbt-arcade',...message}, window.location.origin); }
    catch (_) { /* Standalone use remains possible. */ }
  }
  function setStatus(message) {
    if (ready) ready.textContent = message;
  }
  function switchView(mode) {
    selected = mode;
    const isWind = mode === 'wind';
    wind.hidden = !isWind;
    games.hidden = isWind;
    const f = $('game-view-flight'), y = $('game-view-yakitori');
    if (f) f.classList.toggle('hidden', mode !== 'flight');
    if (y) y.classList.toggle('hidden', mode !== 'yakitori');
    $('tab-game-flight')?.setAttribute('aria-pressed',String(mode === 'flight'));
    $('tab-game-yakitori')?.setAttribute('aria-pressed',String(mode === 'yakitori'));
    if (status) status.textContent = names[mode];
    window.history.replaceState(null,'',window.location.pathname+'?mode='+encodeURIComponent(mode));
  }
  let ticket = 0;
  async function launch(mode) {
    if (!valid.includes(mode)) return;
    const token = ++ticket;
    switchView(mode);
    if (ready) ready.hidden = false;
    window.setTimeout(reportHeight,50);
    setStatus('起動中：'+names[mode]+' …');
    try {
      // Components are loaded only when their own game is selected.
      if (mode === 'wind') {
        await loadSeries(['wind-tunnel.js']);
        if (!window.tbtWindTunnel && window.WindTunnelSimulator)
          window.tbtWindTunnel = new window.WindTunnelSimulator();
      } else if (mode === 'yakitori') {
        await loadSeries(['yakitori-game.js']);
        if (!window.yakitoriGame && window.YakitoriGame)
          window.yakitoriGame = new window.YakitoriGame('yakitori-game-canvas');
      } else {
        await loadSeries([
          'flight-ranking.js','birdman-course.js','contest-venue.js',
          'flight-scenery.js','game.js'
        ]);
        // GitHub Pages cannot run the PHP ranking API. Use its local records.
        if (window.FlightRankingManager) window.FlightRankingManager.endpoint = null;
        if (!window.tobitoGame && window.TobitoFlightSimulator3D)
          window.tobitoGame = new window.TobitoFlightSimulator3D('tobito-game-canvas');
        const rankingNote = $('flight-ranking-storage');
        if (rankingNote) rankingNote.textContent = 'この端末内の記録（サーバー共有なし）';
      }
      if (token !== ticket) return;
      if (ready) ready.hidden = true;
      notifyParent({type:'ready',mode});
      window.setTimeout(() => {window.dispatchEvent(new Event('resize'));reportHeight();},300);
    } catch (err) {
      if (token !== ticket) return;
      setStatus('起動できませんでした。通信環境をご確認ください。'+(err?.message || ''));
      notifyParent({type:'error',mode,message:String(err?.message || err)});
    }
  }
  // Original tab names and play UI are preserved. Switching can load either engine.
  window.switchGameTab = function(mode) {
    if (mode !== 'flight' && mode !== 'yakitori') return;
    void launch(mode);
  };
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'tbt:arcade:switch' && valid.includes(event.data.mode))
      void launch(event.data.mode);
  });
  document.addEventListener('visibilitychange',() => {
    // The original simulators already suspend rendering on hidden documents.
    if (!document.hidden)window.dispatchEvent(new Event('resize'));
  });
  // Report the actual copied controls' height to the embedding homepage.
  // Avoid measuring the iframe viewport itself, which causes resize feedback loops.
  let heightFrame = 0;
  let lastHeight = 0;
  function reportHeight() {
    if(heightFrame)return;
    heightFrame = requestAnimationFrame(()=>{
      heightFrame = 0;
      const header=document.querySelector('.arcade-header');
      const main=document.getElementById('arcade-content');
      if(!main)return;
      const total=Math.min(5500,Math.max(480,(header?.offsetHeight||0)+main.scrollHeight+30));
      if(Math.abs(total-lastHeight)>15) {
        lastHeight=total;
        notifyParent({type:'height',height:total});
      }
    });
  }
  if('ResizeObserver' in window) {
    const resizeObserver=new ResizeObserver(reportHeight);
    const main=document.getElementById('arcade-content');
    if(main)resizeObserver.observe(main);
  }
  window.addEventListener('resize',reportHeight,{passive:true});
  document.addEventListener('click',()=>window.setTimeout(reportHeight,120),{passive:true});
  // Do not load a Three.js game until the visitor opens this isolated page.
  void launch(selected).then(reportHeight);
})();
