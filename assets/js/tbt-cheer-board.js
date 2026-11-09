/**
 * TBT 応援メッセージ掲示板 (非同期送信 & localStorage連携 & リロード防止)
 * 
 * - form の submit イベントで e.preventDefault() を確実に呼び、ページ再読み込み・先頭スクロールを防止
 * - 入力されたメッセージを localStorage ('tbt_cheer_messages_v1') に即時保存 & メッセージ一覧の先頭に即時反映
 * - バックエンドAPI（PHP）が存在する場合は非同期 fetch で保存
 * - 入力欄直下のアラートボックス（#board-alert）にインラインで完了通知を表示
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'tbt_cheer_messages_v1';

    function initCheerBoard() {
        const form = document.getElementById('cheer-form');
        const nameInput = document.getElementById('author-name');
        const msgInput = document.getElementById('cheer-message');
        const alertBox = document.getElementById('board-alert');
        const submitBtn = document.getElementById('submit-cheer-btn');
        const listContainer = document.getElementById('cheer-messages-list');

        if (!form) return;

        // 1. ローカルストレージ内のメッセージをリスト先頭に反映
        renderLocalStoredMessages();

        // 2. フォーム送信処理 (同期遷移・先頭スクロールの100%防止)
        form.addEventListener('submit', async function(e) {
            e.preventDefault(); // ★ ページリロード & 先頭スクロールを絶対に防ぐ

            const author = (nameInput ? nameInput.value.trim() : '') || '名無しの鳥人間ファン';
            const message = (msgInput ? msgInput.value.trim() : '');

            // バリデーション
            if (!message) {
                if (alertBox) {
                    alertBox.className = "mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium block animate-fadeIn";
                    alertBox.textContent = "⚠ 応援メッセージを入力してください。";
                }
                if (msgInput) msgInput.focus();
                return;
            }

            // ボタン無効化（二重送信防止）
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = "送信中...";
            }

            try {
                const todayStr = new Date().toLocaleDateString('ja-JP').replace(/\//g, '.');
                const newMsgObj = {
                    author: author,
                    name: author,
                    message: message,
                    date: todayStr,
                    timestamp: Date.now()
                };

                // ① localStorage へ保存
                let localMsgs = [];
                try {
                    localMsgs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                } catch (e) {
                    localMsgs = [];
                }
                localMsgs.unshift(newMsgObj);
                // 最大50件保持
                if (localMsgs.length > 50) localMsgs = localMsgs.slice(0, 50);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(localMsgs));

                // ② DOM一覧の最上部に即座にカードを挿入（prepend）
                prependMessageCard(newMsgObj);

                // ③ バックエンドAPIへの非同期POST（存在する場合）
                try {
                    const postUrl = window.location.pathname || 'index.php';
                    const formData = new FormData();
                    formData.append('action', 'cheer');
                    formData.append('user_name', author);
                    formData.append('author_name', author);
                    formData.append('user_message', message);
                    formData.append('cheer_message', message);
                    formData.append('user_msg', message);
                    formData.append('ajax', '1');

                    await fetch(postUrl, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                } catch (apiErr) {
                    // APIエラー時もlocalStorageに保存できているのでローカル表示は継続
                    console.warn('API sync warning:', apiErr);
                }

                // ④ 成功表示（スクロールは一切動かさずインラインで表示）
                if (alertBox) {
                    alertBox.className = "mb-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium block animate-fadeIn";
                    alertBox.textContent = "✨ メッセージを届けたトビ！熱い応援ありがとう！";
                }

                // ⑤ 入力欄クリア
                if (msgInput) msgInput.value = '';

                // 6秒後にアラートを自動非表示
                setTimeout(() => {
                    if (alertBox && alertBox.textContent.includes('ありがとう')) {
                        alertBox.classList.add('hidden');
                    }
                }, 6000);

            } catch (err) {
                console.error('Cheer submit error:', err);
                if (alertBox) {
                    alertBox.className = "mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium block";
                    alertBox.textContent = "送信中にエラーが発生しました。もう一度お試しください。";
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>✈</span> メッセージを送る';
                }
            }
        });
    }

    function prependMessageCard(item) {
        const list = document.getElementById('cheer-messages-list');
        if (!list) return;

        const card = createCardElement(item);
        card.classList.add('border-cyan-400/80', 'bg-cyan-950/30'); // 新規投稿ハイライト
        list.prepend(card);
    }

    function createCardElement(item) {
        const div = document.createElement('div');
        div.className = 'p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-start gap-4 transition-all duration-300';
        const name = escapeHtml(item.author || item.name || '名無しの鳥人間ファン');
        const initial = name.charAt(0) || '鳥';
        const date = escapeHtml(item.date || new Date().toLocaleDateString('ja-JP').replace(/\//g, '.'));
        const msg = escapeHtml(item.message || '').replace(/\n/g, '<br>');

        div.innerHTML = `
            <div class="w-10 h-10 rounded-2xl bg-cyan-950 text-cyan-300 font-bold text-sm flex items-center justify-center shrink-0 border border-cyan-500/40 font-mono shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                ${initial}
            </div>
            <div class="space-y-1 w-full">
                <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-white">${name}</span>
                    <span class="text-xs text-slate-400 font-mono">${date}</span>
                </div>
                <p class="text-slate-300 text-xs sm:text-sm leading-relaxed pt-1 text-relaxed-pro">${msg}</p>
            </div>
        `;
        return div;
    }

    function renderLocalStoredMessages() {
        const list = document.getElementById('cheer-messages-list');
        if (!list) return;

        let localMsgs = [];
        try {
            localMsgs = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        } catch (e) {
            return;
        }

        if (!Array.isArray(localMsgs) || localMsgs.length === 0) return;

        // すでにHTML内に同じメッセージが表示されていないか簡易チェック
        const existingTexts = Array.from(list.querySelectorAll('p')).map(p => p.textContent.trim());

        // 新しい順にprepend
        for (let i = localMsgs.length - 1; i >= 0; i--) {
            const item = localMsgs[i];
            if (item && item.message && !existingTexts.includes(item.message.trim())) {
                const card = createCardElement(item);
                list.prepend(card);
            }
        }
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    window.renderCheerMessages = renderLocalStoredMessages;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCheerBoard);
    } else {
        initCheerBoard();
    }
})();
