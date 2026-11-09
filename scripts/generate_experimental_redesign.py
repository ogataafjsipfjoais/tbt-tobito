import os

def generate_experimental_redesign():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_path = os.path.join(base_dir, 'index.php')

    html_content = '''<?php
/**
 * Team Birdman Trial (TBT) - 公式マスコット「とび斗くん」公式Webサイト
 * 
 * アートディレクション:
 * THE AIRCRAFT ATELIER (飛行機工房 × 実験的エディトリアル)
 * TOBITO-KUN × TEAM BIRDMAN TRIAL × HUMAN-POWERED AIRCRAFT × DIGITAL ART
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
     ARCHITECTURAL STUDIO TOP NAVIGATION
     ============================================== -->
<nav class="atelier-top-nav py-2.5 px-4 sm:px-8 border-b border-slate-200/80">
    <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <span class="tech-meta-stamp font-mono text-[10px] text-slate-500 font-bold tracking-widest hidden sm:inline-flex">
                <span class="pulse-dot"></span>
                <span>TBT AERO ATELIER // 35°17'53"N 136°04'57"E</span>
            </span>
            <span class="atelier-vermilion-stamp text-[9px] py-0.5 px-1.5">EXPERIMENTAL</span>
        </div>

        <div class="hidden lg:flex items-center gap-6 font-mono text-xs text-slate-600 font-semibold tracking-wider">
            <a href="#entrance" class="hover:text-sky-600 transition">01 ENTRANCE</a>
            <a href="#workshop" class="hover:text-sky-600 transition">02 WORKSHOP</a>
            <a href="#airframe" class="hover:text-sky-600 transition">03 S-320</a>
            <a href="#aerolab" class="hover:text-sky-600 transition">04 AERO LAB</a>
            <a href="#tobito" class="hover:text-sky-600 transition">05 TOBITO</a>
            <a href="#flight" class="hover:text-sky-600 transition">06 FLIGHT</a>
            <a href="#archive" class="hover:text-sky-600 transition">07 ARCHIVE</a>
            <a href="#terminal" class="hover:text-sky-600 transition">08 TERMINAL</a>
        </div>

        <div class="flex items-center gap-2">
            <button onclick="window.tbtTerminal && window.tbtTerminal.open()" class="px-2.5 py-1 rounded bg-slate-900 text-cyan-300 font-mono text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                <span>TOBITO@HANGAR</span>
            </button>
            <div class="flex items-center bg-slate-200/80 rounded px-1.5 py-0.5 font-mono text-[10px]">
                <button onclick="setFontSize('sm')" id="btn-font-sm" class="px-1 text-slate-500 hover:text-black">A-</button>
                <button onclick="setFontSize('base')" id="btn-font-base" class="px-1 text-sky-600 font-bold bg-white rounded shadow-xs">A</button>
                <button onclick="setFontSize('lg')" id="btn-font-lg" class="px-1 text-slate-500 hover:text-black">A+</button>
            </div>
            <button onclick="toggleLanguage()" class="px-2 py-0.5 rounded bg-slate-200/80 font-mono text-[10px] text-slate-700 font-bold hover:bg-slate-300 transition" id="btn-lang-toggle">JA</button>
        </div>
    </div>
</nav>

<main class="space-y-0 overflow-x-hidden">

    <!-- ==============================================
         SCENE 01: THE ENTRANCE (巨大主翼 × 大胆なトリミング × 空白の美学)
         ============================================== -->
    <section id="entrance" class="min-h-screen relative flex flex-col justify-between p-6 sm:p-12 lg:p-16 atelier-paper-canvas overflow-hidden">
        
        <!-- 技術測定クロスヘア（四隅） -->
        <div class="tech-crosshair top-6 left-6 text-slate-400"></div>
        <div class="tech-crosshair top-6 right-6 text-slate-400"></div>
        <div class="tech-crosshair bottom-6 left-6 text-slate-400"></div>
        <div class="tech-crosshair bottom-6 right-6 text-slate-400"></div>

        <!-- 背景: 32m主翼CADワイヤーフレーム (透かし) -->
        <svg class="wing-spar-svg-wireframe" viewBox="0 0 1200 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="200" x2="1200" y2="200" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="8 4"/>
            <path d="M 50 200 C 300 120, 900 120, 1150 200 C 900 240, 300 240, 50 200 Z" stroke="#0f172a" stroke-width="2"/>
            <line x1="300" y1="140" x2="300" y2="230" stroke="#0284c7" stroke-width="1"/>
            <line x1="600" y1="120" x2="600" y2="240" stroke="#0284c7" stroke-width="1.5"/>
            <line x1="900" y1="140" x2="900" y2="230" stroke="#0284c7" stroke-width="1"/>
            <circle cx="600" cy="200" r="18" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="3 3"/>
            <text x="615" y="195" font-family="JetBrains Mono" font-size="12" fill="#dc2626" font-weight="bold">C.G. / AIRCRAFT DATUM</text>
            <text x="100" y="180" font-family="JetBrains Mono" font-size="11" fill="#64748b">SPAN: 32,040 mm // DAE-21 AIRFOIL</text>
        </svg>

        <!-- 規格外スケール: 画面右上から大胆にはみ出す巨大手描きとび斗くん -->
        <img src="assets/images/tobito_pose_airplane.png" 
             alt="とび斗くん" 
             class="atelier-mascot-hero">

        <!-- 上部ヘッダー情報 -->
        <div class="relative z-10 max-w-xl">
            <div class="flex items-center gap-3 mb-4">
                <span class="atelier-vermilion-stamp">TBT SPEC // PASS</span>
                <span class="font-mono text-xs text-slate-500 tracking-widest font-semibold uppercase">DOC-REF: TBT-AERO-2026-X</span>
            </div>
            <p class="font-mono text-xs text-slate-500 tracking-wider">
                SHIBAURA INSTITUTE OF TECHNOLOGY // HUMAN-POWERED FLIGHT ATELIER
            </p>
        </div>

        <!-- 中央: 超巨大タイポグラフィと詩文 -->
        <div class="relative z-20 my-auto py-12 max-w-4xl">
            <div class="mb-3">
                <span class="font-mono text-xs sm:text-sm font-bold text-sky-700 tracking-[0.25em] uppercase">
                    THE PROLOGUE // 鳥人間コンテスト競技ディスタンス部門
                </span>
            </div>
            
            <h1 class="title-giant-atelier text-slate-900 mb-8">
                「飛ぶために、<br class="hidden sm:inline">つくる。」
            </h1>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-8 items-end border-t border-slate-300/80 pt-6">
                <div class="md:col-span-8">
                    <p class="font-serif text-slate-700 text-base sm:text-lg leading-relaxed font-medium">
                        滋賀県琵琶湖・鳥人間コンテスト。<br class="hidden sm:inline">
                        大会唯一の「二人乗り人力プロペラ機」を、木型からカーボンまで手作業で削り出す学生飛行機工房。<br class="hidden sm:inline">
                        飛べないはずのニワトリが、仲間の削り出した翼とともに風をつかむまでの手仕事の記録。
                    </p>
                </div>
                <div class="md:col-span-4 font-mono text-xs text-slate-500 space-y-1">
                    <div class="flex justify-between border-b border-slate-200 pb-1">
                        <span>CREW:</span>
                        <span class="font-bold text-slate-800">2 PILOTS TANDEM</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-200 pb-1">
                        <span>WINGSPAN:</span>
                        <span class="font-bold text-slate-800">32.04 M</span>
                    </div>
                    <div class="flex justify-between border-b border-slate-200 pb-1">
                        <span>EMPTY WEIGHT:</span>
                        <span class="font-bold text-slate-800">42.5 KG</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 下部: 寸法線と極小とび斗くん (強烈なスケール対比) -->
        <div class="relative z-10 pt-4">
            <div class="flex items-center justify-between mb-2 font-mono text-[11px] text-slate-500">
                <div class="flex items-center gap-3">
                    <img src="assets/images/tobito_pose_airplane.png" 
                         alt="ちいさなとび斗くん" 
                         class="atelier-mascot-perched"
                         onclick="window.playTobitoVoice && window.playTobitoVoice();"
                         title="クリックしてボイスを聞くトビ！">
                    <span>← DIMENSION DATUM // SCALE 1:1</span>
                </div>
                <span>SCROLL DOWN TO ENTER WORKSHOP ↓</span>
            </div>
            <div class="dimension-line-h"></div>
        </div>

    </section>


    <!-- ==============================================
         SCENE 02: THE WORKSHOP (素材と手仕事・アトリエの解剖図)
         ============================================== -->
    <section id="workshop" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 atelier-dark-canvas relative">
        
        <!-- 技術測定クロスヘア -->
        <div class="tech-crosshair top-8 left-8 text-slate-700"></div>
        <div class="tech-crosshair bottom-8 right-8 text-slate-700"></div>

        <div class="max-w-7xl mx-auto">
            
            <!-- セクション標識 -->
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-16">
                <div>
                    <span class="tech-meta-stamp text-sky-400">
                        <span class="pulse-dot"></span>
                        <span>02 // THE PHYSICAL WORKSHOP</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-white mt-2">
                        素材と手仕事の解剖図
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-400 text-right">
                    <span>LOCATION: OMIYA HANGAR</span><br>
                    <span>CFRP / BALSA / STYROFOAM / DAE-21</span>
                </div>
            </div>

            <!-- 職人とび斗くん ＆ 名言 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
                <div class="lg:col-span-5 flex justify-center">
                    <div class="relative p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-2xl">
                        <img src="assets/images/tobito_pose_crossed_arms.png" 
                             alt="腕組みとび斗くん" 
                             class="w-64 sm:w-80 object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.6)]">
                        <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-sky-500 text-slate-950 px-4 py-1 rounded-full font-mono text-xs font-bold whitespace-nowrap shadow-md">
                            CHIEF CRAFTSMAN TOBITO
                        </div>
                    </div>
                </div>
                
                <div class="lg:col-span-7 space-y-6">
                    <span class="atelier-vermilion-stamp">PHILOSOPHY</span>
                    <h3 class="text-2xl sm:text-4xl font-serif font-bold text-slate-100 leading-snug">
                        「1ミリ削るごとに、<br>空が1メートル近づくトビ。」
                    </h3>
                    <p class="font-serif text-slate-300 leading-relaxed text-sm sm:text-base">
                        ニワトリは本来、大空を渡ることのできない鳥。<br class="hidden sm:inline">
                        しかし人間もまた、翼を持たずに生まれた存在です。だからこそ、航空工学の叡智を注ぎ込み、夜通しカーボンを積層し、0.1ミリの狂いもなく翼リブを削り出す。仲間の汗と情熱のすべてが、琵琶湖の風を捉える翼になります。
                    </p>
                    <div class="pt-4 flex items-center gap-4">
                        <button onclick="playTobitoVoice()" class="px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold tracking-wider transition flex items-center gap-2 shadow-md">
                            <i class="fa-solid fa-volume-high"></i>
                            <span>VOICE / 職人の名言を聞く</span>
                        </button>
                        <span id="voice-quote-text" class="text-xs sm:text-sm font-serif text-sky-300 italic font-medium">
                            「ペダルを踏めば、夢は前に進むトビ！」
                        </span>
                    </div>
                </div>
            </div>

            <!-- 素材仕様クリップボード (3連インダストリアルカード) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                <!-- 仕様 01: メインスパー -->
                <div class="atelier-clipboard atelier-clipboard-dark p-8 rounded-2xl">
                    <div class="flex justify-between items-start mb-6">
                        <span class="font-mono text-xs text-sky-400 font-bold">SPEC-01 // SPAR</span>
                        <span class="atelier-vermilion-stamp text-[9px]">CFRP 130℃</span>
                    </div>
                    <h4 class="text-lg font-bold text-white mb-2 font-serif">CFRP ハイブリッド主桁</h4>
                    <p class="text-xs text-slate-400 leading-relaxed mb-6 font-mono">
                        熱硬化性炭素繊維プリプレグを130℃でオートクレーブ焼成。翼幅32mの超ロングスパンにおいて、翼端たわみ2.4mを許容する極限の軽量・高剛性ボックススパー。
                    </p>
                    <div class="border-t border-slate-800 pt-4 font-mono text-[11px] text-slate-500 space-y-1">
                        <div>DEFLECTION: 2,400 mm</div>
                        <div>TENSILE: 3,200 MPa</div>
                    </div>
                </div>

                <!-- 仕様 02: 翼リブ -->
                <div class="atelier-clipboard atelier-clipboard-dark p-8 rounded-2xl">
                    <div class="flex justify-between items-start mb-6">
                        <span class="font-mono text-xs text-sky-400 font-bold">SPEC-02 // RIBS</span>
                        <span class="atelier-vermilion-stamp text-[9px]">84 RIBS</span>
                    </div>
                    <h4 class="text-lg font-bold text-white mb-2 font-serif">バルサ＆スタイロ翼リブ</h4>
                    <p class="text-xs text-slate-400 leading-relaxed mb-6 font-mono">
                        高精度ニクロム線カッターにより1枚ずつ削り出した84枚のDAE-21翼型リブ。マイクロフィルムをピンと張り詰め、琵琶湖の微風でも確実な揚力を生み出します。
                    </p>
                    <div class="border-t border-slate-800 pt-4 font-mono text-[11px] text-slate-500 space-y-1">
                        <div>AIRFOIL: DAE-21 LAMINAR</div>
                        <div>TOLERANCE: ±0.15 mm</div>
                    </div>
                </div>

                <!-- 仕様 03: タンデム駆動 -->
                <div class="atelier-clipboard atelier-clipboard-dark p-8 rounded-2xl">
                    <div class="flex justify-between items-start mb-6">
                        <span class="font-mono text-xs text-sky-400 font-bold">SPEC-03 // DRIVE</span>
                        <span class="atelier-vermilion-stamp text-[9px]">420W TANDEM</span>
                    </div>
                    <h4 class="text-lg font-bold text-white mb-2 font-serif">二人乗りタンデム直結駆動</h4>
                    <p class="text-xs text-slate-400 leading-relaxed mb-6 font-mono">
                        前席と後席のパイロット2名が直列タンデム配置。ペダリング出力をカーボン中空シャフトで直結統合し、直径2.9mの巨大低回転プロペラへ効率92%で伝達。
                    </p>
                    <div class="border-t border-slate-800 pt-4 font-mono text-[11px] text-slate-500 space-y-1">
                        <div>POWER SYNERGY: 420 ~ 600 W</div>
                        <div>PROP DIAMETER: 2,900 mm</div>
                    </div>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 03: THE AIRFRAME S-320 (実機 3Dインタラクティブ・ビューア)
         ============================================== -->
    <section id="airframe" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 bg-[#080b11] text-white relative border-t border-b border-slate-800">
        
        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-wrap items-center justify-between gap-4 mb-8">
                <div>
                    <span class="tech-meta-stamp text-cyan-400">
                        <span class="pulse-dot"></span>
                        <span>03 // 3D AIRFRAME TELEMETRY</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-white mt-2">
                        実機 S-320 3Dモデルビューア
                    </h2>
                </div>
                <div class="flex items-center gap-3">
                    <span class="hud-telemetry-badge">
                        <span>PITCH:</span>
                        <span id="hud-pitch" class="text-white font-bold">0.0°</span>
                    </span>
                    <span class="hud-telemetry-badge">
                        <span>ROLL:</span>
                        <span id="hud-roll" class="text-white font-bold">0.0°</span>
                    </span>
                    <span class="hud-telemetry-badge">
                        <span>YAW:</span>
                        <span id="hud-yaw" class="text-white font-bold">0.0°</span>
                    </span>
                </div>
            </div>

            <!-- 3D Canvas 埋め込みコンテナ -->
            <div class="relative w-full aspect-16/9 min-h-[480px] max-h-[720px] rounded-3xl bg-radial from-slate-900/90 to-[#04060a] border border-cyan-500/30 overflow-hidden shadow-2xl flex items-center justify-center">
                
                <canvas id="aircraft-canvas" class="w-full h-full block cursor-grab active:cursor-grabbing"></canvas>

                <!-- 操作ヒント -->
                <div class="absolute bottom-6 left-6 z-20 font-mono text-xs text-slate-400 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 backdrop-blur-md flex items-center gap-2">
                    <i class="fa-solid fa-arrows-rotate text-cyan-400 animate-spin"></i>
                    <span>ドラッグで機体を360°回転 / ホイールでズーム</span>
                </div>

                <div class="absolute top-6 right-6 z-20 font-mono text-[11px] text-cyan-300 bg-cyan-950/70 px-3 py-1.5 rounded-lg border border-cyan-500/40">
                    CAD MODEL: S-320 (REV.4) // COMPLETE ASSEMBLY
                </div>
            </div>

            <!-- スペックストリップ -->
            <div class="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div class="text-slate-400">WINGSPAN</div>
                    <div class="text-xl font-bold text-cyan-300 mt-1">32.04 m</div>
                </div>
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div class="text-slate-400">TOTAL WEIGHT</div>
                    <div class="text-xl font-bold text-cyan-300 mt-1">42.5 kg</div>
                </div>
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div class="text-slate-400">GLIDE RATIO (L/D)</div>
                    <div class="text-xl font-bold text-cyan-300 mt-1">34 : 1</div>
                </div>
                <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <div class="text-slate-400">CRUISE VELOCITY</div>
                    <div class="text-xl font-bold text-cyan-300 mt-1">10.5 m/s</div>
                </div>
            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 04: THE AERODYNAMICS LAB (2,400流線 風洞シミュレーター)
         ============================================== -->
    <section id="aerolab" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 atelier-paper-canvas relative">
        
        <div class="tech-crosshair top-8 left-8 text-slate-400"></div>
        <div class="tech-crosshair bottom-8 right-8 text-slate-400"></div>

        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 pb-6 mb-12">
                <div>
                    <span class="tech-meta-stamp text-sky-600">
                        <span class="pulse-dot"></span>
                        <span>04 // AERODYNAMICS LABORATORY</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-slate-900 mt-2">
                        2,400流線 リアルタイム風洞
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-500 text-right">
                    <span>NUMERICAL FLOW SIMULATION</span><br>
                    <span>REYNOLDS NUMBER: 4.5 × 10⁵</span>
                </div>
            </div>

            <!-- 風洞シミュレーターキャンバス -->
            <div class="relative w-full aspect-16/9 min-h-[460px] max-h-[680px] rounded-3xl bg-[#090d16] border border-slate-800 overflow-hidden shadow-xl" id="wind-tunnel-canvas-container">
                <!-- wind-tunnel.js がここにキャンバスを生成 -->
            </div>

            <div class="mt-8 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-wrap items-center justify-between gap-6 font-mono text-xs text-slate-600">
                <div class="flex items-center gap-3">
                    <span class="atelier-vermilion-stamp">AIRFOIL ANALYSIS</span>
                    <span class="font-bold text-slate-900 font-serif">DAE-21 低レイノルズ数高揚力翼型</span>
                </div>
                <div>
                    <span>最適迎角: <strong>4.2°</strong> ｜ 揚抗比最大化: <strong>Cl/Cd = 38.5</strong></span>
                </div>
            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 05: TOBITO'S WORLD (キャラクターの真実・守り神・4つの表情)
         ============================================== -->
    <section id="tobito" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 bg-white relative">
        
        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-16">
                <div>
                    <span class="tech-meta-stamp text-sky-600">
                        <span class="pulse-dot"></span>
                        <span>05 // CHARACTER DOSSIER</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-slate-900 mt-2">
                        マスコット「とび斗くん」の秘密
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-400 text-right">
                    <span>NAME: TOBITO (1994 ~ PRESENT)</span><br>
                    <span>GUARDIAN OF TBT HANGAR</span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                
                <!-- 左カラム: 実物大立体FRP像 (傘立て) -->
                <div class="lg:col-span-5 space-y-6">
                    <div class="relative p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm">
                        <img src="assets/images/tobito_stand_umbrella.png" 
                             alt="トビト君かさ立て" 
                             class="w-full max-h-[460px] object-contain drop-shadow-md">
                        <div class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center font-mono text-xs">
                            <span class="text-slate-500">TBT-OBJ-06 // FRP SCULPTURE</span>
                            <span class="atelier-vermilion-stamp text-[9px]">REAL ATELIER STATUE</span>
                        </div>
                    </div>
                    <p class="font-serif text-xs sm:text-sm text-slate-600 leading-relaxed">
                        <strong>【部室の守り神：トビト君かさ立て】</strong><br>
                        2019年秋のフェアリング成形講習会で余ったFRPから受肉した実寸大立体像。雨の日も風の日も、部室の玄関で傘を抱えて部員たちの無事を見守り続けています。
                    </p>
                </div>

                <!-- 右カラム: 4つの手描き表情インタラクション & 豆知識 -->
                <div class="lg:col-span-7 space-y-8">
                    
                    <div>
                        <span class="font-mono text-xs text-slate-400 uppercase tracking-widest block mb-3">
                            INSPECT HAND-DRAWN EXPRESSIONS // 4つの手描き表情パレット
                        </span>
                        <div class="flex items-center gap-4">
                            <button onclick="changeAboutMood('assets/images/tobito_pose_crossed_arms.png')" class="w-14 h-14 rounded-2xl border-2 border-sky-500 bg-white p-2 shadow-xs hover:scale-110 transition" title="真剣な眼差し">
                                <img src="assets/images/tobito_face_normal.png" alt="通常" class="w-full h-full object-contain">
                            </button>
                            <button onclick="changeAboutMood('assets/images/tobito_face_smile.png')" class="w-14 h-14 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs hover:scale-110 transition" title="笑顔">
                                <img src="assets/images/tobito_face_smile.png" alt="笑顔" class="w-full h-full object-contain">
                            </button>
                            <button onclick="changeAboutMood('assets/images/tobito_face_angry.png')" class="w-14 h-14 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs hover:scale-110 transition" title="気合">
                                <img src="assets/images/tobito_face_angry.png" alt="気合" class="w-full h-full object-contain">
                            </button>
                            <button onclick="changeAboutMood('assets/images/tobito_face_cry.png')" class="w-14 h-14 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs hover:scale-110 transition" title="涙">
                                <img src="assets/images/tobito_face_cry.png" alt="涙" class="w-full h-full object-contain">
                            </button>
                        </div>
                    </div>

                    <!-- 秘密手帳 Q&A -->
                    <div class="space-y-4 font-serif">
                        <div class="p-6 rounded-2xl bg-sky-50/70 border border-sky-100">
                            <h4 class="font-bold text-slate-900 mb-1">Q. 「なぜニワトリなの？」</h4>
                            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                「飛べない鳥」の代表格であるニワトリだからこそ、“人の知恵と手仕事で空を飛ぶ”という人力飛行機の原点・挑戦の象徴なのです。
                            </p>
                        </div>
                        <div class="p-6 rounded-2xl bg-sky-50/70 border border-sky-100">
                            <h4 class="font-bold text-slate-900 mb-1">Q. 「1号と2号がいるって本当？」</h4>
                            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                本当です。部室玄関を守るFRP製の「トビト君1号」と、イベント等で全国を巡る着ぐるみ仕様の「2号」が存在し、チームの歴史とともに大切に受け継がれています。
                            </p>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 06: FLIGHT SIMULATION (3D 琵琶湖フライト ＆ やきとり脱出)
         ============================================== -->
    <section id="flight" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 bg-[#0a0e17] text-white relative">
        
        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
                <div>
                    <span class="tech-meta-stamp text-sky-400">
                        <span class="pulse-dot"></span>
                        <span>06 // FLIGHT SIMULATION DECK</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-white mt-2">
                        琵琶湖フライト ＆ やきとり脱出
                    </h2>
                </div>

                <!-- タブ切り替えボタン -->
                <div class="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
                    <button type="button" id="tab-game-flight" onclick="switchGameTab('flight')" class="px-4 py-2 rounded-lg bg-sky-500 text-white font-mono text-xs font-bold transition">
                        3D 琵琶湖フライト
                    </button>
                    <button type="button" id="tab-game-yakitori" onclick="switchGameTab('yakitori')" class="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold hover:text-white transition">
                        2D やきとり脱出
                    </button>
                </div>
            </div>

            <!-- ゲームビューコンテナ -->
            <div class="relative w-full aspect-16/9 min-h-[480px] max-h-[700px] rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
                
                <!-- 3Dフライトシミュレーター -->
                <div id="game-view-flight" class="w-full h-full relative">
                    <canvas id="tobito-game-canvas" class="w-full h-full block"></canvas>
                </div>

                <!-- やきとりサバイバルゲーム -->
                <div id="game-view-yakitori" class="w-full h-full relative hidden">
                    <canvas id="yakitori-game-canvas" class="w-full h-full block"></canvas>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 07: THE ARCHIVE (ACTIVE THEORY 3D アーカイブ)
         ============================================== -->
    <section id="archive" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 bg-[#06080e] text-white relative">
        
        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-12">
                <div>
                    <span class="tech-meta-stamp text-cyan-400">
                        <span class="pulse-dot"></span>
                        <span>07 // ACTIVE THEORY 3D ARCHIVE</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-white mt-2">
                        原画・ステッカー・航空線画アーカイブ
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-400">
                    <span>3D PARTICLE INTERACTIVE SYSTEM</span>
                </div>
            </div>

            <div class="relative w-full aspect-16/9 min-h-[460px] max-h-[640px] rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
                <canvas id="at-canvas" class="w-full h-full block cursor-pointer"></canvas>
            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 08: THE WORKSHOP TERMINAL (TOBITO@HANGAR)
         ============================================== -->
    <section id="terminal" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 atelier-paper-canvas relative">
        
        <div class="max-w-4xl mx-auto">
            
            <div class="text-center mb-10">
                <span class="tech-meta-stamp text-sky-600 mb-2">
                    <span class="pulse-dot"></span>
                    <span>08 // WORKSHOP TERMINAL</span>
                </span>
                <h2 class="text-3xl sm:text-5xl font-bold font-serif text-slate-900">
                    TOBITO WORKSHOP TERMINAL
                </h2>
                <p class="font-mono text-xs text-slate-500 mt-2">
                    部室サーバー直結擬似AIコンソール ｜ 自然な日本語またはコマンドで会話できます
                </p>
            </div>

            <!-- インライン端末UI (バグ修正済: 送信後に即クリア & フォーカス復帰) -->
            <div class="rounded-3xl bg-[#070b14] border border-cyan-500/30 overflow-hidden shadow-2xl font-mono text-xs text-slate-200">
                <div class="h-12 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span class="font-bold text-white tracking-wider">tobito@hangar-os (tty1)</span>
                    </div>
                    <span class="text-[10px] text-slate-500">v2.6.4</span>
                </div>

                <div id="inline-term-body" class="p-6 h-72 overflow-y-auto space-y-2 leading-relaxed text-xs">
                    <div class="text-cyan-400 font-bold">=============================================================</div>
                    <div class="text-cyan-300 font-bold">  TEAM BIRDMAN TRIAL - TOBITO WORKSHOP CONSOLE</div>
                    <div class="text-cyan-400 font-bold">=============================================================</div>
                    <div class="text-slate-400">システム初期化完了。とび斗くんがスタンバイしています。</div>
                    <div class="text-amber-300 font-bold">とび斗くん: 「やあ！飛行機のこと、部室のこと、なんでも聞いてねトビ！」</div>
                </div>

                <div class="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
                    <span class="text-cyan-400 font-bold select-none">tobito@hangar:~$</span>
                    <input type="text" id="inline-term-input" 
                           class="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs focus:outline-none placeholder-slate-600" 
                           placeholder="メッセージを入力... (例: こんにちは、二人乗りについて教えて、help)" 
                           autocomplete="off">
                    <button type="button" id="inline-term-send" class="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-mono text-xs font-bold rounded-lg transition">
                        SEND
                    </button>
                </div>
            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 09: COMMS & COMMUNITY (無線通信 ＆ 応援掲示板)
         ============================================== -->
    <section id="community" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 bg-white relative border-t border-slate-200">
        
        <div class="max-w-7xl mx-auto">
            
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-16">
                <div>
                    <span class="tech-meta-stamp text-sky-600">
                        <span class="pulse-dot"></span>
                        <span>09 // COMMS & COMMUNITY</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-slate-900 mt-2">
                        コクピット無線 ＆ フライトフィード
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-400">
                    <span>LIVE SUPPORTER VOICES</span>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                
                <!-- コクピット無線 -->
                <div class="lg:col-span-5 space-y-6">
                    <div class="p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-lg">
                        <div class="flex justify-between items-center mb-6">
                            <span class="font-mono text-xs text-sky-400 font-bold">COCKPIT RADIO // PTT</span>
                            <span class="atelier-vermilion-stamp text-[9px]">WEBRTC AUDIO</span>
                        </div>
                        <h4 class="text-xl font-bold font-serif mb-2">コクピット無線（Push-To-Talk）</h4>
                        <p class="text-xs text-slate-400 leading-relaxed mb-6 font-mono">
                            長押ししている間だけ音声が送信される、航空機インターコム仕様のWeb音声通信。
                        </p>
                        <button type="button" id="radio-ptt-btn" class="w-full py-4 rounded-2xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-mono text-sm font-bold tracking-widest transition flex items-center justify-center gap-3 select-none">
                            <i class="fa-solid fa-microphone"></i>
                            <span>HOLD TO TALK (押しながら話す)</span>
                        </button>
                    </div>
                </div>

                <!-- 応援掲示板 & フィード -->
                <div class="lg:col-span-7 space-y-6">
                    <div class="p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm">
                        <h4 class="text-lg font-bold font-serif text-slate-900 mb-4">
                            フライトフィード ＆ 応援メッセージ
                        </h4>
                        
                        <!-- 投稿フォーム -->
                        <form id="cheer-form" class="space-y-4 mb-6">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input type="text" name="name" placeholder="お名前・コールサイン" class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs outline-none focus:border-sky-500">
                                <input type="text" name="message" placeholder="応援メッセージを入力..." class="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs outline-none focus:border-sky-500">
                            </div>
                            <button type="submit" class="px-6 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition">
                                メッセージを送信
                            </button>
                        </form>

                        <!-- メッセージ一覧 -->
                        <div id="cheer-messages-container" class="space-y-3 max-h-72 overflow-y-auto pr-1">
                            <?php if (!empty($messages)): ?>
                                <?php foreach ($messages as $c): ?>
                                    <div class="p-4 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                                        <div class="flex justify-between font-mono text-[10px] text-slate-400 mb-1">
                                            <span class="font-bold text-slate-700"><?= htmlspecialchars($c['author'] ?? $c['name'] ?? '鳥人間ファン', ENT_QUOTES, 'UTF-8') ?></span>
                                            <span><?= htmlspecialchars($c['date'] ?? date('Y.m.d'), ENT_QUOTES, 'UTF-8') ?></span>
                                        </div>
                                        <p class="text-slate-600 font-serif"><?= nl2br(htmlspecialchars($c['message'] ?? '', ENT_QUOTES, 'UTF-8')) ?></p>
                                    </div>
                                <?php endforeach; ?>
                            <?php else: ?>
                                <div class="text-center text-slate-400 py-6 font-mono text-xs">
                                    最初のメッセージを送信してみよう！🕊️
                                </div>
                            <?php endif; ?>
                        </div>

                    </div>
                </div>

            </div>

        </div>
    </section>

</main>

<!-- ==============================================
     ACTIVE THEORY LIGHTBOX MODAL
     ============================================== -->
<div id="archive-lightbox" class="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="relative max-w-2xl w-full bg-[#0c1017] border border-cyan-500/40 rounded-3xl p-6 text-white font-mono text-xs shadow-2xl">
        <button onclick="closeArchiveLightbox()" class="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg">✕</button>
        <img id="lightbox-img" src="" alt="" class="w-full h-64 object-contain rounded-xl bg-black/40 mb-4">
        <div id="lightbox-code" class="text-cyan-400 font-bold mb-1"></div>
        <div id="lightbox-title" class="text-lg font-bold text-white mb-2 font-serif"></div>
        <div id="lightbox-desc" class="text-slate-300 leading-relaxed mb-4"></div>
        <div id="lightbox-spec" class="text-slate-500 border-t border-slate-800 pt-2"></div>
        <div id="lightbox-recorded" class="text-slate-500"></div>
    </div>
</div>

<!-- ==============================================
     ENGINE SCRIPTS INCLUSION
     ============================================== -->
<script src="assets/js/flight-ranking.js"></script>
<script src="assets/js/game.js"></script>
<script src="assets/js/wind-tunnel.js"></script>
<script type="module" src="assets/js/s320-aig-hero.js"></script>
<script src="assets/js/yakitori-game.js"></script>
<script src="assets/js/archive-scroll.js"></script>
<script src="assets/js/tbt-hangar-console.js"></script>
<script src="assets/js/tobito-companion.js"></script>
<script src="assets/js/tbt-cheer-board.js"></script>
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
<script src="assets/js/tbt-cockpit-radio.js"></script>
<script src="assets/js/tbt-flight-feed.js"></script>
<script>
    window.activeTheoryArchivesData = <?= json_encode($archives, JSON_UNESCAPED_UNICODE) ?>;
</script>
<script src="assets/js/active-theory-archive.js"></script>

<script>
    // 1. 表情ポートレート変更
    window.changeAboutMood = function(imgSrc) {
        const el = document.getElementById('about-portrait-img');
        if (el) {
            el.src = imgSrc;
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
        }
    };

    // 3. ゲームタブ切り替え
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

    // 4. インラインターミナル送信処理（バグ修正済: 即クリア & フォーカス復帰）
    function handleInlineTermSubmit() {
        const input = document.getElementById('inline-term-input');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';
        input.focus();

        const body = document.getElementById('inline-term-body');
        if (body) {
            const userLine = document.createElement('div');
            userLine.className = 'text-white font-mono';
            userLine.textContent = 'user@tbt:~$ ' + text;
            body.appendChild(userLine);

            const reply = window.generateTobitoReply ? window.generateTobitoReply(text) : ('「' + text + ' か！ぼくも琵琶湖を飛ぶのが楽しみだトビ！」');
            const botLine = document.createElement('div');
            botLine.className = 'text-amber-300 font-bold font-mono';
            botLine.textContent = 'とび斗くん: ' + reply;
            body.appendChild(botLine);
            body.scrollTop = body.scrollHeight;
        }
        input.focus();
    }

    document.getElementById('inline-term-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleInlineTermSubmit();
        }
    });

    document.getElementById('inline-term-send')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleInlineTermSubmit();
    });

    // 5. Active Theory ライトボックス
    window.openArchiveLightbox = function(index) {
        const modal = document.getElementById('archive-lightbox');
        if (!modal) return;
        const archives = window.activeTheoryArchivesData || [];
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

    // 6. 各種シミュレーターDOM初期化
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
    });
</script>

<?php
// 共通フッター読み込み
require_once __DIR__ . '/includes/footer.php';
?>
'''

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    print(f"Generated experimental redesign at {target_path} (size: {len(html_content)} bytes)")

if __name__ == '__main__':
    generate_experimental_redesign()
