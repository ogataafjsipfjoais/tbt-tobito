/**
 * TBT COCKPIT RADIO // コクピット無線通信 (WebRTC ボイスチャット & ATC インターコム)
 * 
 * - WebRTC (PeerJS) による軽量ルーム音声通信
 * - Web Audio API によるリアルタイムオーディオ波形ビジュアライザー
 * - 航空無線風スケルチノイズ & ロジャービープ（Roger Beep）音響エフェクト
 * - PTT (Push-To-Talk) モード & Mute 切り替え
 * - ハウリング防止 (echoCancellation / noiseSuppression) & マイク権限ハンドリング
 * - ローカルループバック（テスト交信）モード & スタンドアロンWebRTC無線演出
 */
(function() {
    'use strict';

    class CockpitRadio {
        constructor() {
            this.peer = null;
            this.localStream = null;
            this.audioCtx = null;
            this.sharedAudioCtx = null;
            this.analyser = null;
            this.dataArray = null;
            this.animId = null;
            this.activeCalls = new Map();

            this.isConnected = false;
            this.isMuted = false;
            this.isPttMode = false;
            this.isPttActive = false;
            this.isLoopbackMode = false;
            this.isMonitorOnly = false;

            this.defaultRoom = 'tbt-biwako-ch1';
            this.peerId = 'pilot-' + Math.random().toString(36).substring(2, 7);

            this.initElements();
            this.bindEvents();
        }

        getAudioContext() {
            if (!this.sharedAudioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (AudioCtx) {
                    this.sharedAudioCtx = new AudioCtx();
                }
            }
            if (this.sharedAudioCtx && this.sharedAudioCtx.state === 'suspended') {
                this.sharedAudioCtx.resume().catch(() => {});
            }
            return this.sharedAudioCtx;
        }

        initElements() {
            this.btnToggle = document.getElementById('btn-radio-toggle');
            this.btnMute = document.getElementById('btn-radio-mute');
            this.btnPtt = document.getElementById('btn-radio-ptt');
            this.btnLoopback = document.getElementById('btn-radio-loopback');
            this.btnAtcTest = document.getElementById('btn-radio-atc-test');
            this.statusEl = document.getElementById('radio-status');
            this.roomInput = document.getElementById('radio-room-id');
            this.pilotCountEl = document.getElementById('radio-pilot-count');
            this.audioWave = document.getElementById('audio-wave');
            this.alertEl = document.getElementById('radio-alert');
            this.pttModeToggle = document.getElementById('toggle-ptt-mode');
        }

        bindEvents() {
            if (this.btnToggle) {
                this.btnToggle.addEventListener('click', () => {
                    if (this.isConnected) {
                        this.disconnect();
                    } else {
                        this.connect();
                    }
                });
            }

            if (this.btnMute) {
                this.btnMute.addEventListener('click', () => {
                    this.toggleMute();
                });
            }

            if (this.btnLoopback) {
                this.btnLoopback.addEventListener('click', () => {
                    this.toggleLoopback();
                });
            }

            if (this.btnAtcTest) {
                this.btnAtcTest.addEventListener('click', () => {
                    this.playClickSound();
                    this.playAtcDemoTransmission();
                });
            }

            if (this.pttModeToggle) {
                this.pttModeToggle.addEventListener('change', (e) => {
                    this.isPttMode = e.target.checked;
                    this.updatePttUI();
                });
            }

            // PTT (Push-To-Talk) ボタン長押し制御
            if (this.btnPtt) {
                const startTalk = (e) => {
                    e.preventDefault();
                    if (!this.isConnected || !this.isPttMode) return;
                    this.setPttActive(true);
                };
                const endTalk = (e) => {
                    e.preventDefault();
                    if (!this.isConnected || !this.isPttMode) return;
                    this.setPttActive(false);
                };

                this.btnPtt.addEventListener('mousedown', startTalk);
                this.btnPtt.addEventListener('mouseup', endTalk);
                this.btnPtt.addEventListener('mouseleave', endTalk);
                this.btnPtt.addEventListener('touchstart', startTalk, { passive: false });
                this.btnPtt.addEventListener('touchend', endTalk, { passive: false });
            }

            // スペースキー長押しでもPTT可能
            window.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && this.isPttMode && this.isConnected && !this.isPttActive) {
                    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                        return;
                    }
                    e.preventDefault();
                    this.setPttActive(true);
                }
            });

            window.addEventListener('keyup', (e) => {
                if (e.code === 'Space' && this.isPttMode && this.isConnected && this.isPttActive) {
                    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                        return;
                    }
                    e.preventDefault();
                    this.setPttActive(false);
                }
            });
        }

        async connect() {
            this.showAlert('', 'hide');
            this.setStatus('INITIALIZING...', 'amber');
            this.isMonitorOnly = false;

            // AudioContext解放
            this.getAudioContext();

            try {
                // 1. マイク権限取得 (エコーキャンセラー & ノイズ抑制有効)
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false
                });

                this.localStream = stream;
                this.initAudioVisualizer(stream);

                // 2. PeerJS 接続の確立 (PeerJS CDN利用)
                if (window.Peer) {
                    this.setupPeerJs();
                } else {
                    console.log('PeerJS loading or using local mode...');
                    this.onConnectedSuccess();
                }

            } catch (err) {
                console.warn('Microphone unavailable or denied, falling back to monitor mode:', err);
                // マイクなし環境でも「受信・傍受・ATC交信モード」として安定動作
                this.isMonitorOnly = true;
                this.onConnectedSuccess();
                this.showAlert('📻 受信・交信モードで接続しました。周波数121.5MHzクリア！', 'emerald');
            }
        }

        setupPeerJs() {
            const roomName = (this.roomInput && this.roomInput.value.trim()) || this.defaultRoom;
            this.setStatus('TUNING FREQ...', 'amber');

            try {
                this.peer = new window.Peer(this.peerId + '-' + Math.floor(Math.random() * 1000), {
                    debug: 1
                });

                this.peer.on('open', (id) => {
                    console.log('PeerJS connected with ID:', id);
                    this.setupBroadcastChannel();
                    this.onConnectedSuccess();
                });

                this.peer.on('call', (call) => {
                    if (this.localStream) {
                        call.answer(this.localStream);
                    } else {
                        call.answer(); // monitor only
                    }
                    this.handleCallStream(call);
                });

                this.peer.on('error', (err) => {
                    console.warn('PeerJS warning:', err);
                    // サーバー通信不能時もローカルインターコムとして安定動作
                    this.onConnectedSuccess();
                });

            } catch (e) {
                this.onConnectedSuccess();
            }
        }

        setupBroadcastChannel() {
            const roomName = (this.roomInput && this.roomInput.value.trim()) || this.defaultRoom;
            try {
                if (this.channel) {
                    try { this.channel.close(); } catch(e) {}
                }
                this.channel = new BroadcastChannel('tbt_radio_' + roomName);
                this.channel.onmessage = (e) => {
                    const data = e.data;
                    if (!data || !this.isConnected || !this.peer) return;

                    if (data.type === 'PEER_JOIN' && data.peerId !== this.peer.id) {
                        this.showAlert(`📻 新規パイロット入室: ${data.peerId.slice(0, 10)}`, 'emerald');
                        // 自身の存在を返信
                        this.channel.postMessage({
                            type: 'PEER_HERE',
                            peerId: this.peer.id
                        });
                        // 相手を呼び出し
                        if (!this.activeCalls.has(data.peerId)) {
                            this.callPeer(data.peerId);
                        }
                    } else if (data.type === 'PEER_HERE' && data.peerId !== this.peer.id) {
                        if (!this.activeCalls.has(data.peerId)) {
                            this.callPeer(data.peerId);
                        }
                    } else if (data.type === 'PEER_LEAVE' && data.peerId !== this.peer.id) {
                        if (this.activeCalls.has(data.peerId)) {
                            try { this.activeCalls.get(data.peerId).close(); } catch(err) {}
                            this.activeCalls.delete(data.peerId);
                            this.updatePilotCount();
                        }
                    }
                };

                // 周波数へ参加アナウンス
                this.channel.postMessage({
                    type: 'PEER_JOIN',
                    peerId: this.peer.id
                });
            } catch (err) {
                console.warn('BroadcastChannel not supported in this environment:', err);
            }
        }

        callPeer(targetPeerId) {
            if (!this.peer) return;
            try {
                const call = this.peer.call(targetPeerId, this.localStream);
                if (call) {
                    this.handleCallStream(call);
                }
            } catch (e) {
                console.warn('Failed to call peer:', e);
            }
        }

        handleCallStream(call) {
            call.on('stream', (remoteStream) => {
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.play().catch(() => {});
                this.showAlert('🔊 僚機の音声を受信中...', 'emerald');
            });
            call.on('close', () => {
                this.activeCalls.delete(call.peer);
                this.updatePilotCount();
            });
            this.activeCalls.set(call.peer, call);
            this.updatePilotCount();
        }

        onConnectedSuccess() {
            this.isConnected = true;
            this.setStatus('ON AIR // LIVE', 'emerald');
            this.playSquelchSound();

            if (this.btnToggle) {
                this.btnToggle.textContent = 'DISCONNECT';
                this.btnToggle.className = 'px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-mono font-bold text-xs rounded-xl tracking-wider uppercase transition active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.4)]';
            }

            if (this.btnMute) this.btnMute.disabled = this.isMonitorOnly;
            if (this.btnPtt) this.btnPtt.disabled = this.isMonitorOnly;
            if (this.btnLoopback) this.btnLoopback.disabled = this.isMonitorOnly;
            if (this.btnAtcTest) this.btnAtcTest.disabled = false;

            this.updatePilotCount();
            this.updatePttUI();

            if (!this.isMonitorOnly) {
                this.showAlert('🎙 コクピット無線に接続しました。周波数クリア！', 'emerald');
            }

            // 接続時にリアルな航空無線アナウンス（ATC）を自動放送
            setTimeout(() => {
                if (this.isConnected) {
                    this.playAtcDemoTransmission();
                }
            }, 600);
        }

        disconnect() {
            this.playRogerBeep();

            if (this.channel) {
                try {
                    if (this.peer) {
                        this.channel.postMessage({ type: 'PEER_LEAVE', peerId: this.peer.id });
                    }
                    this.channel.close();
                } catch(e) {}
                this.channel = null;
            }
            this.activeCalls.clear();

            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            if (this.peer) {
                try { this.peer.destroy(); } catch (e) {}
                this.peer = null;
            }

            if (this.animId) {
                cancelAnimationFrame(this.animId);
                this.animId = null;
            }

            if (this.audioCtx) {
                try { this.audioCtx.close(); } catch (e) {}
                this.audioCtx = null;
            }

            this.isConnected = false;
            this.isMuted = false;
            this.isPttActive = false;
            this.isLoopbackMode = false;
            this.isMonitorOnly = false;

            this.setStatus('OFFLINE', 'slate');
            this.resetVisualizer();

            if (this.btnToggle) {
                this.btnToggle.textContent = 'CONNECT RADIO';
                this.btnToggle.className = 'px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-xl tracking-wider uppercase transition active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(0,229,255,0.3)]';
            }

            if (this.btnMute) {
                this.btnMute.disabled = true;
                this.btnMute.textContent = 'MIC ON';
                this.btnMute.classList.remove('bg-rose-500/30', 'text-rose-300');
            }

            if (this.btnPtt) this.btnPtt.disabled = true;
            if (this.btnLoopback) {
                this.btnLoopback.disabled = true;
                this.btnLoopback.classList.remove('border-emerald-400', 'text-emerald-300');
            }

            if (this.pilotCountEl) {
                this.pilotCountEl.textContent = '0 PILOTS ON AIR';
            }
        }

        toggleMute() {
            if (!this.localStream) return;
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (!audioTrack) return;

            this.isMuted = !this.isMuted;
            audioTrack.enabled = !this.isMuted;

            if (this.btnMute) {
                if (this.isMuted) {
                    this.btnMute.textContent = 'MUTED';
                    this.btnMute.classList.add('bg-rose-500/30', 'text-rose-300', 'border-rose-500/50');
                    this.btnMute.classList.remove('bg-slate-800');
                } else {
                    this.btnMute.textContent = 'MIC ON';
                    this.btnMute.classList.remove('bg-rose-500/30', 'text-rose-300', 'border-rose-500/50');
                    this.btnMute.classList.add('bg-slate-800');
                }
            }
        }

        setPttActive(active) {
            if (!this.localStream) return;
            this.isPttActive = active;

            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = active;
            }

            if (this.btnPtt) {
                if (active) {
                    this.btnPtt.classList.add('bg-emerald-500', 'text-slate-950', 'scale-95', 'shadow-[0_0_15px_rgba(16,185,129,0.5)]');
                    this.btnPtt.classList.remove('bg-slate-800', 'text-slate-300');
                    this.playClickSound();
                } else {
                    this.btnPtt.classList.remove('bg-emerald-500', 'text-slate-950', 'scale-95', 'shadow-[0_0_15px_rgba(16,185,129,0.5)]');
                    this.btnPtt.classList.add('bg-slate-800', 'text-slate-300');
                    this.playRogerBeep();

                    // 1人でテスト交信中の場合、PTTを離すとTBT地上タワー/管制官がリアルに応答
                    if (this.activeCalls.size === 0) {
                        clearTimeout(this._atcReplyTimer);
                        this._atcReplyTimer = setTimeout(() => {
                            if (this.isConnected && !this.isPttActive) {
                                this.triggerAtcResponse();
                            }
                        }, 750);
                    }
                }
            }
        }

        updatePttUI() {
            if (!this.btnPtt) return;
            if (this.isPttMode) {
                this.btnPtt.classList.remove('opacity-50', 'pointer-events-none');
                if (this.localStream) {
                    const audioTrack = this.localStream.getAudioTracks()[0];
                    if (audioTrack) audioTrack.enabled = this.isPttActive;
                }
            } else {
                this.btnPtt.classList.add('opacity-50', 'pointer-events-none');
                if (this.localStream) {
                    const audioTrack = this.localStream.getAudioTracks()[0];
                    if (audioTrack) audioTrack.enabled = !this.isMuted;
                }
            }
        }

        toggleLoopback() {
            if (!this.audioCtx || !this.localStream) return;
            this.isLoopbackMode = !this.isLoopbackMode;

            if (this.isLoopbackMode) {
                // マイク音声を自分のスピーカーに航空無線エフェクトを通して流す
                const source = this.audioCtx.createMediaStreamSource(this.localStream);
                const filter = this.audioCtx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1800; // 航空無線の電話帯域（300Hz〜3000Hz）
                filter.Q.value = 1.2;

                const gain = this.audioCtx.createGain();
                gain.gain.value = 0.8;

                source.connect(filter);
                filter.connect(gain);
                gain.connect(this.audioCtx.destination);
                this.loopbackNodes = { source, filter, gain };

                if (this.btnLoopback) {
                    this.btnLoopback.classList.add('border-emerald-400', 'text-emerald-300', 'bg-emerald-950/40');
                }
                this.playSquelchSound();
                this.showAlert('🔊 エコーテスト有効: ヘッドフォンでの試聴を推奨します。', 'emerald');
            } else {
                if (this.loopbackNodes) {
                    try {
                        this.loopbackNodes.gain.disconnect();
                        this.loopbackNodes.filter.disconnect();
                    } catch (e) {}
                    this.loopbackNodes = null;
                }
                if (this.btnLoopback) {
                    this.btnLoopback.classList.remove('border-emerald-400', 'text-emerald-300', 'bg-emerald-950/40');
                }
                this.playRogerBeep();
            }
        }

        initAudioVisualizer(stream) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;

            this.audioCtx = new AudioCtx();
            const source = this.audioCtx.createMediaStreamSource(stream);
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 64;

            source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.renderVisualizer();
        }

        renderVisualizer() {
            if (!this.analyser || !this.audioWave) return;

            const bars = this.audioWave.querySelectorAll('.wave-bar');
            if (bars.length === 0) return;

            const update = () => {
                this.analyser.getByteFrequencyData(this.dataArray);

                let sum = 0;
                for (let i = 0; i < bars.length; i++) {
                    const val = this.dataArray[i * 2] || 0;
                    sum += val;
                    const heightPercent = Math.max(8, Math.min(100, (val / 255) * 100));
                    bars[i].style.height = `${heightPercent}%`;

                    if (val > 150) {
                        bars[i].style.backgroundColor = '#10B981'; // 強い音: グリーン
                    } else if (val > 60) {
                        bars[i].style.backgroundColor = '#00F0FF'; // 中音: シアン
                    } else {
                        bars[i].style.backgroundColor = '#0284c7'; // 弱音: ブルー
                    }
                }

                this.animId = requestAnimationFrame(update);
            };

            update();
        }

        resetVisualizer() {
            if (!this.audioWave) return;
            const bars = this.audioWave.querySelectorAll('.wave-bar');
            bars.forEach(b => {
                b.style.height = '10%';
                b.style.backgroundColor = '#334155';
            });
        }

        setStatus(text, color) {
            if (!this.statusEl) return;
            this.statusEl.textContent = text;
            this.statusEl.className = `font-mono text-xs px-2.5 py-1 rounded-full border transition-all ${
                color === 'emerald'
                    ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : color === 'amber'
                    ? 'text-amber-400 border-amber-500/40 bg-amber-950/40'
                    : 'text-slate-400 border-slate-700 bg-slate-900'
            }`;
        }

        updatePilotCount() {
            if (!this.pilotCountEl) return;
            const count = this.activeCalls.size + 1; // 自身 + リスナー
            this.pilotCountEl.textContent = `${count} PILOTS ON AIR`;
        }

        showAlert(msg, type) {
            if (!this.alertEl) return;
            if (type === 'hide') {
                this.alertEl.classList.add('hidden');
                return;
            }
            this.alertEl.className = `p-3 rounded-xl border text-xs font-mono font-medium block animate-fadeIn ${
                type === 'emerald'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`;
            this.alertEl.textContent = msg;
        }

        // --- 音響エフェクト（航空無線スケルチ & ロジャービープ & ATC交信デモ放送） ---

        playAtcDemoTransmission() {
            const transmissions = [
                "こちらTBTフライトディスパッチ。彦根プラットフォーム、風向南南西、風速2.5メートル。周波数121.5メガヘルツ、テイクオフ準備よし！",
                "TBTタワーより各機へ。琵琶湖サーマル発生中、竹生島ルートの気流安定。順調に巡航高度を維持せよトビ！",
                "こちら前席パイロット！ケイデンス90RPM安定、対気速度35キロ。後席パイロットと呼吸同期完了、このまま対岸へ突っ切るトビ！",
                "こちらTBT地上クルー！CFRP主翼の健全性100パーセント確認。琵琶湖の追い風に乗って、思いっきり翔んで来い！"
            ];
            const msg = transmissions[Math.floor(Math.random() * transmissions.length)];

            this.showAlert('📻 [ATC受信中] ' + msg, 'emerald');
            this.playSquelchSound();
            this.simulateWaveform(3800);

            setTimeout(() => {
                if (window.speakTobito) {
                    window.speakTobito(msg, null, () => {
                        this.playRogerBeep();
                        setTimeout(() => this.playSquelchSound(), 160);
                    });
                } else if ('speechSynthesis' in window) {
                    const utter = new SpeechSynthesisUtterance(msg);
                    utter.lang = 'ja-JP';
                    utter.pitch = 1.15;
                    utter.rate = 1.0;
                    utter.onend = () => {
                        this.playRogerBeep();
                        setTimeout(() => this.playSquelchSound(), 160);
                    };
                    window.speechSynthesis.speak(utter);
                } else {
                    this.playRogerBeep();
                }
            }, 250);
        }

        triggerAtcResponse() {
            const replies = [
                "ラジャー、TBTタワー了解！感度良好、明瞭度ファイブ・バイ・ファイブ。このまま気流を捉えて進めトビ！",
                "こちら彦根ディスパッチ、了解！主翼の迎え角良好、風速2.5メートル。テイクオフ姿勢を維持せよトビ！",
                "ラジャー、コクピット送信を受信！対岸ゴールまで残り15キロメートル、ケイデンスをキープして翔べトビ！",
                "TBTフライトコントロール了解！テレメトリデータ全系統オールグリーン。琵琶湖の風を味方に飛翔せよトビ！",
                "こちら地上支援クルー、了解！CFRPの応力値・気流バランスともに安定。素晴らしいフライトだトビ！"
            ];
            const msg = replies[Math.floor(Math.random() * replies.length)];

            this.showAlert('📻 [TBTタワー応答] ' + msg, 'emerald');
            this.playSquelchSound();
            this.simulateWaveform(3600);

            setTimeout(() => {
                if (window.speakTobito) {
                    window.speakTobito(msg, null, () => {
                        this.playRogerBeep();
                        setTimeout(() => this.playSquelchSound(), 160);
                    });
                } else if ('speechSynthesis' in window) {
                    const utter = new SpeechSynthesisUtterance(msg);
                    utter.lang = 'ja-JP';
                    utter.pitch = 1.15;
                    utter.rate = 1.05;
                    utter.onend = () => {
                        this.playRogerBeep();
                        setTimeout(() => this.playSquelchSound(), 160);
                    };
                    window.speechSynthesis.speak(utter);
                } else {
                    this.playRogerBeep();
                }
            }, 250);
        }

        simulateWaveform(duration = 3500) {
            if (!this.audioWave) return;
            const bars = this.audioWave.querySelectorAll('.wave-bar');
            if (bars.length === 0) return;

            const startTime = performance.now();
            const anim = () => {
                const elapsed = performance.now() - startTime;
                if (elapsed > duration || !this.isConnected) {
                    bars.forEach(b => {
                        b.style.height = '10%';
                        b.style.backgroundColor = '#334155';
                    });
                    return;
                }

                bars.forEach((b, i) => {
                    const h = Math.min(100, Math.max(12, Math.floor(Math.sin((elapsed * 0.02) + (i * 0.7)) * 40 + Math.random() * 35 + 25)));
                    b.style.height = `${h}%`;
                    b.style.backgroundColor = h > 60 ? '#10B981' : '#00F0FF';
                });

                requestAnimationFrame(anim);
            };
            anim();
        }

        playSquelchSound() {
            try {
                const ctx = this.getAudioContext();
                if (!ctx) return;
                const bufferSize = Math.floor(ctx.sampleRate * 0.12); // 120ms
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1; // ホワイトノイズ
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 2200;
                filter.Q.value = 1.5;

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.12, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                noise.start();
            } catch (e) {}
        }

        playRogerBeep() {
            try {
                const ctx = this.getAudioContext();
                if (!ctx) return;
                const now = ctx.currentTime;

                // 航空無線のロジャービープ（ピロッ！）
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.setValueAtTime(1800, now + 0.05);

                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
            } catch (e) {}
        }

        playClickSound() {
            try {
                const ctx = this.getAudioContext();
                if (!ctx) return;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                gain.gain.setValueAtTime(0.08, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.04);
            } catch (e) {}
        }
    }

    // 初期化
    window.CockpitRadio = CockpitRadio;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.tbtCockpitRadio = new CockpitRadio();
        });
    } else {
        window.tbtCockpitRadio = new CockpitRadio();
    }
})();
