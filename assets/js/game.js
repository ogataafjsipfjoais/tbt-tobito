/**
 * ==============================================================================
 * TBT 琵琶湖フライトシミュレーター 2026 (Lake Biwa Flight Simulator - MFS Edition)
 * 芝浦工業大学 鳥人間コンテスト出場チーム「Team Birdman Trial」公式
 * 
 * Microsoft Flight Simulator (MFS) スタイルの本格3Dフライトシミュレーター
 * - 3D WebGL (Three.js) による琵琶湖 & 二人乗り人力プロペラ機 レンダリング
 * - 実機空力シミュレーション（揚力、抗力、推力、迎角、失速、地面効果/グラウンドエフェクト）
 * - MFS風 グラスコックピット HUD（姿勢指示器、速度テープ、高度テープ、風向、GPSレーダー）
 * - 4大マルチカメラアングル（チェイス、コックピットFPV、翼端、とびとくん同乗）
 * - 3つの時間帯天候（朝練モーニング、大会真夏、夕暮れサンセット）
 * - Web Audio API によるリアルタイム音響（風切り音、プロペラパルス、ペダル、失速アラーム）
 * ==============================================================================
 */

(function(global) {
    'use strict';

    class TobitoFlightSimulator3D {
        constructor(canvasId) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) return;

            // アセットベースパス
            this.assetsBase = window.TBT_TOBITO_ASSETS_BASE || 'assets/images/';

            // シミュレーター状態: 'ready', 'takeoff', 'flying', 'splashdown'
            this.state = 'ready';
            this.assisted = false;
            this.courseTracker = new window.TBTBirdman.CourseTracker();
            this.courseMap = new window.TBTBirdman.FlightMap(this.courseTracker);
            this.weather = 'day'; // 'morning', 'day', 'sunset'
            this.cameraMode = 'platform';
            // 彦根プラットフォーム 3.5度傾斜スロープ角 (rad)
            this.slopeAngle = 3.5 * (Math.PI / 180); // 約0.048869 rad
            this.waterTouchTimer = 0; // 水面スキミング継続タイマー
            this.lastWaterSplashTime = 0; // 水しぶき効果音タイマー

            // フライト物理パラメータ (初期状態: 3.5度傾斜スロープ滑走路後端 Z=-10.0m スタンバイ)
            const initRunwayY = 10.0 + 10.0 * Math.tan(this.slopeAngle);
            this.physics = {
                // 位置 (m): x: 左右, y: 高度 (スロープ上面 + 車輪接地オフセット0.65m), z: 前進距離
                pos: { x: 0, y: initRunwayY + 0.65, z: -10.0 },
                // 速度 (m/s)
                vel: { x: 0, y: 0, z: 0 },
                // 姿勢 (rad) - 3.5度傾斜スロープに合わせた前傾
                pitch: -this.slopeAngle,
                roll: 0.0,
                yaw: 0.0,
                // 角速度
                pitchRate: 0,
                rollRate: 0,
                yawRate: 0,
                // パイロット入力 (-1.0 to 1.0)
                elevator: 0, // ピッチ操縦桿
                aileron: 0,  // ロール
                rudder: 0,   // ラダー
                // 人力ペダリング
                pedaling: false,
                cadenceRPM: 0,
                targetCadence: 0,
                powerWatts: 0,
                pilotStamina: 100, // 0 - 100%
                tandemSync: 0.95,  // 0 - 1.0 二人乗りシンクロ率
                // 空力特性
                airSpeed: 0,
                groundSpeed: 0,
                angleOfAttack: 0.0,
                lift: 0,
                drag: 0,
                thrust: 0,
                isStalling: false,
                isGroundEffect: false,
                stallWarningTimer: 0,
                thermalBoost: 0,
                wind: { direction: 45, speed: 2.2 }, // 風向45度, 2.2 m/s
                gForce: 1.0,                        // リアルタイム過負荷G
                loadFactorMax: 1.0                  // 最大記録G
            };

            // 連打回数によるペダリング制御 (キー長押し無効化・連打回数制御)
            this.pedalTapHistory = [];              // 最近のタプ時刻履歴 (過去1.5秒)
            this.pedalStrokeCount = 0;              // 累積連打回数
            this.lastPedalTapTime = 0;
            this.pedalCPS = 0;                      // 1秒あたりの連打速度 (Clicks Per Sec)
            this.pedalDecayTimer = 0;

            // 機体破損・構造破壊シミュレーション (Aircraft Structural Breakup)
            this.isBroken = false;                  // 機体破壊フラグ
            this.breakReason = null;                // 破壊原因 ('over_g', 'water_impact', 'platform_impact')
            this.breakTime = 0;                     // 破壊発生時刻
            this.cameraShake = 0;                   // カメラ衝撃シェイク強度
            this.debrisList = [];                   // 爆散破片パーティクル配列
            this.debrisGroup = null;                // 破片3Dグループ
            this.leftWingPivot = null;              // 左主翼ピボット関節
            this.rightWingPivot = null;             // 右主翼ピボット関節
            this.propellerSeparated = false;        // プロペラ分離フラグ
            this.propellerVelocity = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0 };

            // フライト記録 & ファウル情報
            this.foulReason = null;
            this.records = {
                distance: 0,
                maxAirSpeed: 0,
                maxAltitude: 10.65,
                flightTime: 0,
                groundEffectDistance: 0,
                totalWattsBurned: 0,
                maxG: 1.0,
                totalStrokes: 0
            };

            // とびとくん無線メッセージ
            this.radioMessage = '「彦根松原プラットフォーム！Spaceキー連打で助走開始だトビ！目指せ対岸！」';
            this.radioMood = 'normal'; // 'normal', 'smile', 'angry', 'cry'
            this.radioTimer = performance.now();

            // オーディオ
            this.audioCtx = null;
            this.soundEnabled = true;
            this.audioNodes = {};

            // マウス視点ドラッグ & カメラ距離
            this.mouseLook = { x: 0, y: 0, isDragging: false, startX: 0, startY: 0 };
            this.cameraDist = 36.0;
            this.isTheater = false;

            // Three.js 関連
            this.hasThree = typeof THREE !== 'undefined';
            this.renderer = null;
            this.scene = null;
            this.camera = null;
            this.planeGroup = null;
            this.propellerMesh = null;
            this.tobitoSprite = null;
            this.waterMesh = null;
            this.sunLight = null;
            this.ambientLight = null;
            this.clouds = [];
            this.thermals = [];
            this.pylons = [];

            // 琵琶湖フライト 躍動感・FX関連
            this.flagMeshes = [];
            this.sunGlitters = null;
            this.wingtipVortices = null;
            this.vortexList = [];
            this.speedStreakGroup = null;
            this.speedStreakLines = [];
            this.thermalShockwave = null;
            this.thermalShockwaveTimer = 0;
            this.pedalBobPhase = 0;
            this.tobitoBubbleText = null;
            this.tobitoBubbleTimer = 0;

            // 2D HUD オーバーレイ用
            this.hudCanvas = null;
            this.hudCtx = null;

            // とびとくん応援ライブ用画像プリロード (背景透過PNGキャッシュバスター付き)
            this.cheerImgKoi = new Image();
            this.cheerImgKoi.src = this.assetsBase + 'tobito_pose_koi.png?v=alpha';
            this.cheerImgAirplane = new Image();
            this.cheerImgAirplane.src = this.assetsBase + 'tobito_pose_airplane.png?v=alpha';
            this.cheerImgSmile = new Image();
            this.cheerImgSmile.src = this.assetsBase + 'tobito_face_smile.png?v=alpha';
            this.cheerLastPedal = 0;

            // 初期化
            this.setupDOM();
            this.initAudio();
            if (this.hasThree) {
                this.initThree();
            } else {
                this.init2DFallback();
            }
            this.bindEvents();
            this.isVisible = true;
            new IntersectionObserver(entries => {
                this.isVisible = entries[0].isIntersecting;
            }).observe(this.canvas);

            // 初期リサイズ調整
            this.handleResize();
            window.addEventListener('resize', () => this.handleResize());

            // アニメーションループ
            this.lastTime = performance.now();
            requestAnimationFrame(this.loop.bind(this));
        }

        // ======================================================================
        // 1. DOM & HUD レイヤー構築
        // ======================================================================
        setupDOM() {
            // 親コンテナの位置基準を設定
            const parent = this.canvas.parentElement;
            if (parent) {
                parent.style.position = 'relative';
                parent.style.userSelect = 'none';

                // HUD専用の透明Canvasレイヤーを重ねる
                this.hudCanvas = document.createElement('canvas');
                this.hudCanvas.width = this.canvas.width;
                this.hudCanvas.height = this.canvas.height;
                this.hudCanvas.className = 'absolute inset-0 w-full h-full pointer-events-none z-10';
                parent.appendChild(this.hudCanvas);
                this.hudCtx = this.hudCanvas.getContext('2d');
            }
        }

        handleResize() {
            if (!this.canvas) return;
            const parent = this.canvas.parentElement;
            const containerWidth = parent ? parent.clientWidth : (window.innerWidth ? Math.min(window.innerWidth - 32, 800) : 800);
            const w = this.isTheater ? window.innerWidth : (containerWidth || 800);

            let h;
            if (this.isTheater) {
                h = window.innerHeight;
            } else if (w < 640) {
                // スマホ・モバイル: 視界と飛行機をしっかり見やすくするため高さを十分に確保
                const maxScreenH = window.innerHeight ? Math.round(window.innerHeight * 0.62) : 460;
                h = Math.max(340, Math.min(Math.round(w * 0.85), Math.max(350, maxScreenH)));
            } else if (w < 960) {
                // タブレット (16:10 相当)
                h = Math.round(w * 10 / 16);
            } else {
                // デスクトップ (16:9 相当)
                h = Math.round(w * 9 / 16);
            }

            if (!this.isTheater && parent?.clientHeight) h = parent.clientHeight;
            this.viewWidth = w;
            this.viewHeight = h;
            this.isMobileView = w < 640;
            this.isTabletView = w >= 640 && w < 960;

            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this.dpr = dpr;

            this.canvas.width = Math.round(w * dpr);
            this.canvas.height = Math.round(h * dpr);
            this.canvas.style.width = `${w}px`;
            this.canvas.style.height = `${h}px`;

            if (this.hudCanvas) {
                this.hudCanvas.width = Math.round(w * dpr);
                this.hudCanvas.height = Math.round(h * dpr);
                this.hudCanvas.style.width = `${w}px`;
                this.hudCanvas.style.height = `${h}px`;
            }

            if (this.hasThree && this.renderer && this.camera) {
                this.renderer.setSize(w, h, false);
                this.renderer.setPixelRatio(dpr);
                this.camera.aspect = w / h;
                this.camera.updateProjectionMatrix();
            }
        }

        // ======================================================================
        // 2. Three.js 3D ワールド構築
        // ======================================================================
        initThree() {
            const w = this.canvas.width;
            const h = this.canvas.height;

            // レンダラー
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.canvas,
                antialias: true,
                alpha: false,
                powerPreference: 'high-performance'
            });
            this.renderer.setSize(w, h, false);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.08;

            // シーン (空気遠近感のある朝霧・湖面霞フォグ)
            this.scene = new THREE.Scene();
            this.scene.fog = new THREE.FogExp2(0xb6ddfc, 0.00008);

            // カメラ (ダイナミックFOV対応: 初期60度)
            this.camera = new THREE.PerspectiveCamera(60, w / h, 0.2, 35000);

            // ライティング (機体の立体感と水面のスペキュラ反射を大幅強化)
            this.ambientLight = new THREE.AmbientLight(0xdceeff, 0.50);
            this.scene.add(this.ambientLight);

            this.sunLight = new THREE.DirectionalLight(0xfffae0, 1.75);
            this.sunLight.position.set(250, 450, 350);
            this.scene.add(this.sunLight);

            const hemiLight = new THREE.HemisphereLight(0x90caf9, 0x0f3b5c, 0.65);
            this.scene.add(hemiLight);

            // スカイ＆背景
            this.createSky();

            // 琵琶湖の水面 (スペキュラ反射 & サン・グリッターきらめき)
            this.createWater();

            // 水面リアルタイム機体シャドウ (落下感・対地距離感の劇的向上)
            this.createWaterShadow();

            // 比良山系・伊吹山系・竹生島のリアル山脈
            this.createMountains();

            // 発進プラットフォーム（鳥人間公式 紅白10mスロープ ＆ なびくフラッグ）
            this.createPlatform();
            this.venueGroup = window.TBTBirdman.addVenue(this.scene, this.assetsBase);
            this.venueDetails = window.TBTScenery.addLandscape(this.scene, this.venueGroup);

            // 旋回パイロン & 立体サーマル（上昇気流リング）
            window.TBTBirdman.addCourseMarkers(this.scene);

            // TBT 二人乗り人力飛行機 3Dモデル
            this.createAircraft();

            // スピード感・気流ビジュアルFX (翼端渦・超高速スピード線・サーマル衝撃波)
            this.createWingtipVortices();
            this.createSpeedStreaks();
            this.createThermalShockwave();

            // 天候テーマ適用
            this.applyWeather(this.weather);
        }

        createSky() {
            // ドーム背景
            const skyGeo = new THREE.SphereGeometry(15000, 32, 16);
            const skyMat = new THREE.MeshBasicMaterial({
                color: 0x64b5f6,
                side: THREE.BackSide
            });
            this.skyMesh = new THREE.Mesh(skyGeo, skyMat);
            this.scene.add(this.skyMesh);

            // プロシージャルな3D雲塊
            const cloudGeo = new THREE.DodecahedronGeometry(80, 1);
            const cloudMat = new THREE.MeshLambertMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.85
            });

            this.clouds = [];
            for (let i = 0; i < 35; i++) {
                const cloud = new THREE.Group();
                const numParts = 4 + Math.floor(Math.random() * 4);
                for (let j = 0; j < numParts; j++) {
                    const m = new THREE.Mesh(cloudGeo, cloudMat);
                    m.position.set(
                        (Math.random() - 0.5) * 120,
                        (Math.random() - 0.5) * 30,
                        (Math.random() - 0.5) * 120
                    );
                    const s = 0.5 + Math.random() * 0.8;
                    m.scale.set(s * 1.5, s * 0.7, s);
                    cloud.add(m);
                }
                const dist = 500 + Math.random() * 6000;
                const angle = Math.random() * Math.PI * 2;
                cloud.position.set(
                    Math.cos(angle) * dist,
                    150 + Math.random() * 350,
                    Math.sin(angle) * dist
                );
                this.scene.add(cloud);
                this.clouds.push(cloud);
            }
        }

        createWater() {
            this.lakeSurface = window.TBTScenery.createWater(this.scene);
            this.waterMesh = this.lakeSurface.far;
        }

        createWaterShadow() {
            // 琵琶湖水面へのリアルタイム機体投影シャドウ (降下・接近感・立体距離感の劇的向上)
            this.waterShadowGroup = new THREE.Group();

            this.waterShadowMat = new THREE.MeshBasicMaterial({
                color: 0x011b2e, // 深い水面吸収影色
                transparent: true,
                opacity: 0.35,
                depthWrite: false
            });

            // 主翼の影 (翼幅28m、翼弦2.2mの主翼プレーン)
            const wingShadowGeo = new THREE.PlaneGeometry(40.0, 1.2);
            const wingShadow = new THREE.Mesh(wingShadowGeo, this.waterShadowMat);
            wingShadow.rotation.x = -Math.PI / 2;
            wingShadow.position.set(0, 0, -0.2);
            this.waterShadowGroup.add(wingShadow);

            // 胴体・テイルブーム・コックピットの影
            const fuselageShadowGeo = new THREE.PlaneGeometry(1.6, 7.5);
            const fuselageShadow = new THREE.Mesh(fuselageShadowGeo, this.waterShadowMat);
            fuselageShadow.rotation.x = -Math.PI / 2;
            fuselageShadow.position.set(0, 0, -2.2);
            this.waterShadowGroup.add(fuselageShadow);

            // 水平尾翼の影
            const tailShadowGeo = new THREE.PlaneGeometry(5.2, 1.0);
            const tailShadow = new THREE.Mesh(tailShadowGeo, this.waterShadowMat);
            tailShadow.rotation.x = -Math.PI / 2;
            tailShadow.position.set(0, 0, -6.0);
            this.waterShadowGroup.add(tailShadow);

            this.waterShadowGroup.position.set(0, 0.04, -10.0);
            this.scene.add(this.waterShadowGroup);
        }

        createSunGlitters() {
            // 琵琶湖水面にきらめく太陽光スペキュラスパークル粒子群
            const count = 140;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            this.sunGlitterOffsets = [];

            for (let i = 0; i < count; i++) {
                const ox = (Math.random() - 0.5) * 160;
                const oz = Math.random() * 320;
                positions[i * 3]     = ox;
                positions[i * 3 + 1] = 0.08;
                positions[i * 3 + 2] = oz;
                this.sunGlitterOffsets.push({ ox, oz, phase: Math.random() * Math.PI * 2, speed: 2.0 + Math.random() * 3.5 });
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const mat = new THREE.PointsMaterial({
                color: 0xfffde7,
                size: 2.5,
                transparent: true,
                opacity: 0.88,
                blending: THREE.AdditiveBlending
            });
            this.sunGlitters = new THREE.Points(geo, mat);
            this.scene.add(this.sunGlitters);
        }

        createMountains() {
            this.mountainGroup = window.TBTScenery.createMountains(this.scene);
        }

        getRunwayHeight(z) {
            // 彦根・松原プラットフォーム: 3.5度傾斜スロープ仕様 (先端 Z=0 で 10.0m、後端に向かって上昇)
            if (z >= 0) return 10.0;
            return 10.0 + (-z) * Math.tan(this.slopeAngle);
        }

        getRunwayGroundY(z) {
            // 機体車輪接地時の原点高さ (スロープ上面 + 機体接地オフセット 0.65m)
            // 車輪が3.5度傾斜スロープの表面にピタリと乗り、滑走路に沈み込まない
            return this.getRunwayHeight(z) + 0.65;
        }

        createPlatform() {
            const platform = window.TBTContestVenue.createPlatform(this.scene);
            this.platformGroup = platform.group;
            this.wingRunners = platform.wingRunners;
            this.flagMeshes = platform.flagMeshes;
        }

        createPylonsAndThermals() {
            // 旋回目標パイロン (10km地点, 20km地点)
            const pylonMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
            const pylonGeo = new THREE.CylinderGeometry(8, 14, 50, 12);

            const pylon1 = new THREE.Mesh(pylonGeo, pylonMat);
            pylon1.position.set(0, 25, 10000); // 10,000m地点
            this.scene.add(pylon1);
            this.pylons.push(pylon1);

            // 立体サーマル（熱上昇気流リング ＆ 発光コア ＆ 螺旋粒子）
            const ringGeo = new THREE.TorusGeometry(18, 1.4, 8, 36);
            const outerRingMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.75
            });
            const innerRingMat = new THREE.MeshBasicMaterial({
                color: 0xfacc15,
                transparent: true,
                opacity: 0.85
            });

            this.thermals = [];
            for (let i = 1; i <= 24; i++) {
                const thermalGroup = new THREE.Group();
                const distZ = i * 420 + (Math.random() - 0.5) * 80;
                const posX = (Math.sin(i * 1.4)) * 65;
                const posY = 5 + Math.random() * 16;

                // 多重発光リング
                for (let r = 0; r < 3; r++) {
                    const mat = (r === 1) ? innerRingMat : outerRingMat;
                    const ring = new THREE.Mesh(ringGeo, mat);
                    ring.rotation.x = Math.PI / 2;
                    ring.position.y = r * 7.5;
                    const scale = 1 - r * 0.14;
                    ring.scale.set(scale, scale, 1);
                    thermalGroup.add(ring);
                }

                // 中心の上昇気流光柱（半透明シリンダー）
                const pillarGeo = new THREE.CylinderGeometry(6, 12, 28, 8, 1, true);
                const pillarMat = new THREE.MeshBasicMaterial({
                    color: 0x38bdf8,
                    transparent: true,
                    opacity: 0.22,
                    side: THREE.DoubleSide
                });
                const pillar = new THREE.Mesh(pillarGeo, pillarMat);
                pillar.position.y = 12;
                thermalGroup.add(pillar);

                thermalGroup.position.set(posX, posY, distZ);
                this.scene.add(thermalGroup);
                this.thermals.push({
                    mesh: thermalGroup,
                    pos: { x: posX, y: posY, z: distZ },
                    active: true
                });
            }
        }

        // ==============================================================
        // 【躍動感 Visual FX】翼端渦・超高速スピード線・サーマル衝撃波
        // ==============================================================
        createWingtipVortices() {
            // 主翼両端（翼端渦: Wingtip Vortices）パーティクルシステム
            const count = 80;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);

            for (let i = 0; i < count; i++) {
                positions[i * 3]     = 0;
                positions[i * 3 + 1] = -100; // 画面外待機
                positions[i * 3 + 2] = 0;
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const mat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 2.0,
                transparent: true,
                opacity: 0.70,
                blending: THREE.AdditiveBlending
            });

            this.wingtipVortices = new THREE.Points(geo, mat);
            this.scene.add(this.wingtipVortices);

            this.vortexList = [];
            for (let i = 0; i < count; i++) {
                this.vortexList.push({
                    x: 0, y: -100, z: 0,
                    vx: 0, vy: 0, vz: 0,
                    life: 0, maxLife: 1.0,
                    side: i % 2 === 0 ? -1 : 1
                });
            }
        }

        createSpeedStreaks() {
            // 高速・急降下時のスピード線（スピードストリーク）
            this.speedStreakGroup = new THREE.Group();
            const lineCount = 75;
            const streakGeo = new THREE.CylinderGeometry(0.04, 0.04, 9.0, 4);
            const streakMat = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.55
            });

            this.speedStreakLines = [];
            for (let i = 0; i < lineCount; i++) {
                const mesh = new THREE.Mesh(streakGeo, streakMat);
                mesh.rotation.x = Math.PI / 2; // Z軸沿いに伸ばす
                const ox = (Math.random() - 0.5) * 45;
                const oy = (Math.random() - 0.5) * 20;
                const oz = (Math.random() - 0.5) * 60;
                mesh.position.set(ox, oy, oz);
                mesh.visible = false;
                this.speedStreakGroup.add(mesh);

                this.speedStreakLines.push({
                    mesh,
                    ox, oy, oz,
                    speedMult: 1.0 + Math.random() * 0.8
                });
            }

            this.scene.add(this.speedStreakGroup);
        }

        createThermalShockwave() {
            // サーマル通過時の光のサークル衝撃波
            const shockGeo = new THREE.RingGeometry(0.5, 2.2, 32);
            const shockMat = new THREE.MeshBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide
            });
            this.thermalShockwave = new THREE.Mesh(shockGeo, shockMat);
            this.thermalShockwave.visible = false;
            this.scene.add(this.thermalShockwave);
        }

        updateWingtipVortices(dt) {
            if (!this.wingtipVortices || !this.vortexList) return;
            const p = this.physics;
            const isFlying = (this.state === 'flying' || this.state === 'takeoff') && !this.isBroken;
            const pos = this.wingtipVortices.geometry.attributes.position;

            const cosY = Math.cos(p.yaw);
            const sinY = Math.sin(p.yaw);

            for (let i = 0; i < this.vortexList.length; i++) {
                const v = this.vortexList[i];
                if (v.life > 0) {
                    v.life -= dt * 1.8;
                    v.x += v.vx * dt;
                    v.y += v.vy * dt;
                    v.z += v.vz * dt;
                    pos.setXYZ(i, v.x, v.y, v.z);
                } else if (isFlying && p.airSpeed >= 6.5) {
                    // 主翼左右端（±14.8m）から新しい渦を生成
                    v.life = 1.0;
                    const wingSpanX = v.side * 14.8;
                    v.x = p.pos.x + wingSpanX * cosY;
                    v.y = p.pos.y + 0.8;
                    v.z = p.pos.z - wingSpanX * sinY;
                    // 後方へ流れる気流
                    v.vx = -sinY * p.airSpeed * 0.35 + (Math.random() - 0.5) * 0.4;
                    v.vy = (Math.random() - 0.5) * 0.25;
                    v.vz = -cosY * p.airSpeed * 0.35;
                    pos.setXYZ(i, v.x, v.y, v.z);
                } else {
                    pos.setXYZ(i, 0, -100, 0);
                }
            }
            pos.needsUpdate = true;
        }

        updateSpeedStreaks(dt) {
            if (!this.speedStreakGroup || !this.speedStreakLines) return;
            const p = this.physics;
            const isHighSpeed = (p.airSpeed >= 8.2 || p.vel.y <= -2.5) && (this.state === 'flying');

            if (!isHighSpeed || this.isBroken) {
                this.speedStreakLines.forEach(s => { s.mesh.visible = false; });
                return;
            }

            if (this.camera) {
                this.speedStreakGroup.position.copy(this.camera.position);
                this.speedStreakGroup.rotation.copy(this.camera.rotation);
            }

            const streakSpeed = Math.max(35, p.airSpeed * 4.2);
            this.speedStreakLines.forEach(s => {
                s.mesh.visible = true;
                s.oz += streakSpeed * s.speedMult * dt;
                if (s.oz > 35) {
                    s.oz = -35;
                    s.ox = (Math.random() - 0.5) * 38;
                    s.oy = (Math.random() - 0.5) * 22;
                }
                s.mesh.position.set(s.ox, s.oy, s.oz);
                const scaleLen = Math.min(2.8, 1.0 + (p.airSpeed - 8.0) * 0.25);
                s.mesh.scale.set(1.0, 1.0, scaleLen);
            });
        }

        triggerThermalShockwave(pos) {
            if (!this.thermalShockwave) return;
            this.thermalShockwave.position.set(pos.x, pos.y, pos.z);
            this.thermalShockwave.scale.set(1, 1, 1);
            this.thermalShockwave.material.opacity = 0.9;
            this.thermalShockwave.visible = true;
            this.thermalShockwaveTimer = 1.0;
        }

        updateThermalShockwave(dt) {
            if (!this.thermalShockwave || this.thermalShockwaveTimer <= 0) return;
            this.thermalShockwaveTimer -= dt * 2.2;
            if (this.thermalShockwaveTimer <= 0) {
                this.thermalShockwave.visible = false;
            } else {
                const s = (1.0 - this.thermalShockwaveTimer) * 28 + 1;
                this.thermalShockwave.scale.set(s, s, s);
                this.thermalShockwave.material.opacity = this.thermalShockwaveTimer * 0.9;
            }
        }

        updateTobitoCockpitReaction(dt) {
            const p = this.physics;
            if (this.tobitoSprite) {
                // 速度が出ると風圧でトサカや翼が後ろになびく・前のめり微振動
                const speedTilt = Math.min(0.22, (p.airSpeed / 15) * 0.22);
                const jitter = (p.airSpeed > 8.0) ? (Math.random() - 0.5) * 0.04 : 0;
                this.tobitoSprite.material.rotation = -p.roll * 0.5 + jitter;
                this.tobitoSprite.position.y = 1.1 - speedTilt * 0.3;
                this.tobitoSprite.position.z = 0.2 - speedTilt * 0.5;
            }

            // フキダシUIタイマー更新
            if (this.tobitoBubbleTimer > 0) {
                this.tobitoBubbleTimer -= dt;
                if (this.tobitoBubbleTimer <= 0) {
                    this.tobitoBubbleText = null;
                }
            }

            // 高速時やサーマル時にフキダシをトリガー
            if (p.airSpeed >= 11.0 && this.tobitoBubbleTimer <= 0 && this.state === 'flying') {
                this.showTobitoSpeechBubble('「ものすごい快速トビ！ぐんぐん進むトビ！」', 2.5);
            }
        }

        showTobitoSpeechBubble(text, duration = 3.0) {
            this.tobitoBubbleText = text;
            this.tobitoBubbleTimer = duration;
        }

        createAircraft() {
            this.planeGroup = new THREE.Group();
            this.scene.add(this.planeGroup);
            this.debrisGroup = new THREE.Group();
            this.scene.add(this.debrisGroup);
            this.modelReady = false;
            const load = async () => {
                window.TBTS320.status(this.canvas.parentElement, 'loading');
                try {
                    const model = await window.TBTS320.create({ span: 40, groundY: -0.65 });
                    this.planeGroup.add(model.root);
                    this.propellerGroup = model.propeller;
                    this.wingFlex = model.flex;
                    this.propellerRestPosition = model.propeller.position.clone();
                    this.modelReady = true;
                    window.TBTS320.status(this.canvas.parentElement, 'ready');
                    this.renderThree(0);
                    this.renderHUD();
                } catch (error) {
                    window.TBTS320.status(this.canvas.parentElement, 'error', load);
                    console.error('[S-320 flight]', error);
                }
            };
            load();
        }

        createTobitoSprite() {
            // 公式イラストの透過スプライト (背景完全透過)
            const loader = new THREE.TextureLoader();
            const textureUrl = this.assetsBase + 'tobito_pose_airplane.png?v=alpha';

            loader.load(textureUrl, (texture) => {
                const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
                this.tobitoSprite = new THREE.Sprite(spriteMat);
                this.tobitoSprite.scale.set(1.4, 1.4, 1.4);
                // 主翼の右付け根近くに搭乗
                this.tobitoSprite.position.set(1.4, 1.1, 0.2);
                this.planeGroup.add(this.tobitoSprite);
            });
        }

        // ======================================================================
        // 3. 天候 & 時間帯マネージャー
        // ======================================================================
        applyWeather(mode) {
            this.weather = mode;
            if (!this.hasThree) return;

            if (mode === 'morning') {
                // 爽やかな朝練モード（朝霧・澄み切った青）
                this.scene.fog.color.setHex(0xbfe0f7);
                this.skyMesh.material.color.setHex(0x7ec0ee);
                this.sunLight.color.setHex(0xfff3d6);
                this.sunLight.intensity = 1.1;
                this.sunLight.position.set(400, 200, 400);
                this.waterMesh.material.color.setHex(0x397e8b);
                this.physics.wind = { direction: 30, speed: 1.5 };
                this.setRadioMessage('「朝練の澄んだ空気トビ！風がとっても穏やかで飛びやすいトビ！」', 'smile');
            } else if (mode === 'day') {
                // 大会本番（真夏の強烈な太陽光と青空）
                this.scene.fog.color.setHex(0x9ad0f5);
                this.skyMesh.material.color.setHex(0x38bdf8);
                this.sunLight.color.setHex(0xffffff);
                this.sunLight.intensity = 1.4;
                this.sunLight.position.set(100, 600, 200);
                this.waterMesh.material.color.setHex(0x286f83);
                this.physics.wind = { direction: 50, speed: 2.4 };
                this.setRadioMessage('「鳥人間コンテスト本番の大空！熱気とサーマルがいっぱいだトビ！」', 'normal');
            } else if (mode === 'sunset') {
                // 夕暮れサンセット（茜色の琵琶湖）
                this.scene.fog.color.setHex(0xf97316);
                this.skyMesh.material.color.setHex(0xe11d48);
                this.sunLight.color.setHex(0xfbbf24);
                this.sunLight.intensity = 1.5;
                this.sunLight.position.set(-500, 80, 500);
                this.waterMesh.material.color.setHex(0x775b56);
                this.physics.wind = { direction: 120, speed: 3.0 };
                this.setRadioMessage('「夕日に染まる琵琶湖…最高にドラマチックなフライトだトビ！」', 'smile');
            }
        }

        // ======================================================================
        // 4. 本格フライト物理シミュレーター (Flight Dynamics)
        // ======================================================================
        updatePhysics(dt) {
            if (this.state === 'ready') return;

            const p = this.physics;
            const rec = this.records;
            const g = 9.806;

            // 連打減衰ロジック: 最後のタップから0.35秒以上経過したらRPMが減衰（連打必須）
            const nowTime = performance.now();
            const timeSinceLastTap = (nowTime - this.lastPedalTapTime) / 1000.0;
            if (timeSinceLastTap > 0.35) {
                p.cadenceRPM = Math.max(0, p.cadenceRPM - 52.0 * dt);
                if (p.cadenceRPM < 5) {
                    p.cadenceRPM = 0;
                    p.pedaling = false;
                }
            } else {
                p.pedaling = true;
            }

            // ==============================================================
            // 1. 助走フェーズ (Takeoff Roll on 3.5° Inclined Runway - 手すりなし開放デッキ)
            // ==============================================================
            if (this.state === 'takeoff') {
                // A. 滑走路面の当たり判定（Y軸接地拘束: 3.5度スロープ上面 + 接地オフセット0.65m）
                // スロープにぴったり沿って車輪が転がり、沈み込みはゼロ！
                p.pos.y = this.getRunwayGroundY(p.pos.z);
                p.vel.y = 0;
                p.pitch = -this.slopeAngle; // 3.5度傾斜スロープに合わせた前傾角
                p.roll *= 0.70;             // 車輪接地のためロール抑制

                // 助走中は飛行距離は0m（踏切ラインZ=0突破後に公式計測開始）
                rec.distance = 0;

                // B. 連打ペダリング推力 + スロープ重力加速（3.5度下り） + ウィングランナー押し出し
                const slopeGravityAcc = 9.8 * Math.sin(this.slopeAngle); // 3.5度スロープの自然な重力前進加速（約0.48 m/s²）
                const runnerPushAcc = 1.15;                             // ウィングランナー2名の全力押し出しアシスト
                const rollingResistance = 0.10;                         // 車輪の転がり抵抗

                if (p.pedaling && p.pilotStamina > 0) {
                    const drainRate = (p.cadenceRPM / 80) * 1.5 * dt;
                    p.pilotStamina = Math.max(0, p.pilotStamina - drainRate);
                    // 連打によって高まったRPMを強力な推力パワー（最大440W）に変換
                    p.powerWatts = (p.cadenceRPM / 80) * 435 * (p.pilotStamina / 100);
                } else {
                    p.powerWatts = 0;
                }
                rec.totalWattsBurned += p.powerWatts * dt;

                // プロペラ推力による前進加速度 (m=138kg)
                const thrustAcc = Math.max(0, (p.powerWatts * 0.95) / Math.max(p.vel.z, 1.8)) / 199.0;
                const fwdAcc = thrustAcc * 1.45 + slopeGravityAcc + runnerPushAcc - rollingResistance;
                p.vel.z = Math.max(0, p.vel.z + fwdAcc * dt);
                p.airSpeed = p.vel.z;
                p.groundSpeed = p.vel.z;
                rec.maxAirSpeed = Math.max(rec.maxAirSpeed, p.airSpeed * 3.6);

                // 前進移動
                p.pos.z += p.vel.z * dt;

                // C. 左右ステアリング（ラダー・エルロンによる滑走路内制御）
                p.pitchRate = 0;
                p.rollRate = 0;
                p.yawRate = p.yawRate * 0.85 + (p.rudder + p.aileron * 0.5) * 0.35 * dt;
                p.yaw += p.yawRate;
                p.yaw = Math.max(-0.09, Math.min(0.09, p.yaw)); // 滑走中の首振り制限

                p.vel.x = p.vel.x * 0.85 + Math.sin(p.yaw) * p.vel.z + (p.aileron + p.rudder) * 0.9 * dt;
                p.pos.x += p.vel.x * dt;

                // D. ウィングランナー（補助員）の追従アニメーション（3.5度スロープに追従）
                if (this.wingRunners && this.wingRunners.length === 2) {
                    const runnerZ = Math.min(-2.5, p.pos.z);
                    this.wingRunners[0].position.z = runnerZ;
                    this.wingRunners[1].position.z = runnerZ;
                    this.wingRunners[0].position.y = this.getRunwayHeight(runnerZ);
                    this.wingRunners[1].position.y = this.getRunwayHeight(runnerZ);
                }

                // E. 手すりは完全撤廃！(左右幅8mの開放デッキで広々と助走)
                // 端（X=±4.0m）に近づきすぎた場合のみ安全アラート
                if (Math.abs(p.pos.x) >= 3.8) {
                    p.pos.x = Math.sign(p.pos.x) * 3.75;
                    p.vel.x = -p.vel.x * 0.3;
                    this.setRadioMessage('「端に寄りすぎトビ！ラダーで中央をキープするトビ！」', 'cry');
                }

                // F. 【何がなんでも飛ぶ！】踏切ライン（Takeoff Edge: Z >= 0.0）通過判定！
                if (p.pos.z >= 0.0) {
                    this.state = 'flying';
                    this.playSound('takeoff');

                    // 10mプラットフォーム先端からの射出！
                    // 初速約35km/hと最適滑空ピッチ角で、操作なしでもスーッと美しく滑空！
                    if (this.assisted) p.vel.z = Math.max(8.0, p.vel.z * 1.05); // 最低35km/h以上を保証
                    p.airSpeed = p.vel.z;
                    p.vel.y = 0.06;                          // 飛び出した瞬間の自律揚力（ふわりと水平飛行へテイクオフ）
                    p.pitch = 0.022;                         // 最適滑空ピッチ角（頭から突っ込まず綺麗なグライド）
                    p.pitchRate = 0;
                    p.isStalling = false;

                    this.playSound('takeoff');
                    this.setRadioMessage('「踏切ライン突破！大空へテイクオフ！Space連打で高度キープ＆操縦桿で滑空だトビ！」', 'smile');
                }

                // 無線コメント定期更新
                this.updateRadioRoutine();
                return;
            }

            // ==============================================================
            // 2. 飛行フェーズ (Aerial Flight Dynamics - リアル空力 & 飛行性能)
            // ==============================================================
            if (this.isBroken) {
                // 破壊後の自由落下 & 破片更新
                p.vel.y -= g * dt;
                p.vel.x *= 0.95;
                p.vel.z *= 0.95;
                p.pos.x += p.vel.x * dt;
                p.pos.y = Math.max(0.1, p.pos.y + p.vel.y * dt);
                p.pos.z += p.vel.z * dt;
                this.updateDebris(dt);
                return;
            }

            // 操縦入力の減衰・ダンピング & 自律滑空トリム（実機同様の縦静安定性: 無操作でも失速せずスーッと滑空）
            if (Math.abs(p.elevator) < 0.05) {
                // キー操作なし時は、自然な水平滑空トリム（+0.022 rad / 約1.3度）へ自律復元！
                const naturalGlideTrim = 0.022;
                p.pitchRate = p.pitchRate * 0.85 + (naturalGlideTrim - p.pitch) * 0.40 * dt;
            } else {
                p.pitchRate = p.pitchRate * 0.88 + p.elevator * 0.38 * dt;
            }
            p.rollRate  = p.rollRate  * 0.82 + p.aileron  * 0.42 * dt; // 翼端慣性による穏やかなロール
            p.yawRate   = p.yawRate   * 0.88 + p.rudder   * 0.30 * dt;

            // 姿勢の更新
            p.pitch += p.pitchRate;
            p.roll  += p.rollRate;
            p.yaw   += p.yawRate;

            // 航空力学: バンク旋回（Coordinated Bank Turn）
            const safeSpeed = Math.max(p.airSpeed, 4.0);
            const turnRate = (g * Math.tan(p.roll)) / safeSpeed; // rad/s
            p.yaw += turnRate * dt;

            // 自律復元力 & 限界制限
            p.roll  *= 0.985;
            p.roll  = Math.max(-0.65, Math.min(0.65, p.roll));   // 最大バンク角約37度
            p.pitch = Math.max(-0.40, Math.min(0.42, p.pitch));  // ピッチ制限

            // 対気速度ベクトル & 機体進行方向
            const cosP = Math.cos(p.pitch);
            const sinP = Math.sin(p.pitch);
            const cosY = Math.cos(p.yaw);
            const sinY = Math.sin(p.yaw);

            // 機首が向いている前進方向
            const fwdX = sinY * cosP;
            const fwdY = sinP;
            const fwdZ = cosY * cosP;

            // 現在の対気速度 V
            p.airSpeed = Math.sqrt(p.vel.x * p.vel.x + p.vel.y * p.vel.y + p.vel.z * p.vel.z);
            rec.maxAirSpeed = Math.max(rec.maxAirSpeed, p.airSpeed * 3.6);

            // 迎角 (Angle of Attack: ピッチ角と進行方向角の差)
            const flightPathPitch = Math.atan2(p.vel.y, Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z));
            p.angleOfAttack = p.pitch - flightPathPitch;

            // 連打ペダリング推力計算 (トップアスリート並みの高出力タンデムドライブ)
            if (p.pedaling && p.pilotStamina > 0) {
                const drainRate = (p.cadenceRPM / 80) * 1.6 * dt;
                p.pilotStamina = Math.max(0, p.pilotStamina - drainRate);
                // 連打でRPMが上がるほど力強い推力パワー（最大450W）
                p.powerWatts = (p.cadenceRPM / 80) * 450 * (p.pilotStamina / 100) * (0.85 + p.tandemSync * 0.35);
            } else {
                p.powerWatts = 0;
                p.pilotStamina = Math.min(100, p.pilotStamina + 2.0 * dt);
            }
            rec.totalWattsBurned += p.powerWatts * dt;

            // プロペラ推力 (Thrust = Power * 効率 / 速度)
            p.thrust = (p.powerWatts * 0.92) / Math.max(p.airSpeed, 3.2);

            // 地面効果 (Ground Effect / WIG効果): 水面高度4m以下で誘導抗力最大72%激減！
            const h = Math.max(0.2, p.pos.y);
            const groundEffectRatio = (16 * (h / 40) * (h / 40)) / (1 + 16 * (h / 40) * (h / 40));
            const groundEffectFactor = Math.min(1.0, 0.28 + 0.72 * groundEffectRatio);
            p.isGroundEffect = h <= 3.8;
            if (p.isGroundEffect) {
                rec.groundEffectDistance += p.airSpeed * dt;
            }

            // 揚力 & 失速判定 (翼型空力学モデル: DAE-21風高揚力翼)
            const rho = 1.225; // 空気密度
            const S = 45.60;    // 主翼面積 m2 (二人乗り仕様)
            const q = 0.5 * rho * p.airSpeed * p.airSpeed; // 動圧

            const stallAoA = 0.24; // 約13.8度で気流剥離・失速
            if (p.angleOfAttack > stallAoA || p.airSpeed < 5.6) {
                p.isStalling = true;
                p.lift = q * S * 0.18; // 気流剥離で揚力激減！
                p.drag = q * S * 0.32; // 失速抗力急増！
                p.pitch -= 0.55 * dt;  // ノーズがグッと下を向いて水面へダイブ！
                p.vel.y -= 1.6 * dt;   // 急激な失速沈下！(落ちていく感覚)
                this.triggerStallAlarm();
            } else {
                p.isStalling = false;
                // 飛べる設計: 高揚力・高滑空比（L/D比 約30）
                const cL = Math.max(0.12, 0.46 + 6.0 * p.angleOfAttack);
                p.lift = q * S * cL;
                const cD0 = 0.019; // 形状抗力
                const cDi = (cL * cL) / (Math.PI * 0.88 * 35.09) * groundEffectFactor; // 誘導抗力
                p.drag = q * S * (cD0 + cDi);
            }

            // サーマル（熱上昇気流）ブースト
            p.lift += p.thermalBoost * 520;
            p.thermalBoost = Math.max(0, p.thermalBoost - 0.4 * dt);

            // 運動方程式による速度更新 (m = 138kg)
            const mass = 199.0;

            const thrustAccX = (fwdX * p.thrust) / mass;
            const thrustAccY = (fwdY * p.thrust) / mass;
            const thrustAccZ = (fwdZ * p.thrust) / mass;

            const dragAccX = -(p.vel.x / Math.max(p.airSpeed, 1)) * (p.drag / mass);
            const dragAccY = -(p.vel.y / Math.max(p.airSpeed, 1)) * (p.drag / mass);
            const dragAccZ = -(p.vel.z / Math.max(p.airSpeed, 1)) * (p.drag / mass);

            const liftUpX = -Math.sin(p.roll) * Math.cos(p.yaw);
            const liftUpY =  Math.cos(p.roll);
            const liftUpZ =  Math.sin(p.roll) * Math.sin(p.yaw);

            const liftAccX = (liftUpX * p.lift) / mass;
            const liftAccY = (liftUpY * p.lift) / mass;
            const liftAccZ = (liftUpZ * p.lift) / mass;

            // 過負荷G (G-Force) のリアルタイム計算
            p.gForce = Math.max(0.1, liftAccY / g);
            rec.maxG = Math.max(rec.maxG, p.gForce);

            // 【機体破壊ルール1】過大Gによる主翼スパー折損判定（Wing Snap）
            // 急激な操縦桿の引き起こしで許容限界3.0Gを超えたら主翼がバキッとへし折れる！
            if (p.gForce >= 3.0 && p.airSpeed >= 8.0 && !this.isBroken) {
                this.triggerBreakup('over_g');
                return;
            }

            p.vel.x += (thrustAccX + dragAccX + liftAccX) * dt;
            p.vel.y += (thrustAccY + dragAccY + liftAccY - g) * dt;
            p.vel.z += (thrustAccZ + dragAccZ + liftAccZ) * dt;

            // 進行方向への空力アライメント
            const targetVelX = fwdX * p.airSpeed;
            const targetVelZ = fwdZ * p.airSpeed;
            p.vel.x = p.vel.x * 0.90 + targetVelX * 0.10;
            p.vel.z = p.vel.z * 0.90 + targetVelZ * 0.10;

            // 位置更新
            p.pos.x += p.vel.x * dt;
            p.pos.y += p.vel.y * dt;
            p.pos.z += p.vel.z * dt;

            // 飛行距離（鳥人間コンテスト公式ルール: 踏切先端Z=0からの総水平直線距離・リアル実測値）
            this.courseTracker.update(p.pos);
            rec.distance = Math.floor(this.courseTracker.distance);
            if (this.courseTracker.complete) {
                rec.distance = 42195;
                this.state = 'splashdown';
                this.showResultOverlay('練習コース完走', '南北ルートの往復を完了しました。', rec.distance);
                return;
            }
            rec.maxAltitude = Math.max(rec.maxAltitude, p.pos.y);
            rec.flightTime += dt;

            // サーマル接触判定
            this.checkThermals();

            // （障害物激突判定は完全撤廃: 前方へ滑空する鳥人間コンテストで理不尽なクラッシュを防止）

            // 【水面スキミング & 再上昇判定】（水がついても再度上昇すればよし！）
            if (p.pos.y <= 0.55) {
                if (!this.assisted) {
                    p.pos.y = 0.2;
                    this.triggerSplashdown();
                    return;
                }
                p.isWaterTouching = true;
                this.waterTouchTimer = (this.waterTouchTimer || 0) + dt;

                // 1. 水しぶき効果音と微振動 (0.28秒おき)
                const now = performance.now();
                if (now - (this.lastWaterSplashTime || 0) > 280) {
                    this.lastWaterSplashTime = now;
                    this.playSound('splash');
                    this.cameraShake = Math.max(this.cameraShake, 0.22);
                }

                // 2. 水面ハイドロダイナミクス反発力（水面クッション・浮力）
                // 沈下速度を反発力で押し返し、水面（Y=0.20〜0.35m）で支える
                if (p.vel.y < 0) {
                    p.vel.y = Math.max(0.12, -p.vel.y * 0.45);
                }
                p.pos.y = Math.max(0.20, p.pos.y);

                // 3. 水の抵抗による前進ドラッグ（即座に止まらないよう緩やか）
                p.vel.z *= (1.0 - 0.12 * dt);
                p.airSpeed = p.vel.z;

                // 4. 【奇跡の再上昇！】Space連打＋操縦桿引き起こし（↑/Sキー/機首上げピッチ）
                const isPullingUp = p.elevator > 0 || p.pitch > 0.02;
                if (isPullingUp && (p.pedaling || p.cadenceRPM > 30)) {
                    // 水面を蹴って力強く上昇！
                    const powerBonus = (p.cadenceRPM / 80) * 2.2;
                    p.vel.y += (2.2 + powerBonus) * dt;
                    p.pitch = Math.min(0.25, p.pitch + 0.35 * dt); // ノーズアップ支援
                    
                    if (p.pos.y > 0.52) {
                        this.playSound('takeoff');
                        this.setRadioMessage('「水面タッチから奇跡の再上昇成功トビ！！大空へ復帰だトビ！！」', 'smile');
                        p.isWaterTouching = false;
                        this.waterTouchTimer = 0;
                    } else {
                        this.setRadioMessage('「水面タッチ中！Space連打＋操縦桿引き起こし（↑）で再上昇だトビ！」', 'smile');
                    }
                } else {
                    this.setRadioMessage('「水面タッチ中！Space連打＋操縦桿引き起こし（↑）で再上昇だトビ！」', 'cry');
                }

                // 5. 完全沈没・着水判定（極限状態でのみフライト終了）
                // - 急激な垂直激突（沈下速度 -5.5 m/s 以上、または急角度ダイブ）のみ大破
                // - それ以外は規定の滑空着水
                if (p.vel.y < -5.5 || p.pitch < -0.45) {
                    this.triggerBreakup('water_impact');
                    return;
                } else if (p.airSpeed < 3.0 || this.waterTouchTimer > 3.0) {
                    this.triggerSplashdown();
                    return;
                }
            } else {
                p.isWaterTouching = false;
                this.waterTouchTimer = 0;
            }

            // 無線コメント定期更新
            this.updateRadioRoutine();
        }

        checkThermals() {
            const p = this.physics;
            for (let t of this.thermals) {
                if (!t.active) continue;
                const dx = p.pos.x - t.pos.x;
                const dy = p.pos.y - t.pos.y;
                const dz = p.pos.z - t.pos.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < 22 * 22) {
                    // サーマル突入！
                    p.thermalBoost = 1.0;
                    p.pilotStamina = Math.min(100, p.pilotStamina + 15);
                    this.playSound('thermal');
                    this.triggerThermalShockwave(t.pos);
                    this.showTobitoSpeechBubble('「いい風トビ！上昇気流に乗ったトビ！」', 3.0);
                    this.setRadioMessage('「サーマル（熱上昇気流）に入ったトビ！高度急上昇だトビ！」', 'smile');
                    t.active = false; // 一度拾ったら消滅
                    if (t.mesh) t.mesh.visible = false;
                    break;
                }
            }
        }

        updateRadioRoutine() {
            const now = performance.now();
            if (now - this.radioTimer < 5000) return;
            this.radioTimer = now;

            const p = this.physics;
            if (p.vel.y <= -1.3) {
                this.setRadioMessage('「うわあああ！急降下してるトビ！操縦桿（↑/S）を引いて！Space連打トビ！！」', 'cry');
            } else if (p.isStalling) {
                this.setRadioMessage('「⚠️ 失速警報（STALL）！操縦桿を前に倒して加速するトビ！」', 'angry');
            } else if (p.isGroundEffect && p.pos.y <= 2.5) {
                this.setRadioMessage('「水面スレスレ！地面効果でグングン伸びてるトビ！維持するトビ！」', 'smile');
            } else if (p.pilotStamina < 25) {
                this.setRadioMessage('「パイロットの足が限界に近いトビ！滑空してスタミナを温存するトビ！」', 'cry');
            } else if (this.records.distance > 5000 && this.records.distance < 5500) {
                this.setRadioMessage('「5,000m突破トビ！前方に10km旋回パイロンが見えてきたトビ！」', 'smile');
            } else if (p.airSpeed * 3.6 > 38) {
                this.setRadioMessage('「ものすごい快速トビ！TBT二人乗りの真骨頂だトビ！」', 'normal');
            }
        }

        setRadioMessage(msg, mood = 'normal') {
            this.radioMessage = msg;
            this.radioMood = mood;

            // スプライト画像切り替え
            if (this.tobitoSprite) {
                const mapName = mood === 'smile' ? 'tobito_face_smile.png' :
                               mood === 'angry' ? 'tobito_face_angry.png' :
                               mood === 'cry'   ? 'tobito_face_cry.png'   : 'tobito_pose_airplane.png';
                new THREE.TextureLoader().load(this.assetsBase + mapName + '?v=alpha', (tex) => {
                    this.tobitoSprite.material.map = tex;
                    this.tobitoSprite.material.needsUpdate = true;
                });
            }
        }

        // ======================================================================
        // 5. アニメーション & 3Dレンダリングループ
        // ======================================================================
        loop(time) {
            this.frameInterval = (this.frameInterval || 16.7) * 0.9 + Math.min(250, time - this.lastTime) * 0.1;
            const dt = Math.min((time - this.lastTime) / 1000, 0.08);
            this.lastTime = time;
            if (time - (this.lastMapUpdate || 0) > 200) {
                this.courseMap.update(this.physics.pos, this.physics.yaw, this.state);
                this.lastMapUpdate = time;
            }
            if (document.hidden || !this.isVisible || document.getElementById('game-view-flight')?.classList.contains('hidden')) {
                requestAnimationFrame(this.loop.bind(this));
                return;
            }

            // 物理シミュレーション更新
            if (this.state === 'flying' || this.state === 'takeoff') {
                this.updatePhysics(dt);
            }

            // 3Dレンダリング
            if (this.hasThree && this.renderer) {
                this.renderThree(dt);
            } else {
                this.render2DFallback(dt);
            }

            // MFS グラスコックピット HUD描画
            this.renderHUD();

            // 音響パラメータ更新
            this.updateAudioLoop();

            requestAnimationFrame(this.loop.bind(this));
        }

        renderThree(dt) {
            const p = this.physics;

            // ペダリング連動微振動位相の更新
            if (p.cadenceRPM > 15) {
                this.pedalBobPhase += (p.cadenceRPM / 60) * Math.PI * 2 * dt;
            }
            const pedalBobRoll = (p.cadenceRPM > 15) ? Math.sin(this.pedalBobPhase) * 0.012 : 0;

            // 1. 機体位置 & 姿勢更新 (物理ピッチ角＋ペダリング微振動に忠実な3Dレンダリング)
            if (this.planeGroup) {
                if (this.wingFlex) {
                    const airSpeed = Math.max(this.physics.airSpeed, this.physics.wind?.speed || 0);
                    this.wingFlex.setLoad(window.TBTS320.windLoad(airSpeed, performance.now(), matchMedia('(prefers-reduced-motion: reduce)').matches));
                    this.wingFlex.update(dt, dt === 0);
                    this.canvas.dataset.wingFlex = this.wingFlex.load.toFixed(3);
                }
                this.planeGroup.position.set(p.pos.x, p.pos.y, p.pos.z);
                this.planeGroup.rotation.set(-p.pitch, p.yaw, -(p.roll + pedalBobRoll), 'YXZ');

                // 主翼のリアルなしなり (速度 & 揚力に応じて翼端が上へ湾曲)
                if (this.wingMesh) {
                    const flex = (p.airSpeed / 10) * 0.08;
                    this.wingMesh.rotation.z = Math.sin(performance.now() * 0.003) * 0.01;
                }

                // プロペラ高速回転
                if (this.propellerGroup && !this.propellerSeparated) {
                    const propSpeed = (p.cadenceRPM / 60) * 45 * dt;
                    this.propellerGroup.rotation.z += propSpeed;
                }
            }

            // 水面リアルタイム機体シャドウの追従 & 高度連動濃淡変化 (落ちている感覚の直感表現)
            if (this.waterShadowGroup && this.waterShadowMat) {
                this.waterShadowGroup.position.set(p.pos.x, 0.04, p.pos.z);
                this.waterShadowGroup.rotation.y = p.yaw;

                const alt = Math.max(0.1, p.pos.y);
                const shadowOpacity = Math.max(0.06, Math.min(0.68, 0.72 - (alt / 12.0) * 0.58));
                const shadowScale = Math.min(2.0, 0.82 + (alt / 11.0) * 0.90);

                this.waterShadowMat.opacity = shadowOpacity;
                this.waterShadowGroup.scale.set(shadowScale, 1.0, shadowScale);
            }

            // 破片パーティクルの更新
            this.updateDebris(dt);

            // 2. カメラ位置制御 (マルチカメラアングル & 垂直慣性ラグ & ダイナミック落下/加速FOV)
            this.updateCamera();

            // Surface normals and small waves are animated on the GPU.
            const sceneryTime = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : performance.now() * 0.001;
            this.lakeSurface.update(sceneryTime, p.wind.speed, p.pos, this.scene.fog.color);
            this.venueDetails.update(sceneryTime, p.wind.speed);
            this.canvas.dataset.waterTime = sceneryTime.toFixed(2);
            this.canvas.dataset.waterDetail = 'ripples-reflection-shore-wake';
            this.canvas.dataset.frameMs = this.frameInterval.toFixed(1);

            // 5. 風になびく大会旗（頂点ウェーブアニメーション）
            if (this.flagMeshes && this.flagMeshes.length > 0) {
                const ft = performance.now() * 0.008;
                this.flagMeshes.forEach(flag => {
                    const pos = flag.geometry.attributes.position;
                    for (let i = 0; i < pos.count; i++) {
                        const x = pos.getX(i);
                        const wave = Math.sin(ft + x * 2.8) * 0.22 * Math.max(0, (x + 1.2) / 2.4);
                        pos.setZ(i, wave);
                    }
                    flag.geometry.attributes.position.needsUpdate = true;
                });
            }

            // 6. 躍動感 Visual FX 更新 (翼端渦・超高速スピード線・サーマル衝撃波・とびとくんリアクション)
            this.updateWingtipVortices(dt);
            this.updateSpeedStreaks(dt);
            this.updateThermalShockwave(dt);
            this.updateTobitoCockpitReaction(dt);

            // レンダリング実行
            this.renderer.render(this.scene, this.camera);
        }

        updateCamera() {
            const p = this.physics;
            const planePos = new THREE.Vector3(p.pos.x, p.pos.y, p.pos.z);

            // 1. ダイナミック落下 ＆ 加速FOV (通常60度 → 高速/急降下時に最大74〜76度まで広がり疾走感MAX！)
            if (this.camera) {
                const speedBonus = Math.min(14, Math.max(0, (p.airSpeed - 7.5) * 2.2));
                const sinkSpeed  = Math.max(0, -p.vel.y);
                const sinkBonus   = Math.min(8, sinkSpeed * 3.5);
                const targetFov = 60 + speedBonus + sinkBonus;
                this.camera.fov += (targetFov - this.camera.fov) * 0.09;
                this.camera.updateProjectionMatrix();
            }

            // ペダリング連動微振動
            const pedalBob = (p.cadenceRPM > 15) ? Math.sin(this.pedalBobPhase) * 0.06 : 0;

            if (this.cameraMode === 'platform') {
                this.camera.up.set(0, 1, 0);
                const distance = 65 * Math.max(1, 1.05 / this.camera.aspect);
                this.camera.position.set(distance * 0.45, distance * 0.42, distance * 0.72);
                this.camera.lookAt(0, 7, -22);
            } else if (this.cameraMode === 'venue') {
                this.camera.up.set(0, 1, 0);
                const distance = 215 * Math.max(1, 1.05 / this.camera.aspect);
                this.camera.position.set(distance * 0.65, distance * 0.55, -80 + distance * 0.67);
                this.camera.lookAt(0, 4, -95);
            } else if (this.cameraMode === 'stands') {
                this.camera.up.set(0, 1, 0);
                const venue = window.TBTContestVenue.layout;
                this.camera.position.set(venue.standX, 6.8, venue.standZ - 7);
                this.camera.lookAt(0, 10, -8);
            } else if (this.cameraMode === 'chase') {
                // 三人称 チェイスカメラ（機体後方上空・垂直慣性ラグ対応）
                this.camera.up.set(0, 1, 0);
                const dist = (this.cameraDist || 28) * Math.max(1, 1.05 / this.camera.aspect);
                const baseHeight = dist * 0.32;
                const yaw = p.yaw + this.mouseLook.x;
                const pitch = p.pitch * 0.5 + this.mouseLook.y;

                // 垂直慣性ラグ: 降下中はカメラが少し上空にとどまり、機体が落ちていくのを捉える
                const sinkLag = Math.min(2.8, Math.max(-1.5, -p.vel.y * 0.55));
                const height = baseHeight + sinkLag + pedalBob * 0.3;

                const cx = p.pos.x - Math.sin(yaw) * Math.cos(pitch) * dist;
                const cy = p.pos.y + height - Math.sin(pitch) * dist;
                const cz = p.pos.z - Math.cos(yaw) * Math.cos(pitch) * dist;

                this.camera.position.set(cx, Math.max(0.8, cy), cz);
                const lookYOffset = (this.camera.aspect < 1 ? 1.0 : 0.8) + Math.min(0.2, p.vel.y * 0.35);
                this.camera.lookAt(planePos.x, planePos.y + lookYOffset, planePos.z + 4.0);

            } else if (this.cameraMode === 'cockpit' || this.cameraMode === 'pilot') {
                // 👨‍✈️ パイロット視点 (操縦席FPV)
                // パイロットの目線から回転プロペラと琵琶湖を目前に臨む！
                // 機体のロール・ピッチに追従して地平線が傾く本格フライト感覚
                const cosY = Math.cos(p.yaw);
                const sinY = Math.sin(p.yaw);
                const cosP = Math.cos(p.pitch);
                const sinP = Math.sin(p.pitch);

                // 前方進行方向ベクトル
                const fwdX = sinY * cosP;
                const fwdY = sinP;
                const fwdZ = cosY * cosP;

                // 上方ベクトル (機体ロールに連動)
                const upX = -Math.sin(p.roll) * cosY;
                const upY =  Math.cos(p.roll);
                const upZ =  Math.sin(p.roll) * sinY;
                this.camera.up.set(upX, upY, upZ);

                // パイロット頭部位置 (コックピット上部・プロペラ手前)
                const eyeX = p.pos.x;
                const eyeY = p.pos.y + 0.32;
                const eyeZ = p.pos.z + 0.45;
                this.camera.position.set(eyeX, eyeY, eyeZ);

                // 視線目標点 (機首の向く遠方)
                const lookDist = 60.0;
                this.camera.lookAt(
                    eyeX + fwdX * lookDist,
                    eyeY + fwdY * lookDist,
                    eyeZ + fwdZ * lookDist
                );

            } else if (this.cameraMode === 'wing') {
                // 右主翼 翼端カメラ（翼長14m横から機体を見返す）
                this.camera.up.set(0, 1, 0);
                const wx = p.pos.x + Math.cos(p.yaw) * 14.5;
                const wy = p.pos.y + 1.2;
                const wz = p.pos.z - Math.sin(p.yaw) * 14.5;
                this.camera.position.set(wx, wy, wz);
                this.camera.lookAt(planePos.x, planePos.y, planePos.z);

            } else if (this.cameraMode === 'tobito') {
                // とびとくん同乗カメラ（すぐ横のドアップ）
                this.camera.up.set(0, 1, 0);
                this.camera.position.set(p.pos.x + 2.5, p.pos.y + 1.4, p.pos.z + 0.8);
                this.camera.lookAt(p.pos.x + 1.4, p.pos.y + 1.1, p.pos.z + 0.2);
            }

            // 急降下・落下時の気流バイブレーション (Wind Buffet Shake)
            if (this.state === 'flying' && p.vel.y < -0.8) {
                const buffet = Math.min(0.22, (-p.vel.y - 0.8) * 0.08);
                this.camera.position.x += (Math.random() - 0.5) * buffet;
                this.camera.position.y += (Math.random() - 0.5) * buffet;
            }

            // 衝撃カメラシェイク (Camera Impact Shake)
            if (this.cameraShake > 0.01) {
                const shakeX = (Math.random() - 0.5) * this.cameraShake * 1.6;
                const shakeY = (Math.random() - 0.5) * this.cameraShake * 1.6;
                const shakeZ = (Math.random() - 0.5) * this.cameraShake * 1.6;
                this.camera.position.x += shakeX;
                this.camera.position.y += shakeY;
                this.camera.position.z += shakeZ;
                this.cameraShake *= 0.90;
            } else {
                this.cameraShake = 0;
            }
        }

        // ======================================================================
        // 6. MFS グラスコックピット HUD (Head-Up Display)
        // ======================================================================
        renderHUD() {
            if (!this.hudCtx) return;
            const ctx = this.hudCtx;
            const dpr = this.dpr || 1;
            const w = this.viewWidth || this.hudCanvas.width / dpr;
            const h = this.viewHeight || this.hudCanvas.height / dpr;
            const p = this.physics;
            const columns = w < 520 ? 2 : 4;
            const gap = 6;
            const cellW = (w - 24 - gap * (columns - 1)) / columns;
            const metrics = [
                ['速度', (p.airSpeed * 3.6).toFixed(1) + ' km/h'],
                ['高度', Math.max(0, p.pos.y).toFixed(1) + ' m'],
                ['飛行距離', Math.round(this.records.distance) + ' m'],
                ['スタミナ', Math.round(p.pilotStamina) + '%']
            ];
            ctx.save();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'left';
            metrics.forEach(([label, value], index) => {
                const x = 12 + (index % columns) * (cellW + gap);
                const y = 72 + Math.floor(index / columns) * 48;
                ctx.fillStyle = 'rgba(23, 29, 32, 0.86)';
                this.drawRoundedRect(ctx, x, y, cellW, 42, 4);
                ctx.fill();
                ctx.fillStyle = '#a8c5cf';
                ctx.font = '10px sans-serif';
                ctx.fillText(label, x + 9, y + 11);
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px monospace';
                ctx.fillText(value, x + 9, y + 29, cellW - 18);
            });
            const y = columns === 2 ? 178 : 130;
            let message = this.modelReady ? 'S-320 / 発進待機' : 'S-320 / 読み込み中';
            if (this.state === 'takeoff') message = '助走 / 踏切まで ' + Math.max(0, -p.pos.z).toFixed(1) + ' m';
            if (this.state === 'flying') message = '飛行中 / ' + Math.round(p.cadenceRPM) + ' RPM';
            if (this.state === 'splashdown') message = 'フライト終了';
            if (p.isStalling) message = '失速 / 機首を下げてください';
            else if (p.isWaterTouching) message = '水面接触';
            ctx.textAlign = 'center';
            ctx.fillStyle = p.isStalling ? '#b82e40' : 'rgba(23, 29, 32, 0.86)';
            const messageW = Math.min(320, w - 24);
            this.drawRoundedRect(ctx, (w - messageW) / 2, y - 10, messageW, 26, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.fillText(message, w / 2, y + 3, messageW - 16);
            if (this.cameraMode === 'pilot' || this.cameraMode === 'cockpit') {
                ctx.translate(w / 2, h / 2);
                ctx.rotate(-p.roll);
                ctx.strokeStyle = '#dffaff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(-60, p.pitch * 120);
                ctx.lineTo(-12, p.pitch * 120);
                ctx.moveTo(12, p.pitch * 120);
                ctx.lineTo(60, p.pitch * 120);
                ctx.stroke();
            }
            ctx.restore();
        }

        renderTobitoSpeechBubble(ctx, w, h) {
            if (!this.tobitoBubbleText) return;
            ctx.save();
            const text = this.tobitoBubbleText;
            ctx.font = 'bold 13px "M PLUS Rounded 1c", sans-serif';
            const metrics = ctx.measureText(text);
            const bw = metrics.width + 36;
            const bh = 34;
            const bx = w / 2 - bw / 2;
            const by = 85;

            // フキダシ影
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            this.drawRoundedRect(ctx, bx + 2, by + 2, bw, bh, 14);
            ctx.fill();

            // フキダシ本体
            ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
            this.drawRoundedRect(ctx, bx, by, bw, bh, 14);
            ctx.fill();

            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 2;
            this.drawRoundedRect(ctx, bx, by, bw, bh, 14);
            ctx.stroke();

            // テキスト
            ctx.fillStyle = '#0369a1';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, w / 2, by + bh / 2);
            ctx.restore();
        }

        renderRunwayHUD(ctx, cx, w, h, isMobile = false) {
            if (this.state !== 'takeoff' && this.state !== 'ready') return;
            const p = this.physics;
            const remDist = Math.max(0, -p.pos.z).toFixed(1);
            const reqSpeed = 27.5; // 必要離陸速度 km/h
            const curSpeed = (p.airSpeed * 3.6).toFixed(1);
            const speedRatio = Math.min(1.0, (p.airSpeed * 3.6) / reqSpeed);

            ctx.save();
            const hudBoxW = Math.min(420, isMobile ? w - 24 : w - 80);
            const hudBoxH = isMobile ? 60 : 68;
            const bx = cx - hudBoxW / 2;
            const by = isMobile ? 50 : 55;

            // 背景
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.fillRect(bx, by, hudBoxW, hudBoxH);
            ctx.strokeStyle = this.state === 'takeoff' ? '#f59e0b' : '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(bx, by, hudBoxW, hudBoxH);

            // タイトル
            ctx.fillStyle = this.state === 'takeoff' ? '#fbbf24' : '#38bdf8';
            ctx.font = isMobile ? 'bold 11px sans-serif' : 'black 12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(this.state === 'takeoff' ? '【助走中】RUNWAY TAKEOFF' : '【発進台】彦根プラットフォーム 10m', bx + 12, by + (isMobile ? 15 : 18));

            // 残り距離
            ctx.fillStyle = '#ffffff';
            ctx.font = isMobile ? 'bold 10px monospace' : 'bold 11px monospace';
            ctx.fillText(`踏切まで: ${remDist} m`, bx + 12, by + (isMobile ? 32 : 37));

            // 速度
            ctx.textAlign = 'right';
            ctx.fillStyle = p.airSpeed * 3.6 >= reqSpeed ? '#10b981' : '#f87171';
            ctx.fillText(`速度: ${curSpeed} / 27.5 km/h`, bx + hudBoxW - 12, by + (isMobile ? 32 : 37));

            // スピードプログレスバー
            const barY = by + (isMobile ? 42 : 47);
            const barW = hudBoxW - 24;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(bx + 12, barY, barW, isMobile ? 8 : 9);

            ctx.fillStyle = speedRatio >= 1.0 ? '#10b981' : '#f59e0b';
            ctx.fillRect(bx + 12, barY, barW * speedRatio, isMobile ? 8 : 9);

            // 案内メッセージ
            if (this.state === 'ready') {
                ctx.fillStyle = '#38bdf8';
                ctx.font = isMobile ? 'bold 11px sans-serif' : 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                const guideMsg = isMobile 
                    ? '⚡ PEDALボタン連打（または画面タップ）で助走発進！' 
                    : '⚡ Space連打で助走スタート！（押しっぱなし無効・連打で加速！）';
                ctx.fillText(guideMsg, cx, by + hudBoxH + 18);
            }

            ctx.restore();
        }



        renderGPSRadar(ctx, rx, ry, rw, rh) {
            const p = this.physics;
            const rec = this.records;

            // 背景パネル
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(rx, ry, rw, rh);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(rx, ry, rw, rh);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('LAKE BIWA GPS', rx + 10, ry + 15);

            // 琵琶湖の簡略輪郭
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.beginPath();
            ctx.moveTo(rx + 40, ry + 130);
            ctx.lineTo(rx + 50, ry + 80);
            ctx.lineTo(rx + 90, ry + 40);
            ctx.lineTo(rx + 110, ry + 70);
            ctx.lineTo(rx + 80, ry + 120);
            ctx.closePath();
            ctx.stroke();

            // スタート地点
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(rx + 45, ry + 125, 4, 0, Math.PI * 2);
            ctx.fill();

            // 10km パイロン
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(rx + 95, ry + 45, 4, 0, Math.PI * 2);
            ctx.fill();

            // 自機現在位置
            const progress = Math.min(1.0, rec.distance / 12000);
            const planeX = rx + 45 + (progress * 50);
            const planeY = ry + 125 - (progress * 80);

            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(planeX, planeY, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`${rec.distance} m`, rx + 10, ry + rh - 12);
        }

        renderPedalInstrument(ctx, px, py, pw, ph) {
            const p = this.physics;

            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(px, py, pw, ph);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, py, pw, ph);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('TANDEM PEDAL DRIVE', px + 10, py + 15);

            // ペダルRPM
            ctx.fillStyle = p.cadenceRPM > 70 ? '#10b981' : p.cadenceRPM > 30 ? '#f59e0b' : '#64748b';
            ctx.font = 'black 22px monospace';
            ctx.fillText(`${Math.round(p.cadenceRPM)}`, px + 12, py + 46);
            ctx.font = 'bold 10px monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('RPM', px + 55, py + 46);

            // 連打速度 (CPS)
            const cpsColor = this.pedalCPS >= 4.0 ? '#10b981' : this.pedalCPS > 1.5 ? '#f59e0b' : '#94a3b8';
            ctx.fillStyle = cpsColor;
            ctx.font = 'black 14px monospace';
            ctx.fillText(`${(this.pedalCPS || 0).toFixed(1)}`, px + 95, py + 46);
            ctx.font = 'bold 9px monospace';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('TAP/s', px + 130, py + 46);

            // パイロットスタミナバー
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 9px monospace';
            ctx.fillText('STAMINA (PILOT A&B)', px + 12, py + 70);
            ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
            ctx.fillRect(px + 12, py + 78, pw - 24, 11);
            const staminaColor = p.pilotStamina > 40 ? '#10b981' : p.pilotStamina > 20 ? '#f59e0b' : '#ef4444';
            ctx.fillStyle = staminaColor;
            ctx.fillRect(px + 12, py + 78, (pw - 24) * (p.pilotStamina / 100), 11);

            // Gメーター & 連打状態
            const gColor = p.gForce >= 2.6 ? '#ef4444' : p.gForce >= 2.0 ? '#f59e0b' : '#38bdf8';
            ctx.fillStyle = gColor;
            ctx.font = 'bold 10px monospace';
            ctx.fillText(`G: ${(p.gForce || 1.0).toFixed(1)}G`, px + 12, py + 115);

            ctx.fillStyle = p.cadenceRPM > 10 ? '#10b981' : '#64748b';
            ctx.fillText(p.cadenceRPM > 10 ? '⚡ PEDAL ACTIVE' : '🪶 GLIDE (連打で加速)', px + 65, py + 115);

            // 総連打数
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(`STROKES: ${this.pedalStrokeCount}`, px + pw - 10, py + 135);
            ctx.textAlign = 'left';
        }

        renderRadioBox(ctx, bx, by, bw) {
            // とびとくん無線フキダシ
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.fillRect(bx, by, bw, 32);
            ctx.strokeStyle = '#0284c7';
            ctx.lineWidth = 1;
            ctx.strokeRect(bx, by, bw, 32);

            // アイコン
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText('📻 とびとくん無線:', bx + 12, by + 16);

            // セリフ
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px "M PLUS Rounded 1c", sans-serif';
            ctx.fillText(this.radioMessage, bx + 140, by + 16);
        }

        renderTobitoCheerWidget(ctx, w, h) {
            // 応援団長 とびとくん ライブHUDウィジェット
            ctx.save();

            const p = this.physics;
            const now = performance.now();
            const isPedaling = p.pedaling || p.cadenceRPM > 50;

            // ウィジェット位置設定（ペダル計器の上側、または画面右上）
            const cardW = 195;
            const cardH = 135;
            let cardX = w - cardW - 15;
            let cardY = h - 170 - cardH - 12;

            // 画面高が小さい場合（スマホなど）は右上へ調整
            if (cardY < 60) {
                cardX = w - cardW - 15;
                cardY = 55;
            }

            // カード背景パネル（グラスモーフィズム調）
            ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
            ctx.strokeStyle = isPedaling ? '#f59e0b' : '#38bdf8';
            ctx.lineWidth = 1.8;
            this.drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12);
            ctx.fill();
            ctx.stroke();

            // ヘッダーバッジ: 📢 応援団長 とびとくん
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('📢 応援団長 とびとくん', cardX + 12, cardY + 18);

            // バウンスアニメーション計算
            const bounceFreq = isPedaling ? 0.016 : 0.008;
            const bounceAmp = isPedaling ? 12 : 6;
            const bounceY = Math.abs(Math.sin(now * bounceFreq)) * bounceAmp;
            const tilt = Math.sin(now * bounceFreq * 0.5) * 0.08;

            // キャラクター画像選択
            // 飛行中は飛行機ポーズ、助走中・待機中は「来い！」ポーズ
            let tobitoImg = this.state === 'flying' ? this.cheerImgAirplane : this.cheerImgKoi;
            if (!tobitoImg || !tobitoImg.complete || tobitoImg.naturalWidth === 0) {
                tobitoImg = this.cheerImgKoi;
            }

            // とびとくんイラストの描画 (左側)
            const imgBoxX = cardX + 8;
            const imgBoxY = cardY + 28 - bounceY;
            const imgSize = 75;

            ctx.save();
            ctx.translate(imgBoxX + imgSize / 2, imgBoxY + imgSize / 2);
            ctx.rotate(tilt);
            if (tobitoImg && tobitoImg.complete && tobitoImg.naturalWidth > 0) {
                ctx.drawImage(tobitoImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
            } else {
                // フォールバック可愛いアバター
                ctx.fillStyle = '#facc15';
                ctx.beginPath();
                ctx.arc(0, 0, 26, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#0f172a';
                ctx.font = 'bold 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('とびとくん', 0, 4, 46);
            }
            ctx.restore();

            // エールメッセージ決定
            let cheerLine1 = 'Space連打で助走！';
            let cheerLine2 = '目指せ琵琶湖の空へ！';

            if (this.isBroken) {
                cheerLine1 = '機体大破トビ〜〜！💥';
                cheerLine2 = this.breakReason === 'over_g' ? '過大Gでスパー折損！' : '水面に激突したトビ！';
            } else if (this.state === 'ready') {
                cheerLine1 = '準備OKだトビ！';
                cheerLine2 = 'Space連打で助走！';
            } else if (this.state === 'takeoff') {
                if (p.cadenceRPM >= 90) {
                    cheerLine1 = '神連打キター！🔥';
                    cheerLine2 = '時速30km/h突破！飛ぶぞ！';
                } else if (p.cadenceRPM >= 60) {
                    cheerLine1 = 'イイ連打だトビ！✨';
                    cheerLine2 = '踏切まで漕ぎまくれ！';
                } else {
                    cheerLine1 = 'Space連打連打ー！';
                    cheerLine2 = 'ガンバレガンバレ！';
                }
            } else if (this.state === 'flying') {
                if (p.gForce >= 2.5) {
                    cheerLine1 = 'G高すぎ注意！⚠️';
                    cheerLine2 = '引き起こしを緩めて！';
                } else if (p.isStalling) {
                    cheerLine1 = '機首下げて加速！';
                    cheerLine2 = '失速を回避するトビ！';
                } else if (p.thermalBoost > 0) {
                    cheerLine1 = 'サーマル突入！！✨';
                    cheerLine2 = 'グングン上昇だトビ！';
                } else if (p.isGroundEffect) {
                    cheerLine1 = '水面効果バッチリ！🌊';
                    cheerLine2 = '翼が浮いてるトビ！';
                } else if (p.vel.y <= -1.0) {
                    cheerLine1 = '急降下中だトビ！⚠️';
                    cheerLine2 = '操縦桿（↑/S）を引け！';
                } else if (isPedaling) {
                    cheerLine1 = 'ナイスペダリング！🔥';
                    cheerLine2 = `連打${this.pedalStrokeCount}回目！その調子！`;
                } else {
                    cheerLine1 = '風に乗ってるトビ！🪽';
                    cheerLine2 = '連打で高度を稼ぐトビ！';
                }
            } else if (this.state === 'splashdown') {
                cheerLine1 = 'ナイスフライト！🎉';
                cheerLine2 = 'よく頑張ったトビ！';
            }

            // 右側のフキダシ風テキストボックス
            const bubbleX = cardX + 88;
            const bubbleY = cardY + 30;
            const bubbleW = cardW - 98;
            const bubbleH = 58;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            this.drawRoundedRect(ctx, bubbleX, bubbleY, bubbleW, bubbleH, 8);
            ctx.fill();
            ctx.stroke();

            // フキダシのしっぽ (左向き)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.moveTo(bubbleX, bubbleY + 22);
            ctx.lineTo(bubbleX - 7, bubbleY + 27);
            ctx.lineTo(bubbleX, bubbleY + 32);
            ctx.closePath();
            ctx.fill();

            // フキダシ内のテキスト描画
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(cheerLine1, bubbleX + 6, bubbleY + 21);
            ctx.fillStyle = '#0284c7';
            ctx.font = 'bold 9.5px sans-serif';
            ctx.fillText(cheerLine2, bubbleX + 6, bubbleY + 41);

            // フッター応援ステータス
            ctx.fillStyle = isPedaling ? '#10b981' : '#94a3b8';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            const statusTxt = isPedaling ? '⚡ CHEER: MAX (全力応援中)' : '🪶 CHEER: READY';
            ctx.fillText(statusTxt, cardX + cardW / 2, cardY + cardH - 12);

            ctx.restore();
        }

        renderDiveSpeedLines(ctx, w, h, sinkRate) {
            // 急降下時の空気摩擦ストリーク (落ちている激しいスピード感を画面全体で表現！)
            const count = Math.min(36, Math.floor(sinkRate * 12));
            ctx.save();
            const now = performance.now();

            for (let i = 0; i < count; i++) {
                // 画面下から上へ高速で吹き抜ける気流ライン
                const speed = 1.2 + sinkRate * 0.8;
                const seed = (i * 123.7 + now * speed) % h;
                const x = ((i * 79.3) % (w - 60)) + 30;
                const lineLen = 30 + sinkRate * 35;
                const alpha = Math.min(0.55, 0.18 + (i % 4) * 0.10);

                ctx.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
                ctx.lineWidth = 1.5 + (i % 3) * 0.8;
                ctx.beginPath();
                ctx.moveTo(x, seed);
                ctx.lineTo(x, seed - lineLen);
                ctx.stroke();
            }
            ctx.restore();
        }

        drawRoundedRect(ctx, x, y, width, height, radius) {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
        }

        // ======================================================================
        // 7. 2Dフォールバック (Three.jsロード前または非対応環境)
        // ======================================================================
        init2DFallback() {
            this.ctx = this.canvas.getContext('2d');
            this.modelReady = false;
            window.TBTS320.status(this.canvas.parentElement, 'error');
        }

        render2DFallback() {}
        initAudio() {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.audioCtx = new AudioCtx();
                    this.windGain = null;
                    this.windFilter = null;
                    this.windStarted = false;
                }
            } catch (e) {}
        }

        startWindAudio() {
            if (!this.soundEnabled || !this.audioCtx || this.windStarted) return;
            try {
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                // ホワイトノイズ生成バッファ (2秒ループ)
                const bufferSize = this.audioCtx.sampleRate * 2;
                const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
                const output = noiseBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    output[i] = Math.random() * 2 - 1;
                }

                const noise = this.audioCtx.createBufferSource();
                noise.buffer = noiseBuffer;
                noise.loop = true;

                // バンドパスフィルター (風切り音帯域)
                this.windFilter = this.audioCtx.createBiquadFilter();
                this.windFilter.type = 'bandpass';
                this.windFilter.frequency.value = 350;
                this.windFilter.Q.value = 1.3;

                this.windGain = this.audioCtx.createGain();
                this.windGain.gain.value = 0.0;

                noise.connect(this.windFilter);
                this.windFilter.connect(this.windGain);
                this.windGain.connect(this.audioCtx.destination);
                noise.start();
                this.windStarted = true;
            } catch (e) {}
        }

        updateAudioLoop() {
            if (!this.soundEnabled || !this.audioCtx || this.state === 'ready') {
                if (this.windGain) this.windGain.gain.value = 0;
                return;
            }
            try {
                if (!this.windStarted) {
                    this.startWindAudio();
                }
                if (this.audioCtx.state === 'suspended') return;

                const p = this.physics;
                const now = this.audioCtx.currentTime;

                // 1. リアルタイム風切り音 (対気速度 + 沈下速度でダイナミック轟音化！)
                const sinkSpeed = Math.max(0, -p.vel.y);
                const targetFreq = Math.min(2400, 260 + p.airSpeed * 42 + sinkSpeed * 460);
                const targetVol = this.state === 'flying'
                    ? Math.min(0.36, 0.04 + (p.airSpeed / 16) * 0.09 + sinkSpeed * 0.13)
                    : (this.state === 'takeoff' ? 0.05 : 0);

                if (this.windFilter) {
                    this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.05);
                }
                if (this.windGain) {
                    this.windGain.gain.setTargetAtTime(targetVol, now, 0.05);
                }

                // 2. 急降下沈下警報ビープ音 (GPWS: SINK RATE WARNING BEEP)
                // 沈下速度が -1.4m/s 以下、または水面高度3.5m以下で -0.7m/s 以上のとき電子警告音
                if (this.state === 'flying' && (sinkSpeed >= 1.4 || (p.pos.y <= 3.5 && sinkSpeed >= 0.70))) {
                    if (!this.lastSinkBeepTime || (performance.now() - this.lastSinkBeepTime > 260)) {
                        this.lastSinkBeepTime = performance.now();
                        this.playSinkBeep();
                    }
                }
            } catch (e) {}
        }

        playSinkBeep() {
            if (!this.soundEnabled || !this.audioCtx) return;
            try {
                const now = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(760, now); // 高音の切迫警告音
                gain.gain.setValueAtTime(0.20, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.10);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(now);
                osc.stop(now + 0.10);
            } catch (e) {}
        }

        playSound(type) {
            if (!this.soundEnabled || !this.audioCtx) return;
            try {
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume();
                }
                const now = this.audioCtx.currentTime;
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);

                if (type === 'stall') {
                    // 失速ブザー警報
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(820, now);
                    osc.frequency.setValueAtTime(620, now + 0.08);
                    gain.gain.setValueAtTime(0.18, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);
                    osc.start(now);
                    osc.stop(now + 0.16);
                } else if (type === 'thermal') {
                    // サーマル上昇チャイム
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);
                } else if (type === 'splash') {
                    // 水しぶき音
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(140, now);
                    osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
                    gain.gain.setValueAtTime(0.35, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
                    osc.start(now);
                    osc.stop(now + 0.6);
                } else if (type === 'takeoff') {
                    // テイクオフファンファーレ
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
                    gain.gain.setValueAtTime(0.25, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    osc.start(now);
                    osc.stop(now + 0.5);
                } else if (type === 'crash') {
                    // プラットフォーム激突・クラッシュ音
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(180, now);
                    osc.frequency.linearRampToValueAtTime(40, now + 0.4);
                    gain.gain.setValueAtTime(0.4, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                    osc.start(now);
                    osc.stop(now + 0.45);
                } else if (type === 'break') {
                    // 機体構造破壊・スパー骨折音 (バキィィッ！ドガシャァン！)
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(480, now);
                    osc.frequency.exponentialRampToValueAtTime(60, now + 0.35);
                    gain.gain.setValueAtTime(0.55, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                    osc.start(now);
                    osc.stop(now + 0.4);

                    // 破片飛散ノイズ音
                    try {
                        const noiseOsc = this.audioCtx.createOscillator();
                        const noiseGain = this.audioCtx.createGain();
                        noiseOsc.type = 'square';
                        noiseOsc.frequency.setValueAtTime(120, now);
                        noiseOsc.frequency.linearRampToValueAtTime(30, now + 0.5);
                        noiseGain.gain.setValueAtTime(0.3, now);
                        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                        noiseOsc.connect(noiseGain);
                        noiseGain.connect(this.audioCtx.destination);
                        noiseOsc.start(now);
                        noiseOsc.stop(now + 0.5);
                    } catch (e) {}
                } else if (type === 'pedal') {
                    // ペダルストローククリック音 (チキッ)
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(200, now + 0.04);
                    gain.gain.setValueAtTime(0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                    osc.start(now);
                    osc.stop(now + 0.04);
                }
            } catch (e) {}
        }

        triggerStallAlarm() {
            const now = performance.now();
            if (now - this.physics.stallWarningTimer > 400) {
                this.physics.stallWarningTimer = now;
                this.playSound('stall');
            }
        }

        // ==============================================================
        // 【鳥人間コンテスト】着水 & フライト記録判定（公式実測値 100% 正確な測定）
        // ==============================================================
        triggerRunwayFoul(reason) {
            this.state = 'splashdown';
            this.foulReason = reason || '滑走路手すり接触';
            this.playSound('stall');
            // 公式実測値（踏切ライン先端Z=0からの正確な実測距離）
            const dist = Math.floor(Math.max(0, this.records.distance));
            this.records.distance = dist;
            this.setRadioMessage('「ナイスファイトだトビ！次は中央をキープしてSpace連打で加速しよう！」', 'smile');
            this.showResultOverlay('【ゲーム記録】' + dist + ' m', '手すり接触後も滑空を続けました！次は中央をキープしてSpace連打で加速しよう！', dist);
        }

        triggerPlatformCrash(reason) {
            this.state = 'splashdown';
            this.foulReason = reason || 'プラットフォーム建造物接近';
            this.playSound('splash');
            // 公式実測値
            const dist = Math.floor(Math.max(0, this.records.distance));
            this.records.distance = dist;
            this.setRadioMessage('「琵琶湖へ着水！次は沖合へ向かって大きく旋回するトビ！」', 'smile');
            this.showResultOverlay('【ゲーム記録】' + dist + ' m', '10mプラットフォームから飛び立ちました！次回は高度を保って琵琶湖の沖合へ飛び出そう！', dist);
        }

        triggerSplashdown() {
            this.state = 'splashdown';
            this.playSound('splash');

            // 鳥人間コンテスト公式ルール: 踏切ライン先端Z=0からの実測水平直線距離
            const dist = Math.floor(Math.max(0, this.records.distance));
            this.records.distance = dist;

            if (dist < 200) {
                // 初心者・ショートフライト
                this.setRadioMessage('「琵琶湖に着水！ナイスファイトだトビ！次はもっと遠くへ飛べるトビ！」', 'smile');
                let title = '【ゲーム記録】' + dist + ' m';
                let desc = '彦根松原プラットフォームから勢いよくテイクオフ！Spaceキー連打でペダル回転数を上げ、主翼の揚力で大空高く羽ばたこう！';
                this.showResultOverlay(title, desc, dist);
            } else {
                // ロングフライト
                this.setRadioMessage('「琵琶湖に着水！素晴らしい二人乗りフライトだったトビ！」', 'smile');
                let title = '【称号】ルーキーパイロット';
                let desc = '彦根プラットフォームから飛び立ちました！次回はペダリングと姿勢を整えて、さらに遠くへ飛ぼう！';

                if (dist >= 10000) {
                    title = '【称号】神風バードマン（琵琶湖の覇者）';
                    desc = '10km旋回パイロンを回る驚異のフライト！歴代レジェンド記録です！';
                } else if (dist >= 5000) {
                    title = '【称号】二人乗りマイスター';
                    desc = '息の合ったタンデムペダリングで5kmの壁を突破しました！';
                } else if (dist >= 2000) {
                    title = '【称号】グラウンドエフェクト職人';
                    desc = '水面スレスレの地面効果を巧みに操り長距離を滑空しました！';
                } else if (dist >= 500) {
                    title = '【称号】琵琶湖の若鳥';
                    desc = '安定した美しい滑空で見事なフライトを決めました！';
                }
                this.showResultOverlay(title, desc, dist);
            }
        }

        showResultOverlay(title, desc, distance) {
            const resultBox = document.getElementById('game-result-box');
            if (resultBox) {
                resultBox.classList.remove('hidden');
                resultBox.style.display = 'flex';
                resultBox.style.zIndex = '99999';
                resultBox.style.pointerEvents = 'auto';

                const distSpan = document.getElementById('result-distance');
                if (distSpan) distSpan.textContent = distance.toLocaleString();

                const commentP = document.getElementById('result-comment') || document.getElementById('result-desc');
                if (commentP) commentP.textContent = desc || '素晴らしいフライト！追い風に乗って見事な飛行を見せました。';

                const titleP = document.getElementById('result-title');
                if (titleP) titleP.textContent = title;

                const distInput = document.getElementById('submit-distance') || document.getElementById('ranking-distance-input');
                if (distInput) distInput.value = distance;

                // タッチコントロールのポインタイベントを遮断（リザルト画面クリックを最優先）
                const touchControls = document.getElementById('game-touch-controls');
                if (touchControls) {
                    touchControls.style.pointerEvents = 'none';
                }

                // The completed flight is saved once; registering a name updates it.
                if (window.FlightRankingManager) {
                    const flightDurationSec = (this.flightStartTime && this.flightEndTime) ? ((this.flightEndTime - this.flightStartTime) / 1000) : (this.records ? this.records.flightTime : 0);
                    window.FlightRankingManager.recordFlight(distance, flightDurationSec);
                }

            }
        }

        // ==============================================================
        // 【機体破壊シミュレーション】主翼折損 & 水面激突 & 爆散パーティクル
        // ==============================================================
        triggerBreakup(reason) {
            if (this.isBroken) return;
            this.isBroken = true;
            this.breakReason = reason || 'impact';
            this.breakTime = performance.now();
            this.state = 'splashdown';

            // 破壊音 & カメラシェイク
            this.playSound('break');
            this.cameraShake = 1.2;

            // 主翼ピボット関節の破損折れ曲がり
            if (this.leftWingPivot) {
                this.leftWingPivot.rotation.z = -0.72; // 左翼がバキッと下へ垂れ下がる
                this.leftWingPivot.rotation.x = 0.28;
            }
            if (this.rightWingPivot) {
                this.rightWingPivot.rotation.z = 0.62;  // 右翼が折れて上へめくれ上がる
                this.rightWingPivot.rotation.y = -0.32;
            }

            // プロペラ分離・飛散
            if (this.propellerGroup) {
                this.propellerSeparated = true;
                this.propellerVelocity = {
                    x: (Math.random() - 0.5) * 5.0,
                    y: 4.8,
                    z: this.physics.vel.z + 6.0,
                    rotX: 14.0,
                    rotY: 9.0
                };
            }

            // 破片パーティクルの生成
            this.spawnDebris(this.physics.pos);

            // 距離記録（公式実測値）
            const dist = Math.floor(Math.max(0, this.records.distance));
            this.records.distance = dist;

            // 理由に応じた演出・メッセージ・リザルト
            if (reason === 'over_g') {
                this.setRadioMessage('「ギャアァァッ！主翼のスパー（桁）がバキッと折れたトビ〜〜！！過大G（限界荷重突破）だトビ！」', 'cry');
                this.showResultOverlay(
                    '【機体大破】主翼スパー破断！(過大G)',
                    `高速滑空中に急激な引き起こしを行い、主翼CFRPメインスパーの許容耐荷重限界（${this.physics.gForce.toFixed(1)}G）を超過しました！主翼がバキッとへし折れて琵琶湖へ着水！`,
                    dist
                );
            } else if (reason === 'water_impact') {
                this.setRadioMessage('「ドボォォン！水面に高速激突して機体が大破したトビ〜！！」', 'cry');
                this.showResultOverlay(
                    '【機体大破】水面激突クラッシュ！',
                    '急降下のまま琵琶湖の水面へ激しく叩きつけられ、衝撃で主翼とプロペラが大破・飛散しました！次回は水面手前でエレベーターを引き起こして水平着水しよう！',
                    dist
                );
            } else {
                this.setRadioMessage('「ドガシャァン！建造物に激突して主翼が粉々になったトビ！」', 'cry');
                this.showResultOverlay(
                    '【機体大破】障害物激突クラッシュ！',
                    'プラットフォーム建造物に激突し、主翼が粉々に大破しました！',
                    dist
                );
            }
        }

        spawnDebris(origin) {
            if (!this.hasThree || !this.debrisGroup) return;

            // 既存の破片をクリア
            while (this.debrisGroup.children.length > 0) {
                this.debrisGroup.remove(this.debrisGroup.children[0]);
            }
            this.debrisList = [];

            const pMatMylar = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.3, transparent: true, opacity: 0.85 });
            const pMatCarbon = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
            const pMatBlue = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

            // 35個の破片（リブ、桁、フィルム断片）を爆散
            for (let i = 0; i < 35; i++) {
                const isSpar = i % 3 === 0;
                let geo, mat;
                if (isSpar) {
                    geo = new THREE.CylinderGeometry(0.04, 0.04, 0.9 + Math.random() * 0.8, 6);
                    mat = pMatCarbon;
                } else if (i % 2 === 0) {
                    geo = new THREE.BoxGeometry(0.5 + Math.random() * 0.5, 0.05, 0.6 + Math.random() * 0.4);
                    mat = pMatMylar;
                } else {
                    geo = new THREE.BoxGeometry(0.4, 0.08, 0.4);
                    mat = pMatBlue;
                }

                const mesh = new THREE.Mesh(geo, mat);
                const spawnX = origin.x + (Math.random() - 0.5) * 8.0;
                const spawnY = origin.y + (Math.random() - 0.5) * 1.5;
                const spawnZ = origin.z + (Math.random() - 0.5) * 2.5;
                mesh.position.set(spawnX, spawnY, spawnZ);

                this.debrisGroup.add(mesh);

                this.debrisList.push({
                    mesh: mesh,
                    vel: {
                        x: (Math.random() - 0.5) * 12.0,
                        y: Math.random() * 7.0 + 1.5,
                        z: this.physics.vel.z * 0.7 + (Math.random() - 0.5) * 8.0
                    },
                    rot: {
                        x: (Math.random() - 0.5) * 14.0,
                        y: (Math.random() - 0.5) * 14.0,
                        z: (Math.random() - 0.5) * 14.0
                    },
                    landed: false
                });
            }
        }

        updateDebris(dt) {
            if (!this.debrisList || this.debrisList.length === 0) return;

            for (let d of this.debrisList) {
                if (d.landed) continue;

                // 重力 & 移動
                d.vel.y -= 9.8 * dt;
                d.mesh.position.x += d.vel.x * dt;
                d.mesh.position.y += d.vel.y * dt;
                d.mesh.position.z += d.vel.z * dt;

                d.mesh.rotation.x += d.rot.x * dt;
                d.mesh.rotation.y += d.rot.y * dt;
                d.mesh.rotation.z += d.rot.z * dt;

                // 水面着水
                if (d.mesh.position.y <= 0.1) {
                    d.mesh.position.y = 0.05;
                    d.vel.x *= 0.2;
                    d.vel.z *= 0.2;
                    d.vel.y = 0;
                    d.landed = true;
                }
            }

            // プロペラ分離アニメーション
            if (this.propellerSeparated && this.propellerGroup) {
                const pv = this.propellerVelocity;
                pv.y -= 9.8 * dt;
                this.propellerGroup.position.x += pv.x * dt;
                this.propellerGroup.position.y += pv.y * dt;
                this.propellerGroup.position.z += pv.z * dt;
                this.propellerGroup.rotation.x += pv.rotX * dt;
                this.propellerGroup.rotation.y += pv.rotY * dt;

                if (this.propellerGroup.position.y <= 0.2) {
                    this.propellerGroup.position.y = 0.1;
                    pv.y = 0;
                    pv.x = 0;
                    pv.z = 0;
                }
            }
        }

        handlePedalTap() {
            if (!this.modelReady) return;
            // キー長押し無効化 & 連打回数によるペダリング制御 (連打制御)
            const now = performance.now();
            if (this.state === 'ready') {
                this.startFlight();
            }
            if (this.state === 'splashdown') return;

            // 連打時刻を記録
            this.pedalTapHistory.push(now);
            // 過去1.5秒以内のタップのみ保持
            this.pedalTapHistory = this.pedalTapHistory.filter(t => now - t <= 1500);

            this.pedalStrokeCount++;
            this.records.totalStrokes++;
            this.lastPedalTapTime = now;
            this.physics.pedaling = true;

            // 直近の連打秒間速度 (Clicks Per Second)
            this.pedalCPS = this.pedalTapHistory.length / 1.5;

            // 1タップごとの回転数（RPM）ブーストインパルス
            // 助走中は強力に加速（1タップにつき +12 RPM）
            // 飛行中は +8.5 RPM
            const rpmBoost = this.state === 'takeoff' ? 12.0 : 8.5;
            this.physics.cadenceRPM = Math.min(135, this.physics.cadenceRPM + rpmBoost);

            // 軽快なペダルストローククリック音
            this.playSound('pedal');
        }

        // ======================================================================
        // 9. 操作イベントバインド
        // ======================================================================
        bindEvents() {
            document.getElementById('flight-camera')?.addEventListener('change', event => this.switchCamera(event.target.value));
            document.getElementById('flight-assist')?.addEventListener('change', event => { this.assisted = event.target.checked; });
            document.getElementById('flight-route-order')?.addEventListener('change', event => {
                if (this.state !== 'ready') this.resetFlight();
                this.courseTracker.reset(event.target.value);
                this.courseMap.reset();
                this.courseMap.update(this.physics.pos, this.physics.yaw, this.state);
            });
            // 操作キーリスト（ブラウザのデフォルトスクロール等の挙動を完全遮断）
            const flightKeys = [
                'Space',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'KeyW', 'KeyS', 'KeyA', 'KeyD',
                'KeyQ', 'KeyE',
                'KeyC', 'KeyP', 'KeyV', 'KeyT', 'KeyR', 'KeyF'
            ];

            // キーボード操作
            window.addEventListener('keydown', (e) => {
                if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
                if (e.target.closest('input, textarea, button, select, a, [contenteditable="true"]')) return;
                if (!this.canvas.parentElement.contains(document.activeElement)) return;
                if (document.getElementById('game-view-flight')?.classList.contains('hidden')) return;

                if (flightKeys.includes(e.code)) {
                    // スクロールなどのブラウザデフォルト動作を完全防止
                    e.preventDefault();
                }

                // 【重要】キーボード押し続け（キーリピート）を完全無効化！連打回数でのみ制御！
                if (e.repeat) return;

                if (e.code === 'Space') {
                    this.handlePedalTap();
                } else if (e.code === 'KeyW' || e.code === 'ArrowDown') {
                    // 機首下げ (加速降下)
                    this.physics.elevator = -1;
                } else if (e.code === 'KeyS' || e.code === 'ArrowUp') {
                    // 機首上げ (上昇・減速)
                    this.physics.elevator = 1;
                } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
                    this.physics.aileron = -1;
                } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
                    this.physics.aileron = 1;
                } else if (e.code === 'KeyQ') {
                    this.physics.rudder = -1;
                } else if (e.code === 'KeyE') {
                    this.physics.rudder = 1;
                } else if (e.code === 'KeyC') {
                    this.switchCamera();
                } else if (e.code === 'KeyP' || e.code === 'KeyV') {
                    // パイロット視点へダイレクト切替
                    this.switchCamera('pilot');
                } else if (e.code === 'KeyT') {
                    this.switchWeather();
                } else if (e.code === 'KeyR') {
                    this.resetFlight();
                } else if (e.code === 'KeyF') {
                    this.toggleTheater();
                } else if (e.code === 'Escape' && this.isTheater) {
                    this.toggleTheater();
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.code === 'KeyW' || e.code === 'KeyS' || e.code === 'ArrowUp' || e.code === 'ArrowDown') {
                    this.physics.elevator = 0;
                }
                if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                    this.physics.aileron = 0;
                }
                if (e.code === 'KeyQ' || e.code === 'KeyE') {
                    this.physics.rudder = 0;
                }
            });

            // マウス視点ドラッグ (Chaseカメラ時)
            const canvasEl = this.canvas.parentElement || this.canvas;
            this.canvas.tabIndex = 0;
            this.canvas.setAttribute('aria-label', 'S-320 フライトシミュレーター');
            const updateKeyboardStatus = () => {
                const status = document.getElementById('flight-keyboard-status');
                if (status) status.textContent = document.activeElement === this.canvas ? 'キーボード操作中' : 'キーボード待機';
            };
            document.getElementById('flight-keyboard-focus')?.addEventListener('click', () => {
                this.canvas.focus({ preventScroll: true });
            });
            this.canvas.addEventListener('focus', updateKeyboardStatus);
            this.canvas.addEventListener('blur', updateKeyboardStatus);
            updateKeyboardStatus();
            const releaseControls = () => {
                this.physics.elevator = this.physics.aileron = this.physics.rudder = 0;
                this.mouseLook.isDragging = false;
            };
            window.addEventListener('blur', releaseControls);
            this.canvas.addEventListener('blur', releaseControls);
            canvasEl.addEventListener('mousedown', (e) => {
                if (e.button !== 0 || e.target.closest('button, input, select, a')) return;
                this.canvas.focus({ preventScroll: true });
                if (this.state === 'ready') this.startFlight();
                this.mouseLook.isDragging = true;
                this.mouseLook.startX = e.clientX;
                this.mouseLook.startY = e.clientY;
            });

            window.addEventListener('mousemove', (e) => {
                if (!this.mouseLook.isDragging) return;
                const dx = (e.clientX - this.mouseLook.startX) * 0.005;
                const dy = (e.clientY - this.mouseLook.startY) * 0.005;
                this.mouseLook.x += dx;
                this.mouseLook.y = Math.max(-0.4, Math.min(0.5, this.mouseLook.y + dy));
                this.mouseLook.startX = e.clientX;
                this.mouseLook.startY = e.clientY;
            });

            window.addEventListener('mouseup', () => {
                this.mouseLook.isDragging = false;
            });

            // マウスホイールによるスクロール完全遮断 & カメラズーム
            canvasEl.addEventListener('wheel', (e) => {
                if (document.activeElement !== this.canvas || (!e.ctrlKey && !e.metaKey)) return;
                e.preventDefault();
                if (this.cameraMode === 'chase') {
                    this.cameraDist = Math.max(8.0, Math.min(65.0, this.cameraDist + (e.deltaY > 0 ? 1.2 : -1.2)));
                } else if (this.camera) {
                    this.camera.fov = Math.max(35, Math.min(85, this.camera.fov + (e.deltaY > 0 ? 2.5 : -2.5)));
                    this.camera.updateProjectionMatrix();
                }
            }, { passive: false });

            // タッチ操作対応 (画面タップでもペダル連打加速)
            canvasEl.addEventListener('touchstart', (e) => {
                if (e.target.closest('button, input, select, a')) return;
                this.canvas.focus({ preventScroll: true });
                if (this.state === 'ready') this.startFlight();
                this.handlePedalTap();
            }, { passive: true });

            // モバイル・タブレット バーチャルコントローラーのバインド
            this.bindTouchControls();

            // サウンドボタン連動
            const soundBtn = document.getElementById('game-sound-toggle');
            if (soundBtn) {
                soundBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.soundEnabled = !this.soundEnabled;
                    soundBtn.innerHTML = this.soundEnabled 
                        ? '<i class="fa-solid fa-volume-high"></i> BGM/SE: ON' 
                        : '<i class="fa-solid fa-volume-xmark"></i> BGM/SE: OFF';
                });
            }

            // シアター / 全画面ボタン連動
            const theaterBtn = document.getElementById('game-theater-toggle');
            if (theaterBtn) {
                theaterBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleTheater();
                });
            }

            // フルスクリーン状態変更の監視
            document.addEventListener('fullscreenchange', () => {
                if (!document.fullscreenElement && this.isTheater) {
                    this.toggleTheater(false);
                }
            });

            // もう一度飛ぶ（リトライ）ボタンのイベントバインド
            const restartBtn = document.getElementById('btn-restart-game') || document.getElementById('game-restart-btn');
            if (restartBtn) {
                const onRestart = (e) => {
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    this.resetFlight();
                };
                restartBtn.addEventListener('click', onRestart);
            }
        }

        bindTouchControls() {
            // モバイル・タブレット バーチャルコントローラー
            const pedalBtn = document.getElementById('touch-pedal-btn');
            if (pedalBtn) {
                const onPedal = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (this.state === 'ready') this.startFlight();
                    this.handlePedalTap();
                    if (navigator.vibrate) {
                        try { navigator.vibrate(12); } catch (err) {}
                    }
                };
                pedalBtn.addEventListener('touchstart', onPedal, { passive: false });
                pedalBtn.addEventListener('mousedown', onPedal);
            }

            // 操縦桿: 上 (機首上げ / ピッチアップ)
            const upBtn = document.getElementById('touch-ctrl-up');
            if (upBtn) {
                const pressUp = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.elevator = 1; };
                const releaseUp = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.elevator = 0; };
                upBtn.addEventListener('touchstart', pressUp, { passive: false });
                upBtn.addEventListener('touchend', releaseUp, { passive: false });
                upBtn.addEventListener('touchcancel', releaseUp, { passive: false });
                upBtn.addEventListener('mousedown', pressUp);
                upBtn.addEventListener('mouseup', releaseUp);
                upBtn.addEventListener('mouseleave', releaseUp);
            }

            // 操縦桿: 下 (機首下げ / ピッチダウン)
            const downBtn = document.getElementById('touch-ctrl-down');
            if (downBtn) {
                const pressDown = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.elevator = -1; };
                const releaseDown = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.elevator = 0; };
                downBtn.addEventListener('touchstart', pressDown, { passive: false });
                downBtn.addEventListener('touchend', releaseDown, { passive: false });
                downBtn.addEventListener('touchcancel', releaseDown, { passive: false });
                downBtn.addEventListener('mousedown', pressDown);
                downBtn.addEventListener('mouseup', releaseDown);
                downBtn.addEventListener('mouseleave', releaseDown);
            }

            // 操縦桿: 左 (左旋回)
            const leftBtn = document.getElementById('touch-ctrl-left');
            if (leftBtn) {
                const pressLeft = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.aileron = -1; };
                const releaseLeft = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.aileron = 0; };
                leftBtn.addEventListener('touchstart', pressLeft, { passive: false });
                leftBtn.addEventListener('touchend', releaseLeft, { passive: false });
                leftBtn.addEventListener('touchcancel', releaseLeft, { passive: false });
                leftBtn.addEventListener('mousedown', pressLeft);
                leftBtn.addEventListener('mouseup', releaseLeft);
                leftBtn.addEventListener('mouseleave', releaseLeft);
            }

            // 操縦桿: 右 (右旋回)
            const rightBtn = document.getElementById('touch-ctrl-right');
            if (rightBtn) {
                const pressRight = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.aileron = 1; };
                const releaseRight = (e) => { e.preventDefault(); e.stopPropagation(); this.physics.aileron = 0; };
                rightBtn.addEventListener('touchstart', pressRight, { passive: false });
                rightBtn.addEventListener('touchend', releaseRight, { passive: false });
                rightBtn.addEventListener('touchcancel', releaseRight, { passive: false });
                rightBtn.addEventListener('mousedown', pressRight);
                rightBtn.addEventListener('mouseup', releaseRight);
                rightBtn.addEventListener('mouseleave', releaseRight);
            }

            // モバイルクイックバー
            const camBtn = document.getElementById('touch-btn-cam');
            if (camBtn) {
                camBtn.addEventListener('click', (e) => { e.stopPropagation(); this.switchCamera(); });
            }
            const resetBtn = document.getElementById('touch-btn-reset');
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => { e.stopPropagation(); this.resetFlight(); });
            }
            const theaterTouchBtn = document.getElementById('touch-btn-theater');
            if (theaterTouchBtn) {
                theaterTouchBtn.addEventListener('click', (e) => { e.stopPropagation(); this.toggleTheater(); });
            }
        }

        updateTouchControlsVisibility() {
            const touchControls = document.getElementById('game-touch-controls');
            if (!touchControls) return;
            touchControls.classList.remove('hidden');
        }

        toggleTheater(forceState) {
            const container = this.canvas.parentElement;
            if (!container) return;

            this.isTheater = (forceState !== undefined) ? forceState : !this.isTheater;
            const theaterBtn = document.getElementById('game-theater-toggle');

            if (this.isTheater) {
                container.classList.add('fixed', 'inset-0', 'z-[9999]', 'w-screen', 'h-screen', 'bg-black');
                container.classList.remove('relative');
                document.body.style.overflow = 'hidden';
                if (theaterBtn) {
                    theaterBtn.innerHTML = '<i class="fa-solid fa-compress"></i> <span>通常表示 [F/ESC]</span>';
                    theaterBtn.classList.add('bg-rose-600', 'text-white');
                }
                this.setRadioMessage('「全画面シアターモード起動！大空の没入フライトだトビ！(ESCで解除)」', 'smile');

                // フルスクリーンAPIを試行（ユーザーインタラクション時）
                if (container.requestFullscreen && !document.fullscreenElement) {
                    container.requestFullscreen().catch(() => {});
                }
            } else {
                container.classList.remove('fixed', 'inset-0', 'z-[9999]', 'w-screen', 'h-screen', 'bg-black');
                container.classList.add('relative');
                document.body.style.overflow = '';
                if (theaterBtn) {
                    theaterBtn.innerHTML = '<i class="fa-solid fa-expand"></i> <span>全画面シアター [F]</span>';
                    theaterBtn.classList.remove('bg-rose-600', 'text-white');
                }
                this.setRadioMessage('「通常表示に戻ったトビ！」', 'normal');

                if (document.fullscreenElement && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            }

            setTimeout(() => this.handleResize(), 60);
        }

        startFlight() {
            if (!this.modelReady) return;
            if (this.state === 'ready') {
                if (['platform', 'venue', 'stands'].includes(this.cameraMode)) this.switchCamera('chase');
                this.state = 'takeoff';
                this.physics.pedaling = true;
                this.physics.cadenceRPM = Math.max(50, this.physics.cadenceRPM + 8);
                this.setRadioMessage('「助走開始！Spaceキー連打で踏切ラインまで全力加速だトビ！」', 'smile');
            } else if (this.state === 'splashdown') {
                this.resetFlight();
            }
        }

        resetFlight() {
            this.state = 'ready';
            this.courseTracker.reset(document.getElementById('flight-route-order')?.value || 'south');
            this.courseMap.reset();
            this.foulReason = null;
            const initZ = -10.0;
            this.physics.pos = { x: 0, y: this.getRunwayGroundY(initZ), z: initZ };
            this.physics.vel = { x: 0, y: 0, z: 0 };
            this.physics.pitch = -this.slopeAngle; // 3.5度スロープの前傾
            this.physics.roll = 0;
            this.physics.yaw = 0;
            this.physics.pitchRate = 0;
            this.physics.rollRate = 0;
            this.physics.yawRate = 0;
            this.physics.elevator = 0;
            this.physics.aileron = 0;
            this.physics.rudder = 0;
            this.physics.pedaling = false;
            this.physics.airSpeed = 0;
            this.physics.groundSpeed = 0;
            this.physics.cadenceRPM = 0;
            this.physics.powerWatts = 0;
            this.physics.pilotStamina = 100;
            this.physics.isStalling = false;
            this.physics.isGroundEffect = false;
            this.physics.thermalBoost = 0;
            this.physics.gForce = 1.0;
            Object.assign(this.records, {
                distance: 0, flightTime: 0, maxAirSpeed: 0,
                maxAltitude: this.physics.pos.y, groundEffectDistance: 0,
                totalWattsBurned: 0, maxG: 1, totalStrokes: 0
            });

            // 水面タッチ＆スキミング状態のリセット
            this.waterTouchTimer = 0;
            this.lastWaterSplashTime = 0;
            this.physics.isWaterTouching = false;

            // 機体構造破壊状態の復旧リセット
            this.isBroken = false;
            this.breakReason = null;
            this.cameraShake = 0;
            this.propellerSeparated = false;
            if (this.leftWingPivot) {
                this.leftWingPivot.rotation.set(0, 0, 0);
            }
            if (this.rightWingPivot) {
                this.rightWingPivot.rotation.set(0, 0, 0);
            }
            if (this.propellerGroup) {
                this.propellerGroup.position.copy(this.propellerRestPosition);
                this.propellerGroup.rotation.set(0, 0, 0);
            }
            if (this.debrisGroup) {
                while (this.debrisGroup.children.length > 0) {
                    this.debrisGroup.remove(this.debrisGroup.children[0]);
                }
            }
            this.debrisList = [];

            // スピード線・衝撃波・フキダシのリセット
            if (this.speedStreakLines) {
                this.speedStreakLines.forEach(s => { s.mesh.visible = false; });
            }
            if (this.thermalShockwave) {
                this.thermalShockwave.visible = false;
            }
            this.tobitoBubbleText = null;
            this.tobitoBubbleTimer = 0;

            // サーマルリングの全再有効化
            if (this.thermals) {
                this.thermals.forEach(t => {
                    t.active = true;
                    if (t.mesh) t.mesh.visible = true;
                });
            }

            // 連打ストローク履歴リセット
            this.pedalTapHistory = [];
            this.pedalStrokeCount = 0;
            this.pedalCPS = 0;
            this.lastPedalTapTime = 0;

            if (this.wingRunners && this.wingRunners.length === 2) {
                this.wingRunners[0].position.set(-5.2, this.getRunwayHeight(-10.0), -10.0);
                this.wingRunners[1].position.set(5.2, this.getRunwayHeight(-10.0), -10.0);
            }

            this.setRadioMessage('「彦根松原3.5°発進台！Spaceキー連打で助走開始だトビ！目指せ対岸！」', 'normal');

            // リザルトモーダルの完全非表示化
            const resultBox = document.getElementById('game-result-box');
            if (resultBox) {
                resultBox.classList.add('hidden');
                resultBox.style.display = 'none';
            }
            window.FlightRankingManager?.resetResult();
            this.canvas.focus?.({ preventScroll: true });

            // タッチコントロールのポインタイベント復元
            const touchControls = document.getElementById('game-touch-controls');
            if (touchControls) {
                touchControls.style.pointerEvents = '';
                this.updateTouchControlsVisibility();
            }
        }

        switchCamera(targetMode) {
            const modes = ['platform', 'venue', 'stands', 'chase', 'pilot', 'wing'];
            if (targetMode && (modes.includes(targetMode) || targetMode === 'cockpit')) {
                this.cameraMode = targetMode === 'cockpit' ? 'pilot' : targetMode;
            } else {
                const cur = this.cameraMode === 'cockpit' ? 'pilot' : this.cameraMode;
                const idx = modes.indexOf(cur);
                this.cameraMode = modes[(idx + 1) % modes.length];
            }
            const modeNames = {
                platform: '発進台',
                venue: '会場全景',
                stands: '応援席',
                chase: '後方追従 (チェイス)',
                pilot: '👨‍✈️ パイロット視点 (操縦席FPV)',
                wing: '主翼カメラ (翼端視点)',
                tobito: 'とびとくん同乗カメラ'
            };
            this.setRadioMessage(`「カメラ切り替え: ${modeNames[this.cameraMode] || this.cameraMode.toUpperCase()}だトビ！」`, 'smile');
            this.updateCameraUIButtons();
            const select = document.getElementById('flight-camera');
            if (select) select.value = this.cameraMode;
            if (this.renderer) { this.renderThree(0); this.renderHUD(); }
        }

        updateCameraUIButtons() {
            const cur = this.cameraMode === 'cockpit' ? 'pilot' : this.cameraMode;
            ['chase', 'pilot', 'wing', 'tobito'].forEach(m => {
                const btn = document.getElementById(`cam-btn-${m}`);
                if (btn) {
                    if (m === cur) {
                        btn.classList.add('bg-sky-600', 'text-white', 'ring-2', 'ring-sky-400', 'shadow-md');
                        btn.classList.remove('bg-slate-800', 'text-slate-300');
                    } else {
                        btn.classList.remove('bg-sky-600', 'text-white', 'ring-2', 'ring-sky-400', 'shadow-md');
                        btn.classList.add('bg-slate-800', 'text-slate-300');
                    }
                }
            });
        }

        switchWeather() {
            const weathers = ['morning', 'day', 'sunset'];
            const idx = weathers.indexOf(this.weather);
            this.applyWeather(weathers[(idx + 1) % weathers.length]);
        }

        startGame() {
            this.startFlight();
        }
    }

    // グローバル初期化 ＆ エイリアス互換性
    window.TobitoFlightSimulator3D = TobitoFlightSimulator3D;
    window.TobitoFlightGame = TobitoFlightSimulator3D;

    // グローバルリセット関数（モーダルや外部ボタンから確実に呼び出せるように公開）
    window.resetFlightGame = function() {
        if (window.tobitoGame && typeof window.tobitoGame.resetFlight === 'function') {
            window.tobitoGame.resetFlight();
        } else {
            const resultBox = document.getElementById('game-result-box');
            if (resultBox) {
                resultBox.classList.add('hidden');
                resultBox.style.display = 'none';
            }
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.tobitoGame && document.getElementById('tobito-game-canvas')) {
            window.tobitoGame = new TobitoFlightSimulator3D('tobito-game-canvas');
        }
    });

})(window);
