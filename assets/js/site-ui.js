(function () {
    function init() {
        document.querySelectorAll('#header_inner .nav_main').forEach(trigger => {
            trigger.tabIndex = 0;
            trigger.setAttribute('role', 'button');
            trigger.setAttribute('aria-haspopup', 'true');
            trigger.addEventListener('keydown', event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                if (matchMedia('(max-width: 768px)').matches) trigger.click();
                else trigger.nextElementSibling?.querySelector('a')?.focus();
            });
        });
        const active = new Set();
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) active.add(entry.target);
                else active.delete(entry.target);
            });
            document.body.classList.toggle('tool-in-view', active.size > 0);
        });
        document.querySelectorAll('.s320-viewer, #wind-tunnel-canvas-container, #game-viewport-container, #yakitori-viewport-container, #terminal').forEach(element => observer.observe(element));
        const menu = document.getElementById('hamburger_button');
        const drawer = document.getElementById('header_inner');
        if (menu && drawer) {
            new MutationObserver(() => {
                menu.setAttribute('aria-expanded', drawer.style.transform ? 'true' : 'false');
            }).observe(drawer, { attributes: true, attributeFilter: ['style'] });
        }
        document.querySelectorAll('#game-touch-controls > div:first-child button').forEach(button => {
            const names = {
                'touch-btn-cam': '視点を切り替える',
                'touch-btn-reset': '再発進',
                'touch-btn-theater': '全画面',
                'game-sound-toggle': 'サウンド切替'
            };
            if (names[button.id]) {
                button.setAttribute('aria-label', names[button.id]);
                button.title = names[button.id];
            }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
