import os

def generate_index_php():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = os.path.join(base_dir, 'index.php')

    content = '''<?php
/**
 * Team Birdman Trial (TBT) - 公式マスコット「とび斗くん」公式Webサイト
 * 
 * アートディレクション:
 * EDITORIAL DESIGN + DIGITAL ART + INTERACTIVE WEB + AIRCRAFT / AERODYNAMICS + HAND-DRAWN CHARACTER
 * 「ハイエンドなデジタル体験の中に、手描きのとび斗くんが突然存在している」世界観。
 * 巨大な日本語タイポグラフィ、文字と画像の融合、余白、白〜淡い水色〜淡い黄色系の空気感。
 */

require_once __DIR__ . '/data.php';

// メッセージデータの初期化 & 読み込み
$messages = $default_cheers ?? [];
$messageFile = __DIR__ . '/data/messages.json';
if (file_exists($messageFile)) {
    $saved = json_decode(file_get_contents($messageFile), true);
    if (is_array($saved)) {
        $messages = $saved;
    }
}

// 共通ヘッダー読み込み
require_once __DIR__ . '/includes/header.php';
?>

<!-- 特設スタイルシート -->
<link rel="stylesheet" href="assets/css/tobito-profile.css">

<!-- アクセシビリティ & 多言語対応エンジン (i18n & Font Scaling) -->
<script src="assets/js/tbt-accessibility-i18n.js"></script>

<!-- ==============================================
     ブランド・グローバルナビゲーション (Minimal & Editorial)
     ============================================== -->
<nav class="sticky top-0 z-50 backdrop-blur-xl bg-white/85 border-b border-sky-100/80 shadow-xs transition-all text-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        <!-- ブランドロゴ: TOBITO -->
        <a href="#hero" class="flex items-center gap-3 group">
            <span class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 text-white flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform duration-300">🕊️</span>
            <div>
                <span class="font-extrabold text-slate-900 text-base tracking-tight block leading-none font-brand-display">TOBITO</span>
                <span class="text-[9px] text-sky-600 font-brand-mono tracking-widest uppercase font-bold">ATELIER & FLIGHT</span>
            </div>
        </a>

        <!-- エディトリアル・ナビリンク -->
        <div class="hidden xl:flex items-center gap-6 text-xs font-bold tracking-widest text-slate-600 font-brand-mono uppercase">
            <a href="#prologue" class="hover:text-sky-600 transition-colors">00 Prologue</a>
            <a href="#atelier" class="hover:text-sky-600 transition-colors">01 Atelier</a>
            <a href="#aircraft" class="hover:text-sky-600 transition-colors">02 Aircraft</a>
            <a href="#aerodynamics" class="hover:text-sky-600 transition-colors">03 Aero</a>
            <a href="#tobito" class="hover:text-sky-600 transition-colors">04 Tobito</a>
            <a href="#daily" class="hover:text-sky-600 transition-colors">05 Life</a>
            <a href="#wardrobe" class="hover:text-sky-600 transition-colors">06 Wardrobe</a>
            <a href="#play" class="hover:text-sky-600 transition-colors flex items-center gap-1.5 text-sky-700">
                <span class="text-amber-500">🎮</span>
                <span>07 Play</span>
            </a>
            <a href="#community" class="hover:text-sky-600 transition-colors flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>08 Signals</span>
            </a>
        </div>

        <!-- ユーティリティ (文字サイズ・言語切り替え・CTA) -->
        <div class="flex items-center gap-2 sm:gap-3">
            <!-- 文字サイズ変更（A- / A / A+） -->
            <div class="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full px-2 sm:px-2.5 py-1 text-[11px] font-brand-mono shadow-xs">
                <span class="text-slate-400 mr-1 text-[9px] uppercase font-bold hidden xs:inline">Font</span>
                <button onclick="setFontSize('sm')" id="btn-font-sm" class="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 transition" title="文字サイズ: 小 (Small)">A-</button>
                <button onclick="setFontSize('base')" id="btn-font-base" class="px-1.5 py-0.5 text-sky-600 font-bold bg-white rounded border border-slate-200 shadow-xs transition" title="文字サイズ: 標準 (Default)">A</button>
                <button onclick="setFontSize('lg')" id="btn-font-lg" class="px-1.5 py-0.5 text-slate-500 hover:text-slate-900 transition" title="文字サイズ: 大 (Large)">A+</button>
            </div>

            <!-- 多言語切り替え（JA / EN） -->
            <div class="flex items-center bg-slate-100/90 border border-slate-200/80 rounded-full p-0.5 sm:p-1 text-[11px] font-brand-mono shadow-xs">
                <button onclick="setLanguage('ja')" id="btn-lang-ja" class="px-2.5 sm:px-3 py-0.5 rounded-full bg-sky-500 text-white font-black shadow-xs transition-all">JA</button>
                <button onclick="setLanguage('en')" id="btn-lang-en" class="px-2.5 sm:px-3 py-0.5 rounded-full text-slate-500 hover:text-slate-900 font-medium transition-colors">EN</button>
            </div>

            <!-- クイックCTA -->
            <a href="#play" class="btn-pill-primary !py-2 !px-4 !text-xs hidden sm:inline-flex shadow-sm">
                <span>PLAY WORLD</span>
            </a>
        </div>
    </div>
</nav>

<main class="space-y-0 overflow-hidden">

    <!-- ==============================================
         【00 PROLOGUE / HERO】大空のファーストビュー
         手描きの巨大とび斗くん × 巨大日本語タイポグラフィ × 航空機テレメトリ
         ============================================== -->
    <section id="hero" class="bg-ambient-atelier min-h-[95vh] sm:min-h-screen relative flex items-center justify-center overflow-hidden py-16 sm:py-24 select-none">
        
        <!-- 背景レイヤー: 巨大日本語タイポグラフィ（文字と空間の融合） -->
        <div class="absolute inset-0 flex flex-col justify-center items-center z-0 overflow-hidden pointer-events-none opacity-25">
            <span class="text-jp-watermark transform -translate-y-12">翼を紡ぎ出す場所。</span>
            <span class="text-jp-watermark transform translate-y-12 opacity-60">夢の空へ。</span>
        </div>

        <!-- 遠景レイヤー: 遠くにぽつんと浮かぶ小さなとび斗くん (遊び心) -->
        <div class="absolute top-20 right-16 z-0 pointer-events-none hidden md:block opacity-60 tobito-distant-float">
            <img src="assets/images/tobito_pose_airplane.png" alt="遠くのとび斗くん" class="w-16 h-auto drop-shadow-xs">
            <span class="font-brand-mono text-[9px] text-sky-700/60 block text-center mt-1">DISTANT // 800m</span>
        </div>

        <!-- 遠景レイヤー: Three.js S-320 3D実機モデル（とび斗くんの背後で優雅に旋回する控えめな演出） -->
        <canvas id="aircraft-canvas" class="absolute inset-0 w-full h-full z-0 opacity-40 pointer-events-none"></canvas>

        <!-- S-320 ロード中インジケータ（極小・控えめ） -->
        <div id="s320-loader-indicator" class="absolute top-4 right-4 z-10 pointer-events-none transition-opacity duration-700 flex items-center gap-1.5 font-brand-mono text-[9px] text-sky-800/60 bg-white/60 px-2.5 py-1 rounded-full backdrop-blur-xs">
            <div class="w-2.5 h-2.5 border border-sky-600/30 border-t-sky-600 rounded-full animate-spin"></div>
            <span>S-320 AIRCRAFT LIVE</span>
        </div>

        <!-- 四隅の航空機テレメトリUI（世界観を支える重要要素） -->
        <div class="absolute bottom-6 left-8 z-10 pointer-events-none hidden md:flex items-center gap-6 font-brand-mono text-[10px] text-sky-900/70 tracking-wider">
            <span class="px-2 py-0.5 rounded bg-sky-100/80 border border-sky-200">TWO-SEATER</span>
            <span>LIVE FLIGHT TELEMETRY</span>
            <span>AIRSPEED: <strong id="hero-hud-airspeed" class="text-sky-900 font-bold">10.5 m/s</strong></span>
            <span>CADENCE: 90 RPM</span>
            <!-- Hidden HUD Bindings for s320-aig-hero.js compatibility -->
            <span class="hidden" id="hero-hud-pitch">0.0°</span>
            <span class="hidden" id="hero-hud-roll">0.0°</span>
            <span class="hidden" id="hero-hud-yaw">0.0°</span>
        </div>

        <!-- ヒーローメインコンテンツ (エディトリアル2カラム構図) -->
        <div class="relative z-10 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            <!-- 左カラム: 巨大日本語タイポグラフィ & 短い強いコピー -->
            <div class="lg:col-span-6 flex flex-col items-start text-left pt-6 sm:pt-0">
                <!-- ミニマルブランドピル -->
                <div class="brand-pill brand-pill-sky mb-4 sm:mb-6 shadow-xs">
                    <span class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    <span>TBT ATELIER & HANGAR</span>
                </div>

                <!-- 巨大日本語メインタイトル -->
                <h1 class="text-jp-giant text-slate-900 tracking-tight leading-none drop-shadow-xs">
                    翼を紡ぎ出す<br>
                    場所。
                    <span class="block text-xl sm:text-2xl lg:text-3xl font-brand-mono text-sky-600 font-bold tracking-wider mt-4">
                        TOBITO THE ROOSTER
                    </span>
                </h1>

                <!-- キャッチコピー -->
                <p class="text-2xl sm:text-3xl lg:text-4xl font-serif text-slate-800 mt-6 tracking-wide leading-relaxed font-bold">
                    「飛べない鳥が、空を目指す。」
                </p>

                <!-- サブコピー（エディトリアルリード） -->
                <p class="text-sm sm:text-base text-slate-600 font-serif mt-4 max-w-lg leading-relaxed">
                    ここは、飛べない鳥と仲間たちが、翼を紡ぎ出す場所。<br>
                    ひとこぎ、ふたこぎ、夢の空へ。
                </p>

                <!-- CTAボタングループ -->
                <div class="flex flex-wrap items-center gap-3 sm:gap-4 mt-8">
                    <a href="#atelier" class="btn-pill-primary shadow-md">
                        <span>アトリエへ進む</span>
                        <span>↓</span>
                    </a>
                    <a href="#play" class="btn-pill-secondary">
                        <span>プレイグラウンド</span>
                    </a>
                </div>
            </div>

            <!-- 右カラム: 画面いっぱいに配置された巨大な手描きとび斗くん -->
            <div class="lg:col-span-6 flex items-center justify-center relative mt-6 lg:mt-0">
                <div class="tobito-hero-img-wrap animate-tobito-float">
                    <img src="assets/images/tobito_pose_airplane.png" 
                         alt="とび斗くん - 飛行ポーズ" 
                         class="tobito-hero-img w-[360px] sm:w-[480px] lg:w-[600px] h-auto object-contain select-none pointer-events-auto cursor-grab"
                         title="大空を舞うとび斗くん">
                </div>
            </div>

        </div>

        <!-- スクロールガイド -->
        <div class="absolute bottom-6 right-8 z-10 hidden sm:flex items-center gap-2 font-brand-mono text-xs text-sky-800/70 tracking-widest uppercase">
            <span>SCROLL TO ENTER ATELIER</span>
            <span class="animate-bounce">↓</span>
        </div>
    </section>


    <!-- ==============================================
         【01 ATELIER】架空の工房・大空の設計室
         手作りの航空機工房 × カーボンとリブの削り屑
         ============================================== -->
    <section id="atelier" class="py-28 sm:py-40 bg-white relative border-t border-sky-100">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div class="max-w-4xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-sky mb-4">01 / THE ATELIER</div>
                <h2 class="text-jp-giant text-slate-900 leading-tight">
                    ここは、飛べない鳥と<br class="hidden sm:inline">仲間たちが、
                    <span class="block text-2xl sm:text-4xl font-serif text-sky-600 font-medium mt-3">
                        翼を紡ぎ出す場所。
                    </span>
                </h2>
                <p class="editorial-lead text-slate-600 mt-6 font-serif">
                    湖畔の風が吹き抜ける、小さな設計室。カーボンとリブの削り屑が舞い散るこの場所で、僕らは二人乗りの翼を仕立てている。<br class="hidden sm:inline">
                    空を飛ぶことのないニワトリが、仲間の夢を乗せて風をつかむまでの、ちいさな手仕事の物語。
                </p>
            </div>

            <!-- アトリエ風景 & 名物かさ立て実写展示 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
                
                <!-- 左カラム: 名物かさ立て写真 (実寸大FRP造形) -->
                <div class="lg:col-span-6 bg-amber-50/50 rounded-3xl p-6 sm:p-8 border border-amber-200/60 shadow-xs">
                    <div class="rounded-2xl overflow-hidden shadow-sm bg-white mb-6">
                        <img src="assets/images/tobito_stand_umbrella.png" 
                             alt="立体かさ立て - 実写写真" 
                             class="w-full h-80 sm:h-96 object-cover hover:scale-105 transition-transform duration-500">
                    </div>
                    <span class="font-brand-mono text-xs font-bold text-amber-700 tracking-wider block mb-1">ATELIER GUARDIAN // FRP SCULPTURE</span>
                    <h3 class="text-xl font-bold font-serif text-slate-900 mb-2">名物「トビト君立体かさ立て」</h3>
                    <p class="text-xs text-slate-600 leading-relaxed font-sans">
                        空気抵抗を限界まで減らすフェアリング講習会から生まれた実寸大立体モデル。雨の日も風の日も、部室の玄関で傘を抱えて部員たちの無事を見守り続けています。
                    </p>
                </div>

                <!-- 右カラム: 職人姿のとび斗くん (腕組み) & 手仕事の精神 -->
                <div class="lg:col-span-6 space-y-8">
                    <div class="relative flex justify-center">
                        <img src="assets/images/tobito_pose_crossed_arms.png" 
                             alt="とび斗くん 職人ポーズ" 
                             class="w-full max-w-[360px] h-auto object-contain drop-shadow-lg">
                    </div>
                    <div class="border-l-2 border-sky-400 pl-6 py-2">
                        <h4 class="text-lg font-bold font-serif text-slate-900 mb-2">1ミリの削り出しに込める誇り</h4>
                        <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-serif">
                            「これ以上削ったら折れる」「いや、あと1グラム軽くできる」。夜の部室に響く真剣勝負の眼差し。妥協のないものづくりを静かに見守る、職人の魂が宿っています。
                        </p>
                    </div>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         【02 AIRCRAFT】二人乗り人力飛行機 S-320
         航空機・テレメトリ表現とクラフトマンシップの調和
         ============================================== -->
    <section id="aircraft" class="py-28 sm:py-40 bg-slate-950 text-white relative overflow-hidden border-t border-b border-sky-500/20">
        
        <!-- 背景ウォーターマーク -->
        <div class="absolute inset-0 flex items-center justify-center z-0 pointer-events-none opacity-10">
            <span class="text-watermark text-watermark-dark">TWO-SEATER S-320</span>
        </div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <div class="max-w-3xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-dark mb-4 text-sky-400 border-sky-400/30">02 / AIRCRAFT SPECIFICATIONS</div>
                <h2 class="text-display-giant text-white font-brand-display">
                    S-320 AIRCRAFT
                    <span class="block text-2xl sm:text-4xl font-serif text-sky-400 font-medium mt-3">
                        大会唯一の、二人乗りタンデム機。
                    </span>
                </h2>
                <p class="editorial-lead text-slate-300 mt-6 font-serif">
                    翼開長30.5メートル。前席と後席のパイロットが完全に呼吸を合わせ、ペダル踏力を直結シャフトで大プロペラへ伝達。<br class="hidden sm:inline">
                    ふたりの出力シナジーが、琵琶湖の空に美しい航跡を描きます。
                </p>
            </div>

            <!-- 航空機UI & スペックカード -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                
                <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <span class="font-brand-mono text-xs text-sky-400 font-bold block mb-2">WING ARCHITECTURE</span>
                    <h3 class="text-xl font-bold font-serif text-white mb-2">30.5m CFRP主翼</h3>
                    <p class="text-xs text-slate-400 leading-relaxed font-sans mb-4">スタイロフォームから0.1mm単位で削り出す数十枚の翼リブが美しい層流翼型を形成。</p>
                    <span class="font-brand-mono text-xs text-slate-300 block pt-3 border-t border-white/10">ACCURACY: ±0.1mm</span>
                </div>

                <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <span class="font-brand-mono text-xs text-sky-400 font-bold block mb-2">PROPULSION SYSTEM</span>
                    <h3 class="text-xl font-bold font-serif text-white mb-2">タンデム直結駆動</h3>
                    <p class="text-xs text-slate-400 leading-relaxed font-sans mb-4">前席・後席直列配置のペダル駆動。2人の出力シナジーにより安定した大推力を実現。</p>
                    <span class="font-brand-mono text-xs text-slate-300 block pt-3 border-t border-white/10">CREW: 2 PILOTS (~600W)</span>
                </div>

                <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
                    <span class="font-brand-mono text-xs text-sky-400 font-bold block mb-2">AERODYNAMICS</span>
                    <h3 class="text-xl font-bold font-serif text-white mb-2">流線型フェアリング</h3>
                    <p class="text-xs text-slate-400 leading-relaxed font-sans mb-4">空気抵抗を限界まで削ぎ落とすハンドレイアップ成形。超軽量かつ高剛性な外殻。</p>
                    <span class="font-brand-mono text-xs text-slate-300 block pt-3 border-t border-white/10">DRAG REDUCTION: -38%</span>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         【03 AERODYNAMICS】風洞実験室 & WebGLアーカイブ
         2,400流線のリアルタイム風洞シミュレーター
         ============================================== -->
    <section id="aerodynamics" class="py-28 sm:py-40 bg-[#05070B] text-white relative border-b border-cyan-500/20">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="max-w-3xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-dark mb-4 text-cyan-400 border-cyan-500/30">03 / AERODYNAMICS LAB</div>
                <h2 class="text-display-giant text-white font-brand-display">
                    FLUID ARCHIVE
                    <span class="block text-2xl sm:text-4xl font-serif text-cyan-400 font-medium mt-3">
                        2,400本の流線が描く、見えない風のかたち。
                    </span>
                </h2>
                <p class="editorial-lead text-slate-300 mt-6 font-serif">
                    翼に沿って流れる気流の美しさをリアルタイムにシミュレーション。<br class="hidden sm:inline">
                    マウスで迎角をドラッグし、揚力と抗力の奇跡を体験してください。
                </p>
            </div>

            <!-- 風洞実験室キャンバス -->
            <div class="rounded-3xl border border-cyan-500/30 overflow-hidden bg-[#070b16] shadow-2xl mb-16">
                <div class="px-6 py-4 bg-slate-900/80 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 font-brand-mono text-xs">
                    <div class="flex items-center gap-3">
                        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span class="font-bold tracking-wider text-cyan-300">WIND TUNNEL SIMULATOR (STREAMLINES: 2,400)</span>
                    </div>
                    <div class="flex items-center gap-4 text-slate-400">
                        <span>迎角: <strong id="wt-aoa-val" class="text-white">4.0°</strong></span>
                        <span>風速: <strong id="wt-speed-val" class="text-white">10.5 m/s</strong></span>
                    </div>
                </div>

                <div id="wind-tunnel-canvas-container" class="relative w-full h-[380px] sm:h-[480px] bg-[#050811] cursor-grab active:cursor-grabbing">
                    <!-- wind-tunnel.js がここにキャンバスを生成 -->
                </div>
            </div>

            <!-- Active Theory WebGL 3Dアーカイブ -->
            <div class="space-y-8">
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-brand-mono text-xs text-cyan-400 font-bold uppercase tracking-widest">3D HISTORICAL WORKS</span>
                        <h3 class="text-2xl font-bold font-serif text-white mt-1">機体・ステッカー原画 3Dコレクション</h3>
                    </div>
                    <span class="font-brand-mono text-xs text-slate-500 hidden sm:inline">CLICK CARD TO INSPECT</span>
                </div>

                <div class="w-full h-[320px] sm:h-[400px] rounded-3xl bg-[#090d18] border border-cyan-500/20 relative overflow-hidden">
                    <canvas id="at-canvas" class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>
                </div>
            </div>

        </div>
    </section>


    <!-- ==============================================
         【04 TOBITO】とび斗くんのヒミツ手帳
         大空に恋い焦がれるニワトリの素顔
         ============================================== -->
    <section id="tobito" class="py-28 sm:py-40 bg-white relative">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="max-w-3xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-sky mb-4">04 / WHO IS TOBITO?</div>
                <h2 class="text-jp-giant text-slate-900 leading-tight">
                    大空に恋い焦がれる、<br class="hidden sm:inline">ニワトリ。
                    <span class="block text-2xl sm:text-4xl font-serif text-sky-600 font-medium mt-3">
                        飛べない鳥だからこそ、仲間の力で翔ぶ。
                    </span>
                </h2>
                <p class="editorial-lead text-slate-600 mt-6 font-serif">
                    「なぜニワトリなの？」とよく聞かれます。<br class="hidden sm:inline">
                    飛べない鳥の代表格だからこそ、人の知恵とチームワークで大空を飛ぶ鳥人間の原点・挑戦の象徴なのです。
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                
                <!-- スペックシート & 秘密豆知識 -->
                <div class="lg:col-span-6 space-y-8">
                    
                    <div class="border-t border-b border-sky-100 py-6 space-y-5">
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="font-brand-mono text-xs uppercase tracking-widest text-slate-400">SPECIES</span>
                            <span class="font-bold text-slate-800 text-sm font-serif">大空に恋い焦がれるニワトリ</span>
                        </div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="font-brand-mono text-xs uppercase tracking-widest text-slate-400">WINGSPAN</span>
                            <span class="font-bold text-slate-800 text-sm font-brand-mono">約180 cm</span>
                        </div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="font-brand-mono text-xs uppercase tracking-widest text-slate-400">WEIGHT</span>
                            <span class="font-bold text-slate-800 text-sm font-brand-mono">約15 kg (鳥人間魂の重み)</span>
                        </div>
                        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span class="font-brand-mono text-xs uppercase tracking-widest text-slate-400">FAVORITE</span>
                            <span class="font-bold text-slate-800 text-sm">バナナ、高カロリーゼリー、追い風</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="font-brand-mono text-xs uppercase tracking-widest text-slate-400">CHARM POINT</span>
                            <span class="font-bold text-slate-800 text-sm">風に揺れる真っ赤なトサカ、大きな翼</span>
                        </div>
                    </div>

                    <!-- 名言ボイスバー -->
                    <div class="flex items-center gap-4 p-4 rounded-2xl bg-sky-50/70 border border-sky-100 shadow-xs">
                        <button onclick="playTobitoVoice()" class="voice-bubble-btn">
                            <span class="voice-wave-dot"></span>
                            <span>ボイスを聞く</span>
                        </button>
                        <p id="voice-quote-text" class="text-xs sm:text-sm font-serif font-bold text-slate-700 transition-colors">
                            「ペダルを踏めば、夢は前に進むトビ！」
                        </p>
                    </div>

                </div>

                <!-- ポートレート & 4表情パレット -->
                <div class="lg:col-span-6 flex flex-col items-center">
                    <div class="relative w-full max-w-md aspect-3/4 rounded-3xl bg-radial from-sky-100/60 to-white flex items-center justify-center p-8 border border-sky-100 shadow-sm overflow-hidden">
                        <img id="about-portrait-img" 
                             src="assets/images/tobito_pose_koi.png" 
                             alt="とび斗くん ポートレート" 
                             class="relative z-10 w-full max-h-[480px] object-contain drop-shadow-lg transition-all duration-300">
                    </div>

                    <div class="mt-6 flex items-center gap-3">
                        <span class="text-xs font-brand-mono text-slate-400 uppercase tracking-widest mr-2">MOOD:</span>
                        <button onclick="changeAboutMood('assets/images/tobito_pose_koi.png')" class="w-10 h-10 rounded-full border-2 border-sky-500 bg-white shadow-xs p-1 hover:scale-110 transition" title="熱血「来い」ポーズ">
                            <img src="assets/images/tobito_face_normal.png" alt="通常" class="w-full h-full object-contain">
                        </button>
                        <button onclick="changeAboutMood('assets/images/tobito_face_smile.png')" class="w-10 h-10 rounded-full border border-slate-200 bg-white shadow-xs p-1 hover:scale-110 transition" title="最高の笑顔">
                            <img src="assets/images/tobito_face_smile.png" alt="笑顔" class="w-full h-full object-contain">
                        </button>
                        <button onclick="changeAboutMood('assets/images/tobito_face_angry.png')" class="w-10 h-10 rounded-full border border-slate-200 bg-white shadow-xs p-1 hover:scale-110 transition" title="真剣な情熱">
                            <img src="assets/images/tobito_face_angry.png" alt="気合" class="w-full h-full object-contain">
                        </button>
                        <button onclick="changeAboutMood('assets/images/tobito_face_cry.png')" class="w-10 h-10 rounded-full border border-slate-200 bg-white shadow-xs p-1 hover:scale-110 transition" title="次への糧となる涙">
                            <img src="assets/images/tobito_face_cry.png" alt="涙" class="w-full h-full object-contain">
                        </button>
                    </div>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         【05 DAILY LIFE】アトリエの日常スケッチ
         クスッと笑える日常、バナナ、鴨居にトサカをぶつける朝
         ============================================== -->
    <section id="daily" class="py-28 sm:py-40 bg-stone-50/90 relative border-t border-b border-stone-200/80">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="max-w-3xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-sky mb-4">05 / DAILY LIFE</div>
                <h2 class="text-jp-giant text-slate-900 leading-tight">
                    アトリエの日常、<br class="hidden sm:inline">クスッと笑える風景。
                </h2>
                <p class="editorial-lead text-slate-600 mt-6 font-serif">
                    ストイックな航空工学のなかに、いつでもとび斗くんの笑顔がある。<br class="hidden sm:inline">
                    部室で過ごす、愛おしい日常の一コマ。
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                
                <div class="p-8 rounded-3xl bg-white border border-stone-200 shadow-xs">
                    <span class="text-3xl mb-4 block">🚪</span>
                    <h3 class="text-lg font-bold font-serif text-slate-900 mb-2">鴨居にトサカをぶつける朝</h3>
                    <p class="text-xs text-slate-600 leading-relaxed font-sans">
                        自慢の真っ赤なトサカは、部室のドア（高さ1,820mm）をくぐるたびにペコリと引っかかるのがお約束。「頭上注意！」と声を掛け合って出動します。
                    </p>
                </div>

                <div class="p-8 rounded-3xl bg-white border border-stone-200 shadow-xs">
                    <span class="text-3xl mb-4 block">🍌</span>
                    <h3 class="text-lg font-bold font-serif text-slate-900 mb-2">深夜2時のバナナ補給</h3>
                    <p class="text-xs text-slate-600 leading-relaxed font-sans">
                        ペダル特訓に励むパイロットと夜更けの翼削り班。デスクに山積みされたバナナと高カロリーゼリーが、みんなの夢を前に進める燃料です。
                    </p>
                </div>

                <div class="p-8 rounded-3xl bg-white border border-stone-200 shadow-xs">
                    <span class="text-3xl mb-4 block">☔</span>
                    <h3 class="text-lg font-bold font-serif text-slate-900 mb-2">雨の日の傘立て警備</h3>
                    <p class="text-xs text-slate-600 leading-relaxed font-sans">
                        部室玄関に鎮座する立体かさ立て。濡れた傘を健気に抱え込みながら、部員たちの無事な帰還をいつでも出迎えます。
                    </p>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         【06 WARDROBE】公式ポーズ & 衣装図鑑
         ファッションルックブック形式の全6ポーズ
         ============================================== -->
    <section id="wardrobe" class="py-28 sm:py-40 bg-slate-900 text-white relative">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="max-w-3xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-dark mb-4 text-sky-400 border-sky-400/30">06 / WARDROBE & MOOD</div>
                <h2 class="text-display-giant text-white font-brand-display">
                    LOOKBOOK
                    <span class="block text-2xl sm:text-4xl font-serif text-sky-400 font-medium mt-3">
                        公式ポーズ ＆ スタイリングコレクション。
                    </span>
                </h2>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                
                <div class="lg:col-span-6 flex flex-col items-center">
                    <div class="relative w-full aspect-square rounded-3xl bg-radial from-slate-800 to-slate-950 p-8 border border-slate-700 flex items-center justify-center shadow-2xl">
                        <img id="costume-preview-img" 
                             src="assets/images/tobito_pose_airplane.png" 
                             alt="衣装プレビュー" 
                             class="w-full max-h-[380px] object-contain drop-shadow-2xl transition-all duration-300">
                    </div>
                    <div class="mt-4 text-center">
                        <span id="costume-preview-badge" class="brand-pill brand-pill-dark text-xs">OFFICIAL FLIGHT</span>
                        <h4 id="costume-preview-name" class="text-xl font-bold font-serif text-white mt-2">飛行機ポーズ（空飛ぶトビト）</h4>
                        <p id="costume-preview-desc" class="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">両腕をいっぱいに広げて飛行機の真似をして大空を舞う公式ポーズ。</p>
                    </div>
                </div>

                <div class="lg:col-span-6 space-y-3">
                    <?php foreach ($costumes as $idx => $c): ?>
                    <div onclick="selectCostume('<?= e($c['id']) ?>', '<?= e($c['name']) ?>', '<?= e($c['badge']) ?>', '<?= e($c['desc']) ?>', this)"
                         class="lookbook-item <?= $idx === 0 ? 'active' : '' ?> p-4 rounded-2xl cursor-pointer flex items-center justify-between border border-slate-800 hover:border-sky-500/50 bg-slate-950/40">
                        <div class="flex items-center gap-4">
                            <span class="font-brand-mono text-xs text-sky-400 font-bold">LOOK 0<?= $idx + 1 ?></span>
                            <div>
                                <h5 class="text-sm font-bold text-white font-serif"><?= e($c['name']) ?></h5>
                                <span class="text-[11px] text-slate-400"><?= e($c['role']) ?></span>
                            </div>
                        </div>
                        <span class="text-slate-500 text-xs font-brand-mono font-bold tracking-widest uppercase"><?= e($c['badge']) ?></span>
                    </div>
                    <?php endforeach; ?>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         【07 PLAY GROUND & 08 AI TERMINAL】とび斗くんの世界で遊ぶ
         3Dフライト ⇄ やきとり脱出 ＆ 【バグ完全修正済み】AIターミナル
         ============================================== -->
    <section id="play" class="py-28 sm:py-40 bg-[#0b1120] text-white relative overflow-hidden border-t border-slate-800">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="max-w-3xl mb-12 sm:mb-16">
                <div class="brand-pill brand-pill-dark mb-4 text-amber-400 border-amber-500/30">07 / PLAY GROUND</div>
                <h2 class="text-display-giant text-white font-brand-display">
                    PLAY WORLD
                    <span class="block text-2xl sm:text-4xl font-serif text-amber-400 font-medium mt-3">
                        とび斗くんの世界で遊ぶ。
                    </span>
                </h2>
                <p class="editorial-lead text-slate-300 mt-6 font-serif">
                    大空を滑空する爽快フライトから、コミカルな脱出ゲームまで。<br class="hidden sm:inline">
                    ブラウザでそのまま遊べる、とび斗くんの特設ゲームセンター。
                </p>
            </div>

            <!-- ゲームタブ切り替え -->
            <div class="flex items-center gap-3 mb-8">
                <button onclick="switchGameTab('flight')" id="tab-game-flight" class="px-6 py-2.5 rounded-full font-brand-mono text-xs font-bold transition-all bg-sky-500 text-white shadow-sm active">
                    ✈️ 3D FLIGHT SIMULATOR
                </button>
                <button onclick="switchGameTab('yakitori')" id="tab-game-yakitori" class="px-6 py-2.5 rounded-full font-brand-mono text-xs font-bold transition-all bg-slate-800 text-slate-300 hover:text-white">
                    🔥 YAKITORI ESCAPE
                </button>
            </div>

            <!-- ゲームキャンバス -->
            <div class="rounded-3xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl mb-16">
                <div id="game-view-flight" class="relative">
                    <canvas id="tobito-game-canvas" width="800" height="450" class="w-full h-auto block cursor-crosshair select-none touch-manipulation" data-img-src="assets/images/tobito_pose_airplane.png"></canvas>
                </div>
                <div id="game-view-yakitori" class="hidden relative">
                    <canvas id="yakitori-game-canvas" width="800" height="450" class="w-full h-auto block cursor-crosshair select-none"></canvas>
                </div>
            </div>

            <!-- ==============================================
                 【08 AI TERMINAL】Hangar OS 擬似ローカルAI ターミナル
                 (バグ修正: input → submit → process → clear → focus の完全フロー)
                 ============================================== -->
            <div class="p-6 sm:p-10 rounded-3xl bg-[#070b14] border border-emerald-500/40 shadow-2xl font-brand-mono">
                <!-- ターミナルバー -->
                <div class="flex items-center justify-between pb-4 border-b border-emerald-500/20 mb-6">
                    <div class="flex items-center gap-3">
                        <span class="w-3 h-3 rounded-full bg-red-500"></span>
                        <span class="w-3 h-3 rounded-full bg-yellow-500"></span>
                        <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
                        <span class="font-bold text-emerald-400 tracking-wider ml-2 text-xs sm:text-sm">TBT HANGAR-OS // TOBITO AI CONSOLE</span>
                    </div>
                    <span class="text-[10px] text-slate-500">v2.6.4 (tty1)</span>
                </div>

                <!-- ログ出力ボディ -->
                <div id="hangar-terminal-body" class="h-64 sm:h-72 overflow-y-auto space-y-2 pr-2 text-xs text-emerald-300/90 leading-relaxed">
                    <p class="text-slate-500">Team Birdman Trial - Hangar OS v2.6.4</p>
                    <p class="text-slate-500">Type 'help' for system commands, or talk naturally to Tobito.</p>
                    <div class="text-emerald-400 font-bold py-1">
                        とび斗くん: 「やあ！ぼくはTBT公式マスコットのとび斗くんだトビ。なんでも話しかけてね！」
                    </div>
                </div>

                <!-- コマンド入力フォーム (バグ修正: 送信後に文字を完全に消去してフォーカス) -->
                <form id="hangar-terminal-form" onsubmit="submitHangarTerminalInput(event); return false;" class="pt-4 border-t border-emerald-500/20 flex items-center gap-2">
                    <span class="text-emerald-400 font-bold text-xs shrink-0 select-none">tobito@hangar:~$</span>
                    <input type="text" 
                           id="hangar-terminal-input" 
                           placeholder="質問や挨拶を入力... (例: こんばんは、バナナ、help)" 
                           autocomplete="off"
                           spellcheck="false"
                           class="flex-1 bg-transparent border-none outline-none text-emerald-200 font-brand-mono text-xs sm:text-sm focus:outline-none placeholder-emerald-800">
                    <button type="submit" class="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold text-xs transition active:scale-95">
                        SEND ↵
                    </button>
                </form>
            </div>

        </div>
    </section>


    <!-- ==============================================
         【09 COMMUNITY】声をつなぐ
         コクピット無線 ＆ フライトフィード ＆ 応援掲示板
         ============================================== -->
    <section id="community" class="py-28 sm:py-40 bg-white relative border-b border-slate-200">
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div class="max-w-3xl mb-16 sm:mb-24">
                <div class="brand-pill brand-pill-sky mb-4">08 / VOICES & SIGNALS</div>
                <h2 class="text-jp-giant text-slate-900 leading-tight">
                    つながる、応援する、<br class="hidden sm:inline">声を届ける。
                </h2>
                <p class="editorial-lead text-slate-600 mt-6 font-serif">
                    大空を目指す仲間たちのリアルな声がここに集まります。
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
                
                <!-- 左: コクピット無線 & フライトフィード -->
                <div class="lg:col-span-6 space-y-8">
                    
                    <div class="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-md">
                        <div class="flex items-center justify-between mb-4">
                            <span class="font-brand-mono text-xs font-bold text-sky-400 tracking-wider">🎙️ COCKPIT RADIO // INTERCOM</span>
                            <span class="text-[10px] font-brand-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">WEBRTC VOICE</span>
                        </div>
                        <p class="text-xs text-slate-300 mb-4 leading-relaxed font-sans">
                            ブラウザ上でワンクリック接続。パイロット気分で音声をやり取りできるTBT公式インターコム。
                        </p>
                        <div class="flex items-center gap-3">
                            <button id="radio-ptt-btn" class="px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 font-bold text-xs tracking-wider uppercase transition shadow-sm">
                                接続 / PTT TALK
                            </button>
                            <span id="radio-status-text" class="text-xs font-brand-mono text-slate-400">STANDBY (OFF AIR)</span>
                        </div>
                    </div>

                    <div class="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200">
                        <span class="font-brand-mono text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">FLIGHT FEED // LIVE TIMELINE</span>
                        
                        <form id="feed-form" class="mb-6 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                            <input type="text" id="feed-author" placeholder="ニックネーム" maxlength="20" class="w-full mb-2 px-3 py-1.5 text-xs rounded border border-slate-200">
                            <textarea id="feed-text" placeholder="フライトへのメッセージ（140字以内）" maxlength="140" rows="2" class="w-full px-3 py-1.5 text-xs rounded border border-slate-200 mb-2"></textarea>
                            <button type="submit" class="w-full py-1.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition">送信する</button>
                        </form>

                        <div id="feed-list" class="space-y-3 max-h-80 overflow-y-auto pr-1">
                            <!-- tbt-flight-feed.js がレンダリング -->
                        </div>
                    </div>

                </div>

                <!-- 右: 応援メッセージ掲示板 -->
                <div class="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-amber-50/40 border border-amber-200/60 flex flex-col justify-between">
                    <div>
                        <span class="font-brand-mono text-xs font-bold text-amber-700 tracking-wider block mb-2">CHEER BOARD // 応援メッセージ</span>
                        <h3 class="text-2xl font-bold text-slate-900 font-serif mb-4">パイロット ＆ とび斗くんへエールを送る</h3>
                        
                        <form id="cheer-form" class="mb-6 space-y-3 p-4 rounded-2xl bg-white border border-amber-200/60 shadow-xs">
                            <input type="text" id="cheer-name" name="author_name" placeholder="お名前 / ニックネーム" maxlength="30" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200">
                            <textarea id="cheer-message" name="cheer_message" placeholder="応援メッセージを入力してください..." maxlength="500" rows="3" class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200"></textarea>
                            <button type="submit" class="w-full py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition shadow-sm">エールを届ける 🕊️</button>
                        </form>

                        <div id="cheer-messages-container" class="space-y-4 max-h-80 overflow-y-auto pr-1">
                            <?php foreach ($messages as $msg): ?>
                            <div class="p-4 rounded-2xl bg-white border border-amber-100/80 shadow-xs">
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="font-bold text-xs text-slate-800 font-serif"><?= e($msg['name'] ?? $msg['author'] ?? 'ファン') ?></span>
                                    <span class="text-[10px] font-brand-mono text-slate-400"><?= e($msg['date'] ?? '') ?></span>
                                </div>
                                <p class="text-xs text-slate-600 leading-relaxed"><?= nl2br(e($msg['message'] ?? '')) ?></p>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         【10 EPILOGUE】とび斗くんからのメッセージ
         静かな余韻と、公式SNSリンク
         ============================================== -->
    <section id="ending" class="py-28 sm:py-40 bg-slate-950 text-white relative overflow-hidden">
        
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            
            <div class="inline-block p-4 rounded-full bg-sky-500/20 border border-sky-400/30 mb-8 animate-bounce">
                <span class="text-3xl">🕊️</span>
            </div>

            <h2 class="text-display-giant text-white font-brand-display mb-6">
                FLY BEYOND.
            </h2>

            <div class="bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 backdrop-blur-md text-left max-w-2xl mx-auto shadow-2xl mb-12">
                <span class="font-brand-mono text-xs text-sky-400 font-bold uppercase tracking-widest block mb-4">MESSAGE FROM TOBITO</span>
                <p class="text-lg sm:text-xl font-serif text-slate-200 leading-relaxed mb-6">
                    「ペダルを踏めば、夢は前に進むトビ！<br>
                    たとえ飛べない鳥だって、みんなで翼をつくれば、どこまでも高く翔べるんだトビ。<br>
                    きみも、ぼくたちと一緒に大空を目指そうトビ！」
                </p>
                <div class="text-right font-serif font-bold text-sky-300">
                    —— TBT公式マスコット とび斗くん
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-4 text-xs font-brand-mono">
                <a href="<?= e($team['sns_x']) ?>" target="_blank" rel="noopener" class="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center gap-2">
                    <span>X (Twitter)</span>
                </a>
                <a href="<?= e($team['sns_instagram']) ?>" target="_blank" rel="noopener" class="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center gap-2">
                    <span>Instagram</span>
                </a>
                <a href="<?= e($team['sns_youtube']) ?>" target="_blank" rel="noopener" class="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition border border-white/10 flex items-center gap-2">
                    <span>YouTube</span>
                </a>
                <a href="<?= e($team['url']) ?>" target="_blank" rel="noopener" class="px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white transition font-bold flex items-center gap-2">
                    <span>TBT OFFICIAL SITE ↗</span>
                </a>
            </div>

        </div>
    </section>

</main>

<!-- Active Theory WebGL ライトボックスモーダル -->
<div id="archive-lightbox" class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="relative max-w-4xl w-full bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
        <button onclick="closeArchiveLightbox()" class="absolute top-6 right-6 text-slate-400 hover:text-white text-2xl font-bold font-brand-mono">✕</button>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div class="flex items-center justify-center bg-black/50 rounded-2xl p-4">
                <img id="lightbox-img" src="" alt="" class="max-h-80 w-auto object-contain">
            </div>
            <div class="space-y-4">
                <span id="lightbox-code" class="font-brand-mono text-xs text-cyan-400 font-bold"></span>
                <h3 id="lightbox-title" class="text-2xl font-bold font-serif text-white"></h3>
                <p id="lightbox-desc" class="text-sm text-slate-300 leading-relaxed"></p>
                <div class="pt-4 border-t border-slate-800 font-brand-mono text-xs text-slate-400 space-y-1">
                    <p id="lightbox-spec"></p>
                    <p id="lightbox-recorded"></p>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- ==============================================
     インラインJavaScript: インタラクション & 【バグ修正済みAIターミナル】
     ============================================== -->
<script>
    // 1. 表情ポートレート変更
    window.changeAboutMood = function(imgSrc) {
        const el = document.getElementById('about-portrait-img');
        if (el) {
            el.style.opacity = '0';
            setTimeout(() => {
                el.src = imgSrc;
                el.style.opacity = '1';
            }, 150);
        }
    };

    // 2. ボイスフレーズ再生
    const tobitoPhrases = [
        "「ペダルを踏めば、夢は前に進むトビ！」",
        "「風をつかむトビ！琵琶湖の対岸へいくトビ！」",
        "「1ミリの削り出し、みんなの汗がぼくのパワーだトビ！」",
        "「空を飛びたい気持ちに、限界なんてないトビ！」"
    ];

    window.playTobitoVoice = function() {
        if (window.tobitoCompanion && window.tobitoCompanion.playChirpSound) {
            window.tobitoCompanion.playChirpSound();
        }
        const q = tobitoPhrases[Math.floor(Math.random() * tobitoPhrases.length)];
        const el = document.getElementById('voice-quote-text');
        if (el) {
            el.textContent = q;
            el.classList.add('text-sky-600');
            setTimeout(() => el.classList.remove('text-sky-600'), 600);
        }
    };

    // 3. ルックブックセレクター
    window.selectCostume = function(id, name, badge, desc, itemEl) {
        document.querySelectorAll('.lookbook-item').forEach(el => el.classList.remove('active'));
        if (itemEl) itemEl.classList.add('active');

        const imgEl = document.getElementById('costume-preview-img');
        const nameEl = document.getElementById('costume-preview-name');
        const badgeEl = document.getElementById('costume-preview-badge');
        const descEl = document.getElementById('costume-preview-desc');

        if (imgEl) {
            imgEl.style.opacity = '0';
            setTimeout(() => {
                imgEl.src = 'assets/images/' + id;
                imgEl.style.opacity = '1';
            }, 150);
        }
        if (nameEl) nameEl.textContent = name;
        if (badgeEl) badgeEl.textContent = badge;
        if (descEl) descEl.textContent = desc;
    };

    // 4. ゲームタブ切り替え
    window.switchGameTab = function(tabName) {
        const flightView = document.getElementById('game-view-flight');
        const yakitoriView = document.getElementById('game-view-yakitori');
        const btnFlight = document.getElementById('tab-game-flight');
        const btnYakitori = document.getElementById('tab-game-yakitori');

        if (tabName === 'yakitori') {
            if (flightView) flightView.classList.add('hidden');
            if (yakitoriView) yakitoriView.classList.remove('hidden');
            if (btnFlight) {
                btnFlight.classList.remove('bg-sky-500', 'text-white');
                btnFlight.classList.add('bg-slate-800', 'text-slate-300');
            }
            if (btnYakitori) {
                btnYakitori.classList.remove('bg-slate-800', 'text-slate-300');
                btnYakitori.classList.add('bg-sky-500', 'text-white');
            }
            if (!window.yakitoriGame && document.getElementById('yakitori-game-canvas') && window.YakitoriGame) {
                window.yakitoriGame = new window.YakitoriGame('yakitori-game-canvas');
            }
        } else {
            if (flightView) flightView.classList.remove('hidden');
            if (yakitoriView) yakitoriView.classList.add('hidden');
            if (btnFlight) {
                btnFlight.classList.add('bg-sky-500', 'text-white');
                btnFlight.classList.remove('bg-slate-800', 'text-slate-300');
            }
            if (btnYakitori) {
                btnYakitori.classList.add('bg-slate-800', 'text-slate-300');
                btnYakitori.classList.remove('bg-sky-500', 'text-white');
            }
        }
    };

    // ==============================================
    // 5. 【AIターミナル バグ修正】
    // input → submit → process → clear → focus の完全フロー
    // ==============================================
    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    window.submitHangarTerminalInput = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        const input = document.getElementById('hangar-terminal-input');
        if (!input) return;
        
        const rawText = input.value;
        const text = rawText.trim();
        
        // 送信直後に入力欄を完全にクリア（残存バグの根絶）
        input.value = '';

        if (!text) {
            input.focus();
            return;
        }

        const body = document.getElementById('hangar-terminal-body');
        if (body) {
            // ユーザーメッセージの追加
            const userLine = document.createElement('div');
            userLine.className = 'text-white flex items-start gap-2 py-0.5';
            userLine.innerHTML = `<span class="text-emerald-400 font-bold shrink-0">tobito@hangar:~$</span><span class="break-words">${escapeHtml(text)}</span>`;
            body.appendChild(userLine);
            body.scrollTop = body.scrollHeight;

            // 思考インジケータ
            const thinkingLine = document.createElement('div');
            thinkingLine.className = 'text-sky-400 animate-pulse text-xs py-0.5 flex items-center gap-2';
            thinkingLine.innerHTML = `<span class="w-2 h-2 rounded-full bg-sky-400"></span><span>[TOBITO-AI] 思考中...</span>`;
            body.appendChild(thinkingLine);
            body.scrollTop = body.scrollHeight;

            if (window.tbtSound && window.tbtSound.playBeep) {
                window.tbtSound.playBeep(640);
            }

            // AI思考ウェイト
            setTimeout(() => {
                if (thinkingLine.parentNode) {
                    thinkingLine.parentNode.removeChild(thinkingLine);
                }

                // 返答生成
                let reply = '';
                if (typeof generateTobitoReply === 'function') {
                    reply = generateTobitoReply(text);
                } else if (window.tbtTerminal && typeof window.tbtTerminal.getTobitoAIResponse === 'function') {
                    reply = window.tbtTerminal.getTobitoAIResponse(text);
                } else {
                    reply = 'ぼくはTBT公式マスコットのとび斗くんだトビ！琵琶湖の空をみんなで飛ぶのが夢なんだトビ！';
                }

                const botLine = document.createElement('div');
                botLine.className = 'text-emerald-300 font-sans py-0.5 space-y-0.5 leading-relaxed';
                botLine.innerHTML = `<span class="text-amber-300 font-bold font-mono">[tobito-ai]:</span> <span class="text-slate-100">${reply}</span>`;
                body.appendChild(botLine);
                body.scrollTop = body.scrollHeight;

                if (window.tbtSound && window.tbtSound.playTobitoReaction) {
                    window.tbtSound.playTobitoReaction('smile');
                }

                // 応答完了後に入力欄を確実にクリア＆再フォーカス
                input.value = '';
                input.focus();
            }, 350);
        }

        // 入力欄をクリアしてプロンプト状態 tobito@hangar:~$ _ に戻しフォーカス
        input.value = '';
        input.focus();
    };

    // 6. Active Theory ライトボックス
    window.openArchiveLightbox = function(index) {
        const modal = document.getElementById('archive-lightbox');
        if (!modal) return;
        const archives = <?= json_encode($archives, JSON_UNESCAPED_UNICODE) ?>;
        const item = archives[index];
        if (!item) return;

        document.getElementById('lightbox-img').src = 'assets/images/' + item.id;
        document.getElementById('lightbox-code').textContent = item.code || '';
        document.getElementById('lightbox-title').textContent = item.story_title || item.item_name || '';
        document.getElementById('lightbox-desc').textContent = item.story_text || '';
        document.getElementById('lightbox-spec').textContent = 'SPEC: ' + (item.specs || '');
        document.getElementById('lightbox-recorded').textContent = 'RECORDED BY: ' + (item.recorded_by || '');
        modal.classList.remove('hidden');
    };

    window.closeArchiveLightbox = function() {
        const modal = document.getElementById('archive-lightbox');
        if (modal) modal.classList.add('hidden');
    };

    // 初期化
    document.addEventListener('DOMContentLoaded', () => {
        // 3Dフライトゲーム初期化
        if (!window.tobitoGame && document.getElementById('tobito-game-canvas')) {
            const GameClass = window.TobitoFlightSimulator3D || window.TobitoFlightGame;
            if (GameClass) {
                window.tobitoGame = new GameClass('tobito-game-canvas');
            }
        }

        // 風洞シミュレーター初期化
        if (!window.windTunnelSim && document.getElementById('wind-tunnel-canvas-container') && window.WindTunnelSimulator) {
            window.windTunnelSim = new window.WindTunnelSimulator('wind-tunnel-canvas-container');
        }

        // Active Theory アーカイブ初期化
        if (!window.atArchive && document.getElementById('at-canvas') && window.ActiveTheoryArchive) {
            window.atArchive = new window.ActiveTheoryArchive('at-canvas');
        }

        // AIターミナル入力キーバインド確認
        const termInput = document.getElementById('hangar-terminal-input');
        if (termInput) {
            termInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    window.submitHangarTerminalInput(e);
                }
            });
        }
    });
</script>

<?php
// 共通フッター読み込み
require_once __DIR__ . '/includes/footer.php';
?>
'''

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("New editorial index.php generated successfully!")

if __name__ == '__main__':
    generate_index_php()
