/**
 * ==============================================================================
 * Team Birdman Trial (TBT) - とびとくんの部屋
 * ステッカー・部販アーカイブ スクロール連動アニメーション (Scroll-driven Animation)
 * 
 * 機能要件:
 * 1. コンテナのピン留め (Sticky) ＆ 縦スクロール連動の水平スクラブ (Horizontal Scrubbing)
 * 2. 視差（パララックス）効果: スクロール速度に応じたステッカー画像の立体浮遊
 * 3. アクティブカードのフォーカス拡大 (scale: 1.05) ＆ 周辺カードのフェードアウト (opacity: 0.65)
 * 4. カーソル追従 3Dチルト効果 (マウス移動に合わせた微細な立体傾斜)
 * 5. プログレスバー ＆ 現在枚数カウンター連動
 * 6. モバイル / タッチ端末向けのスムーズなスワイプカルーセルフォールバック
 * ==============================================================================
 */

(function () {
    'use strict';

    class ArchiveScrollAnimation {
        constructor() {
            this.section = document.getElementById('archives');
            this.stickyContainer = document.getElementById('archive-sticky-container');
            this.track = document.getElementById('archive-track');
            this.scrollWrapper = document.getElementById('archive-scroll-wrapper');
            this.progressBar = document.getElementById('archive-progress-bar');
            this.counterCurrent = document.getElementById('archive-counter-current');
            this.cards = document.querySelectorAll('.archive-card');

            if (!this.section || !this.track || this.cards.length === 0) return;

            // アニメーション状態
            this.currentX = 0;
            this.targetX = 0;
            this.progress = 0;
            this.isTicking = false;
            this.isDesktop = window.innerWidth >= 768;

            this.init();
        }

        init() {
            // イベントリスナーの登録
            window.addEventListener('scroll', () => this.requestTick(), { passive: true });
            window.addEventListener('resize', () => this.onResize(), { passive: true });

            if (this.scrollWrapper) {
                this.scrollWrapper.addEventListener('scroll', () => this.onMobileScroll(), { passive: true });
            }

            // 3Dチルト効果の初期化
            this.init3DTilt();

            // 初期レンダリング
            this.update();
        }

        onResize() {
            const wasDesktop = this.isDesktop;
            this.isDesktop = window.innerWidth >= 768;

            if (wasDesktop !== this.isDesktop) {
                if (!this.isDesktop) {
                    // モバイルへ切り替わった場合、transformをリセット
                    this.track.style.transform = '';
                    this.cards.forEach(card => {
                        card.style.transform = '';
                        card.style.opacity = '';
                    });
                }
            }
            this.requestTick();
        }

        requestTick() {
            if (!this.isTicking) {
                this.isTicking = true;
                requestAnimationFrame(() => this.update());
            }
        }

        update() {
            if (this.isDesktop) {
                this.updateDesktopHorizontalScrub();
            } else {
                this.updateMobileState();
            }
        }

        /**
         * デスクトップ: 縦スクロール連動の水平スクラブ ＆ 視差パララックス ＆ アクティブ拡大
         */
        updateDesktopHorizontalScrub() {
            const rect = this.section.getBoundingClientRect();
            const sectionHeight = this.section.offsetHeight;
            const viewportHeight = window.innerHeight;
            const scrollDistance = sectionHeight - viewportHeight;

            if (scrollDistance <= 0) {
                this.isTicking = false;
                return;
            }

            // スクロール進捗度 (0.0 〜 1.0)
            const rawProgress = -rect.top / scrollDistance;
            this.progress = Math.max(0, Math.min(1, rawProgress));

            // トラックの最大移動可能量 (Track width - Viewport width + padding)
            const trackWidth = this.track.scrollWidth;
            const containerWidth = this.stickyContainer ? this.stickyContainer.clientWidth : window.innerWidth;
            const maxScrollX = Math.max(0, trackWidth - containerWidth + 80);

            this.targetX = -this.progress * maxScrollX;

            // シルキースムーズな線形補間 (Lerp)
            const lerpFactor = 0.14;
            this.currentX += (this.targetX - this.currentX) * lerpFactor;
            if (Math.abs(this.targetX - this.currentX) < 0.05) {
                this.currentX = this.targetX;
            }

            // トラック本体を横スライド
            this.track.style.transform = `translate3d(${this.currentX.toFixed(2)}px, 0, 0)`;

            // プログレスバー更新
            if (this.progressBar) {
                this.progressBar.style.width = `${(this.progress * 100).toFixed(1)}%`;
            }

            // 各カードの中央距離計算・視差パララックス・スケール調整
            const viewportCenterX = containerWidth / 2;
            let closestIndex = 0;
            let minDistance = Infinity;

            this.cards.forEach((card, idx) => {
                const cardRect = card.getBoundingClientRect();
                const cardCenterX = cardRect.left + cardRect.width / 2;
                const distFromCenter = Math.abs(cardCenterX - viewportCenterX);

                // 最も中央に近いカードの判定
                if (distFromCenter < minDistance) {
                    minDistance = distFromCenter;
                    closestIndex = idx;
                }

                // 画面中心からの正規化距離 (0.0: 中央 〜 1.0: 遠い)
                const maxRange = containerWidth * 0.65;
                const normDist = Math.max(0, Math.min(1, distFromCenter / maxRange));

                // 中央アクティブ拡大 (1.05) ＆ 周辺フェード (0.65, scale 0.95)
                const baseScale = 1.05 - (normDist * 0.10);
                const baseOpacity = 1.0 - (normDist * 0.35);

                card.dataset.baseScale = baseScale.toFixed(3);
                card.dataset.baseOpacity = baseOpacity.toFixed(3);

                // 3Dチルト中でない場合のみトランスフォーム適用
                if (!card.classList.contains('is-tilting')) {
                    card.style.transform = `scale(${baseScale.toFixed(3)})`;
                    card.style.opacity = baseOpacity.toFixed(3);
                }

                // カード内ステッカー画像の微小パララックス浮遊
                const parallaxImg = card.querySelector('.archive-img-parallax');
                if (parallaxImg) {
                    const parallaxShift = (cardCenterX - viewportCenterX) * 0.07;
                    parallaxImg.style.transform = `translate3d(${-parallaxShift.toFixed(2)}px, 0, 0)`;
                }
            });

            // 現在カードカウンター更新 (01, 02, 03, 04)
            if (this.counterCurrent) {
                this.counterCurrent.textContent = String(closestIndex + 1).padStart(2, '0');
            }

            // 慣性補間が残っている場合は次のフレームをリクエスト
            if (Math.abs(this.targetX - this.currentX) >= 0.05) {
                requestAnimationFrame(() => this.update());
            } else {
                this.isTicking = false;
            }
        }

        /**
         * モバイル: ネイティブ横スクロールでのプログレス＆カウンター同期
         */
        onMobileScroll() {
            if (this.isDesktop || !this.scrollWrapper) return;
            this.updateMobileState();
        }

        updateMobileState() {
            if (!this.scrollWrapper) {
                this.isTicking = false;
                return;
            }

            const scrollLeft = this.scrollWrapper.scrollLeft;
            const maxScroll = this.scrollWrapper.scrollWidth - this.scrollWrapper.clientWidth;

            if (maxScroll > 0) {
                const prog = scrollLeft / maxScroll;
                if (this.progressBar) {
                    this.progressBar.style.width = `${(prog * 100).toFixed(1)}%`;
                }

                const cardWidth = this.cards[0] ? this.cards[0].offsetWidth : 300;
                const activeIdx = Math.min(this.cards.length - 1, Math.round(scrollLeft / (cardWidth + 16)));
                if (this.counterCurrent) {
                    this.counterCurrent.textContent = String(activeIdx + 1).padStart(2, '0');
                }
            }

            this.isTicking = false;
        }

        /**
         * 3Dチルト効果 (マウス位置に追従する立体インタラクション)
         */
        init3DTilt() {
            this.cards.forEach(card => {
                card.addEventListener('mousemove', (e) => {
                    if (!this.isDesktop) return;

                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    // 最大傾斜角 (±7.5度)
                    const rotateX = ((y - centerY) / centerY) * -7.5;
                    const rotateY = ((x - centerX) / centerX) * 7.5;

                    const baseScale = parseFloat(card.dataset.baseScale || '1.0');
                    const tiltScale = (baseScale * 1.02).toFixed(3);

                    card.classList.add('is-tilting');
                    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale(${tiltScale})`;
                });

                card.addEventListener('mouseleave', () => {
                    if (!this.isDesktop) return;

                    card.classList.remove('is-tilting');
                    const baseScale = card.dataset.baseScale || '1.0';
                    const baseOpacity = card.dataset.baseOpacity || '1.0';

                    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(${baseScale})`;
                    card.style.opacity = baseOpacity;
                });
            });
        }
    }

    // DOM読み込み後に初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.archiveScroll = new ArchiveScrollAnimation();
        });
    } else {
        window.archiveScroll = new ArchiveScrollAnimation();
    }
})();
