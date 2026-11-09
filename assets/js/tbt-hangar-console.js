/**
 * ==============================================================================
 * Team Birdman Trial (TBT) - とびとくんの部屋
 * 『TBT Hangar & Flight Console（機体格納庫 & 計器コンソール）』
 * （Inspired by yami.net 探索型シミュレータ / インタラクティブ・ワークスペース）
 *
 * コア機能:
 * 1. Web Audio API 音響合成エンジン (ペリッ・カチッ・ピロッ・ピヨッ!)
 * 2. コクピット・テレメトリHUD (ケイデンス・風速スライダー & とびとくんリアクション連動)
 * 3. 物理ドラッグ・ステッカーデスク (慣性スライド・コトッ着地・整列・散乱)
 * 4. 隠しコマンド・ターミナル (キーボード「TBT」入力で極秘ログアンロック)
 * ==============================================================================
 */

(function () {
    'use strict';

    // ==========================================================================
    // 1. Web Audio API 音響合成エンジン (Synthesized Sound FX)
    // ==========================================================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.muted = false;
        }

        initContext() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            return this.muted;
        }

        // メカニカル・スイッチ音 (カチッ)
        playSwitch() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;

            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(1400, t);
            osc.frequency.exponentialRampToValueAtTime(300, t + 0.035);

            gain.gain.setValueAtTime(0.08, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.04);
        }

        // ステッカー剥がし音 (ペリッ)
        playPeel() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;

            const t = this.ctx.currentTime;
            // ノイズバッファ生成
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, t);
            filter.frequency.linearRampToValueAtTime(3200, t + 0.07);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.linearRampToValueAtTime(0.001, t + 0.08);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(t);
        }

        // 机に置いた音 (コトッ)
        playDrop() {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;

            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.exponentialRampToValueAtTime(60, t + 0.06);

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.07);
        }

        // 計器ビープ音 (ピロッ)
        playBeep(freq = 880) {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;

            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.09);
        }

        // とびとくんリアクション音 (ピヨッ！？)
        playTobitoReaction(type = 'surprise') {
            if (this.muted) return;
            this.initContext();
            if (!this.ctx) return;

            const t = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            if (type === 'surprise') {
                osc.frequency.setValueAtTime(600, t);
                osc.frequency.exponentialRampToValueAtTime(1400, t + 0.12);
            } else {
                osc.frequency.setValueAtTime(900, t);
                osc.frequency.exponentialRampToValueAtTime(500, t + 0.15);
            }

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.16);
        }

        // とびとくん音声読み上げ (Web Speech API + 音響エフェクト合成)
        speak(text, onStart, onEnd) {
            if (this.muted) return;
            this.initContext();

            // 音声再生前の可愛いチャイム/リアクション音
            this.playTobitoReaction('smile');

            if (!('speechSynthesis' in window)) {
                if (onEnd) setTimeout(onEnd, 300);
                return;
            }

            try {
                window.speechSynthesis.cancel();

                // テキスト整形: 記号・絵文字・コード枠・括弧を除去して自然な日本語に
                let clean = String(text || '')
                    .replace(/\[.*?\]/g, '')
                    .replace(/[=~#|`*「」]/g, ' ')
                    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!clean) {
                    if (onEnd) onEnd();
                    return;
                }

                // 長すぎるテキストは先頭180文字程度に整理して発声
                if (clean.length > 180) {
                    clean = clean.substring(0, 175) + '、トビ！';
                }

                const utter = new SpeechSynthesisUtterance(clean);
                utter.lang = 'ja-JP';
                utter.pitch = 1.35; // とびとくんの明るく元気な高めトーン
                utter.rate = 1.05;  // テンポよく発声

                // 日本語ボイスの優先取得 (Kyoko, Google, 女声, 又は標準ja)
                const voices = window.speechSynthesis.getVoices();
                const jaVoice = voices.find(v => {
                    const l = (v.lang || '').toLowerCase();
                    return (l === 'ja-jp' || l === 'ja_jp' || l.startsWith('ja')) &&
                        (v.name.includes('Kyoko') || v.name.includes('Otoya') || v.name.includes('Google') || v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Ayumi'));
                }) || voices.find(v => (v.lang || '').toLowerCase().startsWith('ja'));

                if (jaVoice) {
                    utter.voice = jaVoice;
                }

                if (onStart) utter.onstart = onStart;
                utter.onend = () => {
                    if (onEnd) onEnd();
                };
                utter.onerror = (e) => {
                    console.warn('Speech synthesis error:', e);
                    if (onEnd) onEnd();
                };

                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }

                // 発声実行 (Chromiumのcancel同期バグ回避のためタイマー経由で実行)
                setTimeout(() => {
                    try {
                        if (window.speechSynthesis.paused) {
                            window.speechSynthesis.resume();
                        }
                        window.speechSynthesis.speak(utter);
                    } catch (e) {
                        console.warn('SpeechSynthesis speak failed:', e);
                        if (onEnd) onEnd();
                    }
                }, 30);
            } catch (err) {
                console.warn('Speech synthesis failed:', err);
                if (onEnd) onEnd();
            }
        }
    }

    const sound = new SoundEngine();
    window.tbtSound = sound;
    window.speakTobito = (text, onStart, onEnd) => sound.speak(text, onStart, onEnd);

    // ==========================================================================
    // 2. コックピット・テレメトリHUD (Telemetry Console HUD)
    // ==========================================================================
    class FlightTelemetryConsole {
        constructor() {
            this.cadence = 85;       // RPM (パイロットのペダリング)
            this.windSpeed = 2.5;    // m/s (琵琶湖の風速)
            this.airspeed = 0;       // km/h (対気速度)
            this.pilotPower = 0;     // W (パイロット2名の合計出力)
            this.isAlert = false;
            this.alertTimeout = null;

            this.initDOM();
            this.updateCalculations();
            this.bindEvents();
        }

        initDOM() {
            // テレメトリHUDウィジェットがDOMに存在するか確認、なければ動的生成
            let hud = document.getElementById('telemetry-hud-widget');
            if (!hud) {
                hud = document.createElement('div');
                hud.id = 'telemetry-hud-widget';
                hud.className = 'fixed bottom-5 left-5 z-40 select-none';
                hud.innerHTML = `
                    <!-- 最小化トグルボタン (親指タップ領域 44px 保証) -->
                    <button type="button" id="telemetry-hud-toggle" class="min-h-[44px] px-4 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-sky-400 font-mono text-xs font-bold border border-sky-500/30 shadow-2xl backdrop-blur-xl flex items-center gap-2.5 transition-all cursor-pointer active:scale-95">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <i class="fa-solid fa-gauge-high"></i>
                        <span>COCKPIT HUD</span>
                        <span id="hud-min-badge" class="px-1.5 py-0.5 rounded bg-sky-950 text-[10px] text-sky-300">85 RPM</span>
                    </button>

                    <!-- メイン計器パネル (展開時) -->
                    <div id="telemetry-hud-panel" class="hidden mt-2 w-72 sm:w-80 rounded-3xl bg-slate-950/95 border border-sky-500/40 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl text-white space-y-4 font-mono transition-all">
                        
                        <!-- ヘッダー -->
                        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5 text-xs">
                            <div class="flex items-center gap-1.5 text-sky-400 font-bold">
                                <i class="fa-solid fa-plane"></i>
                                <span>FLIGHT TELEMETRY</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <button type="button" id="hud-sound-toggle" class="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white transition-colors rounded-lg bg-slate-900 border border-slate-800 cursor-pointer" title="サウンド切替">
                                    <i class="fa-solid fa-volume-high" id="hud-sound-icon"></i>
                                </button>
                                <button type="button" id="hud-terminal-btn" class="min-h-[40px] px-3 py-1 rounded-lg bg-sky-950 border border-sky-700/60 text-sky-300 hover:bg-sky-900 font-bold transition-colors cursor-pointer text-xs" title="隠しターミナルを開く">
                                    CLI
                                </button>
                            </div>
                        </div>

                        <!-- リアルタイム計器メーター (AIRSPEED & POWER) -->
                        <div class="grid grid-cols-2 gap-2 text-center">
                            <div class="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                <div class="text-[10px] text-slate-400">AIRSPEED</div>
                                <div class="text-lg font-black text-sky-400" id="hud-val-airspeed">32.4 <span class="text-[10px]">km/h</span></div>
                            </div>
                            <div class="p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                                <div class="text-[10px] text-slate-400">TOTAL POWER</div>
                                <div class="text-lg font-black text-amber-400" id="hud-val-power">420 <span class="text-[10px]">W</span></div>
                            </div>
                        </div>

                        <!-- スライダー 1: CADENCE (ケイデンス) -->
                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-300">CADENCE (ペダル回転)</span>
                                <span class="text-sky-400 font-bold" id="hud-cadence-label">85 RPM</span>
                            </div>
                            <input type="range" id="hud-slider-cadence" min="20" max="130" value="85" class="w-full accent-sky-500 cursor-pointer">
                        </div>

                        <!-- スライダー 2: WIND SPEED (琵琶湖の風速) -->
                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-slate-300">WIND SPEED (風速)</span>
                                <span class="text-amber-400 font-bold" id="hud-wind-label">2.5 m/s</span>
                            </div>
                            <input type="range" id="hud-slider-wind" min="0" max="15" step="0.5" value="2.5" class="w-full accent-amber-500 cursor-pointer">
                        </div>

                        <!-- とびとくんステータスコール -->
                        <div id="hud-tobito-status" class="p-2.5 rounded-xl bg-sky-950/40 border border-sky-800/40 text-[11px] leading-tight text-slate-300 flex items-center gap-2">
                            <span class="text-base" id="hud-tobito-emoji">🕊️</span>
                            <span id="hud-tobito-msg">順調に水平巡航中トビ！追い風良好！</span>
                        </div>
                    </div>
                `;
                document.body.appendChild(hud);
            }
        }

        bindEvents() {
            const toggleBtn = document.getElementById('telemetry-hud-toggle');
            const panel = document.getElementById('telemetry-hud-panel');
            const soundBtn = document.getElementById('hud-sound-toggle');
            const soundIcon = document.getElementById('hud-sound-icon');
            const termBtn = document.getElementById('hud-terminal-btn');
            const sliderCadence = document.getElementById('hud-slider-cadence');
            const sliderWind = document.getElementById('hud-slider-wind');

            if (toggleBtn && panel) {
                toggleBtn.addEventListener('click', () => {
                    panel.classList.toggle('hidden');
                    sound.playSwitch();
                });
            }

            if (soundBtn && soundIcon) {
                soundBtn.addEventListener('click', () => {
                    const isMuted = sound.toggleMute();
                    soundIcon.className = isMuted ? 'fa-solid fa-volume-xmark text-rose-400' : 'fa-solid fa-volume-high text-sky-400';
                    if (!isMuted) sound.playBeep(1200);
                });
            }

            if (termBtn) {
                termBtn.addEventListener('click', () => {
                    sound.playBeep(1400);
                    window.tbtTerminal?.open();
                });
            }

            if (sliderCadence) {
                sliderCadence.addEventListener('input', (e) => {
                    this.cadence = parseFloat(e.target.value);
                    this.updateCalculations();
                    sound.playBeep(400 + this.cadence * 6);
                });
            }

            if (sliderWind) {
                sliderWind.addEventListener('input', (e) => {
                    this.windSpeed = parseFloat(e.target.value);
                    this.updateCalculations();
                    sound.playBeep(300 + this.windSpeed * 50);
                });
            }
        }

        updateCalculations() {
            // 対気速度 = ケイデンス比例 + 風速影響
            this.airspeed = (this.cadence * 0.28 + this.windSpeed * 0.6).toFixed(1);
            // パイロット合計出力 (W)
            this.pilotPower = Math.round(Math.pow(this.cadence / 85, 2) * 420);

            // 表示更新
            const valAirspeed = document.getElementById('hud-val-airspeed');
            const valPower = document.getElementById('hud-val-power');
            const labelCadence = document.getElementById('hud-cadence-label');
            const labelWind = document.getElementById('hud-wind-label');
            const minBadge = document.getElementById('hud-min-badge');
            const tobitoMsg = document.getElementById('hud-tobito-msg');
            const tobitoEmoji = document.getElementById('hud-tobito-emoji');

            if (valAirspeed) valAirspeed.innerHTML = `${this.airspeed} <span class="text-[10px]">km/h</span>`;
            if (valPower) valPower.innerHTML = `${this.pilotPower} <span class="text-[10px]">W</span>`;
            if (labelCadence) labelCadence.textContent = `${this.cadence} RPM`;
            if (labelWind) labelWind.textContent = `${this.windSpeed.toFixed(1)} m/s`;
            if (minBadge) minBadge.textContent = `${this.cadence} RPM`;

            // とびとくんのリアクション判定
            if (this.windSpeed >= 8.5) {
                // 強風注意警報！
                if (tobitoEmoji) tobitoEmoji.textContent = '😱💦';
                if (tobitoMsg) tobitoMsg.textContent = '強風警報トビ〜！！舵が重い！耐えて〜！';
                this.triggerTobitoReaction('storm');
            } else if (this.cadence >= 105) {
                // 超高速巡航！
                if (tobitoEmoji) tobitoEmoji.textContent = '🚀🔥';
                if (tobitoMsg) tobitoMsg.textContent = '超高速巡航だトビ！！風に乗ってるトビ！';
                this.triggerTobitoReaction('fast');
            } else if (this.cadence <= 45) {
                // 失速警報！
                if (tobitoEmoji) tobitoEmoji.textContent = '⚠️😨';
                if (tobitoMsg) tobitoMsg.textContent = '失速警報トビ！もっとペダルを踏んで〜！';
                this.triggerTobitoReaction('stall');
            } else {
                if (tobitoEmoji) tobitoEmoji.textContent = '🕊️✨';
                if (tobitoMsg) tobitoMsg.textContent = '順調に水平巡航中トビ！追い風良好！';
            }
        }

        triggerTobitoReaction(state) {
            clearTimeout(this.alertTimeout);
            this.alertTimeout = setTimeout(() => {
                sound.playTobitoReaction(state === 'storm' ? 'surprise' : 'normal');

                // 画面常駐コンパニオンがいる場合、焦るアニメーションを付与
                const companion = document.getElementById('tobito-companion');
                if (companion) {
                    if (state === 'storm') {
                        companion.classList.add('animate-bounce');
                        setTimeout(() => companion.classList.remove('animate-bounce'), 1200);
                    }
                }
            }, 100);
        }
    }

    // ==========================================================================
    // 3. 物理ドラッグ・ステッカーデスク (Interactive Sticker Desk)
    // ==========================================================================
    function initInteractiveStickerDesk() {
        const deskArea = document.getElementById('archive-fly-stage') || document.getElementById('archive-track');
        if (!deskArea) return;

        // デスク操作ツールバーの注入
        const deskHeader = document.getElementById('fly-section-header');
        if (deskHeader && !document.getElementById('desk-toolbar')) {
            const tb = document.createElement('div');
            tb.id = 'desk-toolbar';
            tb.className = 'flex items-center gap-2 mt-2 md:mt-0';
            tb.innerHTML = `
                <button type="button" id="desk-btn-scatter" class="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-sky-400 border border-slate-700/80 shadow flex items-center gap-1.5 transition-all">
                    <i class="fa-solid fa-shuffle"></i>
                    <span>デスクに散らす</span>
                </button>
                <button type="button" id="desk-btn-tidy" class="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-xs font-mono text-slate-300 border border-slate-700/80 shadow flex items-center gap-1.5 transition-all">
                    <i class="fa-solid fa-table-cells"></i>
                    <span>きれいに整列</span>
                </button>
            `;
            deskHeader.appendChild(tb);

            document.getElementById('desk-btn-scatter')?.addEventListener('click', () => {
                sound.playPeel();
                scatterCards();
            });

            document.getElementById('desk-btn-tidy')?.addEventListener('click', () => {
                sound.playDrop();
                tidyCards();
            });
        }

        const cards = document.querySelectorAll('.fly-card-item, .archive-card');

        cards.forEach((card, i) => {
            let isDragging = false;
            let startX = 0, startY = 0;
            let curX = 0, curY = 0;
            let rot = (Math.random() * 8 - 4); // 初期微小角度

            card.dataset.origRot = rot;
            card.style.cursor = 'grab';

            card.addEventListener('mousedown', (e) => {
                // 右クリックや子要素クリック判定
                if (e.button !== 0) return;
                isDragging = true;
                card.style.cursor = 'grabbing';
                card.style.zIndex = '50';
                card.classList.add('shadow-2xl');

                startX = e.clientX - curX;
                startY = e.clientY - curY;

                sound.playPeel(); // ペリッ
            });

            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                curX = e.clientX - startX;
                curY = e.clientY - startY;

                card.style.transform = `translate3d(${curX}px, ${curY}px, 60px) rotate(${rot * 1.5}deg) scale(1.08)`;
            });

            window.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                card.style.cursor = 'grab';
                card.style.zIndex = '10';

                // コトンと着地
                sound.playDrop();
                card.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.transform = `translate3d(${curX}px, ${curY}px, 0) rotate(${rot}deg) scale(1.0)`;

                setTimeout(() => {
                    card.style.transition = '';
                }, 400);
            });
        });

        function scatterCards() {
            cards.forEach((card, idx) => {
                const randX = (Math.random() * 200 - 100);
                const randY = (Math.random() * 120 - 60);
                const randRot = (Math.random() * 18 - 9);

                card.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.transform = `translate3d(${randX}px, ${randY}px, 0) rotate(${randRot}deg)`;
            });
        }

        function tidyCards() {
            cards.forEach((card) => {
                card.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                card.style.transform = `translate3d(0, 0, 0) rotate(0deg)`;
            });
        }
    }

    // ==========================================================================
    // 擬似ローカルAI（とびとくん対話エンジン & ナレッジベース）
    // ==========================================================================
    const generateTobitoReply = text => window.TobitoCLI.reply(text);

    function purgeFloatingMascotsAndBubbles() {
        document.querySelectorAll('.legacy-tobito-bubble').forEach(element => element.remove());
    }
    class HangarTerminal {
        constructor() {
            this.container = null;
            this.history = [];
            this.keyBuffer = [];
            this.initDOM();
            this.bindGlobalKeys();
        }

        initDOM() {
            const modal = document.createElement('div');
            modal.id = 'tbt-terminal-modal';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'とびとくん CLI');
            modal.className = 'hidden fixed inset-0 z-[999999] bg-slate-950/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6 font-mono select-none';
            modal.innerHTML = `
                <div id="term-window" class="w-full sm:max-w-xl h-[100dvh] sm:h-[560px] bg-[#070b14]/95 backdrop-blur-xl sm:rounded-2xl border-0 sm:border border-cyan-500/30 flex flex-col overflow-hidden shadow-2xl text-slate-200 transition-all">
                    <!-- ヘッダー（十分な高さと44px以上の親指タップ領域を保証した閉じるボタン） -->
                    <div class="h-14 px-4 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0">
                        <div class="flex items-center gap-2 text-xs sm:text-sm">
                            <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span class="font-bold text-white tracking-wider" data-i18n="termTitle">tbt-hangar-os v2.6.4</span>
                            <span class="hidden xs:inline-block text-[10px] text-slate-500 font-mono">(tty1)</span>
                        </div>
                        <button type="button" id="term-close-btn" class="min-h-[44px] min-w-[44px] h-10 px-4 text-xs font-mono font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition active:scale-95 cursor-pointer shadow-sm" data-i18n="termClose">
                            ✕ 閉じる
                        </button>
                    </div>

                    <!-- ターミナル出力スクリーン (スムーズなスクロール・適切な行間・最低文字サイズ保証) -->
                    <div id="term-output" class="flex-1 p-4 overflow-y-auto font-mono text-xs sm:text-sm space-y-2 leading-relaxed tracking-wide scroll-smooth overscroll-contain">
                        <div class="text-cyan-300 font-bold whitespace-pre-wrap">=============================================================</div>
                        <div class="text-cyan-400 font-bold whitespace-pre-wrap" data-i18n="termBanner">  TEAM BIRDMAN TRIAL / TOBITO GUIDE</div>
                        <div class="text-cyan-300 font-bold whitespace-pre-wrap">=============================================================</div>
                        <div class="text-slate-400 whitespace-pre-wrap" data-i18n="termInitMsg">サイト掲載データに基づくローカルガイド。</div>
                        <div class="pt-2 text-slate-500 whitespace-pre-wrap">-------------------------------------------------------------</div>
                    </div>

                    <!-- スマホ用：ワンタップ入力チップ（親指操作エリア & 横スクロール） -->
                    <div class="px-3 py-2 bg-slate-900/80 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 select-none">
                        <span class="text-[10px] font-mono text-slate-500 shrink-0 uppercase tracking-wider font-bold">QUICK:</span>
                        <button type="button" class="quick-chip-btn px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono rounded-full shrink-0 border border-slate-700 active:scale-95 transition cursor-pointer" data-cmd="help">help</button>
                        <button type="button" class="quick-chip-btn px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono rounded-full shrink-0 border border-slate-700 active:scale-95 transition cursor-pointer" data-cmd="status">status</button>
                        <button type="button" class="quick-chip-btn px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono rounded-full shrink-0 border border-slate-700 active:scale-95 transition cursor-pointer" data-cmd="aircraft">aircraft</button>
                        <button type="button" class="quick-chip-btn px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono rounded-full shrink-0 border border-slate-700 active:scale-95 transition cursor-pointer" data-cmd="logs">logs</button>
                        <button type="button" class="quick-chip-btn px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono rounded-full shrink-0 border border-slate-700 active:scale-95 transition cursor-pointer" data-cmd="flight">flight</button>
                        <button type="button" class="quick-chip-btn px-3 py-1.5 min-h-[36px] bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-mono rounded-full shrink-0 border border-slate-700 active:scale-95 transition cursor-pointer" data-cmd="clear">clear</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="二人乗りについて教えて">💬 二人乗り機とは？</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="翼の長さは？">💬 翼の長さ</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="風洞実験って何？">💬 風洞実験</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="なぜニワトリなの？">💬 なぜニワトリ？</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="好きな食べ物は？">💬 好物は？</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-amber-950/70 hover:bg-amber-900/70 text-amber-200 text-xs font-mono rounded-full shrink-0 border border-amber-600/50 active:scale-95 transition cursor-pointer" data-cmd="焼き鳥について">💬 ヤキトリ...？</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="傘立てについて教えて">💬 傘立て・守り神</button>
                        <button type="button" class="quick-chip-btn px-3.5 py-1.5 min-h-[36px] bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-200 text-xs font-mono rounded-full shrink-0 border border-cyan-600/50 active:scale-95 transition cursor-pointer" data-cmd="鳥人間コンテストとは？">💬 鳥人間コンテスト</button>
                    </div>

                    <!-- コマンド入力プロンプト（Safe Area & Virtual Keyboard 追従） -->
                    <div id="term-input-row" class="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                        <span class="text-cyan-400 font-bold text-xs shrink-0 select-none">tobito@hangar:~$</span>
                        <input type="text" id="term-input" aria-label="とびとくんへの質問" maxlength="500" class="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs sm:text-sm focus:outline-none placeholder-slate-600" autocomplete="off" spellcheck="false" placeholder="メッセージを入力..." data-i18n-placeholder="termPlaceholder">
                        <button type="button" id="term-send-btn" class="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-mono text-xs font-bold rounded-lg transition shrink-0 cursor-pointer shadow-sm">SEND</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.container = modal;

            // グローバルコマンド実行関数の登録
            window.executeCommand = (cmd) => this.execute(cmd);

            // チップクリックイベント登録
            modal.querySelectorAll('.quick-chip-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const cmd = btn.getAttribute('data-cmd');
                    if (cmd) this.execute(cmd);
                });
            });

            document.getElementById('term-close-btn')?.addEventListener('click', () => this.close());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });

            const input = document.getElementById('term-input');
            const sendBtn = document.getElementById('term-send-btn');

            // 送信処理（入力 → 送信 → メッセージ処理 → 入力値をclear → 入力欄へfocus）
            const handleTerminalSubmit = () => {
                if (this.isThinking) return;
                const cmd = input ? input.value.trim() : '';
                if (!cmd) return;

                // 1. メッセージ処理実行
                this.execute(cmd);

                // 2. 入力値を即座にclear（tobito@hangar:~$ _ の空状態へ戻す）
                if (input) {
                    input.value = '';
                    // 3. 入力欄へ確実にfocus
                    input.focus();
                }
            };

            input?.addEventListener('keydown', (e) => {
                if (window.TobitoCLI.shouldSubmit(e)) {
                    e.preventDefault();
                    handleTerminalSubmit();
                }
            });

            sendBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                handleTerminalSubmit();
            });

            // 入力フォーカス時にログ最下部へ自動スクロール
            input?.addEventListener('focus', () => {
                setTimeout(() => {
                    const out = document.getElementById('term-output');
                    if (out) out.scrollTop = out.scrollHeight;
                }, 150);
            });

            // Virtual Keyboard API & visualViewport 対応（スマホでキーボード出現時に入力欄が隠れないように追従）
            if (window.visualViewport) {
                const termWindow = document.getElementById('term-window');
                const handleViewportResize = () => {
                    if (!this.container.classList.contains('hidden') && window.innerWidth <= 640) {
                        const vh = window.visualViewport.height;
                        if (termWindow) {
                            termWindow.style.height = `${vh}px`;
                        }
                        const out = document.getElementById('term-output');
                        if (out) out.scrollTop = out.scrollHeight;
                    } else if (termWindow && window.innerWidth > 640) {
                        termWindow.style.height = '';
                    }
                };

                window.visualViewport.addEventListener('resize', handleViewportResize);
                window.visualViewport.addEventListener('scroll', handleViewportResize);
            }
        }

        bindGlobalKeys() {
            // キーボードで「T」「B」「T」と打つと発火
            window.addEventListener('keydown', (e) => {
                if (!this.container.classList.contains('hidden')) {
                    if (e.key === 'Escape') { e.preventDefault(); this.close(); }
                    if (e.key === 'Tab') {
                        const focusable = [...this.container.querySelectorAll('button, input')].filter(el => !el.disabled);
                        const first = focusable[0], last = focusable[focusable.length - 1];
                        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
                    }
                    return;
                }
                if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, [contenteditable="true"], canvas')) return;

                this.keyBuffer.push(e.key.toUpperCase());
                if (this.keyBuffer.length > 5) this.keyBuffer.shift();

                const recent = this.keyBuffer.join('');
                if (recent.endsWith('TBT')) {
                    sound.playTobitoReaction('surprise');
                    this.open();
                    this.keyBuffer = [];
                }
            });
        }

        open() {
            this.previousFocus = document.activeElement;
            this.container.classList.remove('hidden');
            purgeFloatingMascotsAndBubbles();
            sound.playBeep(980);
            const out = document.getElementById('term-output');
            if (out) out.scrollTop = out.scrollHeight;

            // モバイル時visualViewport高さ初期化
            if (window.visualViewport && window.innerWidth <= 640) {
                const termWindow = document.getElementById('term-window');
                if (termWindow) {
                    termWindow.style.height = `${window.visualViewport.height}px`;
                }
            }

            setTimeout(() => {
                document.getElementById('term-input')?.focus();
                if (out) out.scrollTop = out.scrollHeight;
            }, 100);
        }

        close() {
            this.container.classList.add('hidden');
            this.previousFocus?.focus({ preventScroll: true });
            const termWindow = document.getElementById('term-window');
            if (termWindow) termWindow.style.height = '';
            sound.playSwitch();
        }

        print(text, colorClass = 'text-emerald-400') {
            const out = document.getElementById('term-output');
            if (!out) return null;
            const line = document.createElement('div');
            line.className = `${colorClass} whitespace-pre-wrap break-words leading-relaxed py-0.5`;
            line.textContent = text;
            out.appendChild(line);
            out.scrollTop = out.scrollHeight;
            return line;
        }

        // ==============================================================
        // 【擬似ローカルAI（とびとくん対話エンジン）ナレッジベース】
        // ==============================================================
        getTobitoAIResponse(input) {
            return generateTobitoReply(input);
        }

        execute(cmd) {
            if (!cmd.trim()) return;
            this.history.push(cmd);
            this.print('user@tbt:~$ ' + cmd, 'text-slate-300');
            const result = window.TobitoCLI.resolve(cmd);
            if (result.type === 'clear') {
                document.getElementById('term-output')?.replaceChildren();
                return;
            }
            if (result.type === 'exit') { this.close(); return; }
            this.print(result.text, 'text-slate-100');
            if (result.type === 'navigate') {
                this.close();
                window.navigateTobitoCommand(result);
            }
        }
    }

    // ==========================================================================
    // 5. 初期化
    // ==========================================================================
    function init() {
        window.tbtTelemetry = new FlightTelemetryConsole();
        window.tbtTerminal = new HangarTerminal();
        initInteractiveStickerDesk();
        purgeFloatingMascotsAndBubbles();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ==========================================================================
    // 6. グローバルオーディオアンロック (ブラウザのAutoplay制約をユーザー初操作で全解放)
    // ==========================================================================
    const unlockGlobalAudio = () => {
        sound.initContext();
        if (window.tbtCockpitRadio && typeof window.tbtCockpitRadio.getAudioContext === 'function') {
            window.tbtCockpitRadio.getAudioContext();
        }
        if (window.gameInstance && window.gameInstance.audioCtx && window.gameInstance.audioCtx.state === 'suspended') {
            window.gameInstance.audioCtx.resume().catch(() => {});
        }
    };
    ['click', 'touchstart', 'keydown'].forEach(evt => {
        document.addEventListener(evt, unlockGlobalAudio, { once: true, passive: true });
    });
})();
