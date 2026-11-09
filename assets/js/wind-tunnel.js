/**
 * ==============================================================================
 * TBT Wind Tunnel Simulation (リアルタイム航空力学・風洞実験室シミュレータ)
 * ==============================================================================
 * 
 * 機能要件:
 * 1. Three.js による風洞実験チャンバー & リアルタイム気流シミュレーション
 * 2. 2,000本の流線パーティクル（上面加速・下面減速・翼端渦・後流剥離）
 * 3. 人力飛行機3Dメッシュ（CFRP超長大主翼、フェアリング、尾翼、プロペラ）
 * 4. 風速 (5.0〜25.0 m/s) & 迎角 (-5.0°〜+15.0°) のリアルタイムスライダーUI連動
 * 5. 360°マウスドラッグ回転・ズーム・カメラ視点プリセット
 * 6. 動圧 q, 揚抗比 L/D, レイノルズ数 Re リアルタイム航空テレメトリ計算
 */

(function () {
    'use strict';

    class WindTunnelSimulator {
        constructor() {
            // シングルトン保護: 既に動作しているインスタンスがあればそれを返却
            if (window.tbtWindTunnel && window.tbtWindTunnel.renderer) {
                return window.tbtWindTunnel;
            }

            this.container = null;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.aircraftGroup = null;
            this.propeller = null;
            this.particleSystem = null;
            this.particleCount = 900;

            // 物理パラメータ
            this.windSpeed = 8.0;
            this.aoaDeg = 3.5;    // 迎角 度 (-5.0 - +15.0)
            this.airDensity = 1.225; // kg/m^3
            this.wingArea = 45.60;
            this.wingSpan = 40.0;
            this.aspectRatio = 35.09;

            // カメラ制御
            this.isDragging = false;
            this.prevMouse = { x: 0, y: 0 };
            this.rotAngles = { phi: 0.35, theta: 0.85 }; // 球面座標
            this.camDistance = 18.0;
            this.targetCenter = (typeof THREE !== 'undefined' && THREE.Vector3) ? new THREE.Vector3(0, 0, 0) : null;

            this.animationFrameId = null;
            this.isVisible = true;
            this.hasRenderedOnce = false;

            this.init();
        }

        init() {
            this.container = document.getElementById('wind-tunnel-canvas-container');
            if (!this.container) {
                // コンテナが見つからない場合は遅延待機
                window.addEventListener('DOMContentLoaded', () => {
                    this.container = document.getElementById('wind-tunnel-canvas-container');
                    if (this.container) this.setup();
                });
                return;
            }
            this.setup();
        }

        setup() {
            if (typeof THREE === 'undefined') {
                console.warn('[WindTunnel] Three.js not loaded. Retrying...');
                setTimeout(() => this.setup(), 200);
                return;
            }

            if (!this.container) {
                this.container = document.getElementById('wind-tunnel-canvas-container');
                if (!this.container) return;
            }

            this.targetCenter = new THREE.Vector3(0, 0, 0);

            // 1. シーン & レンダラー
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x050811);
            // 濃すぎるFogExp2を緩和し、遠方のみに穏やかな線形フォグを適用
            this.scene.fog = new THREE.Fog(0x050811, 35, 90);

            const rect = this.container.getBoundingClientRect();
            const width = Math.max(rect.width || this.container.clientWidth || 800, 300);
            const height = Math.max(rect.height || this.container.clientHeight || 480, 300);

            this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
            this.updateCameraPos();

            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.6;
            
            // 既存キャンバスのみを除去（オーバーレイUIバッジ等は保持）
            const oldCanvases = this.container.querySelectorAll('canvas');
            oldCanvases.forEach(c => c.remove());
            this.container.appendChild(this.renderer.domElement);

            // 2. 風洞テストチャンバーの構築
            this.buildTunnelEnvironment();

            // 3. 人力飛行機 3D メッシュの構築
            this.buildAircraftMesh();

            // 4. 流線パーティクルシステムの構築
            this.buildParticleStreamlines();

            // 5. ライティング
            this.setupLighting();

            // 6. イベントバインド & UI接続
            this.bindEvents();
            this.bindUIControls();
            this.updateTelemetryHUD();

            // 初回即時描画（ロード直後に空白になるのを確実に防止）
            this.renderer.render(this.scene, this.camera);
            this.hasRenderedOnce = true;

            // 7. アニメーションループ開始
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
            }
            this.animate = this.animate.bind(this);
            this.animate();
        }

        /**
         * 風洞テストチャンバーの幾何構造 & グリッド
         */
        buildTunnelEnvironment() {
            // テストチャンバー境界ボックス（アクリル風半透明ワイヤー）
            const chamberGeo = new THREE.BoxGeometry(24, 8, 14);
            const chamberWire = new THREE.WireframeGeometry(chamberGeo);
            const chamberMat = new THREE.LineBasicMaterial({
                color: 0x00f0ff,
                transparent: true,
                opacity: 0.12
            });
            const chamberMesh = new THREE.LineSegments(chamberWire, chamberMat);
            this.scene.add(chamberMesh);

            // グリッド床 (高精度航空グリッド)
            const gridHelper = new THREE.GridHelper(24, 24, 0x00f0ff, 0x1e293b);
            gridHelper.position.y = -3.99;
            this.scene.add(gridHelper);

            // 風上インレット（整流ハニカム網）
            const honeycombGeo = new THREE.PlaneGeometry(8, 14, 16, 28);
            const honeycombMat = new THREE.MeshBasicMaterial({
                color: 0x00f0ff,
                wireframe: true,
                transparent: true,
                opacity: 0.15
            });
            const honeycomb = new THREE.Mesh(honeycombGeo, honeycombMat);
            honeycomb.rotation.y = Math.PI / 2;
            honeycomb.position.x = -11.9;
            this.scene.add(honeycomb);
        }

        /**
         * 人力飛行機 3D メッシュの構築 (高アスペクト比カーボン翼 & フェアリング)
         */
        buildAircraftMesh() {
            this.aircraftGroup = new THREE.Group();
            this.scene.add(this.aircraftGroup);
            this.updateAircraftPitch();
            const load = async () => {
                window.TBTS320.status(this.container, 'loading');
                try {
                    const model = await window.TBTS320.create({ span: 11 });
                    model.root.rotation.y = -Math.PI / 2;
                    model.root.position.y = 0.4;
                    this.aircraftGroup.add(model.root);
                    this.propeller = model.propeller;
                    this.wingFlex = model.flex;
                    this.updateWingFlex(0, performance.now(), true);
                    window.TBTS320.status(this.container, 'ready');
                    this.renderer.render(this.scene, this.camera);
                } catch (error) {
                    window.TBTS320.status(this.container, 'error', load);
                    console.error('[S-320 wind tunnel]', error);
                }
            };
            load();
        }

        /**
         * リアルタイム流線パーティクルシステム (Airflow Streamline Particles)
         */
        buildParticleStreamlines() {
            const count = this.particleCount;
            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);

            // 各パーティクルの個別状態保持
            this.particlesData = [];

            const cCyan = new THREE.Color(0x00f0ff);
            const cWhite = new THREE.Color(0xffffff);
            const cOrange = new THREE.Color(0xff7700);

            for (let i = 0; i < count; i++) {
                // 初期位置（風上側 -12.0 〜 12.0 にランダム分散）
                const x = (Math.random() - 0.5) * 24.0;
                // 主翼周辺に密度を集中させるY・Z配置
                const y = (Math.random() - 0.5) * 4.5 + 0.5;
                const z = (Math.random() - 0.5) * 11.5;

                positions[i * 3 + 0] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                // カラー（シアン〜白）
                const mixRatio = Math.random();
                const col = cCyan.clone().lerp(cWhite, mixRatio * 0.4);
                colors[i * 3 + 0] = col.r;
                colors[i * 3 + 1] = col.g;
                colors[i * 3 + 2] = col.b;


                this.particlesData.push({
                    origY: y,
                    origZ: z,
                    speedMult: 0.85 + Math.random() * 0.3,
                    life: Math.random(),
                    vortexSign: z > 0 ? 1 : -1
                });
            }

            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            const dotCanvas = document.createElement('canvas');
            dotCanvas.width = dotCanvas.height = 32;
            const dotContext = dotCanvas.getContext('2d');
            dotContext.fillStyle = '#fff';
            dotContext.beginPath();
            dotContext.arc(16, 16, 13, 0, Math.PI * 2);
            dotContext.fill();

            // パーティクル用ポイントマテリアル (暗闇に鮮烈に映える流線粒子)
            const pMat = new THREE.PointsMaterial({
                size: 5,
                sizeAttenuation: false,
                map: new THREE.CanvasTexture(dotCanvas),
                vertexColors: true,
                transparent: true,
                opacity: 0.78,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            this.particleSystem = new THREE.Points(geometry, pMat);
            this.scene.add(this.particleSystem);
            this.updateParticleAppearance();
        }

        updateParticleAppearance() {
            if (!this.particleSystem) return;
            const strength = Math.max(0, Math.min(1, (this.windSpeed - 5) / 20));
            this.particleSystem.material.size = 3.5 + strength * 5.5;
            this.particleSystem.material.opacity = 0.72 + strength * 0.16;
            this.container.dataset.particleSize = this.particleSystem.material.size.toFixed(2);
        }

        /**
         * ライティング設定 (ハイコントラスト・サイバー風洞スタジオ)
         */
        setupLighting() {
            // アンビエントライト（暗黒にならないベース光）
            const ambient = new THREE.AmbientLight(0xd6e1e0, 1.2);
            this.scene.add(ambient);

            // メインキーライト（クリアホワイト・上部前方）
            const mainLight = new THREE.DirectionalLight(0xffffff, 3.5);
            mainLight.position.set(5, 10, 6);
            this.scene.add(mainLight);

            // トップシアンライト（航空サイバー光彩）
            const topLight = new THREE.DirectionalLight(0x8fd6df, 1.0);
            topLight.position.set(0, 8, 4);
            this.scene.add(topLight);

            // 下部フィルライト（エアロオレンジ）
            const bottomLight = new THREE.DirectionalLight(0xe8d8c6, 0.7);
            bottomLight.position.set(-4, -6, -3);
            this.scene.add(bottomLight);

            // コックピットスポットライト
            const spot = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 3, 0.3);
            spot.position.set(0, 6, 2);
            spot.target = this.aircraftGroup;
            this.scene.add(spot);
        }

        /**
         * 迎角（AoA）に応じた機体ピッチ角の更新
         */
        updateAircraftPitch() {
            if (!this.aircraftGroup) return;
            // 迎角 aoaDeg をラジアンに変換してピッチ回転（Z軸まわり、機首上げ）
            const rad = THREE.MathUtils.degToRad(this.aoaDeg);
            this.aircraftGroup.rotation.z = -rad;
        }

        /**
         * 流体物理計算に基づくパーティクル更新ループ
         */
        updateParticles(delta) {
            if (!this.particleSystem) return;

            const posAttr = this.particleSystem.geometry.attributes.position;
            const colAttr = this.particleSystem.geometry.attributes.color;
            const count = this.particleCount;

            const baseSpeed = this.windSpeed * 0.95; // 画面内スケール速度
            const aoaRad = THREE.MathUtils.degToRad(this.aoaDeg);

            // 翼弦の中心位置
            const wingX = 0;
            const wingY = 0.6;
            const wingSemiSpan = 5.5;

            for (let i = 0; i < count; i++) {
                let x = posAttr.getX(i);
                let y = posAttr.getY(i);
                let z = posAttr.getZ(i);
                const pData = this.particlesData[i];

                // 1. 基本前進（X軸プラス方向への風の流れ）
                const dtSpeed = baseSpeed * pData.speedMult * delta;
                x += dtSpeed;

                // 2. 翼周辺（X: -1.5 ~ +2.5, |Z| < 5.8）でのポテンシャル流・気流迂回
                const inWingSpan = Math.abs(z) <= wingSemiSpan + 0.3;
                const dx = x - wingX;
                const dy = y - (wingY + aoaRad * 0.5);

                if (inWingSpan && Math.abs(dx) < 2.0 && Math.abs(dy) < 1.2) {
                    const distSq = dx * dx + dy * dy + 0.05;
                    const r = Math.sqrt(distSq);

                    // 翼上面（y > wingY）: 気流加速 (Bernoulli) & 吸い寄せ
                    // 翼下面（y < wingY）: 気流減速 & 押し下げ
                    if (y >= wingY) {
                        // 上面低圧・加速流
                        const accel = 1.0 + (1.2 / (r + 0.2)) * Math.max(0.2, (aoaRad + 0.2));
                        x += dtSpeed * (accel - 1.0) * 0.45;
                        // 上面沿いの誘導
                        y += (-aoaRad * 0.35 + Math.sin(dx * 1.5) * 0.08) * delta * 5.0;

                        // 上面の加速粒子をシアン〜白に発光
                        colAttr.setXYZ(i, 0.4, 0.95, 1.0);
                    } else {
                        // 下面高圧・滞留流
                        y -= (0.15 + aoaRad * 0.2) * (1.0 / (r + 0.3)) * delta * 4.0;
                        colAttr.setXYZ(i, 0.0, 0.75, 0.95);
                    }
                }

                // 3. 翼端渦（Wingtip Vortices）: 翼端（|Z|: 5.2〜6.2）後方での螺旋渦
                if (Math.abs(z) >= 5.0 && Math.abs(z) <= 6.2 && x > 0.5) {
                    const vortexStrength = (aoaRad + 0.1) * 3.5;
                    const distBehind = x - 0.5;
                    const decay = Math.max(0, 1.0 - distBehind / 8.0);
                    const angle = distBehind * 4.0;

                    y += Math.sin(angle) * vortexStrength * 0.03 * decay;
                    z += Math.cos(angle) * pData.vortexSign * vortexStrength * 0.03 * decay;

                    // 翼端渦はエアロオレンジに染まる
                    colAttr.setXYZ(i, 0.95, 0.55, 0.1);
                }

                // 4. 境界ループ（X > 12.0 で風上 -12.0 へリセット）
                if (x > 12.0) {
                    x = -12.0 - Math.random() * 2.0;
                    y = pData.origY + (Math.random() - 0.5) * 0.4;
                    z = pData.origZ;
                    // デフォルトシアンカラーへ復帰
                    colAttr.setXYZ(i, 0.0, 0.94, 1.0);
                }

                posAttr.setXYZ(i, x, y, z);
            }

            posAttr.needsUpdate = true;
            colAttr.needsUpdate = true;
        }

        /**
         * 航空力学テレメトリの計算とHUD更新
         */
        updateTelemetryHUD() {
            this.updateParticleAppearance();
            // 動圧 q = 1/2 * rho * V^2 (Pa)
            const dynPressure = 0.5 * this.airDensity * Math.pow(this.windSpeed, 2);

            // 揚力係数 CL = 2 * pi * alpha + CL0
            const aoaRad = THREE.MathUtils.degToRad(this.aoaDeg);
            const cl = Math.max(0.05, 0.45 + 5.8 * aoaRad);

            // 抗力係数 CD = CD0 + CL^2 / (pi * AR * e) (誘導抗力)
            const cd0 = 0.018; // 形状抗力
            const oswald_e = 0.88; // オズワルド効率比
            const cdi = Math.pow(cl, 2) / (Math.PI * this.aspectRatio * oswald_e);
            const cd = cd0 + cdi;

            // 揚抗比 L/D
            const ldRatio = cl / cd;

            // レイノルズ数 Re = rho * V * MAC / mu (MAC = 0.72m, mu = 1.81e-5)
            const reynolds = Math.floor((this.airDensity * this.windSpeed * 1.20) / 1.81e-5);

            // HUD テキストの更新
            const speedEl = document.getElementById('wt-val-speed');
            if (speedEl) speedEl.textContent = `${this.windSpeed.toFixed(1)} m/s`;

            const aoaEl = document.getElementById('wt-val-aoa');
            if (aoaEl) aoaEl.textContent = `${this.aoaDeg > 0 ? '+' : ''}${this.aoaDeg.toFixed(1)}°`;

            const qEl = document.getElementById('wt-hud-dyn-pressure');
            if (qEl) qEl.textContent = `${dynPressure.toFixed(1)} Pa`;

            const ldEl = document.getElementById('wt-hud-ld-ratio');
            if (ldEl) ldEl.textContent = `${ldRatio.toFixed(1)}`;

            const clEl = document.getElementById('wt-hud-cl');
            if (clEl) clEl.textContent = cl.toFixed(3);

            const cdEl = document.getElementById('wt-hud-cd');
            if (cdEl) cdEl.textContent = cd.toFixed(4);

            const reEl = document.getElementById('wt-hud-reynolds');
            if (reEl) reEl.textContent = reynolds.toLocaleString();

            const flowRegimeEl = document.getElementById('wt-hud-regime');
            if (flowRegimeEl) {
                if (this.aoaDeg > 12.0) {
                    flowRegimeEl.textContent = 'STALL WARNING (剥離流)';
                    flowRegimeEl.className = 'text-rose-400 font-bold animate-pulse';
                } else if (this.aoaDeg > 8.0) {
                    flowRegimeEl.textContent = 'HIGH LIFT (高揚力域)';
                    flowRegimeEl.className = 'text-amber-400 font-bold';
                } else {
                    flowRegimeEl.textContent = 'LAMINAR FLOW (層流滑空)';
                    flowRegimeEl.className = 'text-cyan-400 font-bold';
                }
            }
        }

        /**
         * UI スライダーとボタンのバインド
         */
        bindUIControls() {
            // 1. 風速スライダー
            const speedSlider = document.getElementById('wt-wind-speed');
            if (speedSlider) {
                speedSlider.value = this.windSpeed;
                speedSlider.addEventListener('input', (e) => {
                    this.windSpeed = parseFloat(e.target.value);
                    this.updateWingFlex(0, performance.now(), true);
                    this.updateTelemetryHUD();
                    this.renderer.render(this.scene, this.camera);
                });
            }

            // 2. 迎角スライダー
            const aoaSlider = document.getElementById('wt-angle-of-attack');
            if (aoaSlider) {
                aoaSlider.value = this.aoaDeg;
                aoaSlider.addEventListener('input', (e) => {
                    this.aoaDeg = parseFloat(e.target.value);
                    this.updateAircraftPitch();
                    this.updateTelemetryHUD();
                    this.renderer.render(this.scene, this.camera);
                });
            }

            // 3. カメラ視点プリセットボタン
            const viewBtns = document.querySelectorAll('[data-wt-view]');
            viewBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.getAttribute('data-wt-view');
                    viewBtns.forEach(b => b.classList.remove('bg-cyan-500/30', 'border-cyan-400', 'text-cyan-300'));
                    btn.classList.add('bg-cyan-500/30', 'border-cyan-400', 'text-cyan-300');

                    if (mode === 'side') {
                        this.rotAngles = { phi: 0.05, theta: 0.0 };
                        this.camDistance = 18.0;
                    } else if (mode === 'iso') {
                        this.rotAngles = { phi: 0.38, theta: 0.85 };
                        this.camDistance = 18.0;
                    } else if (mode === 'top') {
                        this.rotAngles = { phi: 1.45, theta: 0.0 };
                        this.camDistance = 19.0;
                    } else if (mode === 'wingtip') {
                        this.rotAngles = { phi: 0.15, theta: 1.55 };
                        this.camDistance = 18.0;
                    }
                    this.updateCameraPos();
                    this.renderer.render(this.scene, this.camera);
                });
            });

            // 4. リセットボタン
            const resetBtn = document.getElementById('wt-reset-btn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    this.windSpeed = 8.0;
                    this.aoaDeg = 3.5;
                    if (speedSlider) speedSlider.value = 8.0;
                    if (aoaSlider) aoaSlider.value = 3.5;
                    this.rotAngles = { phi: 0.35, theta: 0.85 };
                    this.camDistance = 18.0;
                    this.updateAircraftPitch();
                    this.updateCameraPos();
                    this.updateTelemetryHUD();
                    this.updateWingFlex(0, performance.now(), true);
                    this.renderer.render(this.scene, this.camera);
                });
            }
        }

        /**
         * マウスドラッグ & ズーム操作
         */
        bindEvents() {
            const el = this.renderer.domElement;

            el.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.prevMouse = { x: e.clientX, y: e.clientY };
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.isDragging) return;
                const dx = e.clientX - this.prevMouse.x;
                const dy = e.clientY - this.prevMouse.y;
                this.prevMouse = { x: e.clientX, y: e.clientY };

                this.rotAngles.theta += dx * 0.006;
                this.rotAngles.phi = Math.max(-1.4, Math.min(1.4, this.rotAngles.phi + dy * 0.006));
                this.updateCameraPos();
            });

            window.addEventListener('mouseup', () => {
                this.isDragging = false;
            });

            // タッチ操作
            el.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.isDragging = true;
                    this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
            }, { passive: true });

            window.addEventListener('touchmove', (e) => {
                if (!this.isDragging || e.touches.length !== 1) return;
                const dx = e.touches[0].clientX - this.prevMouse.x;
                const dy = e.touches[0].clientY - this.prevMouse.y;
                this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

                this.rotAngles.theta += dx * 0.008;
                this.rotAngles.phi = Math.max(-1.4, Math.min(1.4, this.rotAngles.phi + dy * 0.008));
                this.updateCameraPos();
            }, { passive: true });

            window.addEventListener('touchend', () => {
                this.isDragging = false;
            });

            // ホイールズーム
            el.addEventListener('wheel', (e) => {
                if (!e.ctrlKey && !e.metaKey) return;
                e.preventDefault();
                this.camDistance = Math.max(5.0, Math.min(26.0, this.camDistance + e.deltaY * 0.015));
                this.updateCameraPos();
                if (this.renderer && this.scene && this.camera) {
                    this.renderer.render(this.scene, this.camera);
                }
            }, { passive: false });

            // リサイズ
            const onResize = () => {
                if (!this.container || !this.renderer || !this.camera) return;
                const rect = this.container.getBoundingClientRect();
                const w = Math.max(rect.width || this.container.clientWidth || 800, 300);
                const h = Math.max(rect.height || this.container.clientHeight || 480, 300);
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
                this.updateCameraPos();
                this.renderer.setSize(w, h);
                this.renderer.render(this.scene, this.camera);
            };
            window.addEventListener('resize', onResize);

            // ResizeObserver による確実なコンテナサイズ追従
            if ('ResizeObserver' in window) {
                const ro = new ResizeObserver(() => {
                    onResize();
                });
                ro.observe(this.container);
            }

            // IntersectionObserver（画面外時のレンダリング軽減、余裕のあるrootMargin）
            if ('IntersectionObserver' in window) {
                const obs = new IntersectionObserver((entries) => {
                    entries.forEach(ent => {
                        this.isVisible = ent.isIntersecting;
                        if (this.isVisible && this.renderer && this.scene && this.camera) {
                            this.renderer.render(this.scene, this.camera);
                        }
                    });
                }, { rootMargin: '300px 0px 300px 0px', threshold: 0 });
                obs.observe(this.container);
            }
        }

        updateCameraPos() {
            if (!this.camera) return;
            const r = this.camDistance * Math.max(1, 1 / this.camera.aspect);
            const phi = this.rotAngles.phi;
            const theta = this.rotAngles.theta;

            const x = r * Math.cos(phi) * Math.sin(theta);
            const y = r * Math.sin(phi);
            const z = r * Math.cos(phi) * Math.cos(theta);

            this.camera.position.set(x, y, z);
            this.camera.lookAt(this.targetCenter || new THREE.Vector3(0, 0, 0));
        }

        /**
         * メインアニメーションループ
         */
        updateWingFlex(delta, now, immediate = false) {
            if (!this.wingFlex) return;
            const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
            this.wingFlex.setLoad(window.TBTS320.windLoad(this.windSpeed, now, reduced));
            this.wingFlex.update(delta, immediate);
            this.container.dataset.wingFlex = this.wingFlex.load.toFixed(3);
            const output = document.getElementById('wt-val-flex');
            if (output) output.textContent = Math.round(this.wingFlex.load / 1.6 * 100) + '%';
        }

        animate(now = performance.now()) {
            this.animationFrameId = requestAnimationFrame(this.animate);
            const delta = Math.min((now - (this.lastFrame || now)) / 1000, 0.05);
            this.lastFrame = now;

            // 画面外で初回描画済みなら負荷軽減のためスキップ
            if (document.hidden || (!this.isVisible && this.hasRenderedOnce)) return;
            this.updateWingFlex(delta, now);

            // プロペラ高速回転
            if (this.propeller) {
                this.propeller.rotation.z += this.windSpeed * delta * 2.8;
            }

            // 流線パーティクル更新
            this.updateParticles(delta);

            this.renderer.render(this.scene, this.camera);
            this.hasRenderedOnce = true;
        }
    }

    // グローバルインスタンスの公開
    window.WindTunnelSimulator = WindTunnelSimulator;

    // DOMロード時に自動初期化（多重生成防止）
    function initWindTunnel() {
        if (!window.tbtWindTunnel) {
            window.tbtWindTunnel = new WindTunnelSimulator();
        }
        window.windTunnelSim = window.tbtWindTunnel;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWindTunnel);
    } else {
        initWindTunnel();
    }

})();
