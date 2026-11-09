<?php
/**
 * Template Name: 公式マスコット とび斗くんの部屋
 * Template Post Type: page
 * 
 * WordPressのテーマ（tbt等）配下に配置して使用できる公式キャラクター自己紹介固定ページテンプレートです。
 * get_header() / get_footer() による共通ヘッダー・フッターを完全に継承します。
 */

// データ定義の読み込み
if (file_exists(__DIR__ . '/data.php')) {
    require_once __DIR__ . '/data.php';
} elseif (file_exists(__DIR__ . '/data-tobito.php')) {
    require_once __DIR__ . '/data-tobito.php';
}

// 応援メッセージの読み込み & 保存
$messageFile = __DIR__ . '/data/messages.json';
$messages = $default_cheers ?? [];
if (file_exists($messageFile)) {
    $json = file_get_contents($messageFile);
    $saved = json_decode($json, true);
    if (is_array($saved)) {
        $messages = $saved;
    }
}

// ランキングデータの読み込み & 保存
$rankingFile = __DIR__ . '/data/ranking.json';
$rankings = [];
if (file_exists($rankingFile)) {
    $json = file_get_contents($rankingFile);
    $savedRank = json_decode($json, true);
    if (is_array($savedRank)) {
        $rankings = $savedRank;
    }
}

// 状態管理フラグ
$messageSent = false;
$messageError = '';

// POST ハンドリング
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = $_POST['action'] ?? '';

    // 1. 応援メッセージ
    if ($action === 'cheer') {
        $userName = trim($_POST['author_name'] ?? $_POST['user_name'] ?? '');
        $userMessage = trim($_POST['cheer_message'] ?? $_POST['user_message'] ?? $_POST['user_msg'] ?? '');

        if ($userName === '') {
            $userName = '名無しの鳥人間ファン';
        }

        if ($userMessage === '') {
            $messageError = '応援メッセージを入力してください。';
        } else {
            $newCheer = [
                'name' => mb_substr($userName, 0, 30),
                'author' => mb_substr($userName, 0, 30),
                'date' => date('Y.m.d'),
                'message' => mb_substr($userMessage, 0, 500),
            ];
            array_unshift($messages, $newCheer);
            if (!is_dir(__DIR__ . '/data')) {
                mkdir(__DIR__ . '/data', 0777, true);
            }
            file_put_contents($messageFile, json_encode($messages, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            $messageSent = true;
        }

        // 非同期 fetch / AJAX リクエストに対する JSON レスポンス
        $isAjax = isset($_POST['ajax']) 
            || (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
            || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest');

        if ($isAjax) {
            header('Content-Type: application/json; charset=utf-8');
            if ($userMessage === '') {
                echo json_encode(['success' => false, 'error' => $messageError]);
            } else {
                echo json_encode(['success' => true, 'message' => $newCheer]);
            }
            exit;
        }
    }

    // 2. フライトフィード投稿
    if ($action === 'flight_feed_post') {
        $postJson = $_POST['post_json'] ?? '';
        if ($postJson) {
            $feedFile = __DIR__ . '/data/feed.json';
            $feedList = [];
            if (file_exists($feedFile)) {
                $feedList = json_decode(file_get_contents($feedFile), true) ?: [];
            }
            $postData = json_decode($postJson, true);
            if ($postData) {
                array_unshift($feedList, $postData);
                $feedList = array_slice($feedList, 0, 100);
                if (!is_dir(__DIR__ . '/data')) {
                    mkdir(__DIR__ . '/data', 0777, true);
                }
                file_put_contents($feedFile, json_encode($feedList, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            }
        }
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => true]);
        exit;
    }
}

if (function_exists('get_header')) {
    get_header();
}
?>

<!-- GSAP & ScrollTrigger & Lenis & Tailwind CDN (WordPress環境用保証) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.160.0/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"
  }
}
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<script src="https://unpkg.com/lenis@1.1.18/dist/lenis.min.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Space+Grotesk:wght@500;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script>
    tailwind.config = {
        theme: {
            extend: {
                fontFamily: {
                    sans: ['"Noto Sans JP"', 'sans-serif'],
                    serif: ['"Shippori Mincho"', '"Noto Serif JP"', 'serif'],
                    garamond: ['"Cormorant Garamond"', 'serif'],
                    brand: ['"Plus Jakarta Sans"', '"Montserrat"', '"Noto Sans JP"', 'sans-serif'],
                    rounded: ['"M PLUS Rounded 1c"', 'sans-serif'],
                    syne: ['"Syne"', 'sans-serif'],
                    space: ['"Space Grotesk"', 'sans-serif'],
                    cybermono: ['"JetBrains Mono"', 'monospace'],
                }
            }
        }
    }
</script>


<!-- 特設スタイルシート -->
<link rel="stylesheet" href="assets/css/tobito-profile.css">

<!-- アクセシビリティ & 多言語対応エンジン (i18n & Font Scaling) -->
<script src="assets/js/tbt-accessibility-i18n.js"></script>

<!-- プロローグ・スクロール駆動パララックスエンジン -->
<script src="assets/js/prologue-scroll.js"></script>

<main class="space-y-0 overflow-x-hidden">

    <!-- ==============================================
         SCENE 01: THE PROLOGUE (スクロール駆動パララックス・4段階ストーリー)
         リファレンス完全再現:
         1. 「翼を紡ぎ出す場所。」 (TBT ATELIER & HANGAR PROLOGUE)
         2. 「ここは、飛べない鳥と仲間たちが、」
         3. 「夢の空へ。」
         4. 「空を翔べ。」 (リファレンス画像4 完全再現)
         ============================================== -->
    <section id="prologue-section">
        <div id="prologue-pinned-stage">
            <!-- 背景: 湖畔の風・淡い光彩パララックス -->
            <div id="prologue-bg-ambient" class="prologue-ambient-bg"></div>

            <!-- 巨大手描きとび斗くん (頭部が画面上端から大胆にはみ出す構図) -->
            <div id="prologue-giant-wrap">
                <img id="prologue-giant-tobito" 
                     src="assets/images/tobito_pose_airplane.png" 
                     alt="巨大手描きとび斗くん" 
                     class="select-none pointer-events-none">
            </div>

            <!-- 遠くに浮かぶ小さなとび斗くん (多重平面パララックス) -->
            <div id="prologue-small-tobito">
                <img src="assets/images/tobito_pose_airplane.png" 
                     alt="遠くのとび斗くん" 
                     class="select-none pointer-events-none">
            </div>

            <!-- STATE 01 〜 03: 巨大日本語タイポグラフィ (同一中央に重なるグリッドスタック) -->
            <div id="prologue-phrase-stage-123" class="prologue-phrase-wrap">
                <!-- STATE 01: 白＋淡いイエロー光彩 (リファレンス画像1) -->
                <div id="prologue-state-1" class="prologue-state">
                    <h1 class="prologue-text-1">「翼を紡ぎ出す場所。」</h1>
                    <p class="prologue-sub-en">TBT ATELIER &amp; HANGAR PROLOGUE</p>
                    <p class="prologue-sub-jp">湖畔の風が吹き抜ける、小さな設計室。</p>
                </div>

                <!-- STATE 02: 淡い水色光彩 (リファレンス画像2) -->
                <div id="prologue-state-2" class="prologue-state" style="opacity: 0; pointer-events: none;">
                    <p class="prologue-text-2">「ここは、飛べない鳥と仲間たちが、」</p>
                </div>

                <!-- STATE 03: 淡いゴールド光彩 (リファレンス画像3) -->
                <div id="prologue-state-3" class="prologue-state" style="opacity: 0; pointer-events: none;">
                    <p class="prologue-text-3">「夢の空へ。」</p>
                </div>
            </div>

            <!-- STATE 04: 「空を翔べ。」 (リファレンス画像4 完全再現) -->
            <div id="prologue-stage-4" class="prologue-state-4-wrap" style="opacity: 0; pointer-events: none;">
                <span class="prologue-s4-tag">TEAM BIRDMAN TRIAL OFFICIAL MASCOT</span>
                
                <h2 class="prologue-text-4">
                    「<span class="prologue-sora-wrap"><span class="prologue-sora-aura"></span><span class="prologue-sora-mini"><img src="assets/images/tobito_pose_airplane.png" alt=""></span>空</span>を翔べ。」
                </h2>

                <img src="assets/images/tobito_pose_airplane.png" 
                     alt="とび斗くん" 
                     class="prologue-s4-mascot my-5 sm:my-6 cursor-pointer"
                     onclick="window.playTobitoVoice && window.playTobitoVoice();"
                     title="クリックして職人ボイスを聞くトビ！">

                <div class="prologue-s4-story">
                    <p>ニワトリは大空を翔べない。誰が決めた？</p>
                    <p>二人のパイロットが踏み込むペダル。夜を徹して削り出したカーボン翼。</p>
                    <p class="prologue-s4-story-bold">そのすべてが、僕たちの羽になる。</p>
                </div>

                <!-- 次のワークショップセクションへのスクロール誘導 -->
                <div class="mt-8 flex flex-col items-center gap-2">
                    <a href="#workshop" class="group inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-sky-300 font-mono text-xs font-bold transition shadow-lg border border-sky-400/30">
                        <span>ENTER PHYSICAL WORKSHOP</span>
                        <i class="fa-solid fa-arrow-down text-[10px] group-hover:translate-y-0.5 transition"></i>
                    </a>
                </div>
            </div>
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
                        <button onclick="playTobitoVoice()" class="px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold tracking-wider transition flex items-center gap-2 shadow-md cursor-pointer">
                            <i id="voice-quote-icon" class="fa-solid fa-volume-high"></i>
                            <span>VOICE / 職人の名言を聞く</span>
                        </button>
                        <span id="voice-quote-text" class="text-xs sm:text-sm font-serif text-sky-300 italic font-medium">
                            「ペダルを踏めば、夢は前に進むトビ！」
                        </span>
                    </div>
                </div>
            </div>

            <!-- 素材仕様クリップボード (3連インダストリアルカード) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
                
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

            <!-- アトリエ密着タイムライン (とび斗くんの1日) -->
            <div class="p-8 sm:p-10 rounded-3xl bg-slate-900/40 border border-slate-800">
                <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
                    <div>
                        <span class="font-mono text-xs text-sky-400 uppercase tracking-widest">[ DAILY WORKSHOP CHRONICLE ]</span>
                        <h3 class="text-2xl font-bold font-serif text-white mt-1">とび斗くんの工房日誌 ｜ 24時間の現場記録</h3>
                    </div>
                    <span class="atelier-vermilion-stamp text-[9px]">ACTIVE LOG</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6 font-mono text-xs">
                    <div class="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                        <div class="text-sky-400 font-bold text-sm">07:00 // 早朝風向チェック</div>
                        <p class="text-slate-400 font-serif leading-relaxed text-xs">
                            キャンパスの吹き流しを見上げ、気温・湿度・風速を記録。風の息づかいを肌で感じて1日のテスト方針を決めます。
                        </p>
                    </div>
                    <div class="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                        <div class="text-sky-400 font-bold text-sm">11:00 // 翼リブ削り出し</div>
                        <p class="text-slate-400 font-serif leading-relaxed text-xs">
                            スタイロフォームを0.1ミリ単位で手作業サンディング。削り粉をかぶりながら部員の背中を見守ります。
                        </p>
                    </div>
                    <div class="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                        <div class="text-amber-400 font-bold text-sm">15:00 // タンデム負荷特訓</div>
                        <p class="text-slate-400 font-serif leading-relaxed text-xs">
                            エルゴメーターで90rpmを維持するパイロット2名に全力エール。トサカを揺らして限界突破を後押し。
                        </p>
                    </div>
                    <div class="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                        <div class="text-cyan-400 font-bold text-sm">22:00 // 夜間カーボン焼成</div>
                        <p class="text-slate-400 font-serif leading-relaxed text-xs">
                            熱風炉の温度計を監視しながら翌日のフライトシミュレーションを回す。静謐なアトリエの夜を過ごします。
                        </p>
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
                
                <!-- テレメトリHUD（s320-aig-hero.js と完全連動） -->
                <div class="flex items-center gap-3">
                    <span class="hud-telemetry-badge">
                        <span>PITCH:</span>
                        <span id="hero-hud-pitch" class="text-white font-bold">0.0°</span>
                    </span>
                    <span class="hud-telemetry-badge">
                        <span>ROLL:</span>
                        <span id="hero-hud-roll" class="text-white font-bold">0.0°</span>
                    </span>
                    <span class="hud-telemetry-badge">
                        <span>YAW:</span>
                        <span id="hero-hud-yaw" class="text-white font-bold">0.0°</span>
                    </span>
                    <span class="hud-telemetry-badge hidden sm:inline-flex">
                        <span>SPEED:</span>
                        <span id="hero-hud-airspeed" class="text-white font-bold">10.5 m/s</span>
                    </span>
                </div>
            </div>

            <!-- 3D Canvas 埋め込みコンテナ -->
            <div class="relative w-full aspect-16/9 min-h-[480px] max-h-[720px] rounded-3xl bg-radial from-slate-900/90 to-[#04060a] border border-cyan-500/30 overflow-hidden shadow-2xl flex items-center justify-center">
                
                <!-- S-320 ロード中インジケータ -->
                <div id="s320-loader-indicator" class="absolute top-6 left-6 z-20 pointer-events-none transition-opacity duration-700 flex items-center gap-2 font-mono text-xs text-cyan-400 bg-slate-950/80 px-3 py-1.5 rounded-full border border-cyan-500/30 backdrop-blur-md">
                    <div class="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
                    <span>S-320 3D ASSEMBLED // LIVE</span>
                </div>

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
                        2,400流線 リアルタイム風洞実験室
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-500 text-right">
                    <span>NUMERICAL FLOW SIMULATION</span><br>
                    <span>REYNOLDS NUMBER: 4.5 × 10⁵</span>
                </div>
            </div>

            <!-- 風洞実験室 統合コンテナ -->
            <div class="rounded-3xl bg-slate-950 border border-cyan-500/30 overflow-hidden shadow-2xl relative">
                
                <!-- テレメトリHUDトップバー (wind-tunnel.js と完全連動) -->
                <div class="px-5 sm:px-7 py-3.5 bg-slate-900 border-b border-cyan-500/20 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
                    <div class="flex items-center gap-2.5 text-cyan-400">
                        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span class="font-bold tracking-wider">[ LIVE WIND TUNNEL // 2,400 STREAMLINES ]</span>
                        <span id="wt-hud-regime" class="text-cyan-300 font-bold ml-2">LAMINAR FLOW</span>
                    </div>
                    <div class="flex items-center gap-4 text-slate-400 text-[11px]">
                        <span>動圧 q: <strong id="wt-hud-dyn-pressure" class="text-white">67.5 Pa</strong></span>
                        <span>揚抗比 L/D: <strong id="wt-hud-ld-ratio" class="text-cyan-300 font-bold">34.2</strong></span>
                        <span>CL: <strong id="wt-hud-cl" class="text-white">0.804</strong></span>
                        <span>CD: <strong id="wt-hud-cd" class="text-amber-300">0.0235</strong></span>
                        <span class="hidden sm:inline">Re: <strong id="wt-hud-reynolds" class="text-amber-300">524,000</strong></span>
                    </div>
                </div>

                <!-- Three.js 風洞キャンバスコンテナ -->
                <div id="wind-tunnel-canvas-container" class="relative w-full h-[400px] sm:h-[480px] bg-[#050811] cursor-grab active:cursor-grabbing">
                    <div class="absolute top-4 left-4 pointer-events-none font-mono text-[10px] text-cyan-400/90 bg-black/60 px-3 py-1.5 rounded-xl border border-cyan-500/30">
                        <i class="fa-solid fa-arrows-spin mr-1"></i> DRAG: 360° ROTATE // WHEEL: ZOOM
                    </div>
                </div>

                <!-- スライダー＆操作パネル -->
                <div class="p-6 bg-slate-900/95 border-t border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    <!-- 風速スライダー -->
                    <div class="md:col-span-5 space-y-2">
                        <div class="flex justify-between items-center text-xs font-mono text-white">
                            <span class="flex items-center gap-1.5 font-bold">
                                <i class="fa-solid fa-wind text-cyan-400"></i> 風速 (Wind Velocity)
                            </span>
                            <span id="wt-val-speed" class="text-cyan-400 font-bold text-sm">10.5 m/s</span>
                        </div>
                        <input id="wt-wind-speed" type="range" min="5.0" max="25.0" step="0.5" value="10.5" class="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg">
                    </div>

                    <!-- 迎角スライダー -->
                    <div class="md:col-span-5 space-y-2">
                        <div class="flex justify-between items-center text-xs font-mono text-white">
                            <span class="flex items-center gap-1.5 font-bold">
                                <i class="fa-solid fa-plane text-amber-400"></i> 迎角 (AoA: α)
                            </span>
                            <span id="wt-val-aoa" class="text-amber-400 font-bold text-sm">+3.5°</span>
                        </div>
                        <input id="wt-angle-of-attack" type="range" min="-5.0" max="15.0" step="0.5" value="3.5" class="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg">
                    </div>

                    <!-- カメラ視点プリセット -->
                    <div class="md:col-span-2 flex flex-col gap-1.5">
                        <span class="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">CAMERA</span>
                        <div class="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                            <button type="button" data-wt-view="iso" class="px-2 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold hover:bg-cyan-500/30 transition cursor-pointer">3D斜視</button>
                            <button type="button" data-wt-view="side" class="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer">側面流</button>
                            <button type="button" data-wt-view="top" class="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer">平面視</button>
                            <button type="button" id="wt-reset-btn" class="px-2 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-rose-300 hover:text-rose-200 transition cursor-pointer"><i class="fa-solid fa-rotate-right"></i> リセット</button>
                        </div>
                    </div>

                </div>

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
         SCENE 05: TOBITO'S WORLD (キャラクターの真実・表情パレット・衣装図鑑)
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
                        マスコット「とび斗くん」解剖録
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-400 text-right">
                    <span>NAME: TOBITO (1994 ~ PRESENT)</span><br>
                    <span>GUARDIAN OF TBT HANGAR</span>
                </div>
            </div>

            <!-- 上段: 実物大立体像 & 表情パレット -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
                
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

                <!-- 右カラム: 4つの表情パレット (動的切り替え) & 秘密手帳 -->
                <div class="lg:col-span-7 space-y-8">
                    
                    <!-- 動的ポートレート & 表情ボタン -->
                    <div class="p-6 rounded-3xl bg-slate-50 border border-slate-200">
                        <div class="flex items-center justify-between mb-4">
                            <span class="font-mono text-xs text-slate-500 uppercase tracking-widest font-bold">
                                HAND-DRAWN EXPRESSIONS // 4つの表情パレット
                            </span>
                            <span class="text-[11px] font-mono text-sky-600">CLICK TO SWITCH</span>
                        </div>

                        <div class="flex flex-col sm:flex-row items-center gap-6">
                            <div class="w-48 h-48 rounded-2xl bg-white border border-slate-200 p-3 shadow-sm flex items-center justify-center shrink-0">
                                <img id="about-portrait-img" 
                                     src="assets/images/tobito_pose_crossed_arms.png" 
                                     alt="とび斗くんの表情" 
                                     class="max-w-full max-h-full object-contain transition-all duration-300">
                            </div>

                            <div class="space-y-3 flex-1">
                                <div class="grid grid-cols-4 gap-2">
                                    <button type="button" onclick="changeAboutMood('assets/images/tobito_pose_crossed_arms.png')" class="expression-btn active p-2 rounded-xl bg-white border-2 border-sky-500 shadow-xs hover:scale-105 transition cursor-pointer" title="通常顔">
                                        <img src="assets/images/tobito_face_normal.png" alt="通常" class="w-10 h-10 object-contain mx-auto">
                                        <span class="block text-[10px] text-center font-mono mt-1 text-slate-700">通常</span>
                                    </button>
                                    <button type="button" onclick="changeAboutMood('assets/images/tobito_face_smile.png')" class="expression-btn p-2 rounded-xl bg-white border border-slate-200 shadow-xs hover:scale-105 transition cursor-pointer" title="笑顔">
                                        <img src="assets/images/tobito_face_smile.png" alt="笑顔" class="w-10 h-10 object-contain mx-auto">
                                        <span class="block text-[10px] text-center font-mono mt-1 text-slate-700">笑顔</span>
                                    </button>
                                    <button type="button" onclick="changeAboutMood('assets/images/tobito_face_angry.png')" class="expression-btn p-2 rounded-xl bg-white border border-slate-200 shadow-xs hover:scale-105 transition cursor-pointer" title="気合">
                                        <img src="assets/images/tobito_face_angry.png" alt="気合" class="w-10 h-10 object-contain mx-auto">
                                        <span class="block text-[10px] text-center font-mono mt-1 text-slate-700">気合</span>
                                    </button>
                                    <button type="button" onclick="changeAboutMood('assets/images/tobito_face_cry.png')" class="expression-btn p-2 rounded-xl bg-white border border-slate-200 shadow-xs hover:scale-105 transition cursor-pointer" title="涙">
                                        <img src="assets/images/tobito_face_cry.png" alt="涙" class="w-10 h-10 object-contain mx-auto">
                                        <span class="block text-[10px] text-center font-mono mt-1 text-slate-700">涙</span>
                                    </button>
                                </div>
                                <p id="expression-desc" class="text-xs font-serif text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                                    いつでも真剣に大空を見つめる真摯な眼差し。1ミリの削り出しを見守る職人モード。
                                </p>
                            </div>
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

            <!-- 下段: 衣装・装備図鑑 (Costumes Collection) -->
            <div class="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800">
                <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
                    <div>
                        <span class="font-mono text-xs text-sky-400 uppercase tracking-widest">[ ATELIER WARDROBE ]</span>
                        <h3 class="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
                            とび斗くん衣装・装備図鑑
                        </h3>
                    </div>
                    <span class="atelier-vermilion-stamp text-[9px]">FULL SPEC CATALOG</span>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    
                    <!-- 衣装プレビューカード -->
                    <div class="lg:col-span-5 flex justify-center">
                        <div class="relative p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center w-full max-w-sm">
                            <img id="costume-preview-img" 
                                 src="assets/images/tobito_pose_airplane.png" 
                                 alt="衣装プレビュー" 
                                 class="h-64 object-contain mx-auto mb-4 drop-shadow-xl">
                            <span id="costume-badge" class="atelier-vermilion-stamp text-[9px]">OFFICIAL FLIGHT</span>
                            <h4 id="costume-name" class="text-lg font-bold font-serif mt-2">飛行機ポーズ（空飛ぶトビト）</h4>
                            <p id="costume-role" class="text-xs font-mono text-sky-400 mt-1">公式イラスト / 琵琶湖フライト仕様</p>
                        </div>
                    </div>

                    <!-- 衣装セレクター ＆ ステータス -->
                    <div class="lg:col-span-7 space-y-6">
                        
                        <p id="costume-desc" class="text-xs sm:text-sm font-serif text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                            両腕をいっぱいに広げて飛行機の真似をして大空を舞う公式ポーズ。TBTの熱いパッションと大空への憧れがギュッと詰まったメインスタイルです。
                        </p>

                        <!-- パラメータバー -->
                        <div class="space-y-3 font-mono text-xs">
                            <div>
                                <div class="flex justify-between text-slate-400 mb-1">
                                    <span>SPEED / 滑空速度</span>
                                    <span id="stat-speed-val" class="text-sky-400 font-bold">95 / 100</span>
                                </div>
                                <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div id="stat-speed-bar" class="h-full bg-sky-500 rounded-full transition-all duration-500" style="width: 95%;"></div>
                                </div>
                            </div>
                            <div>
                                <div class="flex justify-between text-slate-400 mb-1">
                                    <span>CHEER / 応援パワー</span>
                                    <span id="stat-cheer-val" class="text-amber-400 font-bold">100 / 100</span>
                                </div>
                                <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div id="stat-cheer-bar" class="h-full bg-amber-500 rounded-full transition-all duration-500" style="width: 100%;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- 衣装切り替えグリッド -->
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <?php foreach ($costumes as $idx => $c): ?>
                                <button type="button" 
                                        onclick="switchCostume(<?= $idx ?>)" 
                                        class="costume-grid-card p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500 text-left transition cursor-pointer <?= $idx === 0 ? 'active border-sky-500 bg-sky-950/20' : '' ?>">
                                    <div class="font-bold text-xs text-white truncate"><?= e($c['name']) ?></div>
                                    <div class="text-[10px] font-mono text-slate-400 truncate"><?= e($c['badge']) ?></div>
                                </button>
                            <?php endforeach; ?>
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
                    <button type="button" id="tab-game-flight" onclick="window.switchGameTab('flight')" class="px-5 py-2.5 rounded-lg bg-sky-500 text-white font-mono text-xs font-bold transition cursor-pointer">
                        <i class="fa-solid fa-plane-up mr-1.5"></i> 3D 琵琶湖フライト
                    </button>
                    <button type="button" id="tab-game-yakitori" onclick="window.switchGameTab('yakitori')" class="px-5 py-2.5 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold hover:text-white transition cursor-pointer">
                        <span class="mr-1">🍢</span> 2D やきとり脱出
                    </button>
                </div>
            </div>

            <!-- ===================== VIEW 1: 3D 琵琶湖フライト ===================== -->
            <div id="game-view-flight">
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    <!-- 左カラム: ゲーム画面 (3D Canvas + バーチャルHUD操作) -->
                    <div class="lg:col-span-8 space-y-4">
                        <div id="game-viewport-container" class="relative w-full aspect-16/9 min-h-[460px] max-h-[640px] rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
                            
                            <!-- 3D Canvas -->
                            <canvas id="tobito-game-canvas" width="800" height="450" class="w-full h-full block cursor-crosshair select-none touch-manipulation" data-img-src="assets/images/tobito_pose_airplane.png"></canvas>

                            <!-- バーチャルタッチコントローラー (親指Thumb Zone最適化) -->
                            <div id="game-touch-controls" class="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-3 select-none touch-manipulation">
                                
                                <!-- 上部: クイックアクションバー -->
                                <div class="flex items-center justify-between w-full pointer-events-auto gap-2">
                                    <div class="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-sky-500/30">
                                        <button type="button" id="touch-btn-cam" class="px-3 py-1.5 rounded-lg bg-slate-800 text-sky-300 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer">
                                            <i class="fa-solid fa-camera-rotate"></i> <span>視点 [C]</span>
                                        </button>
                                        <button type="button" id="touch-btn-reset" class="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-300 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer">
                                            <i class="fa-solid fa-rotate-right"></i> <span>再発進 [R]</span>
                                        </button>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <button type="button" id="game-sound-toggle" class="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer pointer-events-auto text-xs" title="サウンド切替">
                                            <i class="fa-solid fa-volume-high"></i>
                                        </button>
                                        <button type="button" id="touch-btn-theater" class="px-3 py-1.5 rounded-lg bg-slate-800 text-indigo-300 text-xs font-bold font-mono flex items-center gap-1 cursor-pointer pointer-events-auto">
                                            <i class="fa-solid fa-expand"></i> <span>全画面</span>
                                        </button>
                                        <button type="button" id="game-theater-toggle" class="hidden"></button>
                                    </div>
                                </div>

                                <!-- 下部: 操縦桿 ＆ 特大ペダルボタン -->
                                <div class="flex items-end justify-between w-full pointer-events-auto pb-1 gap-2">
                                    
                                    <!-- 左手: 操縦桿ボタン群 -->
                                    <div class="flex flex-col items-center bg-slate-950/85 backdrop-blur-md p-2 rounded-2xl border border-sky-500/40 shadow-2xl">
                                        <span class="text-[9px] text-sky-400 font-bold tracking-wider mb-1 font-mono">PITCH/ROLL</span>
                                        <div class="grid grid-cols-3 gap-1 w-28">
                                            <div></div>
                                            <button type="button" id="touch-ctrl-up" class="h-9 rounded-xl bg-slate-800 active:bg-sky-500 text-sky-300 active:text-white border border-sky-500/40 flex items-center justify-center font-black text-sm shadow cursor-pointer select-none">
                                                <i class="fa-solid fa-chevron-up"></i>
                                            </button>
                                            <div></div>

                                            <button type="button" id="touch-ctrl-left" class="h-9 rounded-xl bg-slate-800 active:bg-sky-500 text-sky-300 active:text-white border border-sky-500/40 flex items-center justify-center font-black text-sm shadow cursor-pointer select-none">
                                                <i class="fa-solid fa-chevron-left"></i>
                                            </button>
                                            <div class="flex items-center justify-center text-[9px] text-slate-400 font-bold font-mono">操舵</div>
                                            <button type="button" id="touch-ctrl-right" class="h-9 rounded-xl bg-slate-800 active:bg-sky-500 text-sky-300 active:text-white border border-sky-500/40 flex items-center justify-center font-black text-sm shadow cursor-pointer select-none">
                                                <i class="fa-solid fa-chevron-right"></i>
                                            </button>

                                            <div></div>
                                            <button type="button" id="touch-ctrl-down" class="h-9 rounded-xl bg-slate-800 active:bg-sky-500 text-sky-300 active:text-white border border-sky-500/40 flex items-center justify-center font-black text-sm shadow cursor-pointer select-none">
                                                <i class="fa-solid fa-chevron-down"></i>
                                            </button>
                                            <div></div>
                                        </div>
                                    </div>

                                    <!-- 右手: 特大ペダル連打ボタン -->
                                    <div class="flex flex-col items-center">
                                        <button type="button" id="touch-pedal-btn" class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 font-black flex flex-col items-center justify-center shadow-2xl border-4 border-amber-100/90 active:scale-90 transition-transform duration-75 select-none touch-manipulation cursor-pointer">
                                            <i class="fa-solid fa-bolt text-2xl text-slate-950"></i>
                                            <span class="text-xs font-black tracking-tight leading-none mt-0.5">PEDAL</span>
                                            <span class="text-[9px] font-bold text-amber-950 leading-none">連打!</span>
                                        </button>
                                    </div>

                                </div>

                            </div>

                            <!-- 着水時のリザルトオーバーレイ -->
                            <div id="game-result-box" class="hidden absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 pointer-events-auto select-none">
                                <span class="atelier-vermilion-stamp text-xs mb-3">FLIGHT COMPLETE</span>
                                <h3 id="result-title" class="text-3xl font-black text-white font-serif mb-1">琵琶湖に着水！</h3>
                                <div class="my-3 font-mono">
                                    <span class="text-5xl font-black text-amber-400" id="result-distance">0.0</span>
                                    <span class="text-lg text-slate-400 ml-1">m</span>
                                </div>
                                <p id="result-comment" class="text-sm font-serif text-slate-300 max-w-md mx-auto leading-relaxed my-2"></p>
                                <div id="result-desc" class="hidden"></div>
                                
                                <!-- ランキング登録フォーム -->
                                <form id="result-submit-form" class="mt-3 flex items-center gap-2">
                                    <input type="hidden" id="submit-distance" value="0">
                                    <input type="text" id="ranking-distance-input" placeholder="パイロット名 (例: コールサイン)" class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono outline-none focus:border-sky-500">
                                    <button type="submit" class="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition cursor-pointer">記録登録</button>
                                </form>

                                <button type="button" id="btn-restart-game" class="mt-4 px-6 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-bold text-xs tracking-wider uppercase transition cursor-pointer">
                                    もう一度飛ぶ [R]
                                </button>
                                <button type="button" id="game-restart-btn" class="hidden"></button>
                            </div>

                        </div>
                    </div>

                    <!-- 右カラム: 歴代フライトランキング & 操作ガイド -->
                    <div class="lg:col-span-4 space-y-6">
                        
                        <!-- ランキングボード (flight-ranking.js レンダリング) -->
                        <div class="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl">
                            <div class="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                                <h3 class="font-bold text-white text-base flex items-center gap-2 font-serif">
                                    <span class="text-amber-400">🏆</span>
                                    <span>歴代フライトランキング</span>
                                </h3>
                                <span class="text-[10px] font-mono text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-500/30">TOP 5</span>
                            </div>
                            <div id="ranking-list-container" class="space-y-2.5 font-mono text-xs">
                                <!-- JSによって自動生成 -->
                            </div>
                        </div>

                        <!-- PCキーボード操作ガイド -->
                        <div class="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 space-y-2 font-mono">
                            <div class="font-bold text-slate-300 flex items-center gap-1.5 text-xs">
                                <i class="fa-solid fa-keyboard text-sky-400"></i> PC操作ガイド:
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-[11px]">
                                <div><kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">Space</kbd> : ペダル連打</div>
                                <div><kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">↑ / ↓</kbd> : 昇降舵 (ピッチ)</div>
                                <div><kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">← / →</kbd> : 方向舵 (ロール)</div>
                                <div><kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">C</kbd> / <kbd class="px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-700">R</kbd> : 視点 / 再発進</div>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

            <!-- ===================== VIEW 2: 2D やきとり脱出サバイバル ===================== -->
            <div id="game-view-yakitori" class="hidden">
                <div class="max-w-4xl mx-auto space-y-4">
                    <div id="yakitori-viewport-container" class="relative w-full aspect-16/9 min-h-[460px] max-h-[640px] rounded-3xl overflow-hidden bg-slate-950 border border-orange-500/40 shadow-2xl">
                        <canvas id="yakitori-game-canvas" width="800" height="450" class="w-full h-full block cursor-crosshair select-none"></canvas>
                        
                        <!-- リザルトオーバーレイ -->
                        <div id="yakitori-result-overlay" class="hidden absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
                            <h3 id="yakitori-res-title" class="text-3xl font-black text-orange-400 font-serif mb-2">脱出失敗！</h3>
                            <div class="my-2 font-mono">
                                <span class="text-slate-400 text-xs">SCORE: </span><span id="yakitori-res-score" class="text-white text-2xl font-bold">0</span>
                                <span class="text-slate-400 text-xs ml-3">DISTANCE: </span><span id="yakitori-res-distance" class="text-amber-400 text-2xl font-bold">0</span><span class="text-slate-400 text-xs">m</span>
                            </div>
                            <div class="mt-4 flex gap-3">
                                <button type="button" onclick="window.yakitoriGame && window.yakitoriGame.restart()" class="px-5 py-2 rounded-xl bg-orange-500 text-white font-mono font-bold text-xs cursor-pointer">RESTART</button>
                                <a id="yakitori-share-x" href="#" target="_blank" class="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs flex items-center gap-1.5"><i class="fa-brands fa-x-twitter"></i> SHARE</a>
                            </div>
                        </div>
                    </div>

                    <!-- 操作コントロールボタン -->
                    <div class="flex items-center justify-center gap-4">
                        <button type="button" id="yakitori-btn-jump" class="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-mono font-bold text-xs cursor-pointer shadow-md flex items-center gap-2">
                            <i class="fa-solid fa-arrow-up"></i>
                            <span>JUMP [Space / ↑]</span>
                        </button>
                        <button type="button" id="yakitori-btn-duck" class="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono font-bold text-xs cursor-pointer border border-slate-700 flex items-center gap-2">
                            <i class="fa-solid fa-arrow-down"></i>
                            <span>DUCK [↓]</span>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 07: THE ARCHIVE (ACTIVE THEORY 3D アーカイブ)
         ============================================== -->
    <section id="archive" class="py-24 sm:py-36 px-6 sm:px-12 lg:px-16 bg-[#06080e] text-white relative">
        
        <div class="max-w-7xl mx-auto" id="archives">
            
            <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
                <div>
                    <span class="tech-meta-stamp text-cyan-400">
                        <span class="pulse-dot"></span>
                        <span>07 // ACTIVE THEORY 3D ARCHIVE</span>
                    </span>
                    <h2 class="text-3xl sm:text-5xl font-bold font-serif text-white mt-2">
                        原画・ステッカー・航空線画アーカイブ
                    </h2>
                </div>

                <!-- カテゴリフィルタ -->
                <div class="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800 p-1.5 rounded-xl font-mono text-xs">
                    <button type="button" data-filter="ALL" class="at-filter-btn px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold cursor-pointer">ALL</button>
                    <button type="button" data-filter="STICKER" class="at-filter-btn px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">STICKER</button>
                    <button type="button" data-filter="MERCHANDISE" class="at-filter-btn px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">MERCH</button>
                    <button type="button" data-filter="CRAFT ART" class="at-filter-btn px-3 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer">CRAFT</button>
                    <button type="button" id="at-fullscreen-btn" class="px-2 py-1 rounded-lg text-slate-400 hover:text-white cursor-pointer" title="全画面"><i class="fa-solid fa-expand"></i></button>
                </div>
            </div>

            <!-- WebGL 3D パーティクルステージ (active-theory-archive.js と完全連動) -->
            <div id="active-theory-canvas-container" class="relative w-full min-h-[460px] h-[540px] rounded-3xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl mb-8">
                <canvas id="at-canvas" class="w-full h-full block cursor-pointer"></canvas>
                <div id="at-cards-container" class="hidden"></div>

                <!-- HUDテレメトリオーバーレイ -->
                <div class="absolute top-6 left-6 z-20 pointer-events-none font-mono text-xs text-cyan-300 space-y-1 bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-cyan-500/30 backdrop-blur-md">
                    <div class="flex items-center gap-2">
                        <span id="at-hud-code" class="font-bold text-white">TBT-AERO-01</span>
                        <span id="at-hud-lot" class="text-slate-400 text-[10px]">LOT. 01</span>
                        <span id="at-index-counter" class="text-[10px] text-cyan-400 ml-auto">01 / 06</span>
                    </div>
                    <div id="at-hud-title" class="text-sm font-bold font-serif text-cyan-200">部室の夜明けと4つの顔</div>
                    <div class="flex items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>VEL: <strong id="at-hud-vel" class="text-white">11.4 m/s</strong></span>
                        <span>CAD: <strong id="at-hud-cadence" class="text-white">88 RPM</strong></span>
                        <span id="at-hud-tag" class="text-cyan-400">LAMINAR WING</span>
                    </div>
                    <div class="hidden">
                        <span id="at-telemetry-regime">LAMINAR</span>
                        <span id="at-telemetry-wind">1.2 m/s</span>
                    </div>
                </div>

                <!-- ナビゲーション矢印 & インスペクトボタン -->
                <div class="absolute bottom-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-auto">
                    <div class="flex items-center gap-2">
                        <button type="button" id="at-nav-prev" class="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 cursor-pointer">
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>
                        <button type="button" id="at-nav-next" class="w-10 h-10 rounded-xl bg-slate-900/90 border border-slate-700 text-white flex items-center justify-center hover:bg-slate-800 cursor-pointer">
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                            <div id="at-scrubber-progress" class="h-full bg-cyan-400 rounded-full" style="width: 20%;"></div>
                        </div>
                        <button type="button" id="at-inspect-current-btn" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg">
                            <i class="fa-solid fa-magnifying-glass"></i>
                            <span>詳細を展開</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 触れる実体アーカイブカードストリップ (6枚の触感カード) -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <?php foreach ($archives as $idx => $item): ?>
                    <div class="archive-card p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500 transition cursor-pointer" onclick="openArchiveLightbox(<?= $idx ?>)">
                        <img src="assets/images/<?= e($item['id']) ?>" alt="<?= e($item['story_title']) ?>" class="w-full h-24 object-contain mb-3">
                        <div class="text-[10px] font-mono text-cyan-400 font-bold"><?= e($item['code']) ?></div>
                        <div class="text-xs font-serif font-bold text-white truncate"><?= e($item['story_title']) ?></div>
                    </div>
                <?php endforeach; ?>
            </div>

            <!-- Active Theory 詳細インスペクションモーダル -->
            <div id="active-theory-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md hidden transition-opacity duration-300">
                <div class="relative max-w-3xl w-full bg-[#0a0e17] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-white transform transition-transform duration-300">
                    <button type="button" id="at-modal-close-btn" class="absolute top-5 right-5 text-slate-400 hover:text-white text-xl cursor-pointer">✕</button>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                        <div class="h-64 flex items-center justify-center p-4 bg-black/40 rounded-2xl border border-slate-800">
                            <img id="at-modal-img" src="" alt="Archive Detail" class="max-h-full max-w-full object-contain drop-shadow-xl">
                        </div>
                        <div class="space-y-3 font-mono text-xs">
                            <div class="flex items-center gap-2">
                                <span id="at-modal-category" class="atelier-vermilion-stamp text-[10px]">STICKER</span>
                                <span id="at-modal-code" class="text-cyan-400 font-bold"></span>
                                <span id="at-modal-lot" class="text-slate-400 text-[10px]"></span>
                            </div>
                            <h4 id="at-modal-title" class="text-xl font-bold font-serif text-white"></h4>
                            <p id="at-modal-story" class="text-xs text-slate-300 leading-relaxed font-serif"></p>
                            <div class="pt-3 border-t border-slate-800 space-y-1 font-mono text-[10px] text-slate-400">
                                <div>MATERIAL: <span id="at-modal-material" class="text-slate-200"></span></div>
                                <div>SPEC: <span id="at-modal-specs" class="text-slate-200"></span></div>
                                <div>RECORD: <span id="at-modal-record" class="text-slate-200"></span></div>
                            </div>
                            <div class="pt-2 flex items-center justify-between border-t border-slate-800 text-[10px]">
                                <div class="space-x-2 text-slate-400">
                                    <span>VEL: <strong id="at-modal-vel" class="text-white"></strong></span>
                                    <span>CAD: <strong id="at-modal-cad" class="text-white"></strong></span>
                                    <span>ALT: <strong id="at-modal-alt" class="text-white"></strong></span>
                                </div>
                                <a id="at-modal-download" href="#" download class="text-cyan-400 hover:text-cyan-300"><i class="fa-solid fa-download"></i> DL</a>
                            </div>
                            <div id="at-modal-tag" class="hidden"></div>
                        </div>
                    </div>
                </div>
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

            <!-- インライン端末UI (送信後に即クリア & フォーカス復帰) -->
            <div class="rounded-3xl bg-[#070b14] border border-cyan-500/30 overflow-hidden shadow-2xl font-mono text-xs text-slate-200">
                <div class="h-12 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span class="font-bold text-white tracking-wider">tobito@hangar-os (tty1)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="window.tbtTerminal && window.tbtTerminal.open()" class="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold px-2 py-0.5 rounded border border-cyan-500/30 cursor-pointer">
                            フル画面モーダルを開く
                        </button>
                        <span class="text-[10px] text-slate-500">v2.6.4</span>
                    </div>
                </div>

                <div id="inline-term-body" class="p-6 h-72 overflow-y-auto space-y-2 leading-relaxed text-xs">
                    <div class="text-cyan-400 font-bold">=============================================================</div>
                    <div class="text-cyan-300 font-bold">  TEAM BIRDMAN TRIAL - TOBITO WORKSHOP CONSOLE</div>
                    <div class="text-cyan-400 font-bold">=============================================================</div>
                    <div class="text-slate-400">システム初期化完了。とび斗くんがスタンバイしています。</div>
                    <div class="text-amber-300 font-bold">とび斗くん: 「やあ！飛行機のこと、部室のこと、なんでも聞いてねトビ！」</div>
                </div>

                <!-- クイック質問チップ -->
                <div class="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap gap-2 text-[11px]">
                    <span class="text-slate-500 py-0.5">クイック質問:</span>
                    <button type="button" onclick="sendQuickPrompt('二人乗りについて教えて')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer">二人乗りについて</button>
                    <button type="button" onclick="sendQuickPrompt('翼の長さは？')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer">翼の長さ</button>
                    <button type="button" onclick="sendQuickPrompt('風洞実験って何？')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer">風洞実験</button>
                    <button type="button" onclick="sendQuickPrompt('なぜニワトリなの？')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer">なぜニワトリ？</button>
                    <button type="button" onclick="sendQuickPrompt('好きな食べ物は？')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer">好物は？</button>
                    <button type="button" onclick="sendQuickPrompt('焼き鳥について')" class="px-2.5 py-1 rounded-full bg-slate-900 text-amber-300/80 hover:text-amber-200 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer">ヤキトリ...？</button>
                    <button type="button" onclick="sendQuickPrompt('傘立てについて教えて')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-cyan-500/50 transition cursor-pointer">守り神・傘立て</button>
                    <button type="button" onclick="sendQuickPrompt('status')" class="px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 border border-cyan-700/50 transition cursor-pointer font-mono">status</button>
                    <button type="button" onclick="sendQuickPrompt('help')" class="px-2.5 py-1 rounded-full bg-cyan-950/60 text-cyan-300 hover:text-cyan-200 border border-cyan-700/50 transition cursor-pointer font-mono">help</button>
                    <button type="button" onclick="sendQuickPrompt('clear')" class="px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer font-mono">clear</button>
                </div>

                <div class="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 sm:gap-3">
                    <span class="text-cyan-400 font-bold select-none text-xs hidden sm:inline">tobito@hangar:~$</span>
                    <input type="text" id="inline-term-input" 
                           class="flex-1 bg-transparent border-none outline-none text-white font-mono text-xs focus:outline-none placeholder-slate-600" 
                           placeholder="メッセージを入力... (例: こんにちは、二人乗りについて教えて、help)" 
                           autocomplete="off">
                    <button type="button" id="btn-term-mic" onclick="toggleTermVoiceInput()" 
                            class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-xs font-medium rounded-lg border border-cyan-500/30 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                            title="マイクで話しかける (音声認識)">
                        <span id="term-mic-icon">🎙</span>
                        <span id="term-mic-label" class="hidden sm:inline">音声入力</span>
                    </button>
                    <button type="button" id="inline-term-send" class="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-mono text-xs font-bold rounded-lg transition cursor-pointer shrink-0">
                        SEND
                    </button>
                </div>
            </div>

        </div>
    </section>


    <!-- ==============================================
         SCENE 09: COMMS & COMMUNITY (無線通信 ＆ 応援掲示板 ＆ フィード)
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
                        コクピット無線 ＆ コミュニティ
                    </h2>
                </div>
                <div class="font-mono text-xs text-slate-400">
                    <span>LIVE SUPPORTER VOICES</span>
                </div>
            </div>

            <!-- コクピット無線 (tbt-cockpit-radio.js と完全連動) -->
            <div class="mb-14 p-6 sm:p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-xl">
                <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                    <div class="flex items-center gap-3">
                        <span class="w-10 h-10 rounded-2xl bg-cyan-950 text-cyan-400 flex items-center justify-center text-lg border border-cyan-500/30">📻</span>
                        <div>
                            <h3 class="text-lg font-bold font-serif">TBT コクピット無線 (ATC Intercom)</h3>
                            <span class="text-[10px] font-mono text-cyan-400">VHF 121.5 MHz // STANDALONE WEBRTC PTT</span>
                        </div>
                    </div>
                    <span id="radio-status" class="font-mono text-xs px-3 py-1 rounded-full border text-slate-400 border-slate-700 bg-slate-900">OFFLINE</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    <!-- オーディオ波形ビジュアライザー -->
                    <div class="md:col-span-6 flex items-center justify-center gap-1.5 h-12 px-4 bg-slate-900 rounded-2xl border border-slate-800" id="audio-wave">
                        <?php for ($w = 0; $w < 12; $w++): ?>
                            <span class="wave-bar w-1.5 bg-slate-700 h-[10%] rounded-full transition-all duration-75"></span>
                        <?php endfor; ?>
                    </div>

                    <!-- 操作ボタン群 -->
                    <div class="md:col-span-6 flex items-center justify-end gap-2.5 flex-wrap">
                        <button type="button" id="btn-radio-atc-test" class="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-mono text-xs font-bold rounded-xl border border-cyan-500/40 transition cursor-pointer shadow-sm active:scale-95" title="航空無線のATC交信テスト音声を再生">
                            📻 ATC交信テスト
                        </button>
                        <button type="button" id="btn-radio-mute" disabled class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-40">
                            MIC ON
                        </button>
                        <button type="button" id="btn-radio-loopback" disabled class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold rounded-xl border border-slate-700 transition cursor-pointer disabled:opacity-40" title="自分のマイク音声をテスト">
                            LOOPBACK
                        </button>
                        <button type="button" id="btn-radio-toggle" class="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs rounded-xl tracking-wider uppercase transition shadow-md cursor-pointer">
                            CONNECT RADIO
                        </button>
                    </div>

                </div>

                <!-- PTTモードバー -->
                <div class="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div class="flex items-center gap-3">
                        <label class="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                            <input type="checkbox" id="toggle-ptt-mode" class="rounded bg-slate-800 border-slate-700 text-cyan-500">
                            <span>PTTモード（Spaceキーまたは長押し送信）</span>
                        </label>
                        <button type="button" id="btn-radio-ptt" disabled class="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold opacity-50 pointer-events-none transition cursor-pointer select-none">
                            🎙 TRANSMIT (PTT)
                        </button>
                    </div>
                    <span id="radio-pilot-count" class="text-slate-400 text-[11px]">0 PILOTS ON AIR</span>
                </div>
                <input type="hidden" id="radio-room-id" value="tbt-biwako-ch1">
                <div id="radio-alert" class="hidden text-xs mt-2 p-2 rounded-lg font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30"></div>
            </div>

            <!-- TBT フライトフィード (ミニSNS) ＆ 応援掲示板 -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                <!-- 左カラム: フライトフィード (tbt-flight-feed.js 連動) -->
                <div class="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm">
                    <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">🐦</span>
                            <h3 class="text-lg font-bold font-serif text-slate-900">TBT Flight Feed</h3>
                        </div>
                        <span class="text-xs font-mono text-sky-600 font-bold">TIMELINE</span>
                    </div>

                    <!-- 投稿フォーム -->
                    <form id="feed-post-form" class="mb-6 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
                        <div id="feed-alert" class="hidden text-xs p-2 rounded-lg font-mono"></div>
                        <div class="flex gap-2">
                            <input type="text" id="feed-author-name" placeholder="お名前 / コールサイン" required class="flex-1 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                            <span id="feed-char-count" class="text-[11px] font-mono text-slate-400 self-center">0 / 140</span>
                        </div>
                        <textarea id="feed-post-text" rows="2" maxlength="140" placeholder="メッセージを入力（140字以内）..." required class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-serif"></textarea>
                        
                        <div class="flex items-center justify-between pt-1">
                            <label class="cursor-pointer text-xs text-slate-500 hover:text-sky-600 flex items-center gap-1 font-mono">
                                <i class="fa-solid fa-image"></i> 写真添付
                                <input type="file" id="feed-image-input" accept="image/*" class="hidden">
                            </label>
                            <button type="submit" class="px-5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition cursor-pointer">
                                投稿する
                            </button>
                        </div>

                        <div id="feed-image-preview-container" class="hidden mt-2 relative inline-block">
                            <img id="feed-image-preview" src="" alt="添付プレビュー" class="max-h-24 rounded-lg">
                            <button type="button" id="feed-image-remove-btn" class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">✕</button>
                        </div>
                    </form>

                    <!-- タイムライン一覧 -->
                    <div id="flight-feed-timeline" class="space-y-3 max-h-96 overflow-y-auto pr-1">
                        <!-- tbt-flight-feed.js によって自動レンダリング -->
                    </div>
                </div>

                <!-- 右カラム: 応援メッセージ掲示板 (tbt-cheer-board.js 連動) -->
                <div id="cheer" class="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-amber-50/50 border border-amber-200/60 shadow-sm">
                    <div class="flex items-center justify-between border-b border-amber-200/60 pb-3 mb-6">
                        <div class="flex items-center gap-2">
                            <span class="text-xl">💌</span>
                            <h3 class="text-lg font-bold font-serif text-slate-900">応援メッセージ掲示板</h3>
                        </div>
                        <span class="text-xs font-mono text-amber-600 font-bold">CHEER BOARD</span>
                    </div>

                    <!-- 応援投稿フォーム -->
                    <form id="cheer-form" class="mb-6 space-y-3 p-4 rounded-2xl bg-white border border-amber-200/80 shadow-2xs">
                        <div id="board-alert" class="hidden text-xs p-2 rounded-lg font-mono"></div>
                        <input type="text" id="author-name" placeholder="お名前・コールサイン" required class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
                        <textarea id="cheer-message" rows="2" placeholder="とび斗くんやチームへの応援メッセージ..." required class="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-serif"></textarea>
                        <button type="submit" id="submit-cheer-btn" class="w-full py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-mono text-xs font-bold transition cursor-pointer">
                            エールを送る！
                        </button>
                    </form>

                    <!-- メッセージ一覧 -->
                    <div id="cheer-messages-list" class="space-y-3 max-h-96 overflow-y-auto pr-1">
                        <?php foreach ($messages as $msg): ?>
                            <div class="p-4 rounded-xl bg-white border border-slate-200 text-xs shadow-2xs">
                                <div class="flex justify-between font-mono text-[10px] text-slate-400 mb-1">
                                    <span class="font-bold text-slate-700"><?= e($msg['name'] ?? $msg['author'] ?? '名無し') ?></span>
                                    <span><?= e($msg['date'] ?? '') ?></span>
                                </div>
                                <p class="text-slate-600 font-serif"><?= nl2br(e($msg['message'] ?? '')) ?></p>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>

            </div>

        </div>
    </section>


    <!-- ==============================================
         FINAL MESSAGE & ATELIER FOOTER
         ============================================== -->
    <section class="py-20 sm:py-24 bg-gradient-to-t from-slate-100 to-white text-center relative border-t border-slate-200">
        <div class="max-w-4xl mx-auto px-4 sm:px-6">
            <div class="w-24 h-24 mx-auto mb-4 p-2 bg-white rounded-full shadow-lg border border-slate-200 flex items-center justify-center">
                <img src="assets/images/tobito_pose_koi.png" alt="とび斗くん" class="max-h-full max-w-full object-contain animate-bounce">
            </div>

            <h3 class="text-2xl sm:text-4xl font-bold text-slate-900 font-serif mb-3">
                「空を飛びたい気持ちに、限界なんてないトビ！」
            </h3>
            <p class="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed mb-8 font-serif">
                これからもTeam Birdman Trialの応援、よろしくトビ！<br>
                公式SNSでも日々の活動や琵琶湖の様子を発信しているから、ぜひチェックしてみてね！
            </p>

            <div class="flex flex-wrap items-center justify-center gap-3">
                <a href="<?= e($team['sns_x']) ?>" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-mono text-xs font-bold transition flex items-center gap-2">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>公式 X (旧Twitter)</span>
                </a>
                <a href="<?= e($team['sns_instagram']) ?>" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-mono text-xs font-bold transition flex items-center gap-2">
                    <i class="fa-brands fa-instagram"></i>
                    <span>Instagram</span>
                </a>
                <a href="<?= e($team['sns_youtube']) ?>" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold transition flex items-center gap-2">
                    <i class="fa-brands fa-youtube"></i>
                    <span>YouTube</span>
                </a>
                <a href="<?= e($team['url']) ?>" target="_blank" rel="noopener noreferrer" class="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-mono text-xs font-bold transition flex items-center gap-2">
                    <i class="fa-solid fa-globe text-sky-600"></i>
                    <span>TBT 公式サイト</span>
                </a>
            </div>
        </div>
    </section>

</main>

<!-- ==============================================
     ACTIVE THEORY LIGHTBOX MODAL
     ============================================== -->
<div id="archive-lightbox" class="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md hidden flex items-center justify-center p-4">
    <div class="relative max-w-2xl w-full bg-[#0c1017] border border-cyan-500/40 rounded-3xl p-6 text-white font-mono text-xs shadow-2xl">
        <button onclick="closeArchiveLightbox()" class="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg cursor-pointer">✕</button>
        <img id="lightbox-img" src="" alt="" class="w-full h-64 object-contain rounded-xl bg-black/40 mb-4">
        <div id="lightbox-code" class="text-cyan-400 font-bold mb-1"></div>
        <div id="lightbox-title" class="text-lg font-bold text-white mb-2 font-serif"></div>
        <div id="lightbox-desc" class="text-slate-300 leading-relaxed mb-4 font-serif"></div>
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
    const moodDescs = {
        'assets/images/tobito_pose_crossed_arms.png': 'いつでも真剣に大空を見つめる真摯な眼差し。1ミリの削り出しを見守る職人モード。',
        'assets/images/tobito_face_smile.png': '最高の追い風が吹いたときに見せる満面の笑み！仲間と大空へ飛び立つ喜びに満ちています。',
        'assets/images/tobito_face_angry.png': '妥協のないものづくりにかける熱血の情熱！「あと1ミリ削るトビ！」と気合が入っています。',
        'assets/images/tobito_face_cry.png': '悔しい着水や雨で見せる涙。でも諦めない！次への力に変える強いハートを持っています。'
    };

    window.changeAboutMood = function(imgSrc) {
        const el = document.getElementById('about-portrait-img');
        if (el) {
            el.src = imgSrc;
        }
        const descEl = document.getElementById('expression-desc');
        if (descEl && moodDescs[imgSrc]) {
            descEl.textContent = moodDescs[imgSrc];
        }
        document.querySelectorAll('.expression-btn').forEach(btn => {
            if (btn.querySelector('img') && btn.getAttribute('onclick').includes(imgSrc)) {
                btn.classList.add('border-sky-500', 'border-2');
                btn.classList.remove('border-slate-200');
            } else {
                btn.classList.remove('border-sky-500', 'border-2');
                btn.classList.add('border-slate-200');
            }
        });
        if (window.playTobitoVoice) {
            window.playTobitoVoice();
        }
    };

    // 2. 衣装切り替え
    const costumesData = <?= json_encode($costumes, JSON_UNESCAPED_UNICODE) ?>;
    let currentCostumeIndex = 0;

    window.switchCostume = function(idx) {
        currentCostumeIndex = idx;
        const c = costumesData[idx];
        if (!c) return;

        document.querySelectorAll('.costume-grid-card').forEach((btn, i) => {
            if (i === idx) {
                btn.classList.add('active', 'border-sky-500', 'bg-sky-950/20');
                btn.classList.remove('border-slate-800');
            } else {
                btn.classList.remove('active', 'border-sky-500', 'bg-sky-950/20');
                btn.classList.add('border-slate-800');
            }
        });

        const img = document.getElementById('costume-preview-img');
        if (img) img.src = 'assets/images/' + c.id;

        const badge = document.getElementById('costume-badge');
        if (badge) badge.textContent = c.badge;

        const name = document.getElementById('costume-name');
        if (name) name.textContent = c.name;

        const role = document.getElementById('costume-role');
        if (role) role.textContent = c.role;

        const desc = document.getElementById('costume-desc');
        if (desc) desc.textContent = c.desc;

        if (c.stats) {
            const speedVal = document.getElementById('stat-speed-val');
            const speedBar = document.getElementById('stat-speed-bar');
            if (speedVal) speedVal.textContent = c.stats.speed + ' / 100';
            if (speedBar) speedBar.style.width = c.stats.speed + '%';

            const cheerVal = document.getElementById('stat-cheer-val');
            const cheerBar = document.getElementById('stat-cheer-bar');
            if (cheerVal) cheerVal.textContent = c.stats.cheer + ' / 100';
            if (cheerBar) cheerBar.style.width = c.stats.cheer + '%';
        }

        if (window.tobitoCompanion && window.tobitoCompanion.setSkin) {
            window.tobitoCompanion.setSkin(c.id);
        }
    };

    // 3. ボイスフレーズ再生
    const tobitoPhrases = [
        "「ペダルを踏めば、夢は前に進むトビ！」",
        "「風をつかむトビ！琵琶湖の対岸へいくトビ！」",
        "「1ミリの削り出し、みんなの汗がぼくのパワーだトビ！」",
        "「空を飛びたい気持ちに、限界なんてないトビ！」",
        "「いい追い風が吹いてるトビ〜！」"
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
        const icon = document.getElementById('voice-quote-icon');
        if (window.tbtSound && window.tbtSound.speak) {
            window.tbtSound.speak(q, function() {
                if (icon) icon.classList.add('animate-bounce', 'text-amber-300');
            }, function() {
                if (icon) icon.classList.remove('animate-bounce', 'text-amber-300');
            });
        }
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
                btnYakitori.classList.add('bg-orange-500', 'text-white');
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
                btnYakitori.classList.remove('bg-orange-500', 'text-white');
            }
        }
    };

    // 5. インラインターミナル送信処理（即クリア & フォーカス復帰 & コマンド実行）
    function handleInlineTermSubmit() {
        const input = document.getElementById('inline-term-input');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim();
        input.value = '';
        input.focus();

        const body = document.getElementById('inline-term-body');
        if (!body) return;

        const userLine = document.createElement('div');
        userLine.className = 'text-white font-mono break-words';
        userLine.textContent = 'user@tbt:~$ ' + text;
        body.appendChild(userLine);

        const c = text.toLowerCase().trim();

        // 画面クリアコマンド
        if (c === 'clear' || c === 'cls') {
            body.innerHTML = `
                <div class="text-cyan-400 font-bold">=============================================================</div>
                <div class="text-cyan-300 font-bold">  TEAM BIRDMAN TRIAL - TOBITO WORKSHOP CONSOLE</div>
                <div class="text-cyan-400 font-bold">=============================================================</div>
                <div class="text-slate-400">画面ログを消去しました。何でも聞いてねトビ！</div>
                <div class="text-amber-300 font-bold">とび斗くん: 「準備完了トビ！飛行機や部室のこと、なんでも聞いてね！」</div>
            `;
            body.scrollTop = body.scrollHeight;
            return;
        }

        // 風洞ジャンプ
        if (c === 'wind' || c === 'tunnel') {
            const botLine = document.createElement('div');
            botLine.className = 'text-emerald-400 font-mono py-1';
            botLine.innerHTML = '💨 風洞実験室（Scene 04）へジャンプするトビ！';
            body.appendChild(botLine);
            body.scrollTop = body.scrollHeight;
            document.getElementById('wind-tunnel')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // フライトシミュレーター切り替え
        if (c === 'flight') {
            const botLine = document.createElement('div');
            botLine.className = 'text-sky-300 font-mono py-1';
            botLine.innerHTML = '✈️ 3D琵琶湖フライトシミュレーターへ切り替えるトビ！';
            body.appendChild(botLine);
            body.scrollTop = body.scrollHeight;
            if (window.switchGameTab) window.switchGameTab('flight');
            document.getElementById('game')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // ヤキトリミニゲーム切り替え
        if (c === 'yakitori') {
            const botLine = document.createElement('div');
            botLine.className = 'text-amber-400 font-mono py-1';
            botLine.innerHTML = '🔥 ヒエッ…！ヤキトリ脱出ゲームへ切り替えるトビ！串から逃げ切って！';
            body.appendChild(botLine);
            body.scrollTop = body.scrollHeight;
            if (window.switchGameTab) window.switchGameTab('yakitori');
            document.getElementById('game')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // AI応答生成
        const reply = window.generateTobitoReply ? window.generateTobitoReply(text) : ('「' + text + ' か！ぼくも琵琶湖を飛ぶのが楽しみだトビ！」');
        
        const isCommand = ['help', 'man', '?', 'status', 'aircraft', 'spec', 'specs', 'logs', 'log', 'umbrella', 'kasatate', 'about', 'whoami', 'date', 'easteregg'].includes(c);

        const botLine = document.createElement('div');
        if (isCommand) {
            botLine.className = 'text-cyan-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800 my-1 text-xs';
            botLine.textContent = reply;
        } else {
            botLine.className = 'text-amber-300 font-bold font-mono whitespace-pre-wrap leading-relaxed py-1 flex items-start justify-between gap-2';
            
            const msgSpan = document.createElement('span');
            msgSpan.textContent = 'とび斗くん: 「' + reply + '」';
            botLine.appendChild(msgSpan);

            const voiceBtn = document.createElement('button');
            voiceBtn.type = 'button';
            voiceBtn.className = 'shrink-0 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 transition cursor-pointer';
            voiceBtn.innerHTML = '<i class="fa-solid fa-volume-high mr-1"></i>音声';
            voiceBtn.title = 'とび斗の音声を再生';
            voiceBtn.onclick = function() {
                if (window.tbtSound && window.tbtSound.speak) {
                    window.tbtSound.speak(reply);
                } else if (window.speakTobito) {
                    window.speakTobito(reply);
                } else if ('speechSynthesis' in window) {
                    try {
                        const u = new SpeechSynthesisUtterance(reply.replace(/[「」]/g, ''));
                        u.lang = 'ja-JP';
                        u.pitch = 1.3;
                        window.speechSynthesis.speak(u);
                    } catch(e) {}
                }
            };
            botLine.appendChild(voiceBtn);
        }
        body.appendChild(botLine);
        body.scrollTop = body.scrollHeight;

        if (window.tbtSound) {
            if (text.includes('焼き鳥') || text.includes('ヤキトリ')) {
                window.tbtSound.playTobitoReaction('surprise');
            } else {
                window.tbtSound.playTobitoReaction('smile');
            }
            if (!isCommand && window.tbtSound.speak) {
                window.tbtSound.speak(reply);
            }
        } else if (!isCommand && window.speakTobito) {
            window.speakTobito(reply);
        } else if (!isCommand && 'speechSynthesis' in window) {
            try {
                const u = new SpeechSynthesisUtterance(reply.replace(/[「」]/g, ''));
                u.lang = 'ja-JP';
                u.pitch = 1.3;
                window.speechSynthesis.speak(u);
            } catch(e) {}
        }
        input.focus();
    }

    window.sendQuickPrompt = function(q) {
        const input = document.getElementById('inline-term-input');
        if (input) {
            input.value = q;
            handleInlineTermSubmit();
        }
    };

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

    // 5.5. ターミナル音声認識 (Web Speech API)
    let termRecognition = null;
    let isTermRecognizing = false;

    window.toggleTermVoiceInput = function() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        const btn = document.getElementById('btn-term-mic');
        const icon = document.getElementById('term-mic-icon');
        const label = document.getElementById('term-mic-label');
        const input = document.getElementById('inline-term-input');

        if (!SpeechRec) {
            alert('お使いのブラウザは音声認識 (Web Speech API) に対応していません。Google ChromeまたはMicrosoft Edge等をご利用ください。');
            return;
        }

        if (isTermRecognizing && termRecognition) {
            termRecognition.stop();
            return;
        }

        function stopRecognitionUI() {
            isTermRecognizing = false;
            if (btn) {
                btn.classList.remove('bg-rose-600', 'text-white', 'border-rose-400', 'animate-pulse');
                btn.classList.add('bg-slate-800', 'text-cyan-300', 'border-cyan-500/30');
            }
            if (icon) icon.textContent = '🎙';
            if (label) label.textContent = '音声入力';
            if (input) input.placeholder = 'メッセージを入力... (例: こんにちは、二人乗りについて教えて、help)';
        }

        try {
            termRecognition = new SpeechRec();
            termRecognition.lang = 'ja-JP';
            termRecognition.interimResults = true;
            termRecognition.maxAlternatives = 1;

            termRecognition.onstart = function() {
                isTermRecognizing = true;
                if (btn) {
                    btn.classList.remove('bg-slate-800', 'text-cyan-300', 'border-cyan-500/30');
                    btn.classList.add('bg-rose-600', 'text-white', 'border-rose-400', 'animate-pulse');
                }
                if (icon) icon.textContent = '⏹';
                if (label) label.textContent = '聞いてるトビ...';
                if (input) input.placeholder = '話しかけてください (マイク聞き取り中...)';
            };

            termRecognition.onresult = function(event) {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                if (input) {
                    input.value = transcript;
                }
            };

            termRecognition.onerror = function(event) {
                console.warn('Speech recognition error:', event.error);
                stopRecognitionUI();
            };

            termRecognition.onend = function() {
                stopRecognitionUI();
                if (input && input.value.trim()) {
                    handleInlineTermSubmit();
                }
            };

            termRecognition.start();
        } catch (e) {
            console.error('Failed to start speech recognition:', e);
            stopRecognitionUI();
        }
    };

    // 6. Active Theory ライトボックス
    window.openArchiveLightbox = function(index) {
        const archives = window.activeTheoryArchivesData || [];
        const item = archives[index];
        if (!item) return;

        if (window.activeTheoryInstance && typeof window.activeTheoryInstance.openInspectionModal === 'function') {
            window.activeTheoryInstance.openInspectionModal(item);
            return;
        }

        const modal = document.getElementById('archive-lightbox');
        if (!modal) return;
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

    // 7. 各種シミュレーターDOM初期化
    document.addEventListener('DOMContentLoaded', () => {
        // 3Dフライトゲーム初期化
        if (!window.tobitoGame && document.getElementById('tobito-game-canvas')) {
            const GameClass = window.TobitoFlightSimulator3D || window.TobitoFlightGame;
            if (GameClass) {
                window.tobitoGame = new GameClass('tobito-game-canvas');
            }
        }

        // 風洞シミュレーター初期化
        if (!window.tbtWindTunnel && !window.windTunnelSim && document.getElementById('wind-tunnel-canvas-container') && window.WindTunnelSimulator) {
            window.tbtWindTunnel = new window.WindTunnelSimulator();
        }
        if (window.tbtWindTunnel) {
            window.windTunnelSim = window.tbtWindTunnel;
        }

        // Active Theory アーカイブ初期化
        if (!window.activeTheoryInstance && !window.atArchive && document.getElementById('active-theory-canvas-container') && window.ActiveTheoryArchive) {
            window.activeTheoryInstance = new window.ActiveTheoryArchive();
        }
        if (window.activeTheoryInstance) {
            window.atArchive = window.activeTheoryInstance;
        }
    });
</script>



<?php
if (function_exists('get_footer')) {
    get_footer();
}
?>
