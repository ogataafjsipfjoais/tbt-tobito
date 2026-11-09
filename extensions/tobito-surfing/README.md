# とびとくんサーフィン

提供されたとびとくんのPNG素材を使ったChrome拡張機能です。マウス追従、自由移動、人数・大きさ・速さ・ポーズの変更に対応します。Chrome Web Storeには未公開です。

## インストール

1. tobito-surfing.zipを展開します。
2. Chromeで chrome://extensions/ を開き、デベロッパーモードを有効にします。
3. 「パッケージ化されていない拡張機能を読み込む」で、展開した tobito-surfing フォルダーを選びます。
4. 通常のWebサイトを開き、拡張アイコンから「このタブで表示」を有効にします。

Chromeの設定画面、Chrome Web Storeなど、拡張を注入できないページでは動作しません。「このサイトで自動表示」は、そのサイトの権限を個別に許可した場合だけ有効になります。解除すると、その権限と自動注入の登録を削除します。

## プライバシー

設定と自動表示先を端末内のChromeストレージに保存します。マウスの位置は描画にのみ使用します。閲覧履歴、ページ本文、フォーム入力は収集せず、外部への送信処理もありません。キャラクターはクリックを妨げず、右下の閉じるボタンで非表示にできます。OSの「視差効果を減らす」に対応し、非表示タブではアニメーションを休止します。

## 参考

体験の着想は[Meowsing / ネッコサーフィン](https://chromewebstore.google.com/detail/meowsing/bbfbeaopdnagijhehlhajpjnfghdhohm?hl=ja)です。元の拡張のコードや画像は使用していません。

実装仕様: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)、[Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)。

実ブラウザーへの拡張の読み込みはユーザー側の操作です。サイト内デモとは描画エンジンを共有しますが、Chromeでのインストールテストは別途必要です。
