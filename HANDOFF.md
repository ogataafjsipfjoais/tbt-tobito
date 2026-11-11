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
