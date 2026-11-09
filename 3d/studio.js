/**
 * Interactions for the standalone Tobito 3D website.
 * Does not modify the existing WordPress page or game.
 */
(() => {
  'use strict';

  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const poses = [
    {
      image: '../assets/images/tobito_pose_airplane.png',
      alt: '両腕を広げた飛行機ポーズのとびとくん',
      title: '飛行機ポーズ',
      description: '両腕をいっぱいに広げて、飛行機みたいに。空への憧れをそのままポーズにしました。'
    },
    {
      image: '../assets/images/tobito_pose_crossed_arms.png',
      alt: '青いつなぎで腕組みをするとびとくん',
      title: '職人ポーズ',
      description: '青いつなぎで、真剣な表情。TBTのものづくりを、じっと見守っています。'
    },
    {
      image: '../assets/images/tobito_pose_koi.png',
      alt: '来いと書かれた看板を掲げるとびとくん',
      title: '「来い！」ポーズ',
      description: '気合い十分の新歓スタイル。仲間を呼ぶときは、全力でアピール！'
    }
  ];

  const poseImage = document.getElementById('pose-image');
  const poseTitle = document.getElementById('pose-title');
  const poseDescription = document.getElementById('pose-description');
  const poseIndex = document.getElementById('pose-index');
  const poseKicker = document.getElementById('pose-kicker');
  const poseProgress = document.querySelector('#pose-progress i');
  let pose = 0;
  let transitionId = 0;

  function showPose(index) {
    pose = (index + poses.length) % poses.length;
    const item = poses[pose];
    if (!poseImage) return;
    window.clearTimeout(transitionId);
    poseImage.classList.add('is-changing');
    const apply = () => {
      poseImage.src = item.image;
      poseImage.alt = item.alt;
      poseTitle.textContent = item.title;
      poseDescription.textContent = item.description;
      poseIndex.textContent = String(pose + 1).padStart(2, '0') + ' / 03';
      poseKicker.textContent = 'POSE 00' + String(pose + 1);
      poseProgress.style.width = String((pose + 1) * (100 / poses.length)) + '%';
      document.getElementById('pose-stage').dataset.pose = String(pose);
      poseImage.classList.remove('is-changing');
    };
    if (reduced) apply();
    else transitionId = window.setTimeout(apply, 160);
  }
  document.getElementById('pose-prev')?.addEventListener('click', () => showPose(pose - 1));
  document.getElementById('pose-next')?.addEventListener('click', () => showPose(pose + 1));

  const progress = document.getElementById('reading-progress');
  let progressFrame = 0;
  function updateProgress() {
    progressFrame = 0;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (scrollable > 0 ? Math.min(100, (window.scrollY / scrollable) * 100) : 0) + '%';
  }
  function requestProgress() {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  }
  window.addEventListener('scroll', requestProgress, { passive: true });
  window.addEventListener('resize', requestProgress, { passive: true });
  requestProgress();

  const reveals = document.querySelectorAll('[data-reveal]');
  if (!reduced && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('js-active');
    const revealObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    reveals.forEach(element => revealObserver.observe(element));
  }

  // Real S-320 GLB parts are requested only after an explicit visitor click.
  // The existing TBTS320 assembly and Draco decoder are reused.
  const loadButton = document.getElementById('s320-load');
  const hangarPlaceholder = document.getElementById('hangar-placeholder');
  const viewport = document.getElementById('s320-viewport');
  const status = document.getElementById('s320-status');
  const spinButton = document.getElementById('s320-spin');
  const resetButton = document.getElementById('s320-reset');
  let hasAttemptedLoad = false;

  const setStatus = message => { if (status) status.textContent = message; };
  async function loadAircraft() {
    if (!viewport || !loadButton || hasAttemptedLoad) return;
    if (typeof THREE === 'undefined' || !window.TBTS320 ||
        !THREE.GLTFLoader || !THREE.DRACOLoader) {
      setStatus('3Dエンジンを読み込めませんでした。');
      loadButton.textContent = '3Dエンジンを読み込めませんでした';
      return;
    }
    if (reduced) {
      setStatus('動きを減らす設定のため、機体の説明を表示しています。');
      loadButton.textContent = '動きを減らす設定が有効です';
      return;
    }
    hasAttemptedLoad = true;
    loadButton.disabled = true;
    loadButton.textContent = '読み込み中…';
    setStatus('S-320の3Dモデルを読み込み中…');

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true, antialias: window.innerWidth > 700,
        powerPreference: 'low-power'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.75));
      renderer.setClearColor(0x0c1625, 0);
      if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 250);
      camera.position.set(1, 12, 52);
      camera.lookAt(0, 0, 0);
      const hemi = new THREE.HemisphereLight(0xebf5ff, 0x2a415c, 1.4);
      const key = new THREE.DirectionalLight(0xffffff, 1.45);
      key.position.set(-13, 25, 20);
      const fill = new THREE.DirectionalLight(0x83b6f2, 0.7);
      fill.position.set(17, 2, -10);
      scene.add(hemi, key, fill);

      const aircraft = await window.TBTS320.create({ span: 28 });
      const root = aircraft.root;
      scene.add(root);
      const grid = new THREE.GridHelper(45, 18, 0x55708e, 0x34485f);
      grid.position.y = -5.0;
      grid.material.transparent = true;
      grid.material.opacity = 0.35;
      scene.add(grid);

      hangarPlaceholder.hidden = true;
      hangarPlaceholder.style.display = 'none';
      viewport.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('role', 'img');
      renderer.domElement.setAttribute('aria-label', 'S-320 Elementの3D機体。ドラッグで向きを変えられます');
      setStatus('ドラッグして機体を回せます');
      spinButton.disabled = false;
      resetButton.disabled = false;

      let autoSpin = false;
      let targetYaw = -0.3;
      let targetPitch = -0.12;
      let drag = false;
      let pointerId = null;
      let lastX = 0;
      let lastY = 0;
      let visible = true;
      let frame = 0;
      let lastFrame = 0;

      function resize() {
        const width = Math.max(1, viewport.clientWidth);
        const height = Math.max(1, viewport.clientHeight);
        camera.aspect = width / height;
        camera.position.z = width < 580 ? 73 : 52;
        camera.position.y = width < 580 ? 17 : 12;
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        renderer.render(scene, camera);
      }
      function render(time) {
        frame = 0;
        if (!visible || document.hidden) return;
        // Save battery on high-density screens by capping the showroom at 30fps.
        if (time - lastFrame >= 32) {
          lastFrame = time;
          if (autoSpin) targetYaw += 0.003;
          root.rotation.y += (targetYaw - root.rotation.y) * 0.075;
          root.rotation.x += (targetPitch - root.rotation.x) * 0.075;
          if (aircraft.propeller) aircraft.propeller.rotation.z += 0.02;
          renderer.render(scene, camera);
        }
        frame = requestAnimationFrame(render);
      }
      function updateActivity() {
        if (visible && !document.hidden && !frame) frame = requestAnimationFrame(render);
        else if ((!visible || document.hidden) && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      }
      const visibilityObserver = 'IntersectionObserver' in window
        ? new IntersectionObserver(entries => {
            visible = entries.some(entry => entry.isIntersecting);
            updateActivity();
          }, { rootMargin: '80px' })
        : null;
      if (visibilityObserver) visibilityObserver.observe(viewport);
      document.addEventListener('visibilitychange', updateActivity);
      window.addEventListener('pagehide', () => {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
      });
      window.addEventListener('pageshow', updateActivity);

      renderer.domElement.addEventListener('pointerdown', event => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        drag = true;
        pointerId = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        if (event.pointerType === 'mouse') renderer.domElement.setPointerCapture(pointerId);
      });
      renderer.domElement.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== pointerId) return;
        targetYaw += (event.clientX - lastX) * 0.008;
        targetPitch = Math.max(-0.38, Math.min(0.38, targetPitch + (event.clientY - lastY) * 0.004));
        lastX = event.clientX;
        lastY = event.clientY;
      }, { passive: true });
      const endDrag = event => {
        if (event.pointerId === pointerId) { drag = false; pointerId = null; }
      };
      renderer.domElement.addEventListener('pointerup', endDrag);
      renderer.domElement.addEventListener('pointercancel', endDrag);
      renderer.domElement.addEventListener('lostpointercapture', () => {
        drag = false; pointerId = null;
      });
      spinButton.addEventListener('click', () => {
        autoSpin = !autoSpin;
        spinButton.setAttribute('aria-pressed', String(autoSpin));
        spinButton.textContent = autoSpin ? '回転を止める' : '自動回転';
      });
      resetButton.addEventListener('click', () => {
        targetYaw = -0.3;
        targetPitch = -0.12;
        autoSpin = false;
        spinButton.setAttribute('aria-pressed', 'false');
        spinButton.textContent = '自動回転';
      });
      renderer.domElement.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        visible = false;
        updateActivity();
        setStatus('3D表示が停止しました。ページを再読み込みしてください。');
      });
      const resizer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
      if (resizer) resizer.observe(viewport);
      else window.addEventListener('resize', resize, { passive: true });
      resize();
      updateActivity();
    } catch (error) {
      console.error('S-320 viewer:', error);
      if (renderer) renderer.dispose();
      hasAttemptedLoad = false;
      loadButton.disabled = false;
      loadButton.textContent = '再試行する ↗';
      setStatus('機体モデルを読み込めませんでした。通信環境をご確認ください。');
    }
  }
  loadButton?.addEventListener('click', loadAircraft);
})();
