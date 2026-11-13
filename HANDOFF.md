# HANDOFF — とびとくんのひみつ基地

更新日: 2026-11-11

## プロジェクト
- リポジトリ: https://github.com/ogataafjsipfjoais/tbt-tobito
- 新サイト: https://ogataafjsipfjoais.github.io/tbt-tobito/3d/
- モデル確認: https://ogataafjsipfjoais.github.io/tbt-tobito/3d/model-review.html
- 旧サイト: https://ogataafjsipfjoais.github.io/tbt-tobito/legacy.html
- ブランチ: main
- 最新作業開始点: a3885d4620474f8ebe28914bab6c0e6829199b4e (README更新直後。正確な最新headはGitHubを再取得)

## 最重要条件
- 元サイト index.php / legacy.html と元フライトゲーム、やきとり脱出、S-320風洞ゲームの原本を破壊しない
- 3Dキャラクターの頭の形は四角いと決めつけず、参照イラストと自然な立体感を優先
- 演出やマスコットUIより実際の品質、操作性、読み込み、動作確認を優先
- 旧ゲームは新サイト内の隔離された /3d/arcade/ で再利用し、GitHub Pagesではサーバー側ランキングAPI非対応

## 2026-11-11 直近の作業
- 本物の独立したバイナリGLBデータを追加: /3d/models/tobito-v3.glb (~1.5MB; 55 meshes, 65 nodes, 13 PBR materials)
- 形状は連続曲面の頭、頬、眼、トサカ、くちばし、つなぎ、羽、脚、靴、服の細部。rigは Body_Rig, Face_Gaze, Comb_Sway, Wing_Left/Right_Pivot, Leg_Left/Right_Pivot, Eye_Left/Right_Blink
- /3d/world.js はGLTFLoaderで、新しいGLBを3Dスクロール区間の手前で遅延読込。ノードを歩行・羽ばたき・まばたきへ接続。失敗時には既存の tobito-character.js を使う
- /3d/model-review.html, .css, .js を新設し、原画とGLBを見比べる360度ターンテーブルを用意。マウス・タッチ・キーボード・ズーム
- /3d/index.html のとびと君紹介にレビュー画面へのリンク追加
- /tests/tobito-glb.test.cjs と /tests/tobito-model-review.test.cjs でGLB内部構造、レビュー画面、旧ゲームの保全を検証
- 旧ゲーム/風洞/S-320機体ビューアには今回変更なし

## 開発構成
- 3Dの主シーン: /3d/world.js, /3d/cinematic.css
- 造形GLB: /3d/models/tobito-v3.glb
- 元のフォールバック造形: /3d/tobito-character.js
- 3Dデータ確認: /3d/model-review.html, /3d/model-review.js, /3d/model-review.css
- 旧ゲーム統合: /3d/gameport.js, /3d/arcade/index.html, /3d/arcade/arcade-runtime.js
- 新サイト: /3d/index.html, /3d/opening.js, /3d/opening.css
- CI: /.github/workflows/pages.yml (Node + PHP検証 / legacy.html 自動生成)
- ブランチ公開: GitHub Pages、main

## 検証済み
- GitHubにGLB blob と ref更新が成功し、GLB形式をNodeテストで解析
- GLBメッシュ数、ノード名、マテリアル、バイナリチャンク確認
- /3d/world.js のJS構文とNode回帰テスト
- GitHub Actionsの最新手前のテスト成功。最新コミットのActions実行状況は再確認

## 未検証・懸念点
- 公開URLへの実ブラウザアクセスはこの環境ではできず、モデルの正面/横/背面の見た目の品質は**未検証**
- Blender等でのモデラー監修、正式なマスコット表現の承認は未実施。GLBは造形検討版と明示
- GitHub PagesのJekyllデプロイはPushのたびpending/cancelledが発生しやすい。最新Runがsuccessになるまで公開完了と断言しない
- 既存ページのアニメーション負荷、WebGLコンテキスト制限、キーボード・タッチ操作は現物ブラウザで要検証
- およそ1.5MBのGLBが低性能端末で時間・メモリ負荷にならないか計測が必要

## 次に行う作業
1. GitHub Actionsで最新ビルド成功と、GitHub Pages側デプロイ成功を別々に確認
2. /3d/model-review.html と /3d/ のPC/スマホ実機スクリーンショットで造形・遮蔽・顔・リギング破綻を確認
3. 原画と横顔・背面・頬の整合性、羽の付け根の見た目を改善
4. 必要ならBlender製造形や品質レビューを実施し、GLBを交換
5. old site /3d/arcade/ のゲーム・風洞・入力に回帰不具合がないか検証

## 注意
- モデルレビューの合格とトップサイトの完成度は別問題
- 実ブラウザで未確認の状態を「完成」「公開確認済み」として報告しない


## 2026-11-11 v4再制作 / 現行モデル
- v3の丸顔・頬玉を別キャラクターに見える問題として認識し、`3d/models/tobito-v4.glb` をゼロから造形。頭の輪郭は球や角箱ではなく、正面が広く下部がすぼまる連続面。頬を別パーツにせず、くちばしを細い三角くさび、三峰のトサカは1つの造形に変更。
- 同ディレクトリの `build-tobito-v4.cjs` で再生成可能。v3原本は削除しない。
- `3d/world.js` の主GLBはv4。フォールバックは以前の軽量モデル。レビュー画面 `3d/model-review.html` では v4/v3 を切替比較。
- CI `tests/tobito-v4.test.cjs`。旧サイト・ゲーム・風洞の改変なし。
- v4の実機視覚検査は未実施のため、完成品質とは断言しない。原画との比較・動作・処理負荷の実ブラウザ確認が次の最重要課題。


## 2026-11-13：格納庫を「見る」から「通り抜ける」3Dへ
- ユーザーの指示『通り抜けるようにして』を、スクロールでとびと君と一緒に格納庫入口から翼の下をくぐり、反対側の出口を抜けて琵琶湖へ向かう要求と解釈。
- 3d/flight-path.js を追加。連続座標 z=0→-275、格納庫入口 -133、翼 -171、出口 -193、湖 -210。カメラは常にとびと君の9.5単位後方で同じ通路を走り、逆戻り/場面瞬間切替を防ぐ。
- 3d/world.js の『格納庫でカメラを後方へ引いて上昇させる』旧処理を廃止。6つの連続アーチと天井レールを追加し、カメラ自身が翼の下を通過。湖へ出たあとだけ上空へ移動。
- 3d/index.html で flight-path.js を world.js より先に読む。3d/world.js は入口・翼下・出口の現在地表示を更新。
- tests/tobito-passage.test.cjs で進行方向の単調性、通過順、翼下の低いカメラ、旧ゲーム・風洞・グッズ・2Dフォールバック保存を検証。GitHub Actionsの検証対象に追加。
- 過去のGLBモデル、legacy.html、旧ゲーム、ゲーム移植部分は変更していない。
- CI実行は成功した。GitHub Pagesデプロイ最終成功と実ブラウザでの通り抜け演出・当たり判定・遮蔽・FPS検証は別途確認が必要。

## 2026-11-13：ゲーム・風洞の起動表示とS-320格納庫の改修
- `3d/gameport.js` に親画面の『起動中…』オーバーレイを実装。ゲーム/風洞のiframeを作成した直後から表示し、子の `ready` メッセージ到着まで残す。エラーなら再試行ボタンへ切替。
- `3d/arcade/arcade-runtime.js` の `ready` 通知を、JSコンストラクター直後ではなく描画用canvas/rendererとS-320モデルの読込状態を検証した後に変更。25秒でタイムアウト、失敗なら親へエラー通知。
- `3d/gameport.css` にスピナーと失敗状態のアクセシブルな表示を追加。動きを減らす設定も尊重。
- `3d/world.js` の象徴的な仮機体を、既存 `TBTS320.create({span:40,groundY:0})` により機体・プロペラ・昇降舵・方向舵からなる実S-320 GLBアセンブリへ置換。ロード成功で仮機体を隠し、失敗時は仮機体を残す。一度の失敗で毎フレーム再要求しない。
- 格納庫に整備用キャットウォーク・手すり・台車・天井灯を追加し、実用的な空間密度を上げた。
- 旧サイトと原本ゲームエンジンのコードは変更していない。新規 `tests/tobito-loading-hangar.test.cjs` をCIに追加。
- 残課題：S-320背景表示の軸・高さ・実機描画と、風洞の読込完了通知の実ブラウザ確認。CIとPagesの最新ステータスを確認すること。


## 2026-11-13：S-320整備架台への接地修正（ユーザーB案）
- 機体が宙に浮いて見える問題に対し、ユーザーが『B：整備台に載せる』を選択。
- `3d/aircraft-mount.js` を追加。S-320の実GLBの胴体最下点と機体全体の最下点を計測し、支持面の高さと床への最低クリアランスを計算する。固定の `model.position.y=1.15` は廃止。
- `3d/world.js` に左右ブレース付きの整備架台2基、ラバーサドル、スキッド、床ライン、柔らかい接地影を実装。機体と架台の上面を測定値に合わせる。S-320の中心を通過ルートから右に5.5ユニットずらし、視点と架台の衝突を避ける。
- 旧GLB読込失敗時の仮機体も同じ高さ計算で架台に乗せる。実機体が読込成功すれば架台の高さを再調整する。
- `3d/index.html` の読み込み順へ `aircraft-mount.js` を追加。`tests/tobito-stand.test.cjs` に数値計算、衝突クリアランス、シーン構成と旧サイトの回帰テスト5件を追加。GitHub Actionsへ登録。
- 旧サイト・ゲーム・既存S-320 GLBアセットの変更なし。実ブラウザでの胴体とパッドの視覚的接触、翼とカメラの遮蔽、PC/スマホFPSは未検証。コードテスト成功と実画面検証は区別する。
