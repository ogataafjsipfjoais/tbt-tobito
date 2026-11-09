/**
 * TBT FLIGHT FEED (ミニSNSタイムライン & リアルタイムリアクション)
 * 
 * - ファン・部員・OBが短文（140字）・タグ・写真をリアルタイム投稿
 * - 3つのワンタップリアクション（🕊 とび斗スタンプ / 🔥 ペダル連打 / ✈ ナイスフライト）
 * - localStorage ('tbt_flight_feed_v2') による永続化 & バックエンド (data/feed.json) 非同期保存
 * - AIG / Active Theory 調ダークサイバーUI
 */
(function() {
    'use strict';

    const STORAGE_KEY = 'tbt_flight_feed_v2';

    // 初期モック投稿（TBTの世界観を表現するリアルな投稿）
    const DEFAULT_POSTS = [
        {
            id: 'post-init-1',
            author: '長谷川（パイロット班）',
            role: 'PILOT // CADENCE 90',
            avatar: '✈',
            text: '明日の朝練は午前5時に滑走路集合！風速1.2m/s、絶好の滑空テスト日和です。二人乗りペダル回転数90rpmを維持して湖上脱出ルートを確認します！',
            tag: '#テストフライト',
            image: '',
            date: '2026.10.07 07:15',
            timestamp: Date.now() - 3600000 * 2,
            reactions: { tobito: 18, pedal: 42, flight: 31 }
        },
        {
            id: 'post-init-2',
            author: 'フェアリング班 鈴木',
            role: 'STRUCTURE // CFRP',
            avatar: '🔧',
            text: '第3主翼リブのカーボン積層が完了しました。前年比-180gの超軽量化を達成！とび斗くんの耐久ステッカーをノーズに貼って魂注入完了です。',
            tag: '#開発日誌',
            image: 'assets/images/costume_engineer.png',
            date: '2026.10.06 23:40',
            timestamp: Date.now() - 3600000 * 9,
            reactions: { tobito: 29, pedal: 54, flight: 22 }
        },
        {
            id: 'post-init-3',
            author: '公式マスコット とび斗くん',
            role: 'OFFICIAL MASCOT',
            avatar: '🕊️',
            text: 'みんな夜遅くまで翼削っててすごいトビ！差し入れのバナナと冷えたクエン酸ドリンクを格納庫に置いといたトビ〜！風に乗って翔ぶトビ！！',
            tag: '#応援',
            image: '',
            date: '2026.10.06 18:20',
            timestamp: Date.now() - 3600000 * 15,
            reactions: { tobito: 88, pedal: 73, flight: 65 }
        },
        {
            id: 'post-init-4',
            author: '芝浦工大OB（2019電装班）',
            role: 'ALUMNI // TELEMETRY',
            avatar: '📡',
            text: '今年のS-320、主翼のアスペクト比といいエレベーターの剛性といい本当に美しい。大会当日は琵琶湖松原水泳場のプラットフォーム下で応援します！',
            tag: '#琵琶湖フライト',
            image: '',
            date: '2026.10.05 14:10',
            timestamp: Date.now() - 3600000 * 30,
            reactions: { tobito: 15, pedal: 38, flight: 40 }
        }
    ];

    let currentAttachedImage = '';

    function getFeedPosts() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        } catch (e) {
            console.warn('Failed to parse local feed:', e);
        }
        return [...DEFAULT_POSTS];
    }

    function saveFeedPosts(posts) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        } catch (e) {
            console.warn('Failed to save feed posts locally:', e);
        }
    }

    function initFlightFeed() {
        const feedContainer = document.getElementById('flight-feed-timeline');
        const form = document.getElementById('feed-post-form');
        const textInput = document.getElementById('feed-post-text');
        const authorInput = document.getElementById('feed-author-name');
        const charCount = document.getElementById('feed-char-count');
        const imageInput = document.getElementById('feed-image-input');
        const imagePreviewContainer = document.getElementById('feed-image-preview-container');
        const imagePreviewImg = document.getElementById('feed-image-preview');
        const imageRemoveBtn = document.getElementById('feed-image-remove-btn');
        const tagPills = document.querySelectorAll('.feed-tag-pill');
        const alertBox = document.getElementById('feed-alert');

        if (!feedContainer) return;

        // 初期投稿のレンダリング
        renderTimeline();

        // 文字数カウント
        if (textInput && charCount) {
            textInput.addEventListener('input', () => {
                const len = textInput.value.length;
                charCount.textContent = `${len} / 140`;
                if (len > 140) {
                    charCount.classList.add('text-rose-400');
                    charCount.classList.remove('text-slate-500');
                } else {
                    charCount.classList.remove('text-rose-400');
                    charCount.classList.add('text-slate-500');
                }
            });
        }

        // タグピルのワンクリック挿入
        tagPills.forEach(pill => {
            pill.addEventListener('click', (e) => {
                e.preventDefault();
                const tag = pill.getAttribute('data-tag');
                if (!tag || !textInput) return;
                if (!textInput.value.includes(tag)) {
                    textInput.value = textInput.value.trim() + (textInput.value.trim() ? ' ' : '') + tag + ' ';
                    textInput.focus();
                    if (charCount) charCount.textContent = `${textInput.value.length} / 140`;
                }
            });
        });

        // 画像選択
        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;

                if (file.size > 2 * 1024 * 1024) {
                    showAlert('画像サイズは2MB以内にしてください。', 'rose');
                    imageInput.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    currentAttachedImage = ev.target.result;
                    if (imagePreviewImg && imagePreviewContainer) {
                        imagePreviewImg.src = currentAttachedImage;
                        imagePreviewContainer.classList.remove('hidden');
                    }
                };
                reader.readAsDataURL(file);
            });
        }

        // プレビュー画像削除
        if (imageRemoveBtn) {
            imageRemoveBtn.addEventListener('click', () => {
                currentAttachedImage = '';
                if (imageInput) imageInput.value = '';
                if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');
            });
        }

        // 投稿送信
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault(); // リロード完全防止

                const text = textInput ? textInput.value.trim() : '';
                const author = (authorInput ? authorInput.value.trim() : '') || '名無しのパイロット';

                if (!text) {
                    showAlert('メッセージを入力してください。', 'rose');
                    if (textInput) textInput.focus();
                    return;
                }

                if (text.length > 140) {
                    showAlert('140文字以内で入力してください。', 'rose');
                    return;
                }

                // タグの抽出
                const tagMatch = text.match(/#[^\s#]+/);
                const tag = tagMatch ? tagMatch[0] : '#フライト';

                const newPost = {
                    id: 'post-' + Date.now(),
                    author: author,
                    role: 'CREW MEMBER',
                    avatar: '🪶',
                    text: text,
                    tag: tag,
                    image: currentAttachedImage,
                    date: formatCurrentTime(),
                    timestamp: Date.now(),
                    reactions: { tobito: 1, pedal: 1, flight: 1 }
                };

                // ローカルストレージ先頭に追加
                const posts = getFeedPosts();
                posts.unshift(newPost);
                saveFeedPosts(posts);

                // タイムライン先頭へアニメーション追加
                prependPostToDOM(newPost, true);

                // バックエンドAPIへ非同期送信（任意）
                try {
                    const formData = new FormData();
                    formData.append('action', 'flight_feed_post');
                    formData.append('post_json', JSON.stringify(newPost));
                    formData.append('ajax', '1');
                    fetch('index.php', { method: 'POST', body: formData }).catch(() => {});
                } catch (e) {}

                // フォームリセット
                if (textInput) textInput.value = '';
                if (charCount) charCount.textContent = '0 / 140';
                currentAttachedImage = '';
                if (imageInput) imageInput.value = '';
                if (imagePreviewContainer) imagePreviewContainer.classList.add('hidden');

                showAlert('✨ フライトフィードに投稿しました！', 'emerald');
            });
        }

        function showAlert(msg, color) {
            if (!alertBox) return;
            alertBox.className = `mb-4 p-3 rounded-xl border text-xs font-mono font-medium block animate-fadeIn ${
                color === 'emerald' 
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`;
            alertBox.textContent = msg;
            setTimeout(() => {
                if (alertBox && alertBox.textContent === msg) {
                    alertBox.classList.add('hidden');
                }
            }, 4000);
        }
    }

    function renderTimeline() {
        const feedContainer = document.getElementById('flight-feed-timeline');
        if (!feedContainer) return;
        feedContainer.innerHTML = '';

        const posts = getFeedPosts();
        posts.forEach(post => {
            const card = createPostCardElement(post);
            feedContainer.appendChild(card);
        });
    }

    function prependPostToDOM(post, highlight = false) {
        const feedContainer = document.getElementById('flight-feed-timeline');
        if (!feedContainer) return;

        const card = createPostCardElement(post);
        if (highlight) {
            card.classList.add('ring-2', 'ring-cyan-400', 'shadow-[0_0_25px_rgba(0,229,255,0.25)]');
            setTimeout(() => {
                card.classList.remove('ring-2', 'ring-cyan-400');
            }, 3000);
        }
        feedContainer.prepend(card);
    }

    function createPostCardElement(post) {
        const card = document.createElement('div');
        card.id = `card-${post.id}`;
        card.className = 'p-5 sm:p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 shadow-xl backdrop-blur-md transition-all duration-300 space-y-3.5';

        const author = escapeHtml(post.author || '名無しのパイロット');
        const role = escapeHtml(post.role || 'CREW');
        const avatar = post.avatar || '✈';
        const text = escapeHtml(post.text || '').replace(/\n/g, '<br>');
        const tag = escapeHtml(post.tag || '');
        const date = escapeHtml(post.date || '');

        const reactions = post.reactions || { tobito: 0, pedal: 0, flight: 0 };

        let imageHtml = '';
        if (post.image) {
            imageHtml = `
                <div class="mt-3 rounded-xl overflow-hidden max-h-72 border border-slate-800 bg-slate-950/60">
                    <img src="${post.image}" alt="投稿添付画像" class="w-full h-auto object-cover max-h-72 hover:scale-[1.02] transition-transform duration-300 cursor-pointer" onclick="window.open('${post.image}', '_blank')">
                </div>
            `;
        }

        card.innerHTML = `
            <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-slate-950 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-lg font-mono shadow-[0_0_10px_rgba(0,229,255,0.15)] shrink-0">
                        ${avatar}
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-sm font-bold text-white tracking-wide">${author}</span>
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-500/30 tracking-wider uppercase">${role}</span>
                        </div>
                        <span class="text-[11px] text-slate-500 font-mono">${date}</span>
                    </div>
                </div>
                ${tag ? `<span class="text-xs font-mono font-bold text-cyan-400/90 bg-cyan-950/30 px-2.5 py-1 rounded-full border border-cyan-500/20">${tag}</span>` : ''}
            </div>

            <div class="text-slate-200 text-xs sm:text-sm leading-relaxed text-relaxed-pro font-sans">
                ${text}
            </div>

            ${imageHtml}

            <!-- リアクションバー (ワンタップカウント) -->
            <div class="pt-2 border-t border-slate-800/80 flex items-center gap-2 sm:gap-3 flex-wrap">
                <button type="button" class="btn-reaction px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-cyan-950/50 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer" data-post-id="${post.id}" data-type="tobito" title="とび斗スタンプ">
                    <span class="text-sm">🕊️</span>
                    <span class="text-[11px] font-bold">とび斗</span>
                    <span class="count text-cyan-400 font-mono font-bold">${reactions.tobito || 0}</span>
                </button>

                <button type="button" class="btn-reaction px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-amber-950/50 border border-slate-800 hover:border-amber-500/40 text-xs font-mono text-slate-300 hover:text-amber-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer" data-post-id="${post.id}" data-type="pedal" title="ペダル連打（いいね）">
                    <span class="text-sm">🔥</span>
                    <span class="text-[11px] font-bold">ペダル</span>
                    <span class="count text-amber-400 font-mono font-bold">${reactions.pedal || 0}</span>
                </button>

                <button type="button" class="btn-reaction px-3 py-1.5 rounded-xl bg-slate-950/70 hover:bg-sky-950/50 border border-slate-800 hover:border-sky-500/40 text-xs font-mono text-slate-300 hover:text-sky-300 flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer" data-post-id="${post.id}" data-type="flight" title="ナイスフライト">
                    <span class="text-sm">✈️</span>
                    <span class="text-[11px] font-bold">ナイス</span>
                    <span class="count text-sky-400 font-mono font-bold">${reactions.flight || 0}</span>
                </button>
            </div>
        `;

        // リアクションクリック処理
        card.querySelectorAll('.btn-reaction').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const type = btn.getAttribute('data-type');
                const postId = btn.getAttribute('data-post-id');
                incrementReaction(postId, type, btn);
            });
        });

        return card;
    }

    function incrementReaction(postId, type, btnElement) {
        const posts = getFeedPosts();
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        if (!post.reactions) {
            post.reactions = { tobito: 0, pedal: 0, flight: 0 };
        }
        post.reactions[type] = (post.reactions[type] || 0) + 1;
        saveFeedPosts(posts);

        // UI即時更新 & ポップエフェクト
        const countSpan = btnElement.querySelector('.count');
        if (countSpan) {
            countSpan.textContent = post.reactions[type];
            countSpan.classList.add('scale-125', 'text-white');
            setTimeout(() => {
                countSpan.classList.remove('scale-125', 'text-white');
            }, 250);
        }

        btnElement.classList.add('border-cyan-400', 'bg-cyan-950/40');
    }

    function formatCurrentTime() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `${y}.${m}.${d} ${hh}:${mm}`;
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

    // グローバル露出
    window.initTbtFlightFeed = initFlightFeed;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFlightFeed);
    } else {
        initFlightFeed();
    }
})();
