/** Scroll-driven hero: scene timing, rendering, and pointer motion. */
(function () {
    'use strict';

    const SCENES = [
        { id: 'prologue-state-1', exit: [0.08, 0.16], interactive: true },
        { id: 'prologue-state-2', enter: [0.16, 0.22], exit: [0.33, 0.40], preview: 0.27 },
        { id: 'prologue-state-3', enter: [0.40, 0.46], exit: [0.56, 0.63], preview: 0.50 },
        { id: 'prologue-stage-4', enter: [0.63, 0.71], interactive: true, preview: 0.80 },
    ];
    const BACKGROUNDS = [
        { start: 0, value: 'linear-gradient(180deg, #ffffff 0%, #fff8df 32%, #e8f7ff 68%, #ffffff 100%)' },
        { start: 0.16, value: 'linear-gradient(180deg, #ffffff 0%, #e5f6ff 35%, #f8fbff 72%, #ffffff 100%)' },
        { start: 0.40, value: 'linear-gradient(180deg, #ffffff 0%, #fff0bd 34%, #fffaf0 72%, #ffffff 100%)' },
        { start: 0.65, value: 'linear-gradient(180deg, #ffffff 0%, #eef9ff 52%, #ffffff 100%)' },
    ];
    const PHRASE_TRAVEL = 16;
    const MASCOT_EXIT = SCENES[2].exit;
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const mix = (from, to, progress) => from + (to - from) * progress;
    const ramp = (progress, [start, end]) => clamp((progress - start) / (end - start));

    function sceneFrame(scene, progress) {
        const enter = scene.enter ? ramp(progress, scene.enter) : 1;
        const exit = scene.exit ? ramp(progress, scene.exit) : 0;
        return { opacity: enter * (1 - exit), y: PHRASE_TRAVEL * (1 - enter - exit) };
    }

    function renderScene(element, frame, interactive) {
        if (!element) return;
        element.style.opacity = String(frame.opacity);
        element.style.visibility = frame.opacity > 0 ? 'visible' : 'hidden';
        element.style.transform = `translateY(${frame.y}px)`;
        element.style.pointerEvents = interactive && frame.opacity > 0.95 ? 'auto' : 'none';
        element.inert = frame.opacity <= 0.95;
    }

    function scrollGeometry(section, stage) {
        return {
            top: section.getBoundingClientRect().top,
            offset: parseFloat(getComputedStyle(stage).top) || 0,
            distance: Math.max(1, section.offsetHeight - stage.offsetHeight),
        };
    }

    function initPointerMotion(stage, giant, small) {
        if (!window.matchMedia('(pointer: fine)').matches) return;
        const target = { x: 0, y: 0 };
        const current = { x: 0, y: 0 };
        let frameId = null;

        function requestFrame() {
            if (frameId === null) frameId = requestAnimationFrame(render);
        }

        function render() {
            frameId = null;
            current.x = mix(current.x, target.x, 0.08);
            current.y = mix(current.y, target.y, 0.08);
            if (giant) giant.style.marginLeft = `${current.x * -12}px`;
            if (small) {
                small.style.marginLeft = `${current.x * 36}px`;
                small.style.marginTop = `${current.y * 24}px`;
            }
            if (Math.abs(target.x - current.x) > 0.001 || Math.abs(target.y - current.y) > 0.001) requestFrame();
        }

        stage.addEventListener('mousemove', (event) => {
            const rect = stage.getBoundingClientRect();
            target.x = (event.clientX - rect.left) / rect.width - 0.5;
            target.y = (event.clientY - rect.top) / rect.height - 0.5;
            requestFrame();
        }, { passive: true });
        stage.addEventListener('mouseleave', () => {
            target.x = 0;
            target.y = 0;
            requestFrame();
        });
    }

    function initScenePreview(section, stage) {
        const state = parseInt(new URLSearchParams(window.location.search).get('state'), 10);
        const progress = SCENES[state - 1]?.preview;
        if (progress === undefined) return;
        const scrollToScene = () => {
            const { top, offset, distance } = scrollGeometry(section, stage);
            window.scrollTo({ top: window.scrollY + top - offset + distance * progress, behavior: 'instant' });
        };
        scrollToScene();
        setTimeout(scrollToScene, 100);
    }

    function initPrologueScrollytelling() {
        const section = document.getElementById('prologue-section');
        const stage = document.getElementById('prologue-pinned-stage');
        if (!section || !stage) return;

        const scenes = SCENES.map(scene => ({ ...scene, element: document.getElementById(scene.id) }));
        const phrases = document.getElementById('prologue-phrase-stage-123');
        const giant = document.getElementById('prologue-giant-wrap');
        const portrait = document.getElementById('prologue-giant-tobito');
        const small = document.getElementById('prologue-small-tobito');
        const ambient = document.getElementById('prologue-bg-ambient');
        const watermark = section.querySelector('.prologue-brand-watermark');
        let currentBackground = null;
        let ticking = false;

        function renderProgress(progress) {
            for (const scene of scenes) renderScene(scene.element, sceneFrame(scene, progress), scene.interactive);
            if (phrases) phrases.style.opacity = progress < BACKGROUNDS[3].start ? '1' : '0';
            const background = BACKGROUNDS.reduce((active, item) => progress >= item.start ? item.value : active, null);
            if (ambient && background !== currentBackground) {
                ambient.style.background = background;
                currentBackground = background;
            }

            const exit = ramp(progress, MASCOT_EXIT);
            const opacity = 1 - exit;
            const travel = clamp(progress / MASCOT_EXIT[1]);
            if (giant) {
                giant.style.opacity = String(opacity);
                giant.style.visibility = opacity > 0 ? 'visible' : 'hidden';
                giant.style.transform = `translate(-50%, ${-24 * exit}px)`;
            }
            if (portrait) {
                const y = mix(0, -6, travel);
                const scale = mix(1, 0.96, travel);
                const rotation = mix(0, 1, travel);
                portrait.style.transform = `translateY(${y}%) scale(${scale}) rotate(${rotation}deg)`;
            }
            if (small) {
                small.style.opacity = String(opacity);
                const x = mix(0, 32, travel);
                const y = mix(0, -95, travel);
                const rotation = mix(0, -4, travel);
                small.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
            }
            if (watermark) {
                watermark.style.opacity = String(opacity * mix(1, 0.22, travel));
                const y = mix(0, 34, travel);
                const scale = mix(1, 0.96, travel);
                watermark.style.transform = `translate(-50%, calc(-50% - ${y}px)) scale(${scale})`;
            }
        }

        function updateFromScroll() {
            ticking = false;
            const { top, offset, distance } = scrollGeometry(section, stage);
            renderProgress(clamp((-top + offset) / distance));
        }

        function requestUpdate() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(updateFromScroll);
        }

        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', requestUpdate, { passive: true });
        updateFromScroll();
        initPointerMotion(stage, giant, small);
        initScenePreview(section, stage);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPrologueScrollytelling);
    } else {
        initPrologueScrollytelling();
    }
})();
