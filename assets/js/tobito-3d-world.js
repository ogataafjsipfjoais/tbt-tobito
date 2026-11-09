/**
 * Tobito's 3D studio. A lightweight, procedural Three.js mascot for the prologue.
 * Uses the site's existing Three.js r128. The official 2D portrait remains the fallback.
 * No external model, animation library, or extra WebGL context is requested.
 */
(function () {
    'use strict';

    function init() {
        const stage = document.getElementById('tobito-3d-stage');
        const hero = document.getElementById('prologue-section');
        const rotateButton = document.getElementById('tobito-3d-rotate');
        const flapButton = document.getElementById('tobito-3d-flap');
        const resetButton = document.getElementById('tobito-3d-reset');
        const notice = document.getElementById('tobito-3d-notice');
        if (!stage || !hero) return;

        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const lowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;
        if (reduced || lowMemory || !window.THREE || !window.WebGLRenderingContext) {
            hero.classList.add('tobito-3d-fallback');
            if (notice) notice.textContent = 'イラストで表示しています';
            return;
        }

        const THREE = window.THREE;
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: window.innerWidth > 700,
                powerPreference: 'low-power'
            });
        } catch (error) {
            hero.classList.add('tobito-3d-fallback');
            if (notice) notice.textContent = 'イラストで表示しています';
            return;
        }

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 40);
        camera.position.set(0, 0.23, 6.45);
        camera.lookAt(0, 0.20, 0);
        const ambient = new THREE.HemisphereLight(0xffffff, 0xb7d7e7, 1.05);
        const key = new THREE.DirectionalLight(0xfff2df, 1.7);
        key.position.set(-3, 6, 7);
        const rim = new THREE.DirectionalLight(0x9bdcf8, 1.0);
        rim.position.set(4, 2, -4);
        scene.add(ambient, key, rim);

        const material = (color, roughness = 0.65, metalness = 0) =>
            new THREE.MeshStandardMaterial({ color, roughness, metalness });
        const white = material(0xfffcf5, 0.85);
        const wingWhite = material(0xf3f9fc, 0.78);
        const belly = material(0xf0f8fa, 0.95);
        const red = material(0xd83d3a, 0.6);
        const orange = material(0xef9d24, 0.73);
        const yellow = material(0xfbc745, 0.55);
        const ink = material(0x182c40, 0.38);
        const lens = material(0x4fb4d9, 0.18, 0.12);
        const sparkle = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const blush = new THREE.MeshBasicMaterial({ color: 0xf1afb0, transparent: true, opacity: 0.6 });
        const sphere = new THREE.SphereGeometry(1, 28, 20);

        const root = new THREE.Group();
        scene.add(root);
        const model = new THREE.Group();
        root.add(model);

        function oval(parent, name, mat, x, y, z, sx, sy, sz, rz = 0) {
            const mesh = new THREE.Mesh(sphere, mat);
            mesh.name = name;
            mesh.position.set(x, y, z);
            mesh.scale.set(sx, sy, sz);
            mesh.rotation.z = rz;
            parent.add(mesh);
            return mesh;
        }

        // Rounded chicken silhouette, matching the established Tobito illustrations.
        oval(model, 'body', white, 0, -0.08, 0, 0.94, 1.08, 0.77);
        oval(model, 'head', white, 0, 0.67, 0.05, 0.78, 0.69, 0.68);
        oval(model, 'belly', belly, 0, -0.34, 0.71, 0.55, 0.56, 0.095);

        // Comb: soft, sculpted red lobes. The goggles sit above the eyes.
        oval(model, 'comb-left', red, -0.24, 1.36, -0.07, 0.20, 0.34, 0.17, 0.28);
        oval(model, 'comb-center', red, 0, 1.48, -0.02, 0.22, 0.39, 0.18);
        oval(model, 'comb-right', red, 0.25, 1.34, -0.09, 0.19, 0.29, 0.17, -0.28);

        const strap = new THREE.Mesh(
            new THREE.TorusGeometry(0.68, 0.042, 8, 60),
            ink
        );
        strap.rotation.x = Math.PI / 2;
        strap.position.set(0, 1.09, 0.08);
        model.add(strap);

        [-1, 1].forEach(side => {
            const x = side * 0.34;
            oval(model, 'goggle-lens', lens, x, 1.08, 0.662, 0.205, 0.205, 0.07);
            const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.047, 10, 40), ink);
            rimMesh.position.set(x, 1.08, 0.725);
            model.add(rimMesh);
            oval(model, 'goggle-glint', sparkle, x - 0.065, 1.15, 0.736, 0.053, 0.024, 0.007, 0.45);
            oval(model, 'eye', ink, side * 0.32, 0.52, 0.723, 0.106, 0.124, 0.05);
            oval(model, 'eye-highlight', sparkle, side * 0.32 - 0.035, 0.565, 0.764, 0.032, 0.034, 0.014);
            oval(model, 'cheek', blush, side * 0.55, 0.31, 0.637, 0.125, 0.074, 0.018);
        });

        // Triangular yellow beak and paired red wattles.
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.238, 0.43, 3), yellow);
        beak.position.set(0, 0.30, 0.88);
        beak.rotation.x = Math.PI / 2;
        beak.rotation.z = Math.PI;
        model.add(beak);
        oval(model, 'beak-lower', orange, 0, 0.17, 0.816, 0.15, 0.047, 0.13);
        oval(model, 'wattle-left', red, -0.075, 0.04, 0.77, 0.080, 0.13, 0.072, -0.1);
        oval(model, 'wattle-right', red, 0.075, 0.04, 0.77, 0.080, 0.13, 0.072, 0.1);

        function makeWing(side) {
            const pivot = new THREE.Group();
            pivot.name = side < 0 ? 'wing-left' : 'wing-right';
            pivot.position.set(side * 0.77, 0.13, -0.08);
            model.add(pivot);
            oval(pivot, 'upper-feather', wingWhite, side * 0.37, -0.07, 0, 0.49, 0.28, 0.22, side * -0.2);
            for (let i = 0; i < 3; i++) {
                oval(pivot, 'feather-' + i, white,
                    side * (0.59 + i * 0.08), -0.18 - i * 0.10, 0.04,
                    0.27, 0.105, 0.12, side * (0.24 + i * 0.10));
            }
            return pivot;
        }
        const wingLeft = makeWing(-1);
        const wingRight = makeWing(1);

        [-1, 1].forEach(side => {
            oval(model, 'leg', orange, side * 0.36, -1.04, 0.07, 0.092, 0.28, 0.089);
            oval(model, 'foot', orange, side * 0.36, -1.26, 0.27, 0.29, 0.105, 0.36);
            for (let i = -1; i <= 1; i++) {
                oval(model, 'toe', yellow, side * 0.36 + i * 0.135, -1.28, 0.45, 0.092, 0.075, 0.24);
            }
        });

        for (let i = -1; i <= 1; i++) {
            oval(model, 'tail-feather', wingWhite, i * 0.22, -0.13 + Math.abs(i) * 0.12, -0.68,
                0.21, 0.34, 0.14, -i * 0.24);
        }

        // Depth cues: a delicate flight trajectory and distant airy objects.
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0x77c6e2, transparent: true, opacity: 0.25, depthWrite: false
        });
        const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.012, 6, 100), orbitMaterial);
        orbit.rotation.x = 1.1;
        orbit.rotation.y = 0.16;
        orbit.position.y = 0.06;
        root.add(orbit);

        const specks = [];
        const speckMaterial = new THREE.MeshBasicMaterial({ color: 0xbdddeb, transparent: true, opacity: 0.75 });
        const speckGeometry = new THREE.SphereGeometry(0.026, 6, 6);
        for (let i = 0; i < 18; i++) {
            const angle = i * 2.39996;
            const radius = 1.75 + (i % 5) * 0.16;
            const mesh = new THREE.Mesh(speckGeometry, speckMaterial);
            mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.4) * 1.05, -0.65 - (i % 4) * 0.33);
            root.add(mesh);
            specks.push(mesh);
        }

        renderer.setClearColor(0xffffff, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.35 : 1.75));
        if ('outputEncoding' in renderer) renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        const canvas = renderer.domElement;
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', '立体のとびとくん。ドラッグで向きを変えられます');
        stage.appendChild(canvas);

        let running = false;
        let visible = false;
        let raf = 0;
        let targetYaw = -0.15;
        let targetPitch = 0;
        let flapUntil = 0;
        let dragging = false;
        let moved = false;
        let lastX = 0;
        let lastY = 0;
        let pointerId = null;

        function resize() {
            const width = Math.max(1, stage.clientWidth);
            const height = Math.max(1, stage.clientHeight);
            camera.aspect = width / height;
            camera.position.z = width < 380 ? 7.1 : 6.45;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
            renderOnce();
        }

        function renderFrame(time) {
            model.rotation.y += (targetYaw - model.rotation.y) * 0.075;
            model.rotation.x += (targetPitch - model.rotation.x) * 0.075;
            model.position.y = Math.sin(time * 0.0009) * 0.035;
            const excitement = time < flapUntil ? 0.70 : 0.085;
            const angle = Math.sin(time * (time < flapUntil ? 0.014 : 0.0025)) * excitement;
            wingLeft.rotation.z = -0.13 - angle;
            wingRight.rotation.z = 0.13 + angle;
            orbit.rotation.z = Math.sin(time * 0.00027) * 0.13;
            specks.forEach((speck, index) => {
                speck.position.y += Math.sin(time * 0.0008 + index) * 0.00036;
            });
            renderer.render(scene, camera);
        }

        function renderOnce() {
            if (!running) renderer.render(scene, camera);
        }

        function tick(time) {
            if (!running) return;
            renderFrame(time);
            raf = requestAnimationFrame(tick);
        }

        function setRunning(enabled) {
            if (running === enabled) return;
            running = enabled;
            if (enabled) raf = requestAnimationFrame(tick);
            else cancelAnimationFrame(raf);
        }

        function updateActivity() {
            setRunning(visible && !document.hidden && !hero.classList.contains('tobito-3d-fallback'));
        }

        function flap() {
            flapUntil = performance.now() + 1350;
            if (notice) notice.textContent = 'とびとくんが羽ばたいた！';
            if (!running) renderFrame(performance.now());
        }

        canvas.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            dragging = true;
            moved = false;
            pointerId = event.pointerId;
            lastX = event.clientX;
            lastY = event.clientY;
            if (event.pointerType === 'mouse') canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener('pointermove', event => {
            if (!dragging || event.pointerId !== pointerId) return;
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
            targetYaw += dx * 0.012;
            targetPitch = Math.max(-0.38, Math.min(0.38, targetPitch + dy * 0.004));
            lastX = event.clientX;
            lastY = event.clientY;
        }, { passive: true });
        function finishDrag(event) {
            if (!dragging || pointerId !== event.pointerId) return;
            dragging = false;
            pointerId = null;
            if (!moved) flap();
        }
        canvas.addEventListener('pointerup', finishDrag);
        canvas.addEventListener('pointercancel', () => { dragging = false; pointerId = null; });
        canvas.addEventListener('lostpointercapture', () => { dragging = false; pointerId = null; });

        rotateButton?.addEventListener('click', () => {
            targetYaw += Math.PI / 2;
            if (notice) notice.textContent = 'とびとくんを回転しました';
        });
        flapButton?.addEventListener('click', flap);
        resetButton?.addEventListener('click', () => {
            targetYaw = -0.15;
            targetPitch = 0;
            if (notice) notice.textContent = '正面に戻しました';
        });

        const observer = 'IntersectionObserver' in window
            ? new IntersectionObserver(entries => {
                visible = entries.some(entry => entry.isIntersecting);
                updateActivity();
            }, { rootMargin: '80px' })
            : null;
        if (observer) observer.observe(stage);
        else visible = true;
        document.addEventListener('visibilitychange', updateActivity);
        window.addEventListener('pagehide', () => setRunning(false));
        window.addEventListener('pageshow', updateActivity);
        const resizer = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
        if (resizer) resizer.observe(stage);
        else window.addEventListener('resize', resize, { passive: true });
        canvas.addEventListener('webglcontextlost', event => {
            event.preventDefault();
            setRunning(false);
            hero.classList.add('tobito-3d-fallback');
            if (notice) notice.textContent = 'イラスト表示に切り替えました';
        });
        canvas.addEventListener('webglcontextrestored', () => {
            hero.classList.remove('tobito-3d-fallback');
            updateActivity();
        });

        resize();
        hero.classList.add('tobito-3d-ready');
        if (notice) notice.textContent = '3Dモデルを操作できます';
        updateActivity();
        window.Tobito3D = { flap, reset: () => { targetYaw = -0.15; targetPitch = 0; } };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
