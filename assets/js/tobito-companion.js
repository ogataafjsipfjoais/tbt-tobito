/**
 * TOBITO COMPANION (とびとくんオフィシャルウィジェット)
 * 
 * 修正方針:
 * - 画面内を勝手に飛び回るマウス追従や反転吹き出しを完全停止。
 * - 鳴き声ボタンは衣装プレビュー内に配置し、コンテンツに重ねない。
 * - 衣装の選択はページ内の既存セレクターを使用する。
 */

class TobitoCompanion {
    constructor() {
        let savedSkin;
        try { savedSkin = localStorage.getItem('shibafu_tobito_companion_skin'); } catch (_) {}
        this.currentSkin = (savedSkin && savedSkin !== 'tobito_original.svg') ? savedSkin : 'tobito_pose_airplane.png';

        // スキンリスト (公式ポーズ & 衣装)
        this.skins = [
            { id: 'tobito_pose_airplane.png', name: '飛行機ポーズ（公式）' },
            { id: 'tobito_pose_koi.png', name: '「来い」ポーズ（公式）' },
            { id: 'tobito_pose_crossed_arms.png', name: '腕組みポーズ（公式）' },
            { id: 'tobito_original.svg', name: '通常とびとくん' },
            { id: 'tobito_pilot.svg', name: 'スカイエース' },
            { id: 'tobito_cyber.svg', name: 'サイバージェット' }
        ];

        this.audioCtx = null;
        this.init();
    }

    getAssetUrl(filename) {
        const base = window.TBT_TOBITO_ASSETS_BASE || window.SHIBAFU_ASSETS_BASE || 'assets/images/';
        return base.endsWith('/') ? base + filename : base + '/' + filename;
    }

    init() {
        // 飛び回りコンテナが存在していた場合は完全に削除
        const oldContainer = document.getElementById('tobito-companion-container');
        if (oldContainer) {
            oldContainer.remove();
        }

        // Keep the optional sound control within the wardrobe.
        this.createControlWidget();
        this.bindCardEvents();
    }

    createControlWidget() {
        document.getElementById('tobito-companion-widget')?.remove();
        const host = document.getElementById('tobito-companion-tools');
        if (!host) return;
        this.widget = document.createElement('div');
        this.widget.id = 'tobito-companion-widget';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tobito-chirp-control';
        button.title = 'とびとくんの声';
        button.setAttribute('aria-label', 'とびとくんの声を再生');
        button.innerHTML = '<i class="fa-solid fa-volume-high" aria-hidden="true"></i>';
        button.addEventListener('click', () => this.playChirpSound());
        this.widget.appendChild(button);
        host.appendChild(this.widget);
    }

    bindCardEvents() {
        // 公式プロフィールカード中央メイン画像をクリックしたときのリアクション
        const profileCardImg = document.querySelector('.spec-card-center img');
        if (profileCardImg) {
            profileCardImg.style.cursor = 'pointer';
            profileCardImg.title = 'クリックすると鳴きます！';
            profileCardImg.addEventListener('click', () => {
                this.playChirpSound();
                profileCardImg.classList.add('animate-bounce');
                setTimeout(() => profileCardImg.classList.remove('animate-bounce'), 800);
            });
        }
    }

    setSkin(skin) {
        this.currentSkin = skin;
        try { localStorage.setItem('shibafu_tobito_companion_skin', skin); } catch (_) {}

        // 中央プロフィールカードの画像を更新
        const profileCardImg = document.querySelector('.spec-card-center img');
        if (profileCardImg) {
            profileCardImg.src = this.getAssetUrl(skin);
        }

        // コスチュームプレビュー画像があれば更新
        const previewImg = document.getElementById('costume-preview-img');
        if (previewImg) {
            previewImg.src = this.getAssetUrl(skin);
        }

        this.playChirpSound();
    }

    initAudio() {
        if (!this.audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) {
                this.audioCtx = new AudioCtx();
            }
        }
    }

    playChirpSound() {
        this.initAudio();
        if (!this.audioCtx) return;
        try {
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const now = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            // ピピッ！と可愛い鳴き声
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch (e) {}
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tobitoCompanion = new TobitoCompanion();
});
