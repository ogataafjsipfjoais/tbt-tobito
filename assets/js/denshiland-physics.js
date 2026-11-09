/**
 * ==============================================================================
 * Team Birdman Trial (TBT) - とび斗くんの部屋
 * 「村田製作所 デンシランド風」フィジカル・マイクロインタラクション エンジン
 *
 * 機能要件:
 * 1. スプリング物理 (Spring Physics: stiffness: 350, damping: 25) による弾力ホバー & タップ
 * 2. 3D Parallax Tilt (マウス座標に応じた多層視差・立体傾斜)
 * 3. マグネティック・ボタン (Magnetic Cursor Attraction & Elastic Snap)
 * 4. FLIP アニメーションによる有機的カードモーフィング展開 (Card Morphing Expansion)
 * ==============================================================================
 */

(function () {
    'use strict';

    // ==========================================================================
    // 1. 軽量・高精度 スプリング物理演算クラス (Spring Physics Simulator)
    // ==========================================================================
    class Spring {
        constructor(initial = 0, stiffness = 320, damping = 24) {
            this.val = initial;
            this.target = initial;
            this.velocity = 0;
            this.stiffness = stiffness;
            this.damping = damping;
        }

        set(target) {
            this.target = target;
        }

        update(dt = 0.016) {
            const force = -this.stiffness * (this.val - this.target);
            const dampingForce = -this.damping * this.velocity;
            const acceleration = force + dampingForce;
            this.velocity += acceleration * dt;
            this.val += this.velocity * dt;
            return this.val;
        }

        isSettled(eps = 0.001) {
            return Math.abs(this.val - this.target) < eps && Math.abs(this.velocity) < eps;
        }
    }

    // ==========================================================================
    // 2. 3D Parallax Tilt ＆ スプリング・ホバー/タップ
    // ==========================================================================
    function initSpringCards() {
        // 対象: アーカイブカード、スペックカード、衣装カード、Bentoカード
        const cards = document.querySelectorAll('.archive-card, .spec-card-item, .costume-card, .bento-card, .fly-card-item');

        cards.forEach((card) => {
            // スプリング変数
            const springX = new Spring(0, 350, 24);
            const springY = new Spring(0, 350, 24);
            const springScale = new Spring(1, 400, 26);
            const springElevation = new Spring(0, 350, 24);

            let isHovered = false;
            let isTapped = false;
            let rafId = null;

            // 内部の多層パララックス要素 (画像やバッジ)
            const img = card.querySelector('img');
            const content = card.querySelector('.mt-4, .mt-5, .p-6');

            function loop() {
                springX.update();
                springY.update();
                springScale.update();
                springElevation.update();

                // 回転角 (最大 ±12度)
                const rotX = (-springY.val * 14).toFixed(2);
                const rotY = (springX.val * 14).toFixed(2);
                const scale = springScale.val.toFixed(3);
                const elev = springElevation.val.toFixed(2);

                card.style.transform = `perspective(1000px) translateY(${elev}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;

                // 内部画像のZ軸飛び出し演出 (Layered Depth)
                if (img) {
                    const imgX = (springX.val * 12).toFixed(2);
                    const imgY = (springY.val * 12).toFixed(2);
                    img.style.transform = `translate3d(${imgX}px, ${imgY}px, 35px)`;
                }

                if (!springX.isSettled() || !springY.isSettled() || !springScale.isSettled() || !springElevation.isSettled() || isHovered) {
                    rafId = requestAnimationFrame(loop);
                } else {
                    rafId = null;
                }
            }

            function triggerLoop() {
                if (!rafId) rafId = requestAnimationFrame(loop);
            }

            // マウス移動 (3D Parallax Tilt)
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 ~ 0.5
                const y = (e.clientY - rect.top) / rect.height - 0.5;

                springX.set(x);
                springY.set(y);
                triggerLoop();
            });

            // ホバー開始 (浮遊 scale: 1.04, y: -8px)
            card.addEventListener('mouseenter', () => {
                isHovered = true;
                if (!isTapped) {
                    springScale.set(1.04);
                    springElevation.set(-8);
                }
                triggerLoop();
            });

            // ホバー終了 (復元)
            card.addEventListener('mouseleave', () => {
                isHovered = false;
                isTapped = false;
                springX.set(0);
                springY.set(0);
                springScale.set(1.0);
                springElevation.set(0);
                triggerLoop();
            });

            // タップ/クリック (沈み込み scale: 0.94, 反発)
            card.addEventListener('mousedown', () => {
                isTapped = true;
                springScale.set(0.94);
                springElevation.set(2);
                triggerLoop();
            });

            window.addEventListener('mouseup', () => {
                if (isTapped) {
                    isTapped = false;
                    if (isHovered) {
                        springScale.set(1.04);
                        springElevation.set(-8);
                    } else {
                        springScale.set(1.0);
                        springElevation.set(0);
                    }
                    triggerLoop();
                }
            });

            // タッチ操作 (モバイル)
            card.addEventListener('touchstart', () => {
                springScale.set(0.95);
                triggerLoop();
            }, { passive: true });

            card.addEventListener('touchend', () => {
                springScale.set(1.0);
                triggerLoop();
            }, { passive: true });
        });
    }

    // ==========================================================================
    // 3. マグネティック・ボタン (Magnetic Cursor Attraction)
    // ==========================================================================
    function initMagneticButtons() {
        const magnets = document.querySelectorAll('.btn-pill-primary, .btn-pill-secondary, .game-tab-btn, .magnetic-btn');

        magnets.forEach((btn) => {
            const springX = new Spring(0, 280, 22);
            const springY = new Spring(0, 280, 22);
            const springScale = new Spring(1, 350, 24);

            let isHovered = false;
            let rafId = null;

            function loop() {
                springX.update();
                springY.update();
                springScale.update();

                btn.style.transform = `translate3d(${springX.val.toFixed(2)}px, ${springY.val.toFixed(2)}px, 0) scale(${springScale.val.toFixed(3)})`;

                if (!springX.isSettled() || !springY.isSettled() || !springScale.isSettled() || isHovered) {
                    rafId = requestAnimationFrame(loop);
                } else {
                    rafId = null;
                }
            }

            function trigger() {
                if (!rafId) rafId = requestAnimationFrame(loop);
            }

            btn.addEventListener('mousemove', (e) => {
                const rect = btn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;

                // カーソル引き寄せ量 (最大 ±18px)
                const pullStrength = 0.35;
                const dx = (e.clientX - centerX) * pullStrength;
                const dy = (e.clientY - centerY) * pullStrength;

                springX.set(dx);
                springY.set(dy);
                trigger();
            });

            btn.addEventListener('mouseenter', () => {
                isHovered = true;
                springScale.set(1.06);
                trigger();
            });

            btn.addEventListener('mouseleave', () => {
                isHovered = false;
                springX.set(0);
                springY.set(0);
                springScale.set(1.0);
                trigger();
            });

            btn.addEventListener('mousedown', () => {
                springScale.set(0.93);
                trigger();
            });

            btn.addEventListener('mouseup', () => {
                springScale.set(isHovered ? 1.06 : 1.0);
                trigger();
            });
        });
    }

    // ==========================================================================
    // 4. カード展開のFLIPアニメーション (Organic Card Morphing Expansion)
    // ==========================================================================
    function initCardMorphingFLIP() {
        const modal = document.getElementById('archive-lightbox');
        const modalContent = modal ? modal.querySelector('div') : null;
        if (!modal || !modalContent) return;

        let activeOriginCard = null;

        // グローバルモーダルオープン関数をFLIPモーフィング対応へフック
        const originalOpenLightbox = window.openArchiveLightbox;

        window.openArchiveLightbox = function (index, originElement) {
            // クリック元のカードを取得
            activeOriginCard = originElement || document.querySelector(`[data-index="${index}"]`) || (window.event ? window.event.currentTarget : null);

            // 元のライトボックス展開処理でDOMコンテンツを更新
            if (typeof originalOpenLightbox === 'function') {
                originalOpenLightbox(index);
            }

            if (!activeOriginCard) return;

            // 1. FIRST: 元カードの矩形取得
            const firstRect = activeOriginCard.getBoundingClientRect();

            // 2. LAST: 展開先モーダルコンテナの矩形取得
            modalContent.style.transform = 'none';
            modalContent.style.opacity = '1';
            const lastRect = modalContent.getBoundingClientRect();

            // 3. INVERT: 拡大前の位置・スケール・オフセットを逆算
            const deltaX = firstRect.left + firstRect.width / 2 - (lastRect.left + lastRect.width / 2);
            const deltaY = firstRect.top + firstRect.height / 2 - (lastRect.top + lastRect.height / 2);
            const scaleX = firstRect.width / lastRect.width;
            const scaleY = firstRect.height / lastRect.height;

            // 初期位置として元カードに完全一致させる
            modalContent.style.transformOrigin = 'center center';
            modalContent.style.transform = `translate3d(${deltaX.toFixed(2)}px, ${deltaY.toFixed(2)}px, 0) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            modalContent.style.borderRadius = '2rem';
            modal.style.backgroundColor = 'rgba(2, 6, 23, 0)';

            // 4. PLAY: スプリングで有機的に画面中央へ膨張展開！
            requestAnimationFrame(() => {
                modal.style.transition = 'background-color 0.4s ease';
                modal.style.backgroundColor = 'rgba(2, 6, 23, 0.92)';

                modalContent.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), border-radius 0.4s ease';
                modalContent.style.transform = 'translate3d(0, 0, 0) scale(1, 1)';
                modalContent.style.borderRadius = '1.5rem';
            });
        };

        // モーダルクローズ時の逆FLIPアニメーション
        const originalCloseLightbox = window.closeArchiveLightbox;

        window.closeArchiveLightbox = function (event) {
            if (event && event.target && event.target !== modal && !event.target.closest('#btn-close-lightbox')) {
                return;
            }

            if (!activeOriginCard) {
                if (typeof originalCloseLightbox === 'function') originalCloseLightbox(event);
                return;
            }

            const currentRect = modalContent.getBoundingClientRect();
            const targetRect = activeOriginCard.getBoundingClientRect();

            const deltaX = targetRect.left + targetRect.width / 2 - (currentRect.left + currentRect.width / 2);
            const deltaY = targetRect.top + targetRect.height / 2 - (currentRect.top + currentRect.height / 2);
            const scaleX = targetRect.width / currentRect.width;
            const scaleY = targetRect.height / currentRect.height;

            modal.style.transition = 'background-color 0.35s ease';
            modal.style.backgroundColor = 'rgba(2, 6, 23, 0)';

            modalContent.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
            modalContent.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(${scaleX}, ${scaleY})`;
            modalContent.style.opacity = '0.4';

            setTimeout(() => {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                modalContent.style.transform = '';
                modalContent.style.opacity = '';
                activeOriginCard = null;
            }, 380);
        };
    }

    // ==========================================================================
    // 5. 初期化
    // ==========================================================================
    function init() {
        initSpringCards();
        initMagneticButtons();
        initCardMorphingFLIP();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
