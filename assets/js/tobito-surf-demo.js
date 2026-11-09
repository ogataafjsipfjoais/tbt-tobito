(function () {
    'use strict';
    function init() {
        const toggle = document.getElementById('page-surf-toggle');
        if (!toggle) return;
        let engine;
        let enabled = true;
        try { enabled = localStorage.getItem('tbt-page-surf') !== 'off'; } catch (_) {}
        const viewport = matchMedia('(max-width: 640px)');
        const mount = () => {
            engine?.stop();
            toggle.setAttribute('aria-pressed', String(enabled));
            toggle.setAttribute('aria-label', enabled ? 'とびとくんを非表示' : 'とびとくんを表示');
            if (!enabled) return;
            engine = new window.TobitoSurf.Engine(document.documentElement, {
                settings: { count: viewport.matches ? 2 : 3, size: viewport.matches ? 56 : 64, speed: 1, mode: 'follow', skin: 'mix' },
                fullScreen: true, closeButton: false, layerZIndex: 80,
                assetUrl: name => new URL('../images/' + name, document.querySelector('script[src*="/tobito-surf-demo.js"]').src).href
            });
            engine.host.dataset.surfScope = 'page';
        };
        toggle.addEventListener('click', () => {
            enabled = !enabled;
            try { localStorage.setItem('tbt-page-surf', enabled ? 'on' : 'off'); } catch (_) {}
            mount();
        });
        viewport.addEventListener('change', mount);
        mount();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
