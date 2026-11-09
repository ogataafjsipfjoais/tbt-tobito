/**
 * ==============================================================================
 * Doesbook-Inspired 3D Interactive Hero Experience
 * ==============================================================================
 * 
 * 機能要件:
 * 1. 極限の余白を活かしたダークキャンバス中央で静かに3D回転・浮遊する機体/アートメッシュ
 * 2. マウス/ポインタ移動に超高精度で追従する滑らかな3Dチルト・視差回転（LERP補間）
 * 3. タッチ & ドラッグによる360度インタラクティブ回転
 * 4. スクロール開始時に奥（Z軸深部）へ吸い込まれフェードアウトするシネマティック演出
 * 5. 極小等幅フォント（Mono）による座標・姿勢角（Pitch / Roll / Yaw）テレメトリの連動
 */

(function () {
    'use strict';

    class DoesbookHero {
        constructor() {
            this.container = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.modelGroup = null;
            this.wingMesh = null;
            this.propellerMesh = null;
            this.tobitoAvatar = null;
            this.particles = null;

            // マウス追従用
            this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
            this.isDragging = false;
            this.dragStart = { x: 0, y: 0 };
            this.manualRot = { x: 0, y: 0 };

            // スクロール追従用
            this.scrollY = 0;
            this.scrollProgress = 0; // 0.0 (Top) -> 1.0 (Out of hero)

            this.clock = null;
            this.init();
        }

        init() {
            this.container = document.getElementById('hero-3d-stage');
            if (!this.container) {
                window.addEventListener('DOMContentLoaded', () => {
                    this.container = document.getElementById('hero-3d-stage');
                    if (this.container) this.setup();
                });
                return;
            }
            this.setup();
        }

        setup() {
            if (typeof THREE === 'undefined') {
                setTimeout(() => this.setup(), 400);
                return;
            }

            this.clock = new THREE.Clock();

            // 1. シーン & カメラ
            this.scene = new THREE.Scene();

            const width = this.container.clientWidth || window.innerWidth;
            const height = this.container.clientHeight || window.innerHeight;

            this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
            this.camera.position.set(0, 0, 7.5);

            // 2. レンダラー
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.3;

            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
            this.container.appendChild(this.renderer.domElement);

            // 3. 3Dモデル構築（CFRP流線型グライダー & 浮遊とび斗くんスフィア）
            this.buildModel();

            // 4. 周囲の微細な浮遊星気流パーティクル
            this.buildAuraParticles();

            // 5. ライティング（ダークミニマリズム）
            this.setupLighting();

            // 6. イベントバインド
            this.bindEvents();

            // 7. アニメーション
            this.animate = this.animate.bind(this);
            this.animate();
        }

        buildModel() {
            this.modelGroup = new THREE.Group();

            // A. 超長大カーボン主翼 (CFRP High-Aspect Wing)
            const wingGeo = new THREE.BoxGeometry(7.2, 0.06, 0.65, 32, 2, 8);
            const pos = wingGeo.attributes.position;
            // 上反角（Dihedral） & テーパー変形
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                let y = pos.getY(i);
                const z = pos.getZ(i);

                const spanRatio = Math.abs(x / 3.6);
                pos.setY(i, y + Math.pow(spanRatio, 1.8) * 0.35); // 翼端の美しいしなり
                pos.setZ(i, z * (1.0 - spanRatio * 0.35)); // 先細り
            }
            wingGeo.computeVertexNormals();

            const carbonMat = new THREE.MeshStandardMaterial({
                color: 0x0f172a,
                roughness: 0.25,
                metalness: 0.9,
                wireframe: false
            });

            this.wingMesh = new THREE.Mesh(wingGeo, carbonMat);
            this.wingMesh.position.set(0, 0, 0);
            this.modelGroup.add(this.wingMesh);

            // リブ構造のワイヤーフレームアクセント（シアン微光）
            const ribWireMat = new THREE.LineBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.45
            });
            const ribWire = new THREE.LineSegments(new THREE.WireframeGeometry(wingGeo), ribWireMat);
            this.wingMesh.add(ribWire);

            // B. 流線型コックピットフェアリング
            const fuselageGeo = new THREE.ConeGeometry(0.24, 1.8, 20);
            fuselageGeo.rotateX(Math.PI / 2);
            const fuselageMat = new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                roughness: 0.15,
                metalness: 0.1,
                transmission: 0.3,
                thickness: 0.5
            });
            const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
            fuselage.position.set(0, -0.08, -0.1);
            this.modelGroup.add(fuselage);

            // C. プロペラ
            this.propellerMesh = new THREE.Group();
            const propBladeGeo = new THREE.BoxGeometry(0.04, 1.1, 0.05);
            const propMat = new THREE.MeshStandardMaterial({
                color: 0xff5500, // エアロオレンジ
                roughness: 0.2,
                metalness: 0.8
            });
            const b1 = new THREE.Mesh(propBladeGeo, propMat);
            const b2 = new THREE.Mesh(propBladeGeo, propMat);
            b2.rotation.z = Math.PI / 2;
            this.propellerMesh.add(b1, b2);

            const spinnerGeo = new THREE.ConeGeometry(0.08, 0.22, 12);
            spinnerGeo.rotateX(Math.PI / 2);
            const spinner = new THREE.Mesh(spinnerGeo, propMat);
            this.propellerMesh.add(spinner);

            this.propellerMesh.position.set(0, -0.08, 0.82);
            this.modelGroup.add(this.propellerMesh);

            // D. 尾翼
            const finGeo = new THREE.BoxGeometry(0.02, 0.55, 0.35);
            const fin = new THREE.Mesh(finGeo, carbonMat);
            fin.position.set(0, 0.26, -1.35);
            this.modelGroup.add(fin);

            const stabGeo = new THREE.BoxGeometry(1.2, 0.02, 0.28);
            const stab = new THREE.Mesh(stabGeo, carbonMat);
            stab.position.set(0, 0.05, -1.35);
            this.modelGroup.add(stab);

            // E. とび斗くんホログラムリング（浮遊オーラ）
            const ringGeo = new THREE.TorusGeometry(0.65, 0.008, 16, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.6
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(0, 0.2, 0);
            this.modelGroup.add(ring);

            this.scene.add(this.modelGroup);
        }

        buildAuraParticles() {
            const count = 350;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const col = new Float32Array(count * 3);

            const cCyan = new THREE.Color(0x00f0ff);
            const cWhite = new THREE.Color(0xffffff);

            for (let i = 0; i < count; i++) {
                pos[i * 3 + 0] = (Math.random() - 0.5) * 14;
                pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
                pos[i * 3 + 2] = (Math.random() - 0.5) * 8;

                const c = cCyan.clone().lerp(cWhite, Math.random() * 0.5);
                col[i * 3 + 0] = c.r;
                col[i * 3 + 1] = c.g;
                col[i * 3 + 2] = c.b;
            }

            geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

            const mat = new THREE.PointsMaterial({
                size: 0.06,
                vertexColors: true,
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending
            });

            this.particles = new THREE.Points(geo, mat);
            this.scene.add(this.particles);
        }

        setupLighting() {
            // 上品なアンビエント
            const ambient = new THREE.AmbientLight(0x0a1220, 1.4);
            this.scene.add(ambient);

            // キーライト（シアンハイライト）
            const keyLight = new THREE.DirectionalLight(0x00f0ff, 2.8);
            keyLight.position.set(5, 6, 6);
            this.scene.add(keyLight);

            // リムライト（エアロオレンジアクセント）
            const rimLight = new THREE.DirectionalLight(0xff5500, 1.8);
            rimLight.position.set(-6, -4, -4);
            this.scene.add(rimLight);

            // トップスポット
            const spot = new THREE.SpotLight(0xffffff, 2.0, 15, Math.PI / 4, 0.5);
            spot.position.set(0, 6, 2);
            this.scene.add(spot);
        }

        bindEvents() {
            // マウス移動（視差チルト）
            window.addEventListener('mousemove', (e) => {
                const normX = (e.clientX / window.innerWidth) * 2 - 1;
                const normY = -(e.clientY / window.innerHeight) * 2 + 1;

                this.mouse.targetX = normX;
                this.mouse.targetY = normY;

                // ドラッグ中の手動回転加算
                if (this.isDragging) {
                    const dx = e.clientX - this.dragStart.x;
                    const dy = e.clientY - this.dragStart.y;
                    this.dragStart = { x: e.clientX, y: e.clientY };

                    this.manualRot.y += dx * 0.005;
                    this.manualRot.x += dy * 0.005;
                }
            });

            // ドラッグ開始
            this.renderer.domElement.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.dragStart = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mouseup', () => {
                this.isDragging = false;
            });

            // スクロール検知（奥への吸い込み演出）
            const onScroll = () => {
                const heroEl = document.getElementById('hero');
                const heroHeight = heroEl ? heroEl.offsetHeight : window.innerHeight;
                this.scrollY = window.pageYOffset || document.documentElement.scrollTop;
                this.scrollProgress = Math.max(0, Math.min(1.5, this.scrollY / heroHeight));
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            onScroll();

            // リサイズ
            window.addEventListener('resize', () => {
                if (!this.container || !this.renderer || !this.camera) return;
                const w = this.container.clientWidth;
                const h = this.container.clientHeight;
                if (w === 0 || h === 0) return;
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(w, h);
            });
        }

        animate() {
            requestAnimationFrame(this.animate);

            const elapsed = this.clock.getElapsedTime();

            // 1. マウス位置のLERPスムージング
            this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.045;
            this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.045;

            // 2. モデルの浮遊・自転・チルト運動
            if (this.modelGroup) {
                // 上下浮遊サイン波
                const levitation = Math.sin(elapsed * 1.2) * 0.12;

                // スクロール連動：奥へ吸い込まれる（Z方向へマイナス移動 & スケール縮小 & フェード）
                const suckBackZ = -this.scrollProgress * 9.0;
                const suckScale = Math.max(0.01, 1.0 - this.scrollProgress * 0.85);

                this.modelGroup.position.set(
                    this.mouse.x * 0.35,
                    levitation + this.mouse.y * 0.25 - this.scrollProgress * 1.5,
                    suckBackZ
                );
                this.modelGroup.scale.set(suckScale, suckScale, suckScale);

                // 自転ベース + マウスチルト + 手動ドラッグ回転
                const baseSpin = Math.sin(elapsed * 0.4) * 0.25;
                const targetRotY = baseSpin + this.mouse.x * 0.65 + this.manualRot.y;
                const targetRotX = -this.mouse.y * 0.45 + levitation * 0.2 + this.manualRot.x;
                const targetRotZ = -this.mouse.x * 0.25;

                this.modelGroup.rotation.y += (targetRotY - this.modelGroup.rotation.y) * 0.05;
                this.modelGroup.rotation.x += (targetRotX - this.modelGroup.rotation.x) * 0.05;
                this.modelGroup.rotation.z += (targetRotZ - this.modelGroup.rotation.z) * 0.05;

                // プロペラ回転
                if (this.propellerMesh) {
                    this.propellerMesh.rotation.z += 0.28;
                }

                // テレメトリHUD表示の更新（姿勢角）
                this.updateTelemetryHUD();
            }

            // 3. パーティクルの微細な漂い
            if (this.particles) {
                this.particles.rotation.y = elapsed * 0.02;
                this.particles.rotation.x = Math.sin(elapsed * 0.015) * 0.05;
            }

            this.renderer.render(this.scene, this.camera);
        }

        updateTelemetryHUD() {
            if (!this.modelGroup) return;

            const pitchDeg = (this.modelGroup.rotation.x * 180 / Math.PI).toFixed(1);
            const rollDeg = (this.modelGroup.rotation.z * 180 / Math.PI).toFixed(1);
            const yawDeg = (this.modelGroup.rotation.y * 180 / Math.PI).toFixed(1);

            const pitchEl = document.getElementById('hero-hud-pitch');
            if (pitchEl) pitchEl.textContent = `${pitchDeg}°`;

            const rollEl = document.getElementById('hero-hud-roll');
            if (rollEl) rollEl.textContent = `${rollDeg}°`;

            const yawEl = document.getElementById('hero-hud-yaw');
            if (yawEl) yawEl.textContent = `${yawDeg}°`;
        }
    }

    // グローバル公開 & 自動初期化
    window.DoesbookHero = DoesbookHero;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.tbtHero3D = new DoesbookHero();
        });
    } else {
        window.tbtHero3D = new DoesbookHero();
    }
})();
