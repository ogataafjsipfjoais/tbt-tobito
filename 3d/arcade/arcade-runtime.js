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
      el.onerror = () => {
        loaded.delete(path); // Retry after transient CDN/network failures.
        el.remove();
        reject(new Error(path + ' を読み込めませんでした'));
      };
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
  // Do not announce 'ready' merely because the constructor returned.
  // The S-320 loader has a separate asynchronous geometry/Draco pipeline.
  async function waitForRenderable(mode,instance,token) {
    const began=performance.now();
    while(token===ticket) {
      const canvas=activeCanvas(mode);
      const drawn=mode==='yakitori'
        ? !!(instance.ctx && canvas && canvas.width>0 && canvas.height>0)
        : !!(instance.renderer && instance.scene && instance.camera && instance.renderer.domElement);
      const statusNode=(mode==='wind'?$('wind-tunnel-canvas-container'):canvas?.parentElement)?.querySelector('.s320-status');
      if(statusNode?.querySelector('button'))throw new Error('S-320のモデルを読み込めませんでした');
      // Wait for the complete airframe, not just an empty WebGL canvas.
      if(drawn && !statusNode) {
        await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
        return;
      }
      if(performance.now()-began>25000)throw new Error('起動がタイムアウトしました。再試行してください');
      await new Promise(resolve=>window.setTimeout(resolve,110));
    }
  }
  let ticket = 0;
  let loadingMode = null;
  const initialized = new Set();
  function activeCanvas(mode) {
    return $(mode === 'flight' ? 'tobito-game-canvas' : mode === 'yakitori' ? 'yakitori-game-canvas' : 'wind-tunnel-canvas-container');
  }
  function focusGame(mode = selected) {
    const el = activeCanvas(mode);
    if (!el) return false;
    if (mode === 'wind') return true; // Wind tunnel is controlled with sliders.
    el.setAttribute('tabindex','0');
    el.focus({preventScroll:true});
    const focused = document.activeElement === el;
    notifyParent({type:'focus',mode,focused});
    return focused;
  }
  async function launch(mode) {
    if (!valid.includes(mode)) return;
    // Do not initialize the same 3D engine twice when the iframe's load
    // notification and the initial ?mode= route arrive together.
    if (initialized.has(mode)) {
      ++ticket;
      switchView(mode);
      if (ready) ready.hidden = true;
      window.setTimeout(() => { focusGame(mode);reportHeight(); }, 30);
      notifyParent({type:'ready',mode});
      return;
    }
    if (loadingMode === mode) return;
    const token = ++ticket;
    loadingMode = mode;
    switchView(mode);
    if (ready) ready.hidden = false;
    window.setTimeout(reportHeight,50);
    setStatus('起動中：'+names[mode]+' …');
    try {
      // Components are loaded only when their own game is selected.
      if (mode === 'wind') {
        await loadSeries(['wind-tunnel.js']);
        if (token !== ticket) return;
        if (!window.tbtWindTunnel && window.WindTunnelSimulator)
          window.tbtWindTunnel = new window.WindTunnelSimulator();
      } else if (mode === 'yakitori') {
        await loadSeries(['yakitori-game.js']);
        if (token !== ticket) return;
        if (!window.yakitoriGame && window.YakitoriGame)
          window.yakitoriGame = new window.YakitoriGame('yakitori-game-canvas');
      } else {
        // The original ranking manager probes a PHP API at construction.
        // GitHub Pages cannot serve PHP, so prevent the initial 404 request.
        // Restore fetch immediately after the ranking module has loaded.
        if (!window.FlightRankingManager) {
          const originalFetch = window.fetch;
          try {
            window.fetch = undefined;
            await loadSeries(['flight-ranking.js']);
          } finally {
            window.fetch = originalFetch;
          }
        }
        await loadSeries([
          'birdman-course.js','contest-venue.js','flight-scenery.js','game.js'
        ]);
        if (token !== ticket) return;
        // Rankings still persist locally; no false shared-server status.
        if (window.FlightRankingManager) {
          window.FlightRankingManager.endpoint = null;
          window.FlightRankingManager.serverState = 'local';
          window.FlightRankingManager.renderPageRankingList?.();
        }
        if (!window.tobitoGame && window.TobitoFlightSimulator3D)
          window.tobitoGame = new window.TobitoFlightSimulator3D('tobito-game-canvas');
        const rankingNote = $('flight-ranking-storage');
        if (rankingNote) rankingNote.textContent = 'この端末内の記録（サーバー共有なし）';
      }
      if (token !== ticket) return;
      const instance = mode === 'wind' ? window.tbtWindTunnel : mode === 'flight' ? window.tobitoGame : window.yakitoriGame;
      if (!instance) throw new Error('ゲームエンジンの初期化に失敗しました');
      await waitForRenderable(mode,instance,token);
      if(token!==ticket)return;
      initialized.add(mode);
      loadingMode = null;
      if (ready) ready.hidden = true;
      // Wait one frame so the active canvas is laid out before focus.
      window.requestAnimationFrame(() => {
        if (selected === mode) focusGame(mode);
        notifyParent({type:'ready',mode});
        window.dispatchEvent(new Event('resize'));
        reportHeight();
      });
    } catch (err) {
      if (token !== ticket) return;
      loadingMode = null;
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
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type === 'tbt:arcade:switch' && valid.includes(event.data.mode)) {
      void launch(event.data.mode);
    }
    if (event.data?.type === 'tbt:arcade:focus' && valid.includes(event.data.mode)) {
      if (initialized.has(event.data.mode)) focusGame(event.data.mode);
    }
  });
  // Allow control keys to reach the original engine after clicking the
  // visible game chrome, without changing the game's source files.
  document.getElementById('arcade-content')?.addEventListener('pointerdown',event=>{
    if (event.target.closest('button,input,select,textarea,a,[contenteditable]')) return;
    if (selected !== 'wind') window.requestAnimationFrame(() => focusGame(selected));
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
