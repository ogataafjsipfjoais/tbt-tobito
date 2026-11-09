/**
 * ==============================================================================
 * とびとくんの危機一髪！やきとり脱出サバイバル (Yakitori Escape Survival)
 * 芝浦工業大学 Team Birdman Trial (TBT) 公式マスコット とびとくん アクションゲーム
 * ==============================================================================
 */

class YakitoriGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        // 仮想解像度
        this.width = 800;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 音声エンジン (Web Audio API)
        this.audioCtx = null;
        this.soundEnabled = true;

        // 画像リソース
        this.images = {};
        this.imagesLoaded = false;
        this.loadAssets();

        // ゲーム状態: 'ready', 'playing', 'gameover'
        this.state = 'ready';

        // プレイヤー設定
        this.groundY = 360;
        this.player = {
            x: 120,
            y: this.groundY - 55,
            w: 52,
            h: 55,
            normalH: 55,
            duckH: 30,
            vy: 0,
            gravity: 0.72,
            jumpForce: -13.5,
            flapForce: -11.0,
            jumpsLeft: 2,
            isGrounded: true,
            isDucking: false,
            invincibleTimer: 0, // 無敵フレーム
            faceType: 'normal', // 'normal', 'smile', 'cry', 'angry'
            animTick: 0
        };

        // スコア＆進行
        this.distance = 0;
        this.score = 0;
        this.speed = 6.0;
        this.highScore = parseInt(localStorage.getItem('tbt_yakitori_highscore') || '0', 10);
        this.newRecord = false;

        // ゲーム内オブジェクト
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        this.bgOffset = 0;

        // スポーンタイマー
        this.nextObstacleDistance = 50;
        this.nextItemDistance = 120;

        // 入力管理
        this.keys = {
            up: false,
            down: false
        };

        this.initControls();
        this.startLoop();
    }

    loadAssets() {
        const assetList = {
            tobito_normal: 'assets/images/tobito_face_normal.png',
            tobito_smile: 'assets/images/tobito_face_smile.png',
            tobito_cry: 'assets/images/tobito_face_cry.png',
            tobito_angry: 'assets/images/tobito_face_angry.png',
            tobito_airplane: 'assets/images/tobito_pose_airplane.png'
        };

        let loadedCount = 0;
        const total = Object.keys(assetList).length;

        for (const [key, src] of Object.entries(assetList)) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                loadedCount++;
                if (loadedCount >= total) {
                    this.imagesLoaded = true;
                }
            };
            img.onerror = () => {
                loadedCount++;
                if (loadedCount >= total) {
                    this.imagesLoaded = true;
                }
            };
            this.images[key] = img;
        }
    }

    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioCtx) return;
        try {
            const ctx = this.audioCtx;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'jump') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(320, now);
                osc.frequency.exponentialRampToValueAtTime(750, now + 0.15);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            } else if (type === 'flap') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(450, now);
                osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'item') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587, now);
                osc.frequency.setValueAtTime(880, now + 0.08);
                osc.frequency.setValueAtTime(1174, now + 0.16);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.28);
                osc.start(now);
                osc.stop(now + 0.28);
            } else if (type === 'powerup') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(440, now);
                osc.frequency.setValueAtTime(660, now + 0.1);
                osc.frequency.setValueAtTime(880, now + 0.2);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'burn') {
                // ジュ〜〜ッというホワイトノイズ風
                const bufferSize = ctx.sampleRate * 0.3;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1800;
                noise.connect(filter);
                filter.connect(gain);
                gain.gain.setValueAtTime(0.3, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
                noise.start(now);
                noise.stop(now + 0.3);
            } else if (type === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.linearRampToValueAtTime(60, now + 0.25);
                gain.gain.setValueAtTime(0.35, now);
                gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
                osc.start(now);
                osc.stop(now + 0.25);
            }
        } catch (e) {
            // Audio error ignore
        }
    }

    initControls() {
        this.canvas.tabIndex = 0;
        this.canvas.setAttribute('aria-label', 'とびとくんのやきとり脱出ゲーム');
        window.addEventListener('keydown', (e) => {
            if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
            if (document.activeElement !== this.canvas) return;
            if (document.getElementById('game-view-yakitori')?.classList.contains('hidden')) return;
            if (e.code === 'Space' || e.code === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                e.preventDefault();
                this.initAudio();
                this.handleJump();
            } else if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                e.preventDefault();
                this.setDuck(true);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.setDuck(false);
            }
        });

        // Canvas クリック / タップ
        this.canvas.addEventListener('pointerdown', (e) => {
            this.canvas.focus({ preventScroll: true });
            this.canvas.setPointerCapture(e.pointerId);
            this.initAudio();
            const rect = this.canvas.getBoundingClientRect();
            const scaleY = this.height / rect.height;
            const clickY = (e.clientY - rect.top) * scaleY;

            if (this.state === 'ready') {
                this.startGame();
            } else if (this.state === 'gameover') {
                this.resetGame();
            } else {
                // 下部タップでしゃがみ、上部タップでジャンプ
                if (clickY > this.height * 0.65) {
                    this.setDuck(true);
                } else {
                    this.handleJump();
                }
            }
        });

        this.canvas.addEventListener('pointerup', () => {
            this.setDuck(false);
        });
        this.canvas.addEventListener('pointercancel', () => this.setDuck(false));
        this.canvas.addEventListener('blur', () => this.setDuck(false));
        window.addEventListener('blur', () => this.setDuck(false));

        // モバイル向け画面外ボタン対応
        const jumpBtn = document.getElementById('yakitori-btn-jump');
        if (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.initAudio();
                if (this.state === 'ready') this.startGame();
                else if (this.state === 'gameover') this.resetGame();
                else this.handleJump();
            });
        }

        const duckBtn = document.getElementById('yakitori-btn-duck');
        if (duckBtn) {
            duckBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.initAudio();
                this.setDuck(true);
            });
            duckBtn.addEventListener('pointerup', (e) => {
                e.preventDefault();
                this.setDuck(false);
            });
            duckBtn.addEventListener('pointerleave', () => {
                this.setDuck(false);
            });
            duckBtn.addEventListener('pointercancel', () => this.setDuck(false));
        }
    }

    handleJump() {
        if (this.state === 'ready') {
            this.startGame();
            return;
        }
        if (this.state === 'gameover') {
            this.resetGame();
            return;
        }

        if (this.player.isDucking) {
            this.setDuck(false);
        }

        if (this.player.isGrounded) {
            // 第1ジャンプ
            this.player.vy = this.player.jumpForce;
            this.player.isGrounded = false;
            this.player.jumpsLeft = 1;
            this.playSound('jump');
            this.spawnDust(this.player.x + 20, this.player.y + this.player.h, 6);
        } else if (this.player.jumpsLeft > 0) {
            // 空中2段ジャンプ（羽ばたき！）
            this.player.vy = this.player.flapForce;
            this.player.jumpsLeft--;
            this.playSound('flap');
            this.spawnFeathers(this.player.x + 10, this.player.y + this.player.h / 2, 8);
        }
    }

    setDuck(ducking) {
        if (this.state !== 'playing') return;
        this.player.isDucking = ducking;
        if (ducking) {
            this.player.h = this.player.duckH;
            if (this.player.isGrounded) {
                this.player.y = this.groundY - this.player.duckH;
            }
        } else {
            this.player.h = this.player.normalH;
            if (this.player.isGrounded) {
                this.player.y = this.groundY - this.player.normalH;
            }
        }
    }

    startGame() {
        document.getElementById('yakitori-result-overlay')?.classList.add('hidden');
        this.state = 'playing';
        this.distance = 0;
        this.score = 0;
        this.speed = 6.0;
        this.newRecord = false;
        this.obstacles = [];
        this.items = [];
        this.particles = [];
        this.nextObstacleDistance = 50;
        this.nextItemDistance = 120;
        this.player.y = this.groundY - this.player.normalH;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.jumpsLeft = 2;
        this.player.invincibleTimer = 0;
        this.player.faceType = 'normal';
        this.player.isDucking = false;
        this.player.h = this.player.normalH;
        this.keys.up = this.keys.down = false;
    }

    resetGame() {
        this.startGame();
    }

    gameOver() {
        this.state = 'gameover';
        this.player.faceType = 'cry';
        this.playSound('burn');
        setTimeout(() => this.playSound('hit'), 150);

        // 焦げ・爆発パーティクル
        this.spawnSmoke(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 25);

        if (this.distance > this.highScore) {
            this.highScore = Math.floor(this.distance);
            this.newRecord = true;
            localStorage.setItem('tbt_yakitori_highscore', this.highScore.toString());
        }

        // リザルトDOMの更新
        this.updateResultOverlay();
    }

    updateResultOverlay() {
        const overlay = document.getElementById('yakitori-result-overlay');
        const distEl = document.getElementById('yakitori-res-distance');
        const scoreEl = document.getElementById('yakitori-res-score');
        const titleEl = document.getElementById('yakitori-res-title');
        const shareBtn = document.getElementById('yakitori-share-x');

        if (distEl) distEl.textContent = Math.floor(this.distance);
        if (scoreEl) scoreEl.textContent = Math.floor(this.score) + ' pt';

        const title = this.getTitle(this.distance);
        if (titleEl) titleEl.textContent = title;

        if (shareBtn) {
            const text = `【とびとくんの危機一髪！やきとり脱出サバイバル】\nニワトリのとびとくんは炭火の危機から【${Math.floor(this.distance)}m】逃走成功！（称号: ${title}）\n大空へ飛び立つ鳥人間魂で焼き鳥化を阻止！\n#TBT #とびとくん #やきとりゲーム #鳥人間コンテスト`;
            shareBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href.split('#')[0] + '#yakitori')}`;
        }

        if (overlay) {
            overlay.classList.remove('hidden');
        }
    }

    getTitle(dist) {
        if (dist < 200) return '若鶏級（ちょっと香ばしく焼けちゃったトビ…）';
        if (dist < 600) return '砂肝級（なかなかの身のこなしトビ！）';
        if (dist < 1200) return 'ねぎまマスター（炭火を軽々スルーする達人トビ！）';
        if (dist < 2500) return '脱出の英雄（鳥人間スピリット全開だトビ！）';
        return '大空の不死鳥フェニックス（伝説の脱出王だトビ！！）';
    }

    spawnObstacle() {
        // タイプ決定
        const r = Math.random();
        let obs = null;

        if (r < 0.35) {
            // 七輪コンロ（地面・大ジャンプが必要）
            obs = {
                type: 'shichirin',
                x: this.width + 40,
                y: this.groundY - 50,
                w: 48,
                h: 50,
                hitbox: { ox: 6, oy: 6, w: 36, h: 44 }
            };
        } else if (r < 0.65) {
            // 地面の焼き鳥串（低め・小ジャンプでOK）
            obs = {
                type: 'skewer_low',
                x: this.width + 40,
                y: this.groundY - 32,
                w: 52,
                h: 32,
                hitbox: { ox: 4, oy: 4, w: 44, h: 28 }
            };
        } else if (r < 0.85) {
            // 空中の焼き網・焼き鳥串（しゃがみで回避！）
            obs = {
                type: 'skewer_high',
                x: this.width + 40,
                y: this.groundY - 82,
                w: 64,
                h: 36,
                hitbox: { ox: 4, oy: 4, w: 56, h: 32 }
            };
        } else {
            // 秘伝のタレ壺（地面・スライドやジャンプで回避）
            obs = {
                type: 'sauce_pot',
                x: this.width + 40,
                y: this.groundY - 45,
                w: 40,
                h: 45,
                hitbox: { ox: 4, oy: 4, w: 32, h: 40 }
            };
        }

        this.obstacles.push(obs);
    }

    spawnItem() {
        const isJelly = Math.random() < 0.25;
        const inAir = Math.random() < 0.5;
        this.items.push({
            type: isJelly ? 'jelly' : 'banana',
            x: this.width + 30,
            y: inAir ? this.groundY - 95 : this.groundY - 42,
            w: 32,
            h: 32,
            rot: 0
        });
    }

    spawnDust(x, y, count = 4) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'dust',
                x: x + (Math.random() - 0.5) * 10,
                y: y - Math.random() * 5,
                vx: -this.speed * 0.4 - Math.random() * 2,
                vy: -Math.random() * 2,
                size: 3 + Math.random() * 4,
                life: 1.0,
                decay: 0.05
            });
        }
    }

    spawnFeathers(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'feather',
                x: x,
                y: y,
                vx: -this.speed * 0.3 + (Math.random() - 0.5) * 3,
                vy: -1 - Math.random() * 3,
                size: 4 + Math.random() * 4,
                rot: Math.random() * Math.PI * 2,
                vrot: (Math.random() - 0.5) * 0.2,
                life: 1.0,
                decay: 0.03
            });
        }
    }

    spawnSmoke(x, y, count = 15) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'smoke',
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 4,
                vy: -1 - Math.random() * 4,
                size: 8 + Math.random() * 12,
                life: 1.0,
                decay: 0.02
            });
        }
    }

    spawnSparks(x, y, count = 5) {
        for (let i = 0; i < count; i++) {
            this.particles.push({
                type: 'spark',
                x: x,
                y: y,
                vx: -this.speed + (Math.random() - 0.5) * 5,
                vy: -2 - Math.random() * 3,
                size: 2 + Math.random() * 3,
                life: 1.0,
                decay: 0.04
            });
        }
    }

    update() {
        if (this.state !== 'playing') {
            // 背景やパーティクルの微動
            this.bgOffset = (this.bgOffset + 1) % this.width;
            return;
        }

        // 速度と走行距離の加算
        this.distance += this.speed * 0.06;
        this.score += this.speed * 0.1;
        this.speed = 6.0 + Math.min(6.5, this.distance * 0.0035); // 徐々に加速
        this.bgOffset = (this.bgOffset + this.speed) % this.width;

        // プレイヤー物理
        this.player.y += this.player.vy;
        this.player.vy += this.player.gravity;

        const currentGroundY = this.player.isDucking ? (this.groundY - this.player.duckH) : (this.groundY - this.player.normalH);

        if (this.player.y >= currentGroundY) {
            this.player.y = currentGroundY;
            this.player.vy = 0;
            if (!this.player.isGrounded) {
                this.player.isGrounded = true;
                this.player.jumpsLeft = 2;
                this.spawnDust(this.player.x + 20, this.groundY, 3);
            }
        } else {
            this.player.isGrounded = false;
        }

        // 無敵時間カウント
        if (this.player.invincibleTimer > 0) {
            this.player.invincibleTimer--;
            this.player.faceType = 'angry';
            if (Math.random() < 0.4) {
                this.spawnFeathers(this.player.x, this.player.y + 20, 1);
            }
        } else {
            this.player.faceType = 'normal';
        }

        // 走る足のアニメーション用Tick
        this.player.animTick++;

        // 障害物スポーン管理
        if (this.distance >= this.nextObstacleDistance) {
            this.spawnObstacle();
            // 次のスポーン間隔（難易度に応じて短縮）
            const minGap = Math.max(35, 75 - this.distance * 0.015);
            const maxGap = Math.max(60, 110 - this.distance * 0.015);
            this.nextObstacleDistance = this.distance + minGap + Math.random() * (maxGap - minGap);
        }

        // アイテムスポーン管理
        if (this.distance >= this.nextItemDistance) {
            this.spawnItem();
            this.nextItemDistance = this.distance + 80 + Math.random() * 80;
        }

        // 障害物の移動 & 当たり判定
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= this.speed;

            // 火の粉パーティクル
            if (obs.type === 'shichirin' && Math.random() < 0.3) {
                this.spawnSparks(obs.x + obs.w / 2, obs.y + 6, 2);
            }

            // 当たり判定
            const px = this.player.x + 8;
            const py = this.player.y + 4;
            const pw = this.player.w - 16;
            const ph = this.player.h - 8;

            const ox = obs.x + obs.hitbox.ox;
            const oy = obs.y + obs.hitbox.oy;
            const ow = obs.hitbox.w;
            const oh = obs.hitbox.h;

            if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) {
                if (this.player.invincibleTimer > 0) {
                    // 無敵状態なら障害物を吹き飛ばす！
                    this.spawnSmoke(obs.x + obs.w / 2, obs.y + obs.h / 2, 10);
                    this.playSound('hit');
                    this.obstacles.splice(i, 1);
                    this.score += 50;
                    continue;
                } else {
                    // ゲームオーバー！
                    this.gameOver();
                    return;
                }
            }

            // 画面外削除
            if (obs.x + obs.w < -50) {
                this.obstacles.splice(i, 1);
            }
        }

        // アイテムの移動 & 取得判定
        for (let i = this.items.length - 1; i >= 0; i--) {
            const it = this.items[i];
            it.x -= this.speed;
            it.rot += 0.05;

            const px = this.player.x;
            const py = this.player.y;
            const pw = this.player.w;
            const ph = this.player.h;

            if (px < it.x + it.w && px + pw > it.x && py < it.y + it.h && py + ph > it.y) {
                if (it.type === 'banana') {
                    this.score += 100;
                    this.playSound('item');
                    this.player.faceType = 'smile';
                    this.spawnFeathers(it.x, it.y, 5);
                } else if (it.type === 'jelly') {
                    this.score += 250;
                    this.player.invincibleTimer = 180; // 3秒間無敵 (60fps換算)
                    this.playSound('powerup');
                    this.spawnSmoke(it.x, it.y, 12);
                }
                this.items.splice(i, 1);
                continue;
            }

            if (it.x + it.w < -50) {
                this.items.splice(i, 1);
            }
        }

        // パーティクル更新
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. 背景描画 (夕暮れの炭火キッチン & 琵琶湖スカイライン)
        this.drawBackground(ctx);

        // 2. 地面・炭火コンベア描画
        this.drawGround(ctx);

        // 3. 障害物描画
        for (const obs of this.obstacles) {
            this.drawObstacle(ctx, obs);
        }

        // 4. アイテム描画
        for (const it of this.items) {
            this.drawItem(ctx, it);
        }

        // 5. パーティクル描画
        this.drawParticles(ctx);

        // 6. プレイヤー（とびとくん）描画
        this.drawPlayer(ctx);

        // 7. HUD（距離、スコア、最高記録、無敵ゲージ）
        this.drawHUD(ctx);

        // 8. 待機画面
        if (this.state === 'ready') {
            this.drawReadyScreen(ctx);
        }
    }

    drawBackground(ctx) {
        // グラデーション空（夕暮れの暖色：焼き鳥屋の提灯と夕焼け琵琶湖）
        const grad = ctx.createLinearGradient(0, 0, 0, this.groundY);
        grad.addColorStop(0, '#1e1b4b'); // 夜の空
        grad.addColorStop(0.4, '#431407'); // 炭火の茜色
        grad.addColorStop(0.8, '#7c2d12'); // 赤熱のオレンジ
        grad.addColorStop(1, '#18181b'); // 暗い厨房カウンター
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 遠景シルエット：赤提灯と琵琶湖の山並み
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        for (let i = 0; i < 3; i++) {
            const ox = (i * 350 - (this.bgOffset * 0.2) % 350);
            ctx.beginPath();
            ctx.moveTo(ox, this.groundY);
            ctx.lineTo(ox + 100, this.groundY - 70);
            ctx.lineTo(ox + 200, this.groundY - 110);
            ctx.lineTo(ox + 350, this.groundY);
            ctx.fill();
        }

        // 赤提灯の装飾（上部）
        for (let i = 0; i < 6; i++) {
            const lx = i * 150 + 40 - (this.bgOffset * 0.1) % 150;
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.ellipse(lx, 35, 14, 20, 0, 0, Math.PI * 2);
            ctx.fill();
            // 提灯の光
            ctx.fillStyle = 'rgba(254, 240, 138, 0.8)';
            ctx.beginPath();
            ctx.ellipse(lx, 35, 7, 10, 0, 0, Math.PI * 2);
            ctx.fill();
            // 房
            ctx.strokeStyle = '#b91c1c';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(lx, 55);
            ctx.lineTo(lx, 65);
            ctx.stroke();
        }
    }

    drawGround(ctx) {
        // 地面カウンター
        ctx.fillStyle = '#27272a';
        ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);

        // 炭火の焼き網・赤熱グリルライン
        const step = 24;
        const offset = this.bgOffset % step;

        ctx.strokeStyle = '#71717a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, this.groundY);
        ctx.lineTo(this.width, this.groundY);
        ctx.stroke();

        // 網の格子模様
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.lineWidth = 2;
        for (let x = -offset; x < this.width + step; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, this.groundY);
            ctx.lineTo(x + 12, this.groundY + 16);
            ctx.stroke();
        }

        // 下部の炭火赤熱グラデーション
        const fireGrad = ctx.createLinearGradient(0, this.groundY, 0, this.height);
        fireGrad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
        fireGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.2)');
        fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
        ctx.fillStyle = fireGrad;
        ctx.fillRect(0, this.groundY + 2, this.width, this.height - this.groundY);
    }

    drawObstacle(ctx, obs) {
        ctx.save();

        if (obs.type === 'shichirin') {
            // 七輪コンロ
            const x = obs.x;
            const y = obs.y;
            // 陶器本体
            ctx.fillStyle = '#f4f4f5';
            ctx.beginPath();
            ctx.roundRect(x, y + 10, obs.w, obs.h - 10, 8);
            ctx.fill();
            ctx.strokeStyle = '#d4d4d8';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 七輪の帯
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(x, y + 24, obs.w, 6);

            // 上部の赤熱炭火
            ctx.fillStyle = '#ea580c';
            ctx.beginPath();
            ctx.ellipse(x + obs.w / 2, y + 10, obs.w / 2 - 2, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // 炎の揺らめき
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(x + obs.w / 2, y + 8, 5, 0, Math.PI * 2);
            ctx.fill();

        } else if (obs.type === 'skewer_low') {
            // 地面の焼き鳥串（ネギま）
            const x = obs.x;
            const y = obs.y;

            // 竹串
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x, y + obs.h / 2);
            ctx.lineTo(x + obs.w, y + obs.h / 2);
            ctx.stroke();

            // 鶏肉ブロック1
            ctx.fillStyle = '#b45309';
            ctx.beginPath();
            ctx.roundRect(x + 6, y + 4, 12, obs.h - 8, 4);
            ctx.fill();

            // ネギ
            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.roundRect(x + 20, y + 2, 10, obs.h - 4, 3);
            ctx.fill();

            // 鶏肉ブロック2
            ctx.fillStyle = '#92400e';
            ctx.beginPath();
            ctx.roundRect(x + 32, y + 4, 14, obs.h - 8, 4);
            ctx.fill();

        } else if (obs.type === 'skewer_high') {
            // 空中の焼き網・焼き鳥串
            const x = obs.x;
            const y = obs.y;

            // 焼き網フレーム
            ctx.fillStyle = 'rgba(75, 85, 99, 0.85)';
            ctx.beginPath();
            ctx.roundRect(x, y, obs.w, obs.h, 6);
            ctx.fill();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 串焼きアイコン
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🍢 網串', x + obs.w / 2, y + 24);

        } else if (obs.type === 'sauce_pot') {
            // 秘伝のタレ壺
            const x = obs.x;
            const y = obs.y;

            // 壺本体
            ctx.fillStyle = '#451a03';
            ctx.beginPath();
            ctx.roundRect(x, y + 8, obs.w, obs.h - 8, 10);
            ctx.fill();

            // 壺の首
            ctx.fillStyle = '#78350f';
            ctx.fillRect(x + 6, y, obs.w - 12, 10);

            // 文字
            ctx.fillStyle = '#fef08a';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('タレ', x + obs.w / 2, y + 28);
        }

        ctx.restore();
    }

    drawItem(ctx, it) {
        ctx.save();
        ctx.translate(it.x + it.w / 2, it.y + it.h / 2);
        ctx.rotate(Math.sin(it.rot) * 0.2);

        if (it.type === 'banana') {
            // バナナ
            ctx.font = '26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🍌', 0, 0);
        } else if (it.type === 'jelly') {
            // エネルギーゼリー
            ctx.font = '26px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('⚡', 0, 0);
        }

        ctx.restore();
    }

    drawParticles(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life);

            if (p.type === 'dust') {
                ctx.fillStyle = '#a1a1aa';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'feather') {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size, p.size * 0.4, p.rot, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'smoke') {
                ctx.fillStyle = '#52525b';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'spark') {
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    drawPlayer(ctx) {
        ctx.save();
        const p = this.player;

        // 無敵時のオーラ発光エフェクト
        if (p.invincibleTimer > 0) {
            ctx.save();
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // キャラクター画像選択
        let imgKey = 'tobito_normal';
        if (p.faceType === 'cry') imgKey = 'tobito_cry';
        else if (p.faceType === 'smile') imgKey = 'tobito_smile';
        else if (p.faceType === 'angry') imgKey = 'tobito_angry';

        const img = this.images[imgKey];

        if (p.isDucking) {
            // しゃがみ/スライディング状態：ペタンと平たくなって前傾姿勢
            ctx.translate(p.x + p.w / 2, p.y + p.h);
            ctx.scale(1.2, 0.55);
            if (img && img.complete) {
                ctx.drawImage(img, -p.w / 2, -p.normalH, p.w, p.normalH);
            } else {
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(-p.w / 2, -p.normalH, p.w, p.normalH);
            }
        } else {
            // 通常・ジャンプ状態
            // 走行中は上下にボビング
            const bob = p.isGrounded ? Math.sin(p.animTick * 0.3) * 3 : 0;
            const drawY = p.y + bob;

            if (img && img.complete) {
                ctx.drawImage(img, p.x, drawY, p.w, p.h);
            } else {
                ctx.fillStyle = '#0284c7';
                ctx.fillRect(p.x, drawY, p.w, p.h);
            }

            // ジャンプ中の羽ばたき翼エフェクト
            if (!p.isGrounded) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                const wingW = 16;
                const wingH = 8 + Math.sin(p.animTick * 0.5) * 6;
                ctx.ellipse(p.x + 8, drawY + 28, wingW, wingH, -0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // 走る足のアニメーション
            if (p.isGrounded) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 3;
                const leg1 = Math.sin(p.animTick * 0.35) * 8;
                const leg2 = -leg1;
                // 足1
                ctx.beginPath();
                ctx.moveTo(p.x + 18, drawY + p.h - 4);
                ctx.lineTo(p.x + 18 + leg1, this.groundY);
                ctx.stroke();
                // 足2
                ctx.beginPath();
                ctx.moveTo(p.x + 32, drawY + p.h - 4);
                ctx.lineTo(p.x + 32 + leg2, this.groundY);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    drawHUD(ctx) {
        ctx.save();

        // 逃走距離表示
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(20, 16, 200, 48, 12);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('ESCAPE DISTANCE', 34, 32);

        ctx.fillStyle = '#38bdf8';
        ctx.font = '900 22px monospace';
        ctx.fillText(Math.floor(this.distance) + ' m', 34, 54);

        // スコア表示
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(230, 16, 150, 48, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('SCORE', 244, 32);

        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 20px monospace';
        ctx.fillText(Math.floor(this.score) + ' pt', 244, 54);

        // ハイスコア表示
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(this.width - 180, 16, 160, 48, 12);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('BEST RECORD', this.width - 166, 32);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '900 18px monospace';
        ctx.fillText(this.highScore + ' m', this.width - 166, 54);

        // 無敵タイマーゲージ
        if (this.player.invincibleTimer > 0) {
            const gaugeW = 160;
            const curW = (this.player.invincibleTimer / 180) * gaugeW;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.beginPath();
            ctx.roundRect(20, 72, gaugeW + 8, 18, 8);
            ctx.fill();

            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.roundRect(24, 76, curW, 10, 4);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('⚡ BIRDMAN POWER', 30, 84);
        }

        ctx.restore();
    }

    drawReadyScreen(ctx) {
        ctx.save();

        // 半透明オーバーレイ
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, this.width, this.height);

        // タイトルボックス
        ctx.textAlign = 'center';

        ctx.fillStyle = '#fbbf24';
        ctx.font = '900 12px sans-serif';
        ctx.letterSpacing = '3px';
        ctx.fillText('TBT SPECIAL ACTION MINI-GAME', this.width / 2, 130);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 36px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('とびとくんの危機一髪！', this.width / 2, 175);

        ctx.fillStyle = '#f97316';
        ctx.font = '900 24px sans-serif';
        ctx.fillText('〜 やきとり脱出サバイバル 〜', this.width / 2, 212);

        // セリフ吹き出し
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('「ぼくは焼き鳥じゃないトビ！大空を飛ぶ鳥人間だトビ！！」', this.width / 2, 255);

        // 操作説明
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText('【Space / ↑】ジャンプ（2段羽ばたき） ｜ 【↓】しゃがみスライド', this.width / 2, 290);
        ctx.fillText('📱 スマホ：画面上部タップでジャンプ、下部タップでスライド', this.width / 2, 312);

        // スタートボタン風
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(this.width / 2 - 120, 345, 240, 48, 24);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 16px sans-serif';
        ctx.fillText('TAP TO ESCAPE !', this.width / 2, 375);

        ctx.restore();
    }

    startLoop() {
        const loop = () => {
            if (document.hidden || document.getElementById('game-view-yakitori')?.classList.contains('hidden')) {
                requestAnimationFrame(loop);
                return;
            }
            this.update();
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
}

// グローバル公開
window.YakitoriGame = YakitoriGame;
