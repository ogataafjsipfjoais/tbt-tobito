/**
 * ==============================================================================
 * Time-reactive Sky Lighting System (ダークサイバー・時間連動ライティング)
 * ==============================================================================
 * 
 * 視認性向上のためのダークトーン刷新:
 * - 眩しい明色グラデーションを全廃し、深みのあるダークネイビー〜チャコールブラック
 *   （#050811 〜 #0B1220）を常時基調とする。
 * - アクセス時刻に応じて、アンビエントオーラとテレメトリアクセントが美しく調光。
 * - 白文字（#FFFFFF）、蛍光シアン（#00F0FF）、エアロオレンジ（#FF5500）の
 *   圧倒的な高コントラスト比で視認性を劇的に担保。
 */

(function () {
    'use strict';

    // ダークキャンバス前提の時間帯プリセット定義
    const SKY_THEMES = {
        morning: {
            name: '未明〜黎明 (Dawn Indigo)',
            bgGradient: 'bg-gradient-to-b from-[#050814] via-[#091124] to-[#0d1b33]',
            lightPrimary: 'bg-cyan-500/15',
            lightSecondary: 'bg-amber-400/10',
            subbadge: 'text-cyan-400',
            titleText: 'text-white',
            titleShadow: 'drop-shadow-[0_4px_24px_rgba(0,240,255,0.35)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]',
            statementText: 'text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]',
            statementHighlight: 'text-cyan-300 drop-shadow-[0_2px_12px_rgba(0,240,255,0.4)]',
            scrollText: 'text-cyan-300/80 group-hover:text-cyan-200',
            scrollIcon: 'text-cyan-400 group-hover:text-white',
            modeTag: 'DAWN TELEMETRY'
        },
        daylight: {
            name: '真昼の大空 (Deep Aero Navy)',
            bgGradient: 'bg-gradient-to-b from-[#050811] via-[#071329] to-[#0a1936]',
            lightPrimary: 'bg-cyan-400/20',
            lightSecondary: 'bg-sky-500/15',
            subbadge: 'text-cyan-400',
            titleText: 'text-white',
            titleShadow: 'drop-shadow-[0_4px_28px_rgba(0,240,255,0.4)] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]',
            statementText: 'text-slate-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]',
            statementHighlight: 'text-white drop-shadow-[0_2px_14px_rgba(0,240,255,0.5)]',
            scrollText: 'text-cyan-300/90 group-hover:text-white',
            scrollIcon: 'text-cyan-400 group-hover:text-white',
            modeTag: 'AERO FLIGHT STANDBY'
        },
        sunset: {
            name: '夕暮れ (Aero Amber Dusk)',
            bgGradient: 'bg-gradient-to-b from-[#090b14] via-[#141224] to-[#1a1228]',
            lightPrimary: 'bg-orange-500/20',
            lightSecondary: 'bg-amber-400/15',
            subbadge: 'text-amber-400',
            titleText: 'text-white',
            titleShadow: 'drop-shadow-[0_4px_24px_rgba(255,85,0,0.45)] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]',
            statementText: 'text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]',
            statementHighlight: 'text-amber-300 drop-shadow-[0_2px_14px_rgba(255,85,0,0.5)]',
            scrollText: 'text-amber-300/80 group-hover:text-amber-200',
            scrollIcon: 'text-amber-400 group-hover:text-white',
            modeTag: 'SUNSET TELEMETRY'
        },
        night: {
            name: '漆黒の星空 (Midnight Cyber Void)',
            bgGradient: 'bg-gradient-to-b from-[#030509] via-[#060a14] to-[#0a1020]',
            lightPrimary: 'bg-cyan-500/15',
            lightSecondary: 'bg-indigo-600/15',
            subbadge: 'text-cyan-400',
            titleText: 'text-white',
            titleShadow: 'drop-shadow-[0_4px_24px_rgba(0,240,255,0.4)] drop-shadow-[0_0_30px_rgba(0,240,255,0.25)]',
            statementText: 'text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]',
            statementHighlight: 'text-cyan-300 drop-shadow-[0_2px_16px_rgba(0,240,255,0.6)]',
            scrollText: 'text-cyan-300/80 group-hover:text-cyan-100',
            scrollIcon: 'text-cyan-400 group-hover:text-white',
            modeTag: 'MIDNIGHT VOID'
        }
    };

    /**
     * 現在の時刻から時間帯キーを決定
     */
    function getCurrentTimeKey() {
        const hours = new Date().getHours();
        if (hours >= 4 && hours < 8) {
            return 'morning';
        }
        if (hours >= 8 && hours < 17) {
            return 'daylight';
        }
        if (hours >= 17 && hours < 19) {
            return 'sunset';
        }
        return 'night';
    }

    /**
     * スカイライティングのテーマをUIに適用
     */
    function applyTheme(themeKey) {
        const theme = SKY_THEMES[themeKey] || SKY_THEMES.daylight;

        const bgEl = document.getElementById('sky-reactive-bg');
        if (bgEl) {
            bgEl.className = `absolute inset-0 -z-20 transition-all duration-1000 ease-in-out ${theme.bgGradient}`;
        }

        const lightPri = document.getElementById('sky-reactive-light');
        if (lightPri) {
            lightPri.className = `absolute -top-16 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full blur-[140px] pointer-events-none -z-10 transition-all duration-1000 ${theme.lightPrimary}`;
        }

        const lightSec = document.getElementById('sky-reactive-light-sub');
        if (lightSec) {
            lightSec.className = `absolute bottom-10 left-1/2 -translate-x-1/2 w-[600px] h-[320px] rounded-full blur-[140px] pointer-events-none -z-10 transition-all duration-1000 ${theme.lightSecondary}`;
        }

        const subbadge = document.getElementById('hero-subbadge');
        if (subbadge) {
            subbadge.className = `font-mono text-[10px] sm:text-xs md:text-sm tracking-widest uppercase font-bold transition-colors duration-700 ${theme.subbadge}`;
        }

        const titleText = document.getElementById('hero-main-title');
        if (titleText) {
            titleText.className = `text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-widest mb-4 sm:mb-6 transition-all duration-700 font-syne ${theme.titleText} ${theme.titleShadow}`;
        }

        const statementText = document.getElementById('hero-statement');
        if (statementText) {
            statementText.className = `space-y-2 sm:space-y-3 font-medium text-sm sm:text-base md:text-lg leading-relaxed tracking-wide mt-2 transition-colors duration-700 ${theme.statementText}`;
        }

        const statementHighlight = document.getElementById('hero-statement-highlight');
        if (statementHighlight) {
            statementHighlight.className = `font-bold text-base sm:text-lg md:text-xl ${theme.statementHighlight}`;
        }

        const scrollText = document.getElementById('hero-scroll-text');
        if (scrollText) {
            scrollText.className = `font-mono text-[10px] sm:text-xs tracking-widest uppercase transition-colors duration-700 ${theme.scrollText}`;
        }

        const scrollIcon = document.getElementById('hero-scroll-icon');
        if (scrollIcon) {
            scrollIcon.setAttribute('class', `w-4 h-4 transition-colors duration-700 animate-bounce ${theme.scrollIcon}`);
        }

        const timeBadge = document.getElementById('sky-time-badge');
        if (timeBadge) {
            timeBadge.textContent = theme.modeTag;
        }
    }

    /**
     * システム起動
     */
    function initSkyLighting() {
        const initialKey = getCurrentTimeKey();
        applyTheme(initialKey);

        // 1分ごとに時刻をチェックしてスムーズに移行
        setInterval(() => {
            const currentKey = getCurrentTimeKey();
            applyTheme(currentKey);
        }, 60000);
    }

    // グローバルAPI
    window.TimeReactiveSky = {
        applyTheme: applyTheme,
        getCurrentTimeKey: getCurrentTimeKey,
        THEMES: SKY_THEMES
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSkyLighting);
    } else {
        initSkyLighting();
    }
})();
