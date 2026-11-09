/**
 * Wind Catch: a real, short-session game for Tobito's 3D world.
 * Accessible button targets, scored combos, hazards, a win condition,
 * personal best on this device, and tab/background pause.
 * No server calls or external dependencies.
 */
(() => {
  'use strict';

  const arena = document.getElementById('wind-arena');
  const layer = document.getElementById('wind-targets');
  const intro = document.getElementById('wind-intro');
  const result = document.getElementById('wind-result');
  const startButton = document.getElementById('wind-start');
  const retryButton = document.getElementById('wind-retry');
  const scoreLabel = document.getElementById('wind-score');
  const comboLabel = document.getElementById('wind-combo');
  const timerLabel = document.getElementById('wind-timer');
  const bestLabel = document.getElementById('wind-best');
  const progress = document.getElementById('wind-progress');
  const feedback = document.getElementById('wind-feedback');
  const mascot = document.getElementById('wind-tobito');
  const title = document.getElementById('wind-result-title');
  const summary = document.getElementById('wind-result-text');
  if (!arena || !layer || !startButton || !retryButton) return;

  const DURATION = 25000;
  const GOAL = 100;
  const STORAGE = 'tobito-wind-best-v1';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  let active = false;
  let visible = true;
  let elapsed = 0;
  let nextSpawn = 0;
  let frameTime = 0;
  let score = 0;
  let combo = 0;
  let best = 0;
  let clock = 0;
  let paused = false;
  const targets = new Set();

  try { best = Math.max(0, Number(window.localStorage.getItem(STORAGE)) || 0); }
  catch (_) { /* Private mode: game still works without storage. */ }
  bestLabel.textContent = String(best);

  function display() {
    scoreLabel.textContent = String(score);
    comboLabel.textContent = String(combo);
    timerLabel.textContent = String(Math.max(0, Math.ceil((DURATION - elapsed) / 1000)));
    progress.style.width = String(Math.min(100, score / GOAL * 100)) + '%';
  }

  function removeTarget(target, missed) {
    if (!targets.has(target)) return;
    targets.delete(target);
    target.remove();
    if (missed && target.dataset.kind === 'tailwind') {
      combo = 0;
      comboLabel.textContent = '0';
    }
  }

  function mascotReaction() {
    mascot.classList.remove('wind-cheer');
    void mascot.offsetWidth;
    mascot.classList.add('wind-cheer');
    window.Tobito3D?.flap?.();
  }

  function catchTarget(target) {
    if (!active || paused || !targets.has(target)) return;
    const kind = target.dataset.kind;
    removeTarget(target, false);

    if (kind === 'turbulence') {
      combo = 0;
      score = Math.max(0, score - 12);
      feedback.textContent = 'とびとくん「うわっ！乱気流トビ！」 −12点';
      arena.classList.remove('wind-hit');
      arena.classList.add('wind-hazard-hit');
    } else {
      combo += 1;
      const points = kind === 'bonus' ? 25 : 10;
      const multiplier = combo >= 5 ? 2 : 1;
      const gained = points * multiplier;
      score += gained;
      feedback.textContent = combo >= 5
        ? 'とびとくん「追い風がつながった！ ×2トビ！」 +' + gained + '点'
        : kind === 'bonus'
          ? 'とびとくん「金色の風だ！最高トビ！」 +' + gained + '点'
          : 'とびとくん「追い風、ゲットだトビ！」 +' + gained + '点';
      arena.classList.remove('wind-hazard-hit');
      arena.classList.add('wind-hit');
      mascotReaction();
    }
    display();
    window.setTimeout(() => {
      arena.classList.remove('wind-hit', 'wind-hazard-hit');
    }, 240);
  }

  function spawn() {
    if (!active || paused || targets.size >= 5) return;
    const roll = Math.random();
    const kind = roll < 0.14 ? 'turbulence' : roll < 0.26 ? 'bonus' : 'tailwind';
    const target = document.createElement('button');
    target.type = 'button';
    target.className = 'gust-target gust-' + kind;
    target.dataset.kind = kind;
    target.textContent = kind === 'turbulence' ? '乱気流' : kind === 'bonus' ? '金色の風' : '追い風';
    target.setAttribute('aria-label', target.textContent + (kind === 'turbulence' ? '、押すと減点' : '、押すと得点'));
    target.style.top = String(14 + Math.random() * 60) + '%';
    if (reducedMotion) {
      target.style.left = String(37 + Math.random() * 46) + '%';
      target.style.right = 'auto';
    }
    target.style.setProperty('--wind-track', String(Math.max(320, arena.clientWidth + 145)) + 'px');
    const lifetime = reducedMotion ? 4100 : Math.max(2100, 3100 - elapsed / 35);
    target.style.animationDuration = String(lifetime) + 'ms';
    target._expireAt = elapsed + lifetime;
    target.addEventListener('click', () => catchTarget(target));
    targets.add(target);
    layer.appendChild(target);
  }

  function updatePauseState() {
    const shouldPause = !visible || document.hidden;
    if (paused === shouldPause) return;
    paused = shouldPause;
    arena.classList.toggle('wind-paused', paused);
    frameTime = performance.now();
  }

  function finish() {
    active = false;
    if (clock) cancelAnimationFrame(clock);
    clock = 0;
    for (const target of [...targets]) removeTarget(target, false);
    display();

    if (score > best) {
      best = score;
      bestLabel.textContent = String(best);
      try { window.localStorage.setItem(STORAGE, String(best)); }
      catch (_) { /* Storage is optional. */ }
    }
    const cleared = score >= GOAL;
    title.textContent = cleared ? '追い風をつかまえた！' : '次はもっと飛べる！';
    summary.textContent = score + '点獲得！' + (cleared
      ? ' とびとくん「すごい！空に近づいたトビ！」'
      : ' とびとくん「もう一回、風を探そうトビ！」');
    feedback.textContent = cleared ? 'ミッションクリア！' : 'チャレンジ終了！';
    result.hidden = false;
    retryButton.focus({ preventScroll: true });
  }

  function advance(now) {
    clock = 0;
    if (!active) return;
    if (paused) {
      frameTime = now;
      clock = requestAnimationFrame(advance);
      return;
    }
    elapsed += Math.max(0, Math.min(100, now - frameTime));
    frameTime = now;
    while (elapsed >= nextSpawn && elapsed < DURATION) {
      spawn();
      nextSpawn += 860;
    }
    for (const target of [...targets]) {
      if (elapsed >= target._expireAt) removeTarget(target, true);
    }
    if (elapsed >= DURATION) {
      elapsed = DURATION;
      finish();
      return;
    }
    display();
    clock = requestAnimationFrame(advance);
  }

  function start() {
    if (clock) cancelAnimationFrame(clock);
    for (const target of [...targets]) removeTarget(target, false);
    elapsed = 0;
    nextSpawn = 0;
    score = 0;
    combo = 0;
    active = true;
    paused = false;
    intro.hidden = true;
    result.hidden = true;
    feedback.textContent = 'とびとくん「水色と金色の風をつかむトビ！」';
    arena.classList.remove('wind-hit', 'wind-hazard-hit');
    updatePauseState();
    frameTime = performance.now();
    display();
    clock = requestAnimationFrame(advance);
  }

  startButton.addEventListener('click', start);
  retryButton.addEventListener('click', start);
  document.addEventListener('visibilitychange', updatePauseState);
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.isIntersecting);
        if (active) updatePauseState();
      }, { threshold: 0.05 })
    : null;
  if (observer) observer.observe(arena);
  window.addEventListener('pagehide', () => {
    if (clock) cancelAnimationFrame(clock);
    clock = 0;
    active = false;
  });
  display();
})();
