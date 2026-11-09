const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { create, shouldSubmit } = require('../assets/js/tobito-dialogue.js');

const data = JSON.parse(execFileSync('php', ['-r', 'require "data.php"; echo json_encode(["team"=>$team,"tobito"=>$tobito,"aircraft"=>$aircraft]);'], { cwd: require('node:path').join(__dirname, '..'), encoding: 'utf8' }));
const cli = create(data);

test('all aircraft aliases use the same published values', () => {
    for (const input of ['aircraft', 'ＳＰＥＣ', ' S320 ', 'Ｓ－３２０', 'S-320のスペック']) {
        assert.match(cli.reply(input), /40 m/);
        assert.match(cli.reply(input), /83\.5 kg/);
        assert.doesNotMatch(cli.reply(input), /30\.5/);
    }
});
test('specific questions win over broad team and aircraft names', () => {
    assert.match(cli.reply('TBTに入部したい'), /入部・見学/);
    assert.match(cli.reply('S320の翼の長さは？'), /40 m/);
    assert.match(cli.reply('とび斗くんの好きな食べ物は？'), /バナナ/);
    assert.match(cli.reply('TBTの設立年は？'), /1994/);
});
test('distinct aerodynamic questions are not all answered as wind', () => {
    assert.match(cli.reply('失速とは？'), /流れが剥がれ/);
    assert.match(cli.reply('揚抗比は？'), /掲載されていない/);
    assert.match(cli.reply('揚力とは？'), /垂直/);
    assert.match(cli.reply('抗力とは？'), /妨げる/);
});
test('compound questions answer both published properties', () => {
    const reply = cli.reply('S320の翼幅と機体重量は？');
    assert.match(reply, /40 m/);
    assert.match(reply, /83\.5 kg/);
    assert.doesNotMatch(reply, /ぼくのプロフィール上の体重/);
});
test('unknown specs and live information are not fabricated', () => {
    for (const question of ['S320の最高速度', '今年の飛行記録は？', '今日の天気は？', 'S320の全長']) {
        assert.match(cli.reply(question), /確認できない/);
    }
    assert.match(cli.reply('logs'), /接続していません/);
    assert.match(cli.reply('status'), /接続していません/);
});
test('navigation points to real sections for both terminals', () => {
    assert.deepEqual(cli.resolve('ＷＩＮＤ').target, 'aerolab');
    assert.deepEqual(cli.resolve('tunnel').target, 'aerolab');
    assert.equal(cli.resolve('flight').gameTab, 'flight');
    assert.equal(cli.resolve('yakitori').target, 'flight');
    assert.equal(cli.resolve('yakitori').gameTab, 'yakitori');
});
test('commands require exact matches and prototype names remain plain text', () => {
    for (const command of ['helper', 'windy', 'constructor', '__proto__', 'toString']) {
        assert.equal(cli.resolve(command).type, 'text');
        assert.match(cli.reply(command), /見つけられなかった/);
    }
    assert.equal(cli.resolve('ＣＬＳ').type, 'clear');
    assert.equal(cli.resolve('quit').type, 'exit');
});
test('no random responses or input reflection', () => {
    assert.equal(cli.reply('about'), cli.reply('about'));
    assert.doesNotMatch(cli.reply('<img src=x onerror=alert(1)>'), /<img/);
    assert.match(cli.reply('whoami'), /とびとくん/);
});
test('date and status are obtained at request time', () => {
    let ready = false;
    let time = new Date('2026-01-01T00:00:00Z');
    const live = create(data, () => ({ modelReady: ready }), () => time);
    const before = live.reply('date');
    time = new Date('2026-02-02T00:00:00Z');
    ready = true;
    assert.notEqual(live.reply('date'), before);
    assert.match(live.reply('status'), /読み込み済み/);
});
test('Japanese IME confirmation does not submit prematurely', () => {
    assert.equal(shouldSubmit({ key: 'Enter', isComposing: true }), false);
    assert.equal(shouldSubmit({ key: 'Enter', keyCode: 229 }), false);
    assert.equal(shouldSubmit({ key: 'Enter', isComposing: false, keyCode: 13 }), true);
    assert.equal(shouldSubmit({ key: 'a' }), false);
});
test('official design data stays distinct from simulation and character settings', () => {
    assert.match(cli.reply('S320の全備重量は？'), /199 kg/);
    assert.match(cli.reply('S320の翼型は？'), /DAE31, DAE41, FX76MP120/);
    assert.match(cli.reply('aircraft'), /teambirdmantrial.jp\/history\/s-320-element/);
    assert.match(cli.reply('S320の巡航速度'), /設定機速/);
    assert.match(cli.reply('ウイングフレックス'), /構造解析結果を再現したものではない/);
    assert.match(cli.reply('好きな食べ物'), /設定/);
});
