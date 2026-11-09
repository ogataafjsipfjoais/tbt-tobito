/**
 * ==============================================================================
 * Team Birdman Trial (TBT) - とび斗くんの部屋
 * フルスクリーン・スクロールテリング (Scrollytelling) エンジン
 * （Inspired by 明電舎・あなたのとなりの明電舎）
 *
 * コア機能:
 * 1. Lenis スムーススクロール & GSAP ScrollTrigger 完全同期
 * 2. 背景・気流のシームレス・カラーシフト (夜明けインディゴ → 朝焼け琵琶湖 → 蒼穹スカイ)
 * 3. 超巨大動詞タイポグラフィ (「飛べない鳥よ、」「ペダルを踏め。」「風を掴め。」「空を翔べ。」)
 * 4. Chapter 1: シルエットから光を浴びて実体化するピン留めストーリーテリング
 * 5. Chapter 2: 外側から吸い付くように収束するミニマル・スペックBento
 * 6. Chapter 3: Z軸3D空間を舞い上がる Fly-through ステッカーアーカイブ
 * 7. モバイル・レスポンシブ自動最適化
 * ==============================================================================
 */

(function () {
    'use strict';

    // GSAP と ScrollTrigger の確認
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn('GSAP or ScrollTrigger not loaded. Falling back to native scroll.');
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // ==========================================================================
    // 1. Lenis スムーススクロール初期化
    // ==========================================================================
    let lenis = null;
    const isMobile = window.innerWidth < 768;

    if (typeof Lenis !== 'undefined' && !isMobile) {
        lenis = new Lenis({
            duration: 1.25,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smoothWheel: false,
            smoothTouch: false,
            touchMultiplier: 1.5,
        });

        lenis.on('scroll', ScrollTrigger.update);

        gsap.ticker.add((time) => {
            lenis.raf(time * 1000);
        });

        gsap.ticker.lagSmoothing(0);
    }

    // ==========================================================================
    // 2. 背景カラーシフト & 気流 (Airflow Streamlines)
    // ==========================================================================
    function initBackgroundAndAirflow() {
        const bgLayer1 = document.getElementById('scrolly-bg-dawn');
        const bgLayer2 = document.getElementById('scrolly-bg-sunrise');
        const bgLayer3 = document.getElementById('scrolly-bg-sky');
        const airflowLines = document.querySelectorAll('.airflow-line');

        // 気流のスクロール連動 (stroke-dashoffset)
        if (airflowLines.length > 0) {
            gsap.to(airflowLines, {
                strokeDashoffset: 0,
                ease: 'none',
                scrollTrigger: {
                    trigger: document.body,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: 1.5,
                }
            });
        }

        // 背景レイヤーのクロスフェード (ScrollTrigger)
        // 1. 夜明けインディゴ (初期) -> 2. 早朝琵琶湖 (30%~) -> 3. 青空スカイ (65%~)
        if (bgLayer1 && bgLayer2 && bgLayer3) {
            // 全体のスクロール進捗に応じた背景クロスフェード
            ScrollTrigger.create({
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 1.2,
                onUpdate: (self) => {
                    const p = self.progress;

                    if (p < 0.35) {
                        // 夜明け -> 朝焼け
                        const subP = p / 0.35;
                        gsap.set(bgLayer1, { opacity: 1 - subP });
                        gsap.set(bgLayer2, { opacity: subP });
                        gsap.set(bgLayer3, { opacity: 0 });
                    } else if (p < 0.7) {
                        // 朝焼け -> 青空
                        const subP = (p - 0.35) / 0.35;
                        gsap.set(bgLayer1, { opacity: 0 });
                        gsap.set(bgLayer2, { opacity: 1 - subP });
                        gsap.set(bgLayer3, { opacity: subP });
                    } else {
                        // 青空
                        gsap.set(bgLayer1, { opacity: 0 });
                        gsap.set(bgLayer2, { opacity: 0 });
                        gsap.set(bgLayer3, { opacity: 1 });
                    }
                }
            });
        }
    }

    // ==========================================================================
    // 3. Chapter 1: 誕生と意志（Hero & Story Pinned Scrollytelling）
    // ==========================================================================
    function initChapter1Story() {
        const pinContainer = document.getElementById('story-pinned-stage');
        if (!pinContainer) return;

        // モバイル環境ではシンプルなフェード演出に切り替え
        if (isMobile) {
            gsap.from('.story-mobile-item', {
                opacity: 0,
                y: 30,
                duration: 0.8,
                stagger: 0.2,
                scrollTrigger: {
                    trigger: '#story-pinned-stage',
                    start: 'top 80%',
                }
            });
            return;
        }

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: pinContainer,
                start: 'top top',
                end: '+=2400',
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
            }
        });

        // キーワード & キャラクターのタイムライン
        // Phase 1: 暗闇の中にシルエットと第1メッセージ「飛べない鳥よ、」
        tl.to('#story-phrase-1', { opacity: 1, scale: 1, duration: 1 })
          .to('#story-tobito-silhouette', { filter: 'brightness(0.3) saturate(0.5)', scale: 1.05, duration: 1 }, '<')
          .to('#story-phrase-1', { opacity: 0, scale: 1.25, y: -40, duration: 0.8 }, '+=0.5')

        // Phase 2: 朝日の光輪が差し込み「ペダルを踏め。」
          .to('#story-aura-light', { opacity: 0.8, scale: 1.5, duration: 1.2 }, '<')
          .to('#story-phrase-2', { opacity: 1, scale: 1, duration: 1 }, '<0.2')
          .to('#story-tobito-silhouette', { filter: 'brightness(0.7) saturate(0.9)', duration: 1 }, '<')
          .to('#story-phrase-2', { opacity: 0, scale: 1.25, y: -40, duration: 0.8 }, '+=0.5')

        // Phase 3: 風が吹き抜け「風を掴め。」
          .to('#story-phrase-3', { opacity: 1, scale: 1, duration: 1 }, '<0.2')
          .to('#story-tobito-silhouette', { filter: 'brightness(1) saturate(1.2)', scale: 1.15, duration: 1 }, '<')
          .to('#story-phrase-3', { opacity: 0, scale: 1.25, y: -40, duration: 0.8 }, '+=0.5')

        // Phase 4: 完全実体化 ＆「翼を紡ぎ出す場所。」
          .to('#story-phrase-4', { opacity: 1, scale: 1, duration: 1 }, '<0.2')
          .to('#story-tobito-silhouette', { filter: 'brightness(1) saturate(1.25) drop-shadow(0 20px 40px rgba(56,189,248,0.5))', scale: 1.15, duration: 1.2 }, '<')
          .to('#story-phrase-4', { opacity: 0, scale: 1.1, y: -20, duration: 0.8 }, '+=0.5')
          .to('#story-final-message', { opacity: 1, y: 0, duration: 1 }, '+=0.2');
    }

    // ==========================================================================
    // 4. Chapter 2: スペック・工学の美（Specifications Bento Pinned Ingress）
    // ==========================================================================
    function initChapter2Specs() {
        const specsContainer = document.getElementById('specs-pinned-stage');
        if (!specsContainer) return;

        if (isMobile) {
            gsap.from('.spec-card-item', {
                opacity: 0,
                y: 40,
                duration: 0.7,
                stagger: 0.15,
                scrollTrigger: {
                    trigger: '#specs-pinned-stage',
                    start: 'top 75%',
                }
            });
            return;
        }

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: specsContainer,
                start: 'top top',
                end: '+=1800',
                pin: true,
                scrub: 1,
                anticipatePin: 1,
            }
        });

        // タイトルが上からスライドイン
        tl.from('#specs-section-header', { opacity: 0, y: -50, duration: 1 })

        // 各カードが四方から吸い付くように収束 (power2.out)
          .from('.spec-card-left', { opacity: 0, x: -120, scale: 0.9, duration: 1.2, stagger: 0.2, ease: 'power2.out' }, '<0.2')
          .from('.spec-card-right', { opacity: 0, x: 120, scale: 0.9, duration: 1.2, stagger: 0.2, ease: 'power2.out' }, '<')
          .from('.spec-card-center', { opacity: 0, y: 80, scale: 0.85, duration: 1.2, ease: 'power2.out' }, '<0.3');
    }

    // ==========================================================================
    // 5. Chapter 3: 歴代ステッカー・アーカイブ（3D Fly-through / Depth Gallery）
    // ==========================================================================
    function initChapter3FlyThrough() {
        const flyContainer = document.getElementById('archive-fly-stage');
        if (!flyContainer) return;

        if (isMobile) {
            return; // モバイルは archive-scroll.js のネイティブスワイプを利用
        }

        const cards = gsap.utils.toArray('.fly-card-item');
        if (cards.length === 0) return;

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: flyContainer,
                start: 'top top',
                end: '+=2800',
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
            }
        });

        // タイトル表示
        tl.from('#fly-section-header', { opacity: 0, y: -30, duration: 0.8 });

        // 各カードがZ軸を奥から手前へ通り過ぎるシークエンス
        cards.forEach((card, index) => {
            const isLast = index === cards.length - 1;

            // 初期位置: 奥 (scale: 0.6, y: 150, opacity: 0)
            // 中央: フォーカス (scale: 1.15, y: 0, opacity: 1, filter: blur(0))
            // 通過後: 手前へ飛び去る (scale: 1.8, y: -200, opacity: 0, filter: blur(8px))
            tl.fromTo(card,
                {
                    opacity: 0,
                    scale: 0.6,
                    y: 120,
                    filter: 'blur(6px)',
                    pointerEvents: 'none',
                },
                {
                    opacity: 1,
                    scale: 1.12,
                    y: 0,
                    filter: 'blur(0px)',
                    duration: 1.5,
                    pointerEvents: 'auto',
                    ease: 'power2.out',
                }
            );

            if (!isLast) {
                tl.to(card, {
                    opacity: 0,
                    scale: 1.6,
                    y: -140,
                    filter: 'blur(10px)',
                    duration: 1.2,
                    pointerEvents: 'none',
                    ease: 'power2.in',
                }, '+=0.6');
            } else {
                // 最後のカードは中央に留まる
                tl.to(card, {
                    scale: 1.15,
                    duration: 0.8,
                });
            }
        });
    }

    // ==========================================================================
    // 6. DOM読み込み後の初期化
    // ==========================================================================
    function init() {
        initBackgroundAndAirflow();
        initChapter1Story();
        initChapter2Specs();
        initChapter3FlyThrough();

        // ページ内アンカーリンクをLenisと調和させる
        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (!targetId || targetId === '#') return;
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    if (lenis) {
                        lenis.scrollTo(targetEl, { offset: -60, duration: 1.4 });
                    } else {
                        targetEl.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
