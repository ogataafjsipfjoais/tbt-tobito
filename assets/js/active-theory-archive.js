/**
 * =========================================================================
 * Active Theory Aerodynamic WebGL & Fluid Cyber Laboratory
 * 芝浦工業大学 Team Birdman Trial (TBT) - アーカイブ & ワークポートフォリオ
 * 
 * 仕様:
 * 1. 琵琶湖風洞実験室 & 航空流体パーティクルシミュレーション (Fluid Streamlines)
 *    - 1,000+ 流体粒子が気流を描き、マウス速度・加速度によって水流/風圧ディストーションが発生
 * 2. インタラクティブ3Dイメージプレーン (PlaneGeometry + Custom GLSL Shader)
 *    - Vertex Shader: スクロール速度・ホバー・気流に連動したZ軸波打ち変形 (Sine wave deformation)
 *    - Fragment Shader: 色収差 (RGB Shift / Chromatic Aberration)、スキャンライン、サイバーエッジグロー
 * 3. インフィニティ・スムースドラッグ & パララックス (Inertia Virtual Camera Dolly)
 *    - マウスドラッグ、スワイプ、ホイールで慣性を持った3Dパララックス移動
 * 4. 航空テレメトリHUD & 詳細インスペクションモーダル (Active Theory Telemetry Dossier)
 * =========================================================================
 */

(function () {
    'use strict';

    // Three.js 依存性確認
    if (typeof THREE === 'undefined') {
        console.warn('[ActiveTheory] Three.js is not loaded. Fallback enabled.');
        return;
    }

    // デフォルトアーカイブデータ（HTML/PHPから渡されたデータが優先）
    const defaultArchives = [];

    class ActiveTheoryArchive {
        constructor() {
            // シングルトン保護
            if (window.activeTheoryInstance && window.activeTheoryInstance.renderer) {
                return window.activeTheoryInstance;
            }

            this.container = document.getElementById('active-theory-canvas-container') || document.getElementById('at-canvas-container');
            if (!this.container) {
                window.addEventListener('DOMContentLoaded', () => {
                    this.container = document.getElementById('active-theory-canvas-container') || document.getElementById('at-canvas-container');
                    if (this.container) this.init();
                });
                return;
            }

            this.init();
        }

        init() {
            // データ取得
            this.rawItems = window.activeTheoryArchivesData || defaultArchives;
            this.filteredItems = [...this.rawItems];
            this.activeCategory = 'ALL';

            // レンダリング状態
            const rect = this.container.getBoundingClientRect();
            this.width = Math.max(rect.width || this.container.clientWidth || 800, 300);
            this.height = Math.max(rect.height || this.container.clientHeight || 540, 300);
            this.clock = new THREE.Clock();

            // スクロール・ドラッグ状態
            this.scroll = 0;
            this.targetScroll = 0;
            this.velocity = 0;
            this.lastScroll = 0;
            this.spacing = window.innerWidth < 768 ? 3.6 : 4.4;

            this.isDragging = false;
            this.dragStartX = 0;
            this.dragLastX = 0;
            this.dragDist = 0;

            // マウス & 流体速度
            this.mouse = new THREE.Vector2(0, 0);
            this.mousePrev = new THREE.Vector2(0, 0);
            this.mouseVelocity = new THREE.Vector2(0, 0);
            this.mouseSpeed = 0;
            this.mouseWorld = new THREE.Vector3(0, 0, 0);

            // Raycaster
            this.raycaster = new THREE.Raycaster();
            this.hoveredIndex = -1;

            // メッシュ配列
            this.planeMeshes = [];
            this.animationFrameId = null;

            // 初期化
            this.initThree();
            this.initParticles();
            this.buildPlanes();
            this.bindEvents();
            this.bindUI();

            // 初回即時描画
            this.renderer.render(this.scene, this.camera);

            this.animate = this.animate.bind(this);
            this.animate();

            // 初期テレメトリ表示
            this.updateActiveTelemetry(0);
        }

        initThree() {
            // シーン
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x05070b);

            // カメラ
            this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
            this.camera.position.set(0, 0, 7.2);

            // 既存のキャンバスを再利用または安全に生成
            let targetCanvas = document.getElementById('at-canvas');
            if (!targetCanvas) {
                targetCanvas = this.container.querySelector('canvas');
            }
            if (!targetCanvas) {
                targetCanvas = document.createElement('canvas');
                targetCanvas.id = 'at-canvas';
                this.container.appendChild(targetCanvas);
            }

            // 余分な重複キャンバスがあれば削除
            const allCanvases = this.container.querySelectorAll('canvas');
            allCanvases.forEach(c => {
                if (c !== targetCanvas) c.remove();
            });

            this.canvas = targetCanvas;
            this.canvas.className = 'w-full h-full block cursor-grab active:cursor-grabbing select-none';

            // レンダラー
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(this.width, this.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.setClearColor(0x05070b, 1);

            // 照明
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
            this.scene.add(ambientLight);

            // シアン & オレンジのサイバー光源
            const cyanLight = new THREE.PointLight(0x00f0ff, 1.8, 25);
            cyanLight.position.set(-8, 5, 4);
            this.scene.add(cyanLight);

            const orangeLight = new THREE.PointLight(0xff5500, 1.4, 25);
            orangeLight.position.set(8, -5, 4);
            this.scene.add(orangeLight);
        }

        /**
         * リアルタイム流体粒子（Particles）シミュレーション
         * 琵琶湖の風洞気流と水面を模したストリームライン
         */
        initParticles() {
            this.particleCount = 1100;
            const geometry = new THREE.BufferGeometry();

            const positions = new Float32Array(this.particleCount * 3);
            const basePositions = new Float32Array(this.particleCount * 3);
            const velocities = new Float32Array(this.particleCount * 3);
            const colors = new Float32Array(this.particleCount * 3);
            const sizes = new Float32Array(this.particleCount);
            const phases = new Float32Array(this.particleCount);
            const speeds = new Float32Array(this.particleCount);

            const colorCyan = new THREE.Color(0x00f0ff);
            const colorOrange = new THREE.Color(0xff5500);
            const colorWhite = new THREE.Color(0xffffff);

            for (let i = 0; i < this.particleCount; i++) {
                const x = (Math.random() - 0.5) * 30;
                const y = (Math.random() - 0.5) * 14;
                const z = (Math.random() - 0.5) * 10 - 2;

                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                basePositions[i * 3] = x;
                basePositions[i * 3 + 1] = y;
                basePositions[i * 3 + 2] = z;

                velocities[i * 3] = 0;
                velocities[i * 3 + 1] = 0;
                velocities[i * 3 + 2] = 0;

                // 色配分 (70% シアン, 20% オレンジ, 10% ホワイト)
                const randCol = Math.random();
                let col;
                if (randCol < 0.7) {
                    col = colorCyan;
                } else if (randCol < 0.9) {
                    col = colorOrange;
                } else {
                    col = colorWhite;
                }
                colors[i * 3] = col.r;
                colors[i * 3 + 1] = col.g;
                colors[i * 3 + 2] = col.b;

                sizes[i] = Math.random() * 0.12 + 0.05;
                phases[i] = Math.random() * Math.PI * 2;
                speeds[i] = Math.random() * 2.5 + 4.5; // 風速 (m/s 相当)
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            this.particleBasePositions = basePositions;
            this.particleVelocities = velocities;
            this.particlePhases = phases;
            this.particleSpeeds = speeds;

            // ソフト円形パーティクルテクスチャ
            const particleTexture = this.createParticleTexture();

            const material = new THREE.PointsMaterial({
                size: 0.16,
                map: particleTexture,
                transparent: true,
                vertexColors: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                opacity: 0.85
            });

            this.particleSystem = new THREE.Points(geometry, material);
            this.scene.add(this.particleSystem);
        }

        createParticleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
            grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
            grad.addColorStop(0.3, 'rgba(200, 245, 255, 0.9)');
            grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.3)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 64, 64);
            const texture = new THREE.CanvasTexture(canvas);
            return texture;
        }

        /**
         * アーカイブカードのシェーダー変形 (Interactive Image Plane)
         */
        buildPlanes() {
            // 既存プレーン削除
            this.planeMeshes.forEach(mesh => {
                this.scene.remove(mesh);
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            this.planeMeshes = [];

            const isMobile = window.innerWidth < 768;
            const planeWidth = isMobile ? 3.1 : 3.8;
            const planeHeight = isMobile ? 2.1 : 2.5;
            const segments = 40;

            const textureLoader = new THREE.TextureLoader();

            this.filteredItems.forEach((item, index) => {
                const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight, segments, segments);

                // テクスチャ読み込み
                const texturePath = 'assets/images/' + item.id;
                const texture = textureLoader.load(
                    texturePath,
                    (loadedTex) => {
                        loadedTex.needsUpdate = true;
                        material.uniforms.uTexture.value = loadedTex;
                        material.needsUpdate = true;
                        if (this.renderer && this.scene && this.camera) {
                            this.renderer.render(this.scene, this.camera);
                        }
                    },
                    undefined,
                    () => {
                        console.warn('[ActiveTheory] Failed to load texture:', texturePath);
                    }
                );
                texture.minFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;

                // カテゴリに応じたアクセントカラー
                let accentColor = new THREE.Color(0x00f0ff);
                if (item.type === 'MERCHANDISE') accentColor = new THREE.Color(0xff5500);
                if (item.type === 'CRAFT ART') accentColor = new THREE.Color(0x38bdf8);

                // Active Theory Aerodynamic Wave Shader
                const material = new THREE.ShaderMaterial({
                    uniforms: {
                        uTexture: { value: texture },
                        uTime: { value: 0 },
                        uHover: { value: 0 },
                        uVelocity: { value: 0 },
                        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
                        uGlitch: { value: 0.0 },
                        uColorAccent: { value: accentColor }
                    },
                    vertexShader: `
                        uniform float uTime;
                        uniform float uHover;
                        uniform float uVelocity;
                        uniform vec2 uMouse;
                        varying vec2 vUv;
                        varying float vWave;
                        varying vec3 vWorldPos;

                        void main() {
                            vUv = uv;
                            vec3 pos = position;

                            // 気流のうねり（Sine wave aerodynamic deformation）
                            float waveX = sin(pos.x * 2.6 + uTime * 2.2) * cos(pos.y * 2.0 + uTime * 1.8);
                            float waveY = cos(pos.x * 1.8 - uTime * 1.9) * sin(pos.y * 2.8 + uTime * 2.1);
                            float wave = (waveX + waveY) * (0.07 + uHover * 0.16) + (uVelocity * 0.14);

                            // マウス近接度による局所的な風圧ディストーション（波紋）
                            float dist = distance(vUv, uMouse);
                            float mouseBulge = smoothstep(0.55, 0.0, dist) * uHover * 0.24;

                            pos.z += wave + mouseBulge;
                            vWave = pos.z;

                            vec4 worldPos = modelMatrix * vec4(pos, 1.0);
                            vWorldPos = worldPos.xyz;
                            gl_Position = projectionMatrix * viewMatrix * worldPos;
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D uTexture;
                        uniform float uTime;
                        uniform float uHover;
                        uniform float uVelocity;
                        uniform float uGlitch;
                        uniform vec3 uColorAccent;
                        varying vec2 vUv;
                        varying float vWave;
                        varying vec3 vWorldPos;

                        float random(vec2 st) {
                            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
                        }

                        void main() {
                            // 色収差（RGBシフト / Chromatic Aberration）
                            // ホバーとドラッグ速度、グリッチに応じてオフセットが拡大
                            float chromatic = (0.012 * uHover) + (abs(uVelocity) * 0.02) + (uGlitch * 0.025);
                            vec2 uvDist = vUv;

                            // 微小ノイズグリッチ
                            if (uGlitch > 0.01) {
                                float n = random(vec2(uTime, floor(vUv.y * 32.0)));
                                if (n > 0.88) {
                                    uvDist.x += (random(vec2(n, uTime)) - 0.5) * 0.035 * uGlitch;
                                }
                            }

                            vec2 rOffset = vec2(chromatic, chromatic * 0.35);
                            vec2 bOffset = vec2(-chromatic, -chromatic * 0.35);

                            float r = texture2D(uTexture, uvDist + rOffset).r;
                            float g = texture2D(uTexture, uvDist).g;
                            float b = texture2D(uTexture, uvDist + bOffset).b;
                            float a = texture2D(uTexture, uvDist).a;

                            // スキャンライン (風洞実験テレメトリモニタ)
                            float scanline = sin(uvDist.y * 240.0 + uTime * 8.0) * 0.04 * uHover;
                            vec3 col = vec3(r, g, b) + scanline;

                            // 周囲のサイバー暗色ビネット
                            vec2 vigUv = (uvDist - 0.5) * 2.0;
                            float vig = 1.0 - dot(vigUv, vigUv) * 0.16;
                            col *= max(vig, 0.45);

                            // アクティブ・セオリー風 エッジグロー（蛍光シアン / オレンジ）
                            float edgeX = smoothstep(0.46, 0.5, abs(uvDist.x - 0.5));
                            float edgeY = smoothstep(0.46, 0.5, abs(uvDist.y - 0.5));
                            float edge = max(edgeX, edgeY);
                            col = mix(col, uColorAccent, edge * (0.35 + uHover * 0.6));

                            // 角ブラケット（Active Theory HUD コーナーマーク）
                            vec2 cornerDist = abs(uvDist - 0.5);
                            if ((cornerDist.x > 0.46 && cornerDist.y > 0.43) || (cornerDist.x > 0.43 && cornerDist.y > 0.46)) {
                                col = mix(col, vec3(0.0, 0.94, 1.0), 0.9);
                            }

                            // ホバー時のコントラストと発光
                            col = mix(col, col * 1.15 + vec3(0.01, 0.04, 0.07), uHover * 0.3);

                            gl_FragColor = vec4(col, max(a, 0.25 + uHover * 0.35));
                        }
                    `,
                    transparent: true,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.userData = {
                    item: item,
                    index: index,
                    hoverVal: 0,
                    targetHover: 0
                };

                this.scene.add(mesh);
                this.planeMeshes.push(mesh);
            });
        }

        bindEvents() {
            // リサイズ
            window.addEventListener('resize', () => this.onResize());

            // ポインタ移動（流体速度 & Raycast）
            this.container.addEventListener('pointermove', (e) => this.onPointerMove(e));

            // ドラッグ開始
            this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            window.addEventListener('pointerup', (e) => this.onPointerUp(e));
            window.addEventListener('pointercancel', (e) => this.onPointerUp(e));

            // ホイール（仮想カメラ移動）
            this.container.addEventListener('wheel', (e) => {
                e.preventDefault();
                const delta = e.deltaY * 0.0016;
                this.targetScroll += delta;
                this.clampTargetScroll();
            }, { passive: false });

            // クリック（詳細インスペクション）
            this.container.addEventListener('click', (e) => this.onClick(e));

            // ResizeObserver による確実なコンテナサイズ追従
            if ('ResizeObserver' in window) {
                const ro = new ResizeObserver(() => {
                    this.onResize();
                });
                ro.observe(this.container);
            }
        }

        onResize() {
            if (!this.container || !this.renderer || !this.camera) return;
            const rect = this.container.getBoundingClientRect();
            this.width = Math.max(rect.width || this.container.clientWidth || 800, 300);
            this.height = Math.max(rect.height || this.container.clientHeight || 540, 300);

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.width, this.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

            this.spacing = window.innerWidth < 768 ? 3.6 : 4.4;
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        onPointerDown(e) {
            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragLastX = e.clientX;
            this.dragDist = 0;
            this.canvas.classList.remove('cursor-grab');
            this.canvas.classList.add('cursor-grabbing');
        }

        onPointerMove(e) {
            const rect = this.container.getBoundingClientRect();
            const currentX = (e.clientX - rect.left) / rect.width * 2 - 1;
            const currentY = -((e.clientY - rect.top) / rect.height * 2 - 1);

            // マウス移動速度 & 加速度の計測（Fluid Distortion 用）
            this.mouseVelocity.x = currentX - this.mousePrev.x;
            this.mouseVelocity.y = currentY - this.mousePrev.y;
            this.mouseSpeed = this.mouseVelocity.length() * 60; // 速度スケール

            // 3D 空間でのマウス座標を正確に計算（Z=0 平面との交点）
            const unprojectVec = new THREE.Vector3(currentX, currentY, 0.5);
            unprojectVec.unproject(this.camera);
            const rayDir = unprojectVec.sub(this.camera.position).normalize();
            if (rayDir.z !== 0) {
                const distToZ0 = -this.camera.position.z / rayDir.z;
                this.mouseWorld.copy(this.camera.position).add(rayDir.multiplyScalar(distToZ0));
            }

            // ドラッグ中の場合、スクロール量を更新
            if (this.isDragging) {
                const deltaX = e.clientX - this.dragLastX;
                this.dragDist += Math.abs(deltaX);
                const factor = 1.0 / (this.width * 0.22);
                this.targetScroll -= deltaX * factor;
                this.dragLastX = e.clientX;
                this.clampTargetScroll();
            }

            // Raycasting（ホバー検出 & マウスUV座標の更新）
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.planeMeshes);

            if (intersects.length > 0) {
                const hit = intersects[0];
                const mesh = hit.object;
                this.hoveredIndex = mesh.userData.index;

                // プレーンにマウスUVとホバーを渡す
                if (mesh.material.uniforms && hit.uv) {
                    mesh.material.uniforms.uMouse.value.set(hit.uv.x, hit.uv.y);
                }

                this.planeMeshes.forEach(m => {
                    m.userData.targetHover = (m === mesh) ? 1.0 : 0.0;
                });
            } else {
                this.hoveredIndex = -1;
                this.planeMeshes.forEach(m => {
                    m.userData.targetHover = 0.0;
                });
            }

            // 流体速度テレメトリの更新
            this.updateFluidTelemetry();
        }

        onPointerUp(e) {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.canvas.classList.remove('cursor-grabbing');
            this.canvas.classList.add('cursor-grab');

            // 慣性スナップ（一番近いカードへ吸着）
            this.targetScroll = Math.round(this.targetScroll);
            this.clampTargetScroll();
        }

        clampTargetScroll() {
            const max = Math.max(0, this.filteredItems.length - 1);
            this.targetScroll = Math.max(-0.2, Math.min(max + 0.2, this.targetScroll));
        }

        onClick(e) {
            // ドラッグ量が少なければクリックと判定
            if (this.dragDist > 8) return;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.planeMeshes);

            if (intersects.length > 0) {
                const mesh = intersects[0].object;
                const item = mesh.userData.item;
                this.openInspectionModal(item);
            }
        }

        /**
         * アニメーションループ (60fps)
         */
        animate() {
            requestAnimationFrame(() => this.animate());

            const delta = this.clock.getDelta();
            const time = this.clock.getElapsedTime();

            // スクロール慣性 (Lerp)
            this.scroll += (this.targetScroll - this.scroll) * 0.085;
            this.velocity = this.scroll - this.lastScroll;
            this.lastScroll = this.scroll;

            // 流体パーティクルの更新
            this.updateParticles(delta, time);

            // 3D プレーンの配置・うねり・パララックス
            const currentActiveIndex = Math.max(0, Math.min(this.filteredItems.length - 1, Math.round(this.scroll)));

            this.planeMeshes.forEach((mesh, i) => {
                const diff = i - this.scroll;

                // 3D カーブドギャラリー配置 (Active Theory Parallax Dolly)
                mesh.position.x = diff * this.spacing;
                mesh.position.z = -Math.abs(diff) * 1.15; // 奥行きへの引き
                mesh.position.y = Math.sin(diff * 0.6 + time * 1.4) * 0.12; // 浮遊

                // カメラを向く回転
                mesh.rotation.y = -diff * 0.14;
                mesh.rotation.z = -diff * 0.02;

                // ホバー値の Lerp
                mesh.userData.hoverVal += (mesh.userData.targetHover - mesh.userData.hoverVal) * 0.15;

                // シェーダー uniforms 更新
                if (mesh.material.uniforms) {
                    mesh.material.uniforms.uTime.value = time;
                    mesh.material.uniforms.uHover.value = mesh.userData.hoverVal;
                    mesh.material.uniforms.uVelocity.value = this.velocity * 4.0;

                    // ドラッグ急停止時の微小グリッチ
                    if (Math.abs(this.velocity) > 0.04) {
                        mesh.material.uniforms.uGlitch.value = Math.min(1.0, Math.abs(this.velocity) * 12.0);
                    } else {
                        mesh.material.uniforms.uGlitch.value *= 0.9;
                    }
                }
            });

            // テレメトリ HUD & スクラバーの更新
            this.updateScrubberHUD(currentActiveIndex);

            // レンダリング
            this.renderer.render(this.scene, this.camera);
        }

        /**
         * リアルタイム流体パーティクル更新 (Wind Tunnel Fluid Streamlines)
         */
        updateParticles(delta, time) {
            if (!this.particleSystem) return;

            const positions = this.particleSystem.geometry.attributes.position.array;
            const basePos = this.particleBasePositions;
            const vels = this.particleVelocities;
            const phases = this.particlePhases;
            const speeds = this.particleSpeeds;

            // マウスの風圧加速度
            const mSpeed = Math.min(2.5, this.mouseSpeed);
            const mVx = this.mouseVelocity.x * 25;
            const mVy = this.mouseVelocity.y * 25;

            for (let i = 0; i < this.particleCount; i++) {
                const idx = i * 3;

                // 基本気流（左から右へ流れる風）
                let posX = positions[idx];
                let posY = positions[idx + 1];
                let posZ = positions[idx + 2];

                // 調和風洞ウェーブ
                const targetY = basePos[idx + 1] + Math.sin(posX * 0.35 + time * 1.6 + phases[i]) * 0.35;

                // マウス位置との流体干渉（Fluid Wake & Ripple Distortion）
                const dx = posX - this.mouseWorld.x;
                const dy = posY - this.mouseWorld.y;
                const dist = Math.hypot(dx, dy);

                if (dist < 2.8) {
                    const wakeForce = (1.0 - dist / 2.8) * (0.8 + mSpeed * 1.5);
                    vels[idx] += (dx / (dist + 0.01) * 0.4 + mVx * 0.8) * wakeForce;
                    vels[idx + 1] += (dy / (dist + 0.01) * 0.4 + mVy * 0.8) * wakeForce;
                }

                // 速度減衰（流体粘性）
                vels[idx] *= 0.92;
                vels[idx + 1] *= 0.92;

                // 座標更新
                posX += (speeds[i] + vels[idx]) * delta;
                posY += (vels[idx + 1] + (targetY - posY) * 0.08);

                // 画面外（右端）に出たら左端へループ
                if (posX > 15) {
                    posX = -15;
                    posY = basePos[idx + 1];
                }

                positions[idx] = posX;
                positions[idx + 1] = posY;
                positions[idx + 2] = posZ;
            }

            this.particleSystem.geometry.attributes.position.needsUpdate = true;
        }

        /**
         * 流体速度テレメトリ表示の更新
         */
        updateFluidTelemetry() {
            const windEl = document.getElementById('at-telemetry-wind');
            const regimeEl = document.getElementById('at-telemetry-regime');
            if (!windEl) return;

            // マウス速度に応じたリアルタイム風速
            const liveWind = (10.2 + this.mouseSpeed * 3.8).toFixed(1);
            windEl.textContent = `${liveWind} m/s`;

            if (regimeEl) {
                if (this.mouseSpeed > 0.6) {
                    regimeEl.textContent = 'TURBULENT (HIGH Re)';
                    regimeEl.className = 'text-cyber-orange glow-orange-text font-bold';
                } else {
                    regimeEl.textContent = 'LAMINAR FLOW';
                    regimeEl.className = 'text-cyber-cyan glow-cyan-text';
                }
            }
        }

        /**
         * HUD & スクラバーの更新
         */
        updateScrubberHUD(activeIndex) {
            const count = this.filteredItems.length;
            if (count === 0) return;

            // スクラバープログレス
            const progressEl = document.getElementById('at-scrubber-progress');
            if (progressEl) {
                const pct = Math.max(0, Math.min(100, (this.scroll / Math.max(1, count - 1)) * 100));
                progressEl.style.width = `${pct}%`;
            }

            // インデックス表示
            const indexEl = document.getElementById('at-index-counter');
            if (indexEl) {
                const curStr = String(activeIndex + 1).padStart(2, '0');
                const totStr = String(count).padStart(2, '0');
                indexEl.textContent = `[ ${curStr} // ${totStr} ]`;
            }

            // アクティブアイテムのテレメトリ
            if (this.lastReportedIndex !== activeIndex) {
                this.lastReportedIndex = activeIndex;
                this.updateActiveTelemetry(activeIndex);
            }
        }

        updateActiveTelemetry(idx) {
            const item = this.filteredItems[idx];
            if (!item) return;

            const codeEl = document.getElementById('at-hud-code');
            const titleEl = document.getElementById('at-hud-title');
            const lotEl = document.getElementById('at-hud-lot');
            const velEl = document.getElementById('at-hud-vel');
            const cadEl = document.getElementById('at-hud-cadence');
            const tagEl = document.getElementById('at-hud-tag');

            if (codeEl) codeEl.textContent = item.code || `TBT-AERO-${item.number}`;
            if (titleEl) titleEl.textContent = item.story_title || item.item_name;
            if (lotEl) lotEl.textContent = item.lot_number || `LOT. ${item.number}`;
            if (velEl) velEl.textContent = item.telemetry ? item.telemetry.velocity : '11.4 m/s';
            if (cadEl) cadEl.textContent = item.telemetry ? item.telemetry.cadence : '88 RPM';
            if (tagEl) tagEl.textContent = item.telemetry ? item.telemetry.aero_tag : 'AERODYNAMIC PROFILE';
        }

        /**
         * カテゴリフィルタ
         */
        setCategory(cat) {
            this.activeCategory = cat;

            if (cat === 'ALL') {
                this.filteredItems = [...this.rawItems];
            } else {
                this.filteredItems = this.rawItems.filter(item => item.type === cat);
            }

            // プレーン再構築
            this.buildPlanes();
            this.scroll = 0;
            this.targetScroll = 0;
            this.updateActiveTelemetry(0);

            // ボタンアクティブ状態更新
            const btns = document.querySelectorAll('.at-filter-btn');
            btns.forEach(btn => {
                if (btn.getAttribute('data-filter') === cat) {
                    btn.classList.add('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-300');
                    btn.classList.remove('text-stone-400', 'border-white/10');
                } else {
                    btn.classList.remove('bg-cyan-500/20', 'border-cyan-400', 'text-cyan-300');
                    btn.classList.add('text-stone-400', 'border-white/10');
                }
            });
        }

        /**
         * UIバインド (ボタン・モーダル・全画面)
         */
        bindUI() {
            // 前後ボタン
            const prevBtn = document.getElementById('at-nav-prev');
            const nextBtn = document.getElementById('at-nav-next');

            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    this.targetScroll = Math.max(0, Math.round(this.targetScroll) - 1);
                });
            }
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    this.targetScroll = Math.min(this.filteredItems.length - 1, Math.round(this.targetScroll) + 1);
                });
            }

            // カテゴリフィルタボタン
            const filterBtns = document.querySelectorAll('.at-filter-btn');
            filterBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const cat = btn.getAttribute('data-filter');
                    this.setCategory(cat);
                });
            });

            // フルスクリーン切り替えボタン
            const fsBtn = document.getElementById('at-fullscreen-btn');
            const section = document.getElementById('archives');
            if (fsBtn && section) {
                fsBtn.addEventListener('click', () => {
                    section.classList.toggle('at-fullscreen-active');
                    const isFs = section.classList.contains('at-fullscreen-active');
                    fsBtn.innerHTML = isFs 
                        ? '<i class="fa-solid fa-compress mr-1.5"></i><span>EXIT FULLSCREEN</span>'
                        : '<i class="fa-solid fa-expand mr-1.5"></i><span>FULLSCREEN EXPAND</span>';
                    setTimeout(() => this.onResize(), 100);
                });
            }

            // 現在アイテムの詳細インスペクションボタン
            const inspectBtn = document.getElementById('at-inspect-current-btn');
            if (inspectBtn) {
                inspectBtn.addEventListener('click', () => {
                    const curIdx = Math.max(0, Math.min(this.filteredItems.length - 1, Math.round(this.targetScroll)));
                    const item = this.filteredItems[curIdx];
                    if (item) this.openInspectionModal(item);
                });
            }

            // モーダル閉じる
            const modal = document.getElementById('active-theory-modal');
            const closeBtn = document.getElementById('at-modal-close-btn');
            if (modal && closeBtn) {
                closeBtn.addEventListener('click', () => this.closeInspectionModal());
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeInspectionModal();
                });
            }

            // キーボード操作 (ESC, ArrowLeft, ArrowRight)
            window.addEventListener('keydown', (e) => {
                if (modal && !modal.classList.contains('hidden')) {
                    if (e.key === 'Escape') this.closeInspectionModal();
                    if (e.key === 'ArrowLeft') this.navigateModal(-1);
                    if (e.key === 'ArrowRight') this.navigateModal(1);
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    this.targetScroll = Math.max(0, Math.round(this.targetScroll) - 1);
                } else if (e.key === 'ArrowRight') {
                    this.targetScroll = Math.min(this.filteredItems.length - 1, Math.round(this.targetScroll) + 1);
                }
            });
        }

        /**
         * 詳細インスペクションモーダル (Active Theory Telemetry Dossier)
         */
        openInspectionModal(item) {
            const modal = document.getElementById('active-theory-modal');
            if (!modal) return;

            this.modalCurrentItem = item;

            // フィールド更新
            const img = document.getElementById('at-modal-img');
            const title = document.getElementById('at-modal-title');
            const code = document.getElementById('at-modal-code');
            const lot = document.getElementById('at-modal-lot');
            const cat = document.getElementById('at-modal-category');
            const story = document.getElementById('at-modal-story');
            const specs = document.getElementById('at-modal-specs');
            const material = document.getElementById('at-modal-material');
            const record = document.getElementById('at-modal-record');
            const dlBtn = document.getElementById('at-modal-download');
            const vel = document.getElementById('at-modal-vel');
            const cad = document.getElementById('at-modal-cad');
            const alt = document.getElementById('at-modal-alt');
            const tag = document.getElementById('at-modal-tag');

            if (img) img.src = 'assets/images/' + item.id;
            if (title) title.textContent = item.story_title || item.item_name;
            if (code) code.textContent = item.code || `TBT-AERO-${item.number}`;
            if (lot) lot.textContent = item.lot_number || `LOT. ${item.number}`;
            if (cat) cat.textContent = item.category || 'ARCHIVE SPEC';
            if (story) story.textContent = item.story_text || item.desc;
            if (specs) specs.textContent = item.specs || 'N/A';
            if (material) material.textContent = item.material || 'N/A';
            if (record) record.textContent = item.recorded_by || 'Team Birdman Trial';
            if (dlBtn) dlBtn.href = 'assets/images/' + item.id;

            if (item.telemetry) {
                if (vel) vel.textContent = item.telemetry.velocity;
                if (cad) cad.textContent = item.telemetry.cadence;
                if (alt) alt.textContent = item.telemetry.altitude;
                if (tag) tag.textContent = item.telemetry.aero_tag;
            }

            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }

        closeInspectionModal() {
            const modal = document.getElementById('active-theory-modal');
            if (modal) modal.classList.add('hidden');
            document.body.style.overflow = '';
        }

        navigateModal(dir) {
            if (!this.modalCurrentItem) return;
            const currentIdx = this.filteredItems.findIndex(i => i.id === this.modalCurrentItem.id);
            if (currentIdx === -1) return;

            let nextIdx = currentIdx + dir;
            if (nextIdx < 0) nextIdx = this.filteredItems.length - 1;
            if (nextIdx >= this.filteredItems.length) nextIdx = 0;

            this.openInspectionModal(this.filteredItems[nextIdx]);
            this.targetScroll = nextIdx;
        }
    }

    // グローバルインスタンスの公開
    window.ActiveTheoryArchive = ActiveTheoryArchive;

    function initActiveTheory() {
        if (!window.activeTheoryInstance) {
            window.activeTheoryInstance = new ActiveTheoryArchive();
        }
        window.atArchive = window.activeTheoryInstance;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initActiveTheory);
    } else {
        initActiveTheory();
    }
})();
