(function () {
    'use strict';

    class S320AIGHero {
        constructor(canvas) {
            this.canvas = canvas;
            this.container = canvas.parentElement;
            this.rotation = { x: 0.15, y: -0.42 };
            this.zoom = 1;
            this.isLoaded = false;
            this.visible = false;
            this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
            this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.scene.add(new THREE.HemisphereLight(0xffffff, 0x87939f, 1.3));
            const key = new THREE.DirectionalLight(0xffffff, 1.6);
            key.position.set(5, 12, 14);
            this.scene.add(key);
            this.hud = ['pitch', 'yaw', 'roll'].map(id => document.getElementById('hero-hud-' + id));
            new ResizeObserver(() => this.resize()).observe(this.container);
            new IntersectionObserver(entries => { this.visible = entries[0].isIntersecting; }).observe(canvas);
            this.bindEvents();
            this.load();
            this.resize();
            this.animate = this.animate.bind(this);
            requestAnimationFrame(this.animate);
        }

        async load() {
            window.TBTS320.status(this.container, 'loading');
            document.getElementById('s320-loader-indicator')?.remove();
            try {
                const model = await window.TBTS320.create({ span: 12 });
                this.aircraftRoot = model.root;
                this.propGroup = model.propeller;
                this.wingFlex = model.flex;
                this.scene.add(model.root);
                this.modelBounds = new THREE.Box3().setFromObject(model.root);
                this.isLoaded = true;
                window.TBTS320.status(this.container, 'ready');
                this.renderFrame(0);
            } catch (error) {
                window.TBTS320.status(this.container, 'error', () => this.load());
                console.error('[S-320 viewer]', error);
            }
        }

        resize() {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            if (!width || !height) return;
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height, false);
            this.distance = 20;
            if (this.isLoaded) this.renderFrame(0);
        }

        bindEvents() {
            document.getElementById('s320-zoom-in')?.addEventListener('click', () => { this.zoom = Math.max(0.65, this.zoom - 0.1); });
            document.getElementById('s320-zoom-out')?.addEventListener('click', () => { this.zoom = Math.min(1.4, this.zoom + 0.1); });
            document.getElementById('s320-reset')?.addEventListener('click', () => { this.zoom = 1; this.rotation = { x: 0.15, y: -0.42 }; });
            let drag = null;
            this.canvas.addEventListener('pointerdown', event => {
                if (event.button !== 0) return;
                drag = { x: event.clientX, y: event.clientY };
                this.canvas.setPointerCapture(event.pointerId);
            });
            this.canvas.addEventListener('pointermove', event => {
                if (!drag) return;
                this.rotation.y += (event.clientX - drag.x) * 0.008;
                this.rotation.x = Math.max(-1.1, Math.min(1.1, this.rotation.x + (event.clientY - drag.y) * 0.006));
                drag = { x: event.clientX, y: event.clientY };
            });
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => this.canvas.addEventListener(type, () => { drag = null; }));
            this.canvas.addEventListener('wheel', event => {
                if (!event.ctrlKey && !event.metaKey) return;
                event.preventDefault();
                this.zoom = Math.max(0.65, Math.min(1.4, this.zoom + Math.sign(event.deltaY) * 0.05));
            }, { passive: false });
        }

        animate(now) {
            requestAnimationFrame(this.animate);
            const delta = Math.min((now - (this.lastFrame || now)) / 1000, 0.05);
            this.lastFrame = now;
            if (!this.visible || document.hidden) return;
            this.renderFrame(delta);
        }

        renderFrame(delta) {
            if (this.aircraftRoot) {
                this.aircraftRoot.rotation.set(this.rotation.x, this.rotation.y, 0);
                const speed = window.tbtWindTunnel?.windSpeed ?? 8;
                this.wingFlex.setLoad(window.TBTS320.windLoad(speed, this.lastFrame || 0, this.reducedMotion.matches));
                this.wingFlex.update(delta, delta === 0);
                const bounds = this.modelBounds.clone().applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(this.aircraftRoot.rotation));
                const size = bounds.getSize(new THREE.Vector3());
                const tangent = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
                this.distance = Math.max(8.5, (Math.max(size.y / (2 * tangent), size.x / (2 * tangent * this.camera.aspect)) + size.z / 2) * 1.1);
                if (!this.reducedMotion.matches) this.propGroup.rotation.z -= delta * 8;
                this.hud.forEach((el, index) => {
                    if (el) el.textContent = THREE.MathUtils.radToDeg(this.aircraftRoot.rotation[['x', 'y', 'z'][index]]).toFixed(1) + '°';
                });
            }
            this.camera.position.set(0, 1, this.distance * this.zoom);
            this.camera.lookAt(0, 0, 0);
            this.renderer.render(this.scene, this.camera);
            this.canvas.dataset.aircraft = 'S-320';
            this.canvas.dataset.rendered = this.isLoaded ? 'true' : 'false';
            if (this.wingFlex) this.canvas.dataset.wingFlex = this.wingFlex.load.toFixed(3);
        }
    }

    function init() {
        const canvas = document.getElementById('aircraft-canvas');
        if (!canvas) return;
        try { window.s320AIGHero = new S320AIGHero(canvas); }
        catch (error) { window.TBTS320.status(canvas.parentElement, 'error'); console.error('[S-320 viewer]', error); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
