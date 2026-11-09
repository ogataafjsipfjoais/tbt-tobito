<?php
/**
 * Template Name: 公式マスコット とびとくんの部屋
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
}

if (function_exists('get_header')) {
    get_header();
}
?>

<!-- GSAP & ScrollTrigger & Lenis & Tailwind CDN (WordPress環境用保証) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>
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
