(function (root) {
    'use strict';

    const normalize = text => String(text).normalize('NFKC').toLowerCase().trim().replace(/[‐‑–−ー](?=320)/g, '-');
    const help = 'help: コマンド一覧\naircraft: S-320の掲載値\nabout: TBTについて\nwhoami: とびとくんについて\nstatus: この画面の状態\ndate: 現在日時\nwind / flight / yakitori: 各画面へ移動\nclear: 履歴を消去\nexit: ターミナルを閉じる\n質問例:「翼幅は？」「好きな食べ物は？」「失速とは？」';
    const aliases = { man: 'help', '?': 'help', specs: 'aircraft', spec: 'aircraft', log: 'logs', cls: 'clear', quit: 'exit', tunnel: 'wind', kasatate: 'umbrella' };
    const destinations = { wind: { target: 'aerolab' }, flight: { target: 'flight', gameTab: 'flight' }, yakitori: { target: 'flight', gameTab: 'yakitori' } };

    function create(data = {}, getState = () => ({}), now = () => new Date()) {
        const team = data.team || {};
        const mascot = data.tobito || {};
        const plane = data.aircraft || {};
        const unavailable = 'このサイトのデータでは確認できないトビ。公式サイトの最新情報を確認してね。';
        const value = (number, unit) => number == null ? '未掲載' : `${number}${unit}`;
        const facts = () => `${plane.name || 'S-320 Element'} / TBT公式掲載データ\n翼幅: ${value(plane.span, ' m')}\n機体重量: ${value(plane.weight, ' kg')}\n全備重量: ${value(plane.grossWeight, ' kg')}\n翼面積: ${value(plane.area, ' m²')}\n設定機速: ${value(plane.cruiseSpeed, ' m/s')}\n出典: ${plane.source || 'TBTの機体紹介'}\n設計・掲載値であり、この画面の飛行性能はゲーム用の簡易モデルです。`;
        const about = () => `${team.name || 'TBT'}は${team.university || '芝浦工業大学'}のチーム。サイトでは設立を${team.established || '未掲載'}と紹介しているトビ。${team.contest || '鳥人間コンテスト'}に二人乗りの人力飛行機で挑戦しているよ。`;
        const identity = () => `ぼくは${mascot.name || 'とびとくん'}。${mascot.title || 'TBT公式キャラクター'}だトビ！`;
        const status = () => {
            const state = getState();
            return `案内: ブラウザ内の掲載データから回答\nS-320ビューアー: ${state.modelReady ? '読み込み済み' : '未読込 / 読み込み中'}\nフライト: ${state.flightState || '未起動'}\n実機の状態、現在の天気、部室サーバーには接続していません。`;
        };
        const topics = [
            { id: 'unknown-spec', re: /全長|材質|製作費|予算|最高速度|実測|最新|今年|記録|天気|天候/, reply: () => unavailable },
            { id: 'airfoil', re: /翼型|airfoil/, reply: () => `S-320 Elementの主翼の使用翼型は、TBTの機体データでは${plane.airfoils || '未掲載'}だトビ。` },
            { id: 'recruit', re: /入部|新歓|募集|見学|参加|連絡先|問い合わせ/, reply: () => `TBTへの入部・見学の日程や条件はここでは確認できないトビ。公式サイト ${team.url || 'https://teambirdmantrial.jp'} の案内を確認してね。` },
            { id: 'food', re: /好物|食べ物|好きな食|何.*食べ/, reply: () => `このページのキャラクター設定では、好きなものは${mascot.favorite_food || '未掲載'}だトビ。公式プロフィールとして確認できた情報ではないよ。` },
            { id: 'birthday', re: /誕生日|生まれ|birthday/, reply: () => `プロフィールでは「${mascot.birthday || '未掲載'}」だトビ。正確な日付は掲載していないよ。` },
            { id: 'height', re: /身長|背の高さ/, reply: () => `とびとくんのプロフィール上の身長は${mascot.height || '未掲載'}だトビ。` },
            { id: 'mascot-weight', re: /(?<!機)体重/, reply: () => `ぼくのプロフィール上の体重は${mascot.weight || '未掲載'}だトビ。` },
            { id: 'span', re: /翼幅|翼開長|スパン|wingspan|翼.*(?:長さ|長い|何m|何メートル|大きさ)/, reply: () => `S-320の翼幅はサイト掲載値で${value(plane.span, ' m')}だトビ。` },
            { id: 'weight', re: /機体.*(?:重量|重さ|何kg)|機体重量|総重量|全備重量/, reply: () => `S-320 Elementの公式掲載値は機体重量${value(plane.weight, ' kg')}、搭乗者を含む全備重量${value(plane.grossWeight, ' kg')}だトビ。` },
            { id: 'speed', re: /巡航|機速|速度|速さ|何キロ|何km/, reply: () => `S-320 Elementの公式掲載値は「設定機速」${value(plane.cruiseSpeed, ' m/s')}だトビ。実測の飛行速度や最大速度ではないよ。` },
            { id: 'ratio', re: /揚抗比|l\s*\/\s*d|滑空比/, reply: () => '揚抗比は揚力と抗力の比だトビ。S-320 Elementの揚抗比は確認した公式機体データには掲載されていないよ。風洞の数値は学習用の簡易計算だよ。' },
            { id: 'flex', re: /フレックス|しなり|たわみ|翼.*動/, reply: () => '翼が風速に応じて自動でしなる様子を、このサイトのS-320で表現しているトビ。実機の荷重試験値や構造解析結果を再現したものではないよ。風洞の風速を変えると、しなりも変わるよ。' },
            { id: 'stall', re: /失速|stall/, reply: () => '失速は迎角が大きくなりすぎて翼上の流れが剥がれ、揚力が低下する現象だトビ。速度がゼロになることとは違うよ。この風洞は学習用の簡易計算で、実機の失速限界は分からないよ。' },
            { id: 'lift', re: /揚力|lift/, reply: () => '揚力は空気の流れに対して垂直に働く力だトビ。風速、翼面積、空気密度、迎角に応じた揚力係数などで変わるよ。' },
            { id: 'drag', re: /抗力|drag/, reply: () => '抗力は空気中を進む動きを妨げる向きに働く力だトビ。機体の形や表面、揚力の発生などが関係するよ。' },
            { id: 'tunnel', re: /風洞|迎角|aerodynamics/, reply: () => '風洞は空気を流して機体の周りの流れや力を調べる設備だトビ。このサイトのS-320風洞は学習用の可視化で、実験結果やCFD解析ではないよ。「wind」で移動できるよ。' },
            { id: 'two-seats', re: /二人乗り|2人乗り|ふたり乗り|パイロット|ペダル|プロペラ/, reply: () => 'TBTは二人乗りの人力プロペラ機で空に挑戦しているトビ。二人のペダリングを推進力につなげるんだ。このサイトの機体表示はS-320で統一しているよ。' },
            { id: 'chicken', re: /なぜ.*(?:ニワトリ|鶏|鳥)|どうして.*(?:ニワトリ|鶏|鳥)/, reply: () => '飛べない鳥だからこそ、人の知恵と力で空を飛ぶ挑戦の象徴なんだトビ。' },
            { id: 'umbrella', re: /傘立て|守り神|umbrella/, reply: () => 'ぼくは部室でみんなのものづくりを見守っているトビ。詳しいエピソードは、このページの部室の物語を見てね。' },
            { id: 'yakitori', re: /焼き鳥|ヤキトリ/, reply: () => 'その話題にはちょっとドキッとするトビ！「yakitori」で脱出ゲームへ移動できるよ。' },
            { id: 'contest', re: /鳥人間|コンテスト/, reply: () => `TBTが挑戦しているのは${team.contest || '鳥人間コンテスト'}だトビ。開催日や大会ルールの最新情報はここでは確認できないよ。` }
        ];

        function resolve(input) {
            const text = normalize(input);
            const command = Object.hasOwn(aliases, text) ? aliases[text] : text;
            if (!text) return { type: 'text', text: '質問かコマンドを入力してね。' };
            if (Object.hasOwn(destinations, command)) return { type: 'navigate', ...destinations[command], text: `${command}の画面へ移動するトビ。` };
            if (command === 'clear' || command === 'exit') return { type: command, text: '' };
            const commands = { help: () => help, aircraft: facts, about, whoami: identity, status, date: () => now().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) + ' (日本時間)', logs: () => '実機の飛行ログには接続していません。この会話の履歴は画面内のみです。', umbrella: () => topics.find(t => t.id === 'umbrella').reply(), easteregg: () => 'とびとくんの秘密はプロフィールで紹介しているトビ。' };
            if (Object.hasOwn(commands, command)) return { type: 'text', text: commands[command]() };
            const matches = topics.filter(topic => topic.re.test(text));
            if (matches.some(topic => topic.id === 'unknown-spec')) return { type: 'text', text: unavailable };
            if (matches.length) return { type: 'text', text: matches.slice(0, 3).map(topic => topic.reply()).join('\n\n') };
            if (/s\s*-?\s*320|機体|飛行機|スペック/.test(text)) return { type: 'text', text: facts() };
            if (/tbt|チーム|芝浦|設立|創設/.test(text)) return { type: 'text', text: about() };
            if (/とび斗|とびと|トビト|あなたは誰|君は誰|自己紹介/.test(text)) return { type: 'text', text: identity() };
            if (/^(こんにちは|こんばんは|おはよう|やあ|hello)[!！。]*$/.test(text)) return { type: 'text', text: 'こんにちは、ぼくはとびとくん。S-320やTBTのことを聞いてね。' };
            if (/ありがとう|助かった/.test(text)) return { type: 'text', text: 'どういたしましてトビ！' };
            return { type: 'text', text: 'その質問の答えは掲載データから見つけられなかったトビ。「翼幅」「好物」「TBTについて」のように具体的に聞いてね。コマンド一覧は help で確認できるよ。' };
        }
        return { resolve, reply: input => resolve(input).text };
    }

    const shouldSubmit = event => event.key === 'Enter' && !event.isComposing && event.keyCode !== 229;
    const api = { create, normalize, shouldSubmit };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else {
        root.TobitoCLI = create(root.TBT_SITE_DATA, () => ({ modelReady: root.s320AIGHero?.isLoaded, flightState: root.tobitoGame?.state }));
        root.TobitoCLI.shouldSubmit = shouldSubmit;
        root.generateTobitoReply = root.TobitoCLI.reply;
        root.navigateTobitoCommand = result => {
            if (result.gameTab) root.switchGameTab?.(result.gameTab);
            document.getElementById(result.target)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        };
    }
})(typeof window === 'undefined' ? globalThis : window);
