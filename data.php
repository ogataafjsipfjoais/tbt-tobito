<?php
/**
 * Team Birdman Trial (TBT) - とびとくん 紹介ページ データ定義
 * 芝浦工業大学 鳥人間コンテスト出場チーム「Team Birdman Trial」公式マスコット
 */

function e(string $str): string {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function tobito_asset_url(string $path): string {
    $file = __DIR__ . '/' . $path;
    if (!is_file($file)) return $path;
    return $path . '?v=' . substr(hash_file('sha256', $file), 0, 12);
}

// チーム基本情報
$team = [
    'name' => 'Team Birdman Trial',
    'short_name' => 'TBT',
    'university' => '芝浦工業大学',
    'established' => '1994年',
    'contest' => '鳥人間コンテスト 人力プロペラ機部門',
    'feature' => '大会唯一の二人乗り人力プロペラ機',
    'url' => 'https://teambirdmantrial.jp',
    'sns_x' => 'https://x.com/s_tbt',
    'sns_instagram' => 'https://www.instagram.com/team_birdman_trial_official/',
    'sns_youtube' => 'https://www.youtube.com/user/teambirdmantrial',
];

// Published design data: https://teambirdmantrial.jp/history/s-320-element/
$aircraft = [
    'name' => 'S-320 Element', 'year' => 2026, 'span' => 40.0,
    'weight' => 83.5, 'grossWeight' => 199.0, 'area' => 45.60,
    'aspectRatio' => 35.09, 'glideRatio' => null, 'cruiseSpeed' => 8.0,
    'airfoils' => 'DAE31, DAE41, FX76MP120', 'power' => 435,
    'source' => 'https://teambirdmantrial.jp/history/s-320-element/',
    'verified' => '2026-10-13'
];

// とびとくん 基本プロフィール
$tobito = [
    'name' => 'とびとくん',
    'en_name' => 'TOBITO',
    'title' => 'TBT公式キャラクター / 空を目指すニワトリ',
    'tagline' => '「飛べない鳥が、空を目指す。」',
    'species' => '大空に恋い焦がれるニワトリ（挑戦する気持ちの象徴）',
    'affiliation' => '芝浦工業大学 Team Birdman Trial（特別広報部・空への案内役）',
    'birthday' => '一次資料で未確認',
    'height' => '一次資料で未確認',
    'weight' => '一次資料で未確認',
    'profile_scope' => 'このページのキャラクター設定',
    'charm_point' => '風に揺れる真っ赤なトサカと、一生懸命バタバタする大きな翼',
    'favorite_food' => 'バナナ、エネルギーゼリー、琵琶湖の追い風',
    'dislikes' => '大雨、横風、翼に触れる乱気流',
    'skills' => '追い風の気配を読むこと、部室を少し明るくすること、パイロットへの全力羽ばたき応援',
    'catchphrase' => '「ペダルを踏めば、夢は前に進むトビ！」',
];

// とびとくんの3大ミッション
$missions = [
    [
        'icon' => 'fa-plane-departure',
        'badge' => 'MISSION 01',
        'title' => '琵琶湖フライトでの全力応援！',
        'desc' => '鳥人間コンテスト本番、10mのプラットフォームから飛び立つ二人乗り機体を熱血応援！風を呼び、パイロットのペダリングにエールを送ります。',
    ],
    [
        'icon' => 'fa-users',
        'badge' => 'MISSION 02',
        'title' => '地域・子どもたちとのふれあい',
        'desc' => '「東大宮サマーフェスティバル」など地域のお祭りに出動！子どもたちと一緒に記念撮影をしたり、飛行機の魅力を伝える人気者です。',
    ],
    [
        'icon' => 'fa-school',
        'badge' => 'MISSION 03',
        'title' => '学園祭・新歓でのTBT広報活動',
        'desc' => '芝浦祭での機体展示や新入生勧誘で大活躍。TBTの部室で1年間を通して部員たちのものづくりを見守り、チームの結束を高めています。',
    ],
];

// とびとくんの秘密・豆知識
$secrets = [
    [
        'q' => 'なぜニワトリなの？',
        'a' => '「飛べない鳥」の代表格であるニワトリだからこそ、“人の知恵と力で空を飛ぶ”という人力飛行機の原点・挑戦の象徴なのです。',
    ],
    [
        'q' => '「1号」と「2号」がいるって本当？',
        'a' => '一次資料では確認できていません。このページの物語と公式の来歴は区別して紹介します。',
    ],
    [
        'q' => '先輩たちの魂が宿っている？',
        'a' => '代々の先輩部員たちが命を吹き込んできたため、「歴代のTBT魂が宿っている」と語り継がれています。暑い夏もみんなの気迫で乗り切ります。',
    ],
];

// とびとくんの名言録
$quotes = [
    '「風をつかむトビ！琵琶湖の対岸まで、ふたりで漕ぎ抜くトビ！」',
    '「1ミリの削り出し、1枚の翼リブ。部員みんなの汗がぼくのパワーだトビ！」',
    '「空を飛びたい気持ちに、限界なんてないトビ！」',
];

// 応援メッセージ初期データ
$default_cheers = [
    [
        'name' => '芝浦工大OB（2018年フェアリング班）',
        'date' => '2026.09.20',
        'message' => 'とびとくん、今年も琵琶湖での熱い応援お疲れ様！後輩たちの二人乗りフライト、本当に胸が熱くなりました。ずっとTBTの象徴でいてください！',
    ],
    [
        'name' => '東大宮の小学生ファン',
        'date' => '2026.08.12',
        'message' => 'サマーフェスティバルでとびとくんと握手できて嬉しかったです！飛行機すごく大きくてかっこよかった！',
    ],
    [
        'name' => '琵琶湖プラットフォーム応援団',
        'date' => '2026.07.28',
        'message' => '遠くからでも真っ赤なトサカが見えて勇気をもらいました。大会唯一の二人乗りプロペラ機、誇りに思います！',
    ],
];

// とびとくん 公式ポーズ & 衣装コレクション (純粋なグラフィックスタイル全6種)
$costumes = [
    [
        'id' => 'tobito_pose_airplane.png',
        'name' => '飛行機ポーズ（空飛ぶとびとくん）',
        'en_name' => 'Airplane Flight Pose',
        'role' => '提供イラスト / 飛行機ポーズ',
        'desc' => '両腕をいっぱいに広げた飛行機ポーズ。このページでは、大空への憧れを表すとびとくんの姿として紹介しています。',
        'stats' => ['speed' => 95, 'stamina' => 90, 'cheer' => 100, 'intellect' => 85, 'love' => 100],
        'badge' => 'FLIGHT POSE',
        'color' => 'sky',
    ],
    [
        'id' => 'tobito_pose_koi.png',
        'name' => '「来い」ポーズ（新歓・熱血スタイル）',
        'en_name' => 'Call for Birdman Spirit',
        'role' => '青いつなぎ（作業着） / 新歓ステッカー仕様',
        'desc' => '青い作業着（つなぎ）を身にまとい、「来い」と書かれた額縁を力強く掲げる姿。新歓ステッカーにも採用された、部員と追い風を呼び寄せる熱血スタイルです。',
        'stats' => ['speed' => 75, 'stamina' => 95, 'cheer' => 100, 'intellect' => 80, 'love' => 95],
        'badge' => 'SHIBAURA SPIRIT',
        'color' => 'blue',
    ],
    [
        'id' => 'tobito_pose_crossed_arms.png',
        'name' => '腕組みポーズ（職人・設計魂）',
        'en_name' => 'Crossed Arms Craftsman',
        'role' => '青いつなぎ / 設計・製作見守り仕様',
        'desc' => '腕を組んで真剣な眼差しを向ける姿。1ミリの削り出し、1グラムの軽量化にも妥協しない航空工学の職人魂を象徴しています。',
        'stats' => ['speed' => 70, 'stamina' => 100, 'cheer' => 90, 'intellect' => 95, 'love' => 90],
        'badge' => 'CRAFTSMAN',
        'color' => 'amber',
    ],
    [
        'id' => 'tobito_science.svg',
        'name' => '白衣サイエンス（風洞実験・解析）',
        'en_name' => 'Aero Science Analyst',
        'role' => 'CFD流体解析 / 実験計測仕様',
        'desc' => '白衣と実験メガネを装着した工学研究モード。数値流体力学（CFD）や風洞実験データを精密に分析し、最適翼型を導き出します。',
        'stats' => ['speed' => 65, 'stamina' => 85, 'cheer' => 80, 'intellect' => 100, 'love' => 90],
        'badge' => 'AERO SCIENCE',
        'color' => 'emerald',
    ],
    [
        'id' => 'tobito_pilot.svg',
        'name' => 'スカイエース（パイロット）',
        'en_name' => 'Sky Ace Pilot',
        'role' => 'ヴィンテージゴーグル仕様',
        'desc' => 'ヴィンテージゴーグルとパイロットキャップを装備。風の流れ（サーマル）を的確に察知し、最高の飛行ルートをナビゲートします。',
        'stats' => ['speed' => 95, 'stamina' => 90, 'cheer' => 85, 'intellect' => 85, 'love' => 95],
        'badge' => 'PILOT ACE',
        'color' => 'sky',
    ],
    [
        'id' => 'tobito_cyber.svg',
        'name' => 'サイバージェット（超音速）',
        'en_name' => 'Cyber Thruster',
        'role' => '未来航空工学モード',
        'desc' => '背中にツイン推進バーニアを装備。未来の航空テクノロジーを取り入れたコンセプト形態です。',
        'stats' => ['speed' => 100, 'stamina' => 80, 'cheer' => 80, 'intellect' => 95, 'love' => 85],
        'badge' => 'CYBER TECH',
        'color' => 'cyan',
    ],
];

// 公式ステッカー・表情バリエーション
$emotions = [
    ['id' => 'tobito_face_normal.png', 'name' => '通常顔', 'desc' => 'いつでも真剣に大空を見つめる真摯な眼差し'],
    ['id' => 'tobito_face_smile.png', 'name' => '笑顔', 'desc' => '最高の追い風が吹いたときに見せる満面の笑み'],
    ['id' => 'tobito_face_cry.png', 'name' => '泣き顔', 'desc' => '雨や悔しい着水で見せる、次への糧となる涙'],
    ['id' => 'tobito_face_angry.png', 'name' => '怒り顔', 'desc' => '妥協のないものづくりにかける熱血の情熱'],
];

// とびとくんの1日（密着タイムライン）
$daily_routine = [
    [
        'time' => '07:00',
        'title' => '早朝グラウンド 風向チェック & 準備運動',
        'desc' => 'キャンパスの空を見上げて風向きや湿度をチェック。翼をパタパタさせてウォーミングアップを行います。',
        'icon' => 'fa-sun',
    ],
    [
        'time' => '10:00',
        'title' => '部室で見守り！翼リブの削り出し作業',
        'desc' => 'スタイロフォームの翼リブ削り出しを真剣に見守ります。部員たちへの補給サポートも忘れません。',
        'icon' => 'fa-screwdriver-wrench',
    ],
    [
        'time' => '14:00',
        'title' => '二人乗りパイロットのペダリング特訓に全力エール！',
        'desc' => '汗だくでエルゴメーターを回すパイロットたちの隣で、トサカを揺らして限界突破のエールを送ります。',
        'icon' => 'fa-bicycle',
    ],
    [
        'time' => '17:00',
        'title' => '地域の子どもたちや見学者とハイタッチ！',
        'desc' => '部室見学に来た子どもたちと記念撮影。「大きくなったら一緒に飛行機を作ろう」と約束を交わします。',
        'icon' => 'fa-handshake-simple',
    ],
    [
        'time' => '21:00',
        'title' => '消灯・部室の守り神として明日に備える',
        'desc' => 'ピカピカに磨かれた機体を見守りながら就寝。琵琶湖の対岸へ美しい放物線を描いて飛ぶ夢を見ます。',
        'icon' => 'fa-moon',
    ],
];

// イントロダクション（プロローグ）：架空の工房・大空の設計室
$prologue = [
    'catch_copy_1' => '飛べない鳥が、空を目指す。',
    'catch_copy_2' => 'ここは、とびとくんの世界に入っていくための小さな滑走路。',
    'concept_title' => 'とびとくん公式ブランドサイト',
    'concept_en' => 'TOBITO Official Brand Experience',
    'intro_text' => '部室の笑い声、バナナの差し入れ、夜の削り出し、琵琶湖の追い風。TBTのものづくりの奥にある人間味を、とびとくんというキャラクターの視点からたどる物語です。',
];

// 【AERODYNAMIC ARCHIVES & WORKS】風洞実験室 & 航空テレメトリ・アーカイブ (Active Theoryスタイル)
$archive_items = [
    ['sticker1_p1.png', '4つの表情', 'STICKER', '笑ったり、泣いたり、気合を入れたり。とびとくんの表情を集めた提供画像です。'],
    ['sticker2_p1.png', '追い風を呼ぶ「来い」', 'STICKER', '青いつなぎで額縁を掲げるとびとくん。物語の中で、仲間と追い風を呼び寄せます。'],
    ['goods3_p1.png', '翼を広げるとびとくん', 'MERCHANDISE', '両腕を広げて、空への憧れを表すポーズの提供画像です。'],
    ['goods4_p1.png', '腕組みのとびとくん', 'MERCHANDISE', '腕を組んでものづくりを見守るポーズの提供画像です。'],
    ['tobito_stand_umbrella.png', 'とびとくんかさ立て', 'CRAFT ART', '立体のとびとくんを写した提供素材。製作年・材質・制作担当者は未確認です。'],
];
$archives = array_map(static function ($item, $index) {
    $number = sprintf('%02d', $index + 1);
    return [
        'id' => $item[0], 'number' => $number, 'code' => 'TBT-IMG-' . $number,
        'lot_number' => 'COLLECTION ' . $number, 'category' => '提供素材', 'type' => $item[2],
        'story_title' => $item[1], 'item_name' => $item[1], 'recorded_by' => '提供素材',
        'story_text' => $item[3], 'specs' => '画像コレクション', 'material' => '制作仕様は未確認',
        'zoom_scale' => 'scale-100',
        'telemetry' => ['velocity' => '未測定', 'cadence' => '未測定', 'altitude' => '未測定', 'aero_tag' => '展示用の物語', 'lat_lon' => '位置情報なし'],
    ];
}, $archive_items, array_keys($archive_items));

// 【Layer 1: CRAFT & ENGINEERING】アトリエの設計思想（空への軌跡）
$craft_engineering = [
    'philosophy' => [
        'title' => '飛べない鳥だからこそ、仲間の技術と知恵で翔ぶ。',
        'subtitle' => 'WHY A ROOSTER? — THE BIRDMAN PHILOSOPHY',
        'body' => '「ニワトリ」は本来、大空を渡ることのできない鳥。しかし人間もまた、翼を持たずに生まれた存在です。だからこそ、航空工学の叡智を注ぎ込み、仲間と何千時間も手を動かし、知恵とチームワークを結集して琵琶湖の広大な空へと飛び立ちます。とびとくんは、TBTの純粋な探求心と“不可能への挑戦”を象徴する存在です。',
    ],
    'specs_list' => [
        [
            'code' => 'SYS-01',
            'tag' => 'WING ARCHITECTURE',
            'label' => '30m超 CFRP主翼 & リブ削り',
            'detail' => '極限の軽量化と高剛性を両立するカーボン複合材スパー。翼の部品を製作し、組み立て、試験を重ねます。加工精度の数値は未確認です。',
            'metric' => 'SPAN : 40.00m / TBT公式掲載値',
        ],
        [
            'code' => 'SYS-02',
            'tag' => 'PROPULSION',
            'label' => '大会唯一「二人乗りタンデム駆動」',
            'detail' => '前席と後席のパイロットが完全に息を合わせ、ペダル踏力を直結シャフトとプロペラへ伝達。2人の出力シナジーが安定した大推力を生み出します。',
            'metric' => 'CREW : 2 PILOTS / POWER : 435W（公式掲載値）',
        ],
        [
            'code' => 'SYS-03',
            'tag' => 'AERODYNAMICS',
            'label' => '超軽量フェアリング & 整流設計',
            'detail' => '空気抵抗を限界まで削ぎ落とす流線型ノーズコーン。部員が代々受け継ぐハンドレイアップ技術により、驚異的な軽さと強度を実現。',
            'metric' => '空気抵抗低減率は未確認',
        ],
    ],
];

// 【ATELIER LIFE】アトリエの日常スケッチ (The Studio Notes)
$studio_notes = [
    [
        'number' => 'Note 01',
        'title' => 'フェアリング講習会のあとに生まれた、玄関の守り神',
        'subtitle' => '立体かさ立てをめぐる物語（来歴未確認）',
        'image' => 'tobito_stand_umbrella.png',
        'is_photo' => true,
        'recorded_by' => 'フェアリング造形班',
        'date' => 'ある雨の日のアトリエにて',
        'story' => '人力飛行機の空気抵抗を減らすための軽量カバー「フェアリング」。先輩から後輩へ技術を伝える講習会で、実物大のとびとくんが立体として生まれました。雨の日も風の日も、部室の玄関で傘を抱えて部員たちの無事を見守り続けています。',
        'note' => '提供素材 / 製作場所・材質は一次資料で未確認',
    ],
    [
        'number' => 'Note 02',
        'title' => 'ドアの鴨居にトサカをぶつける朝',
        'subtitle' => '頭上に気をつけて（キャラクターの物語）',
        'icon' => 'fa-door-open',
        'is_photo' => false,
        'recorded_by' => '広報班 ＆ 出動サポート部隊',
        'date' => '毎朝の出動ルーティン',
        'story' => '自慢の真っ赤なトサカは、部室のドアをくぐるたびにペコリと引っかかるのがお約束。「頭上注意！」と声を掛け合いながら、みんなで屈んで外の大空へ出動します。少し不器用で愛おしい、アトリエの朝の光景です。',
        'note' => 'キャラクターの物語 / 実測データではありません',
    ],
    [
        'number' => 'Note 03',
        'title' => '深夜の補給食：バナナとエネルギーゼリー',
        'subtitle' => '真夜中のエネルギーチャージ',
        'icon' => 'fa-bolt',
        'is_photo' => false,
        'recorded_by' => 'パイロット ＆ 深夜作業班',
        'date' => '午前2時の休憩デスク',
        'story' => '二人乗りのペダルを踏み抜くパイロットたちの限界トレーニング。そして夜遅くまで続く翼リブの削り出し。デスクに山積みされたバナナと高カロリーゼリーが、みんなの夢を前に進めるための燃料です。',
        'note' => 'MENU: BANANA & ENERGY GEL / TEAM SPIRIT: 100% CHARGED',
    ],
];

// 後方互換性エイリアス
$behind_the_scenes = $studio_notes;



