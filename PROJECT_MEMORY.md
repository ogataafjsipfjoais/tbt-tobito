# PROJECT_MEMORY: とびとくんの部屋

最終更新: 2026-11-09

## プロジェクト目的
Team Birdman Trial公式マスコット「とびとくん」のキャラクター紹介サイト。既存のWordPress/PHPページを維持しつつ、3D中心の体験へ段階的に移行する。

## リポジトリ
https://github.com/ogataafjsipfjoais/tbt-tobito

## デザイン上の決定
- とびとくん本人を主役に置く。WebGLだけが目的の余計なモーションや汎用的なカードUIを増やさない。
- 第1段階ではトップの2Dポートレートを3D化。既存のスクロール物語・音声・ゲーム・機体モデル・アーカイブは保存。
- 3Dキャラクターは原画に着想を得たプロシージャル試作。正式モデルの承認を得た表現ではない。
- 既存のThree.js r128を流用し追加の3D依存は導入しない。
- WebGL不可、低メモリ、動作抑制設定では公式2D画像へフォールバック。

## 実装済みファイル
- assets/js/tobito-3d-world.js
- assets/css/tobito-3d-world.css
- index.php / page-tobito.php
- tests/tobito-3d.test.cjs
- .github/workflows/pages.yml
- docs/3d-experience-2026-11-09.md

## 検証・デプロイ
- GitHub上のJS構文・参照・WordPress本文の同期を静的検証済み。
- GitHub Actionsのビルド/Pages公開用ワークフローを配置。結果・公開URLは未確認。
- WordPress本番のアップロードは未実施。
- ブラウザ上のWebGL動作、スマホ実機、ゲームとの同時動作、Lighthouseは未確認。

## 次に必要な作業
1. 公式の造形資料を用いて3Dの顔・体・衣装の忠実度を監修する。
2. GitHub Actionsの実行結果を確認し、Pages設定・配信を検証する。
3. PC/モバイル実機で表示と操作・負荷を測定、必要なら調整する。
4. WordPress本番公開経路を確認し、公開確認まで進める。

## 重要な制約
GitHub PagesはPHP・POST保存・APIを実行できない。Pagesプレビューを公式WordPress本番と同一機能だと扱わない。既存ファイルを無断で削除・変更しない。
## 2026-11-09 3D専用ページ
- 新規 `3d/index.html`, `3d/studio.css`, `3d/studio.js` を追加。
- 専用3Dサイトでポーズ切替、キャラクター紹介、ユーザー操作によるS-320実機モデル表示を実装。
- .github/workflows/pages.yml に3dディレクトリ配信を追加。
- `tests/tobito-3d-page.test.cjs` に独立ページ検証を追加。
- 公開URLはGitHub Pagesの有効化・Actions完了を検証するまで未確定。

## 2026-11-09 404対応
- GitHub Pagesの404報告を受けてデプロイパイプラインを修正。旧サイト全体のビルドと切り離し、3Dページ専用テストとPHP静的書き出しのみでデプロイ可能にした。
- `.github/workflows/pages.yml` は3Dページ、assets、既存PHPの静的プレビューを配置してPagesへアップロード。
- GitHub Pages管理設定の有効化や実際の配信ステータスは接続されたGitHubツールで確認・変更できない。Settings > Pages > Source = GitHub Actionsの一度限りの設定と、Actionsの成功確認が残る。
- 404解消は未確認。公開成功を主張しない。
