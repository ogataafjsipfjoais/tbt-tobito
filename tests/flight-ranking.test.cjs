const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(initial = {}, blocked = false) {
    const storage = new Map(Object.entries(initial)), handlers = {};
    const input = { value: '', disabled: false, focus() {} }, button = { disabled: false };
    const form = { querySelector(selector) { return selector.includes('input') ? input : button; } };
    const ids = Object.fromEntries(['ranking-list-container', 'result-ranking-container', 'result-ranking-status', 'flight-ranking-storage'].map(id => [id, { innerHTML: '', textContent: '', replaceChildren() { this.innerHTML = ''; } }]));
    ids['result-submit-form'] = form;
    const document = { readyState: 'complete', getElementById(id) { return ids[id] || null; }, querySelector(selector) { return selector.includes('input') ? input : button; } };
    let sequence = 0;
    const window = { crypto: { randomUUID: () => 'flight-' + (++sequence) }, addEventListener(name, handler) { handlers[name] = handler; } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/flight-ranking.js'), 'utf8'), {
        window, document, AbortController, setTimeout, clearTimeout, localStorage: { getItem(key) { if (blocked) throw Error('Denied'); return storage.get(key) ?? null; }, setItem(key, value) { if (blocked) throw Error('Denied'); storage.set(key, value); } }
    });
    return { manager: window.FlightRankingManager, storage, ids, input, button, form, handlers, window };
}
test('empty ranking renders in the actual page and result containers without fabricated records', () => {
    const html = fs.readFileSync(require.resolve('../index.php'), 'utf8');
    for (const id of ['ranking-list-container', 'result-ranking-container', 'result-ranking-status', 'flight-ranking-storage']) assert.match(html, new RegExp(`id="${id}"`));
    const { manager, ids } = fixture();
    assert.equal(manager.getTop5().length, 0);
    assert.match(ids['ranking-list-container'].innerHTML, /まだフライト記録/);
    manager.recordFlight(1234, 90);
    assert.match(ids['result-ranking-container'].innerHTML, /1,234/);
    assert.match(ids['ranking-list-container'].innerHTML, /01:30/);
});
test('top ten sorting, ties and out-of-ranking result feedback remain consistent', () => {
    const { manager, ids } = fixture();
    for (let i = 1; i <= 12; i++) { manager.resetResult(); manager.recordFlight(i * 100, i); }
    assert.equal(manager.rankings.length, 10); assert.equal(manager.getTop5().length, 5);
    assert.equal(manager.rankings[0].distance, 1200); assert.equal(manager.rankings[9].distance, 300);
    manager.resetResult(); manager.recordFlight(1, 1);
    assert.match(ids['result-ranking-status'].textContent, /TOP 10 圏外/);
    manager.resetResult(); manager.recordFlight(1200, 2);
    assert.equal(manager.rankings[0].timeSec, 2);
});
test('completed flight saves immediately, name registration does not duplicate or alter distance', () => {
    const { manager, storage, ids, input, button } = fixture();
    manager.recordFlight(1234.9, 90);
    assert.equal(JSON.parse(storage.get('tbt_flight_ranking_v2'))[0].distance, 1234);
    manager.recordFlight(1234.9, 90);
    assert.equal(manager.rankings.length, 1);
    manager.registerPilotScore('  とび斗  ', 9999999, '00:01');
    manager.registerPilotScore('二重登録');
    assert.equal(manager.rankings.length, 1);
    assert.equal(manager.rankings[0].name, 'とび斗');
    assert.equal(manager.rankings[0].distance, 1234);
    assert.equal(manager.rankings[0].time, '01:30');
    assert.equal(input.disabled, true); assert.equal(button.disabled, true);
    assert.match(ids['result-ranking-status'].textContent, /名前を登録/);
    manager.resetResult();
    assert.equal(input.disabled, false); assert.equal(button.disabled, false); assert.equal(input.value, '');
    manager.recordFlight(2000, 80);
    assert.equal(manager.rankings.length, 2);
    assert.equal(manager.rankings[0].distance, 2000);
});
test('legacy migration removes exact seed records only and preserves its backup', () => {
    const legacy = JSON.stringify([
        { name: 'TBT歴代最長記録 (2022)', distance: 18450, time: '42:15', date: '2022.07.24' },
        { name: '自分の記録', distance: 500, time: '01:20', date: '2026.10.13' }
    ]);
    const { manager, storage } = fixture({ tbt_flight_ranking_v1: legacy });
    assert.equal(manager.rankings.length, 1); assert.equal(manager.rankings[0].name, '自分の記録');
    assert.equal(storage.get('tbt_flight_ranking_v1'), legacy);
});
test('malformed stored values and user names cannot inject markup or crash sorting', () => {
    const raw = JSON.stringify([{ name: 123, distance: 10, time: '<img onerror=x>', date: '<script>x</script>' }, { distance: -10 }, { distance: '500' }]);
    const { manager, ids } = fixture({ tbt_flight_ranking_v2: raw });
    assert.equal(manager.rankings.length, 1); assert.equal(manager.rankings[0].time, '00:00');
    manager.recordFlight(100, 1); manager.registerPilotScore('<img src=x>');
    assert.match(ids['ranking-list-container'].innerHTML, /&lt;img src=x&gt;/);
    assert.doesNotMatch(ids['ranking-list-container'].innerHTML, /<img|<script/);
});
test('storage denied retains scores in memory and communicates the persistence limitation', () => {
    const { manager, ids } = fixture({}, true);
    manager.recordFlight(400, 35); manager.registerPilotScore('とび斗');
    assert.equal(manager.rankings[0].name, 'とび斗');
    assert.match(ids['result-ranking-status'].textContent, /保存不可/);
    assert.match(ids['flight-ranking-storage'].textContent, /保存不可/);
});
test('invalid score is rejected and browser reload/cross-tab updates retain real scores', () => {
    const { manager, storage, handlers, ids } = fixture();
    for (const score of [NaN, Infinity, -1, '123']) assert.equal(manager.recordFlight(score, 1), null);
    manager.recordFlight(2000, 90);
    const restored = fixture(Object.fromEntries(storage));
    assert.equal(restored.manager.rankings[0].distance, 2000);
    storage.set('tbt_flight_ranking_v2', JSON.stringify([{ id: 'other', name: '別タブ', distance: 3000, timeSec: 12 }]));
    handlers.storage({ key: 'tbt_flight_ranking_v2' });
    assert.match(ids['ranking-list-container'].innerHTML, /別タブ/);
});
test('server saves the flight then its latest name without a duplicated record', async () => {
    const f = fixture(), requests = [];
    f.manager.endpoint = '/api/flight-ranking.php'; f.manager.token = 'a'.repeat(64);
    let release;
    const wait = new Promise(resolve => { release = resolve; });
    f.window.fetch = async (_, options) => {
        const record = JSON.parse(options.body); requests.push(record);
        if (requests.length === 1) await wait;
        return { ok:true, json:async () => ({ acceptedId:record.id, records:[record] }) };
    };
    f.manager.recordFlight(1200, 90);
    f.manager.registerPilotScore('同期した名前');
    release(); await f.manager.syncing;
    assert.equal(requests.length, 2); assert.equal(requests[0].id, requests[1].id);
    assert.equal(requests[1].name, '同期した名前');
    assert.equal(f.manager.pending.size, 0);
    assert.match(f.ids['result-ranking-status'].textContent, /サーバーに保存済み/);
    assert.match(f.ids['ranking-list-container'].innerHTML, /同期した名前/);
});
test('failed synchronization remains queued and a retry confirms the score', async () => {
    const f = fixture(); f.manager.endpoint = '/api/flight-ranking.php'; f.manager.token = 'a'.repeat(64);
    f.window.fetch = async () => { throw Error('Offline'); };
    f.manager.recordFlight(300, 25); await f.manager.syncing;
    assert.equal(f.manager.pending.size, 1);
    assert.equal(JSON.parse(f.storage.get('tbt_ranking_pending')).length, 1);
    assert.match(f.ids['result-ranking-status'].textContent, /未同期/);
    f.window.fetch = async (_, options) => {
        const record = JSON.parse(options.body);
        return { ok:true, json:async () => ({ records:[record], acceptedId:record.id }) };
    };
    await f.manager.syncPending(); assert.equal(f.manager.pending.size, 0);
    assert.match(f.ids['flight-ranking-storage'].textContent, /同期済み/);
});
