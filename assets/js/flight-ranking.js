(function () {
    'use strict';
    const STORAGE_KEY = 'tbt_flight_ranking_v2';
    const LEGACY_KEY = 'tbt_flight_ranking_v1';
    const MAX_RANKINGS = 10;
    // Remove only the exact fabricated seeds; keep the original key as a backup.
    const seeds = [
        ['TBT歴代最長記録 (2022)', 18450, '2022.07.24'],
        ['彦根港ターン成功 (2018)', 12100, '2018.07.29'],
        ['竹生島アプローチ (2015)', 8640, '2015.07.26'],
        ['プラットホーム南風 (2019)', 4820, '2019.07.28'],
        ['新風テストフライト', 1520, '2024.06.12']
    ];
    const localDate = () => {
        const date = new Date();
        return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('.');
    };
    const duration = seconds => String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
    const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]);

    class FlightRankingManager {
        constructor() {
            this.persistent = true;
            this.sequence = 0;
            this.lastFlight = null;
            this.rankings = this.loadRankings();
            this.pending = new Map();
            this.syncedIds = new Set();
            this.serverRankings = null;
            this.serverState = 'loading';
            if (typeof window.fetch === 'function') this.initSync();
            const init = () => {
                this.renderPageRankingList(); this.bindSubmitForm();
                document.getElementById('flight-ranking-refresh')?.addEventListener('click', () => { this.refreshServer(); this.syncPending(); });
                document.getElementById('flight-ranking-import')?.addEventListener('click', () => {
                    if (!this.endpoint) return;
                    this.rankings.filter(record => !this.syncedIds.has(record.id) && !this.pending.has(record.id)).forEach(record => this.queueRecord({ ...record, id: this.token.slice(0, 16) + '-' + record.id }));
                    this.renderPageRankingList();
                });
            };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
            else init();
            window.addEventListener('storage', event => {
                if (event.key !== STORAGE_KEY && event.key !== null) return;
                this.rankings = this.loadRankings();
                this.renderPageRankingList();
                this.renderResultBoard();
            });
        }
        initSync() {
            const script = document.currentScript || document.querySelector('script[src*="/flight-ranking.js"]');
            this.endpoint = new URL(script.src.includes('/assets/js/') ? '../../api/flight-ranking.php' : '../api/flight-ranking.php', script.src).href;
            try {
                this.token = localStorage.getItem('tbt_ranking_owner');
                if (!this.token) {
                    const bytes = window.crypto.getRandomValues(new Uint8Array(32));
                    this.token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
                    try { localStorage.setItem('tbt_ranking_owner', this.token); } catch (_) {}
                }
                const queue = JSON.parse(localStorage.getItem('tbt_ranking_pending') || '[]');
                if (Array.isArray(queue)) queue.forEach(item => { if (item && typeof item.id === 'string') this.pending.set(item.id, item); });
                const synced = JSON.parse(localStorage.getItem('tbt_ranking_synced_ids') || '[]');
                if (Array.isArray(synced)) synced.forEach(id => { if (typeof id === 'string') this.syncedIds.add(id); });
            } catch (_) {
                const bytes = window.crypto.getRandomValues(new Uint8Array(32));
                this.token = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
            }
            this.refreshServer();
            this.syncPending();
            window.addEventListener('online', () => { this.refreshServer(); this.syncPending(); });
            window.addEventListener('focus', () => { this.refreshServer(); this.syncPending(); });
        }
        savePending() {
            try { localStorage.setItem('tbt_ranking_pending', JSON.stringify(Array.from(this.pending.values()))); } catch (_) {}
        }
        async requestServer(options = {}) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            try {
                const response = await window.fetch(this.endpoint, { cache: 'no-store', credentials: 'same-origin', signal: controller.signal, ...options });
                if (!response.ok) throw new Error('Ranking HTTP ' + response.status);
                const data = await response.json();
                if (!Array.isArray(data.records)) throw new Error('Invalid ranking response');
                return data;
            } finally { clearTimeout(timeout); }
        }
        async refreshServer() {
            if (!this.endpoint || this.syncing) return;
            const version = this.serverVersion || 0;
            try {
                const data = await this.requestServer();
                if (version !== (this.serverVersion || 0)) return;
                this.serverRankings = this.sanitizeRankings(data.records);
                this.serverState = 'synced';
            } catch (_) { this.serverState = 'error'; }
            this.renderPageRankingList(); this.renderResultBoard();
        }
        queueRecord(record) {
            if (!this.endpoint) return;
            this.pending.set(record.id, { id: record.id, token: this.token, name: record.name, distance: record.distance, timeSec: record.timeSec });
            this.savePending(); this.syncPending();
        }
        syncPending() {
            if (!this.endpoint || this.syncing || !this.pending.size) return this.syncing;
            this.syncing = (async () => {
                try {
                    while (this.pending.size) {
                        const item = this.pending.values().next().value;
                        const data = await this.requestServer({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-TBT-Ranking': '1' }, body: JSON.stringify(item) });
                        if (data.acceptedId !== item.id) throw new Error('Unconfirmed record');
                        this.serverVersion = (this.serverVersion || 0) + 1;
                        this.serverRankings = this.sanitizeRankings(data.records);
                        this.serverState = 'synced'; this.syncedIds.add(item.id);
                        try { localStorage.setItem('tbt_ranking_synced_ids', JSON.stringify(Array.from(this.syncedIds).slice(-1000))); } catch (_) {}
                        if (this.pending.get(item.id) === item) this.pending.delete(item.id);
                        this.savePending();
                    }
                } catch (_) { this.serverState = 'error'; }
                finally { this.syncing = null; this.renderPageRankingList(); this.renderResultBoard(); }
            })();
            return this.syncing;
        }
        sanitizeRankings(list) {
            if (!Array.isArray(list)) return [];
            const ids = new Set();
            return list.filter(item => item && Number.isFinite(item.distance) && item.distance >= 0 && item.distance <= Number.MAX_SAFE_INTEGER)
                .map((item, index) => {
                    const oldTime = typeof item.time === 'string' && /^\d{1,8}:[0-5]\d$/.test(item.time) ? item.time : '00:00';
                    const seconds = Number.isFinite(item.timeSec) && item.timeSec >= 0 && item.timeSec <= Number.MAX_SAFE_INTEGER ? item.timeSec :
                        Number(oldTime.split(':')[0]) * 60 + Number(oldTime.split(':')[1]);
                    return { id: typeof item.id === 'string' && item.id ? item.id : 'legacy-' + index,
                        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 20) : '名無しパイロット',
                        distance: Math.floor(item.distance), timeSec: Math.floor(seconds), time: duration(seconds),
                        date: typeof item.date === 'string' && /^\d{4}\.\d{2}\.\d{2}$/.test(item.date) ? item.date : localDate() };
                }).filter(item => { if (ids.has(item.id)) return false; ids.add(item.id); return true; })
                .sort((a, b) => b.distance - a.distance || a.timeSec - b.timeSec)
                .slice(0, MAX_RANKINGS).map((item, index) => ({ ...item, rank: index + 1 }));
        }
        loadRankings() {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw !== null) return this.sanitizeRankings(JSON.parse(raw));
                const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
                const actual = Array.isArray(legacy) ? legacy.filter(item => !seeds.some(([name, distance, date]) => item?.name === name && item.distance === distance && item.date === date)) : [];
                const records = this.sanitizeRankings(actual);
                this.saveToStorage(records);
                return records;
            } catch (_) { this.persistent = false; return []; }
        }
        saveToStorage(list) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); this.persistent = true; }
            catch (_) { this.persistent = false; }
        }
        getTop5() { return (this.serverRankings ?? this.rankings).slice(0, 5); }
        recordFlight(distance, timeSec = 0) {
            if (this.lastFlight) return this.lastFlight;
            if (!Number.isFinite(distance) || distance < 0 || distance > 100000 || !Number.isFinite(timeSec) || timeSec < 0 || timeSec > 86400) return null;
            const id = window.crypto?.randomUUID?.() || Date.now() + '-' + (++this.sequence) + '-' + Math.random().toString(36).slice(2);
            this.lastFlight = { id, name: '名無しパイロット', distance: Math.floor(distance), timeSec: Math.floor(timeSec), time: duration(timeSec), date: localDate(), registered: false };
            // Save the completed flight immediately; name registration updates its ID.
            this.rankings = this.sanitizeRankings([...this.rankings, this.lastFlight]);
            this.saveToStorage(this.rankings);
            this.queueRecord(this.lastFlight);
            this.resetForm();
            this.renderResultBoard();
            this.renderPageRankingList();
            return this.lastFlight;
        }
        registerPilotScore(name) {
            if (!this.lastFlight || this.lastFlight.registered) return this.rankings;
            const pilotName = typeof name === 'string' ? name.trim().slice(0, 20) : '';
            if (!pilotName) return this.rankings;
            this.lastFlight.name = pilotName;
            this.lastFlight.registered = true;
            const records = this.rankings.filter(item => item.id !== this.lastFlight.id);
            this.rankings = this.sanitizeRankings([...records, this.lastFlight]);
            this.saveToStorage(this.rankings);
            this.queueRecord(this.lastFlight);
            this.renderResultBoard();
            this.renderPageRankingList();
            const input = document.querySelector('#result-submit-form input[name="pilot_name"]');
            const button = document.querySelector('#result-submit-form button[type="submit"]');
            if (input) input.disabled = true;
            if (button) { button.disabled = true; button.textContent = '登録済'; }
            return this.rankings;
        }
        rows() {
            const top = this.getTop5();
            if (!top.length) return '<p class="flight-ranking-empty">まだフライト記録はありません。</p>';
            return '<ol class="flight-ranking-list">' + top.map(item => `<li class="flight-ranking-row${item.id === this.lastFlight?.id ? ' is-current' : ''}">
                <span class="flight-rank">${item.rank}</span><div class="flight-rank-pilot"><strong>${escape(item.name)}</strong><small>${escape(item.date)} / ${escape(item.time)}</small></div>
                <span class="flight-rank-distance">${item.distance.toLocaleString()} <small>m</small></span></li>`).join('') + '</ol>';
        }
        renderResultBoard() {
            const container = document.getElementById('result-ranking-container');
            if (container) container.innerHTML = '<h4>フライトランキング TOP 5</h4>' + this.rows();
            const status = document.getElementById('result-ranking-status');
            if (status && this.lastFlight) {
                const retained = this.rankings.some(item => item.id === this.lastFlight.id);
                status.textContent = !retained ? 'TOP 10 圏外' : this.persistent ? (this.lastFlight.registered ? '名前を登録しました' : 'フライト記録を保存しました') : '一時記録（端末への保存不可）';
                if (this.endpoint) status.textContent = this.pending.has(this.lastFlight.id) ? (this.serverState === 'error' ? '未同期（再試行待ち）' : 'サーバーへ同期中') : this.syncedIds.has(this.lastFlight.id) ? 'サーバーに保存済み' : '同期確認中';
            }
        }
        renderPageRankingList() {
            const list = document.getElementById('ranking-list-container');
            if (list) list.innerHTML = this.rows();
            const status = document.getElementById('flight-ranking-storage');
            if (status) status.textContent = this.persistent ? 'このブラウザーの記録' : '一時記録（端末への保存不可）';
            if (status && this.endpoint) status.textContent = this.serverState === 'error' ? '接続できません（未同期の記録は再送待ち）' : this.pending.size ? 'サーバー同期中' : this.serverState === 'synced' ? '共有ランキング / 同期済み' : '共有ランキングを取得中';
        }
        resetForm() {
            const form = document.getElementById('result-submit-form');
            const input = form?.querySelector('input[name="pilot_name"]');
            const button = form?.querySelector('button[type="submit"]');
            if (input) { input.disabled = false; input.value = ''; }
            if (button) { button.disabled = false; button.textContent = '名前を登録'; }
        }
        resetResult() {
            this.lastFlight = null;
            this.resetForm();
            const container = document.getElementById('result-ranking-container');
            const status = document.getElementById('result-ranking-status');
            if (container) container.replaceChildren();
            if (status) status.textContent = '';
        }
        bindSubmitForm() {
            const form = document.getElementById('result-submit-form');
            if (!form) return;
            form.onsubmit = event => {
                event.preventDefault();
                const input = form.querySelector('input[name="pilot_name"]');
                if (!input?.value.trim()) { input?.focus(); return; }
                this.registerPilotScore(input.value);
            };
        }
    }
    window.FlightRankingManager = new FlightRankingManager();
})();
