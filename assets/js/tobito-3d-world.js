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
        camera.position.set(0, 0.27, 7.6);
        camera.lookAt(0, 0.28, 0);
        const ambient = new THREE.HemisphereLight(0xffffff, 0xb7d7e7, 1.05);
        const key = new THREE.DirectionalLight(0xfff2df, 1.7);
        key.position.set(-3, 6, 7);
        const rim = new THREE.DirectionalLight(0x9bdcf8, 1.0);
        rim.position.set(4, 2, -4);
        scene.add(ambient, key, rim);

        // Model art direction: the actual provided Tobito drawings, NOT a round bird.
        // Tobito has a flat square white head, two-part red comb, sleepy eyes,
        // tiny yellow beak, and a cobalt blue work suit with outstretched sleeves.
        const material = (color, roughness = 0.76) =>
            new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
        const white = material(0xfffdf7);
        const ice = material(0xf3f8fb);
        const blue = material(0x24499f);
        const blueLight = material(0x3768bc);
        const darkBlue = material(0x1c367d);
        const red = material(0xe22c2d);
        const yellow = material(0xffdc45);
        const black = material(0x17181a);
        const shoe = material(0x121316);
        const eyeShine = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const sphere = new THREE.SphereGeometry(1, 24, 18);

        const root = new THREE.Group();
        scene.add(root);
        const model = new THREE.Group();
        root.add(model);

        function oval(parent, name, mat, x, y, z, sx, sy, sz, rz = 0) {
            const item = new THREE.Mesh(sphere, mat);
            item.name = name;
            item.position.set(x, y, z);
            item.scale.set(sx, sy, sz);
            item.rotation.z = rz;
            parent.add(item);
            return item;
        }

        function shapeMesh(parent, name, shape, mat, depth, x, y, z) {
            const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {
                depth, bevelEnabled: true, bevelThickness: 0.012,
                bevelSize: 0.012, bevelSegments: 2, curveSegments: 12
            }), mat);
            mesh.name = name;
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        }

        function polygon(vertices) {
            const shape = new THREE.Shape();
            vertices.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
            shape.closePath();
            return shape;
        }

        function block(parent, name, color, x, y, z, width, height, depth, rotation = 0) {
            const group = new THREE.Group();
            group.name = name;
            group.position.set(x, y, z);
            group.rotation.z = rotation;
            const outline = new THREE.Mesh(
                new THREE.BoxGeometry(width + 0.08, height + 0.08, depth + 0.07), black
            );
            const fill = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), color);
            fill.position.z = 0.035;
            group.add(outline, fill);
            parent.add(group);
            return group;
        }

        function segment(parent, name, color, x1, y1, x2, y2, width, depth, z) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return block(parent, name, color, (x1 + x2) / 2, (y1 + y2) / 2, z,
                width, Math.hypot(dx, dy), depth, -Math.atan2(dx, dy));
        }

        // Blue workwear torso, zipper and collar, matching the supplied poses.
        block(model, 'blue-workwear', blue, 0, -0.03, -0.12, 1.23, 1.10, 0.60);
        block(model, 'zipper', black, 0.035, -0.01, 0.255, 0.025, 0.85, 0.012);
        block(model, 'name-patch-outline', black, 0.35, 0.12, 0.276, 0.31, 0.17, 0.022);
        block(model, 'name-patch', white, 0.35, 0.12, 0.303, 0.245, 0.105, 0.021);
        const lapelLeft = polygon([[-0.57, 0.54], [-0.04, 0.35], [-0.27, 0.19], [-0.47, 0.40]]);
        const lapelRight = polygon([[0.04, 0.35], [0.54, 0.54], [0.44, 0.40], [0.27, 0.19]]);
        shapeMesh(model, 'collar-left-edge', lapelLeft, black, 0.07, 0, 0, 0.25);
        shapeMesh(model, 'collar-right-edge', lapelRight, black, 0.07, 0, 0, 0.25);
        const lapelLeftFill = polygon([[-0.47, 0.47], [-0.09, 0.34], [-0.28, 0.25], [-0.43, 0.41]]);
        const lapelRightFill = polygon([[0.09, 0.34], [0.47, 0.47], [0.43, 0.41], [0.28, 0.25]]);
        shapeMesh(model, 'collar-left', lapelLeftFill, blueLight, 0.072, 0, 0, 0.29);
        shapeMesh(model, 'collar-right', lapelRightFill, blueLight, 0.072, 0, 0, 0.29);

        // Two hovering arms form Tobito's characteristic airplane pose.
        function makeArm(side) {
            const arm = new THREE.Group();
            arm.name = side < 0 ? 'wing-left' : 'wing-right';
            arm.position.set(side * 0.56, 0.37, -0.06);
            model.add(arm);
            segment(arm, 'sleeve', blue, 0, 0, side * 1.13, 0.03, 0.33, 0.36, 0);
            block(arm, 'cuff', darkBlue, side * 1.13, 0.03, 0.06, 0.13, 0.36, 0.39);
            oval(arm, 'white-hand-outline', black, side * 1.37, 0.04, 0.03,
                0.26, 0.135, 0.19, side * 0.07);
            oval(arm, 'white-hand', white, side * 1.37, 0.055, 0.082,
                0.225, 0.103, 0.16, side * 0.07);
            for (let i = 0; i < 2; i++) {
                oval(arm, 'feather-finger', white, side * (1.54 + i * 0.07),
                    0.10 - i * 0.13, 0.096, 0.18, 0.047, 0.055, -side * 0.12);
            }
            return arm;
        }
        const wingLeft = makeArm(-1);
        const wingRight = makeArm(1);

        // One standing leg and one kicking-out leg, black shoes as in the original.
        segment(model, 'standing-leg', blue, -0.35, -0.47, -0.39, -1.54, 0.39, 0.52, -0.07);
        segment(model, 'raised-thigh', blue, 0.27, -0.46, 0.82, -1.06, 0.41, 0.52, -0.08);
        segment(model, 'raised-shin', blue, 0.82, -1.06, 1.38, -1.14, 0.38, 0.48, -0.08);
        oval(model, 'standing-shoe', shoe, -0.53, -1.76, 0.08, 0.39, 0.18, 0.32, 0.06);
        oval(model, 'raised-shoe', shoe, 1.59, -1.13, 0.07, 0.24, 0.30, 0.29, -0.45);

        // Tall square head: white trapezoid, thick hand-drawn dark border,
        // and genuine depth on the sides, not an image stuck on a plane.
        const headBack = polygon([
            [-0.80, 0.0], [0.80, 0.0], [0.85, 1.24], [-0.85, 1.24]
        ]);
        const headFace = polygon([
            [-0.744, 0.060], [0.744, 0.060], [0.791, 1.185], [-0.791, 1.185]
        ]);
        shapeMesh(model, 'head-ink-outline', headBack, black, 0.75, 0, 0.55, -0.375);
        shapeMesh(model, 'square-white-head', headFace, white, 0.72, 0, 0.55, -0.337);

        // Red two-lobed comb rising above the angular white head.
        const combShape = new THREE.Shape();
        combShape.moveTo(-0.14, 0);
        combShape.bezierCurveTo(-0.27, 0.28, -0.08, 0.55, 0.20, 0.78);
        combShape.bezierCurveTo(0.45, 0.96, 0.59, 0.84, 0.48, 0.61);
        combShape.bezierCurveTo(0.42, 0.48, 0.25, 0.40, 0.43, 0.34);
        combShape.bezierCurveTo(0.65, 0.28, 0.62, 0.15, 0.42, 0.08);
        combShape.bezierCurveTo(0.18, -0.02, 0.01, -0.03, -0.14, 0);
        const combOutline = shapeMesh(model, 'comb-outline', combShape, black, 0.22, -0.04, 1.74, -0.15);
        const combFill = shapeMesh(model, 'red-comb', combShape, red, 0.228, -0.04, 1.74, -0.137);
        combFill.scale.set(0.91, 0.91, 1);
        combFill.position.x += 0.024;
        combFill.position.y += 0.035;

        // Slightly sleepy eyes: black curved eyebrows and vertical ink pupils.
        function eyebrow(points) {
            const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], 0.438)));
            model.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.033, 6, false), black));
        }
        eyebrow([[-0.63, 1.35], [-0.48, 1.47], [-0.31, 1.48], [-0.20, 1.42]]);
        eyebrow([[0.20, 1.42], [0.31, 1.48], [0.48, 1.47], [0.63, 1.35]]);
        [-1, 1].forEach(side => {
            oval(model, 'sleepy-eye', black, side * 0.36, 1.18, 0.449,
                0.075, 0.172, 0.032);
            oval(model, 'eye-glint', eyeShine, side * 0.36 - 0.022, 1.145, 0.483,
                0.021, 0.038, 0.01);
        });

        // The actual beak is a small rounded yellow squiggle, not a large triangle.
        oval(model, 'beak-outline', black, 0.015, 0.92, 0.443, 0.166, 0.139, 0.055, 0.10);
        oval(model, 'yellow-beak', yellow, -0.002, 0.93, 0.486, 0.13, 0.098, 0.042, 0.08);
        oval(model, 'beak-lower-outline', black, 0.047, 0.845, 0.479,
            0.10, 0.064, 0.038, -0.32);
        oval(model, 'beak-lower', yellow, 0.044, 0.852, 0.506,
            0.082, 0.045, 0.031, -0.32);

        // Light, measured spatial cues: depth without unrelated neon decoration.
        const orbitMaterial = new THREE.MeshBasicMaterial({
            color: 0x7dacc2, transparent: true, opacity: 0.19, depthWrite: false
        });
        const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.012, 6, 100), orbitMaterial);
        orbit.rotation.x = 1.20;
        orbit.rotation.y = 0.10;
        orbit.position.y = 0.1;
        root.add(orbit);

        const specks = [];
        const speckMaterial = new THREE.MeshBasicMaterial({ color: 0xb6ceda, transparent: true, opacity: 0.62 });
        const speckGeometry = new THREE.SphereGeometry(0.022, 6, 6);
        for (let i = 0; i < 14; i++) {
            const angle = i * 2.39996;
            const radius = 2.35 + (i % 4) * 0.14;
            const mesh = new THREE.Mesh(speckGeometry, speckMaterial);
            mesh.position.set(Math.cos(angle) * radius, Math.sin(angle * 1.4) * 1.30, -0.95 - (i % 4) * 0.28);
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
            camera.position.z = width < 380 ? 8.2 : 7.6;
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
