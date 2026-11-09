/**
 * ==============================================================================
 * Team Birdman Trial (TBT) - Accessibility & Internationalization (i18n) Engine
 * ==============================================================================
 * 
 * 1. 多言語対応 (i18n): 日本語 (JA) / 英語 (EN) の即時切り替え
 * 2. 文字サイズスケーリング: 標準 (base: 100%) / 小 (sm: 90%) / 大 (lg: 115%)
 * 3. localStorage による永続化 & リアクティブDOM更新
 * ==============================================================================
 */

(function () {
    'use strict';

    // ==========================================================================
    // 1. 多言語辞書 (Locales Dictionary)
    // ==========================================================================
    const i18nData = {
        ja: {
            // グローバルナビゲーション
            navRoomTitle: "とびとくんの部屋",
            navSubtitle: "TBT Atelier & Hangar",
            navPrologue: "プロローグ",
            navEngineering: "アトリエの思想",
            navCostumes: "衣装の記録",
            navArchives: "流体アーカイブ (Works)",
            navSketch: "日常スケッチ",
            navGame: "大空フライト",
            navCommunity: "無線 & フィード",
            navCheer: "応援の言葉",
            navFlyBtn: "物語を飛ぶ",

            // ヒーローセクション
            heroBgText: "TWO-SEATER",
            heroSubbadge: "TEAM BIRDMAN TRIAL OFFICIAL MASCOT",
            heroTag: "S-320 // LIVE FLIGHT TELEMETRY",
            heroBadge: "2 PILOTS TANDEM",
            heroTitle: "空を、<br><span class=\"text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-400\">翔べ。</span>",
            heroDesc: "大会唯一、二人乗り人力プロペラ機。<br>仲間の技術とパイロットのペダルが、琵琶湖の限界高度を突破する。",
            btnLaunch: "LAUNCH SIMULATOR",
            btnSpecs: "[ 01 // SPECIFICATIONS ]",
            scrollHint: "SCROLL TO DIVE",
            telemetryCoords: "[ 35°18'42\"N 136°08'15\"E // BIWAKO ]",
            telemetryCh: "S-320 FLIGHT TELEMETRY // CH-01",
            telemetrySpan: "SPAN: <strong class=\"text-cyan-300 font-bold\">32.4m</strong> // AR: <strong class=\"text-cyan-300 font-bold\">48.2</strong>",
            telemetryMass: "MASS: 31.8kg // 2 PILOTS TANDEM",
            telemetryAttitude: "ATTITUDE SENSORS ACTIVE // LIVE",
            telemetryAirspeed: "AIRSPEED: <strong class=\"text-amber-400 font-bold\">10.5 m/s</strong>",
            telemetryCadence: "CADENCE TARGET: 90 RPM",
            loaderConnecting: "[ S-320 MODEL CONNECTING... ]",

            // Chapter 2: スペック・工学の美
            specsChapter: "The Atelier Anatomy / Chapter II",
            specsTitle: "大空を紡ぐ、手仕事の骨格。",
            specsLead: "空力限界を突き詰めた機体設計と、アトリエの祈りが宿るマスコットスペック。",
            specCard1Badge: "AIRCRAFT SYSTEM",
            specCard1Title: "大会唯一の二人乗り機体",
            specCard1Desc: "パイロット2名の合計出力と呼吸が推進力。一人では届かない限界の距離を、二人の絆と知恵で切り拓きます。",
            specCard2Badge: "AERODYNAMICS",
            specCard2Title: "超ロングスパン 32.4m 主翼",
            specCard2Desc: "S-320 Elementの公式掲載翼幅は40.00m。主翼の使用翼型はDAE31、DAE41、FX76MP120です。",
            specCard3Badge: "HANGAR GUARDIAN",
            specCard3Title: "部室の守り神「かさ立て」",
            specCard3Desc: "提供素材の立体像。製作年・材質・誕生経緯は一次資料では未確認です。",

            // ターミナルOS
            termTitle: "tbt-hangar-os v2.6.4 (tty1)",
            termClose: "✕ CLOSE",
            termBanner: "TEAM BIRDMAN TRIAL / TOBITO GUIDE",
            termInitMsg: "サイト掲載データに基づくローカルガイド。",
            termPlaceholder: "type 'help', 'logs', または とびとくんに質問...",

            // フライトゲーム & その他
            gameSectionTitle: "3D琵琶湖フライトゲーム",
            gameSectionLead: "Spaceキー連動ペダリングで大空へ飛び立ち、琵琶湖の対岸を目指そう！",
            rankingTitle: "歴代フライトランキング",
            cheerTitle: "応援メッセージボード"
        },

        en: {
            // グローバルナビゲーション
            navRoomTitle: "Tobito's Atelier",
            navSubtitle: "TBT Atelier & Hangar",
            navPrologue: "Prologue",
            navEngineering: "Craft & Philosophy",
            navCostumes: "Costumes",
            navArchives: "Aero Archives (Works)",
            navSketch: "Hangar Sketch",
            navGame: "Flight Simulator",
            navCommunity: "Radio & Feed",
            navCheer: "Cheer Board",
            navFlyBtn: "Launch Flight",

            // ヒーローセクション
            heroBgText: "TWO-SEATER",
            heroSubbadge: "TEAM BIRDMAN TRIAL OFFICIAL MASCOT",
            heroTag: "S-320 // LIVE FLIGHT TELEMETRY",
            heroBadge: "2 PILOTS TANDEM",
            heroTitle: "FLY,<br><span class=\"text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-400\">BEYOND.</span>",
            heroDesc: "The tournament's sole two-seater human-powered aircraft.<br>Engineering grit and synchronized tandem pedaling conquer the skies of Lake Biwa.",
            btnLaunch: "LAUNCH SIMULATOR",
            btnSpecs: "[ 01 // SPECIFICATIONS ]",
            scrollHint: "SCROLL TO DIVE",
            telemetryCoords: "[ 35°18'42\"N 136°08'15\"E // BIWAKO ]",
            telemetryCh: "S-320 FLIGHT TELEMETRY // CH-01",
            telemetrySpan: "SPAN: <strong class=\"text-cyan-300 font-bold\">32.4m</strong> // AR: <strong class=\"text-cyan-300 font-bold\">48.2</strong>",
            telemetryMass: "MASS: 31.8kg // 2 PILOTS TANDEM",
            telemetryAttitude: "ATTITUDE SENSORS ACTIVE // LIVE",
            telemetryAirspeed: "AIRSPEED: <strong class=\"text-amber-400 font-bold\">10.5 m/s</strong>",
            telemetryCadence: "CADENCE TARGET: 90 RPM",
            loaderConnecting: "[ S-320 MODEL CONNECTING... ]",

            // Chapter 2: スペック・工学の美
            specsChapter: "The Atelier Anatomy / Chapter II",
            specsTitle: "The Anatomy of Flight & Craftsmanship.",
            specsLead: "Extreme aerodynamic tolerances meet the mascot's spirit born from our atelier.",
            specCard1Badge: "AIRCRAFT SYSTEM",
            specCard1Title: "Sole Tandem Two-Seater",
            specCard1Desc: "Synchronized output and shared breathing of two pilots generate unmatched thrust. Conquering distances no single pilot can reach.",
            specCard2Badge: "AERODYNAMICS",
            specCard2Title: "Ultra Long-Span 32.4m Wings",
            specCard2Desc: "The published wingspan of S-320 Element is 40.00 m. Main-wing airfoils: DAE31, DAE41, FX76MP120.",
            specCard3Badge: "HANGAR GUARDIAN",
            specCard3Title: "Guardian 'Umbrella Stand'",
            specCard3Desc: "Provided character sculpture image. Its year, materials and origin are unverified.",

            // ターミナルOS
            termTitle: "tbt-hangar-os v2.6.4 (tty1)",
            termClose: "✕ CLOSE",
            termBanner: "TEAM BIRDMAN TRIAL / TOBITO GUIDE",
            termInitMsg: "Local guide based on this site\u0027s published information.",
            termPlaceholder: "type 'help', 'logs', or ask Tobito anything...",

            // フライトゲーム & その他
            gameSectionTitle: "3D Lake Biwa Flight Simulator",
            gameSectionLead: "Take off with rhythmic pedaling (Space key) and aim for the opposite shore of Lake Biwa!",
            rankingTitle: "All-Time Flight Rankings",
            cheerTitle: "Supporters Cheer Board"
        }
    };

    // ==========================================================================
    // 2. 状態管理 (State Management)
    // ==========================================================================
    let currentLang = localStorage.getItem('tbt_lang') || 'ja';
    let currentFontSize = localStorage.getItem('tbt_font_size') || 'base';

    // ==========================================================================
    // 3. 多言語適用関数 (Language Switcher)
    // ==========================================================================
    function setLanguage(lang) {
        if (!i18nData[lang]) return;
        currentLang = lang;
        localStorage.setItem('tbt_lang', lang);

        const dict = i18nData[lang];

        // 1. テキストコンテンツ [data-i18n] の更新
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key] !== undefined) {
                el.innerHTML = dict[key];
            }
        });

        // 2. プレースホルダー [data-i18n-placeholder] の更新
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (dict[key] !== undefined) {
                el.placeholder = dict[key];
            }
        });

        // 3. タイトル [data-i18n-title] の更新
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (dict[key] !== undefined) {
                el.title = dict[key];
            }
        });

        // 4. トグルボタンのハイライト更新
        updateLangButtonUI(lang);

        // 5. カスタムイベント通知 (ターミナルなど連動用)
        window.dispatchEvent(new CustomEvent('tbt_language_changed', { detail: { lang } }));
    }

    function updateLangButtonUI(lang) {
        const btnJa = document.getElementById('btn-lang-ja');
        const btnEn = document.getElementById('btn-lang-en');
        if (!btnJa || !btnEn) return;

        if (lang === 'ja') {
            btnJa.className = "px-2.5 sm:px-3 py-1 rounded-full bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-all";
            btnEn.className = "px-2.5 sm:px-3 py-1 rounded-full text-slate-400 hover:text-white font-medium transition-colors";
        } else {
            btnJa.className = "px-2.5 sm:px-3 py-1 rounded-full text-slate-400 hover:text-white font-medium transition-colors";
            btnEn.className = "px-2.5 sm:px-3 py-1 rounded-full bg-cyan-400 text-slate-950 font-black shadow-[0_0_12px_rgba(0,229,255,0.4)] transition-all";
        }
    }

    // ==========================================================================
    // 4. 文字サイズスケーリング関数 (Font Size Scaler)
    // ==========================================================================
    function setFontSize(size) {
        if (!['sm', 'base', 'lg'].includes(size)) size = 'base';
        currentFontSize = size;
        localStorage.setItem('tbt_font_size', size);

        const root = document.documentElement;

        // ルートフォントサイズのスケーリング
        switch (size) {
            case 'sm':
                root.style.fontSize = '92%';
                break;
            case 'base':
                root.style.fontSize = '100%';
                break;
            case 'lg':
                root.style.fontSize = '114%';
                break;
        }

        // ボタンのハイライト更新
        ['sm', 'base', 'lg'].forEach(s => {
            const btn = document.getElementById(`btn-font-${s}`);
            if (btn) {
                if (s === size) {
                    btn.className = "px-2 py-0.5 text-cyan-400 font-bold bg-cyan-950/60 rounded border border-cyan-500/30 transition-all";
                } else {
                    btn.className = "px-2 py-0.5 text-slate-400 hover:text-white font-normal transition-colors";
                }
            }
        });

        window.dispatchEvent(new CustomEvent('tbt_font_size_changed', { detail: { size } }));
    }

    // ==========================================================================
    // 5. グローバル公開 & 初期化
    // ==========================================================================
    window.setLanguage = setLanguage;
    window.setFontSize = setFontSize;
    window.tbtI18n = {
        getLang: () => currentLang,
        getFontSize: () => currentFontSize,
        dict: i18nData
    };

    document.addEventListener('DOMContentLoaded', () => {
        setLanguage(currentLang);
        setFontSize(currentFontSize);
    });

    // 早期実行（FOUC / フラッシュ防止）
    if (document.readyState !== 'loading') {
        setLanguage(currentLang);
        setFontSize(currentFontSize);
    }
})();
