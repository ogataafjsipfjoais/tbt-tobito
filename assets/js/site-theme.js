(function () {
    'use strict';
    const key = 'tbt_site_theme';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const valid = value => ['system', 'light', 'dark'].includes(value) ? value : 'system';
    let preference = 'system';
    try { preference = valid(localStorage.getItem(key)); } catch (_) {}
    function apply() {
        const theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
        document.documentElement.dataset.siteTheme = theme;
        document.documentElement.style.colorScheme = theme;
        const select = document.getElementById('site-theme');
        if (select) select.value = preference;
    }
    apply();
    if (media.addEventListener) media.addEventListener('change', apply);
    else media.addListener(apply);
    window.addEventListener('storage', event => {
        if (event.key !== key && event.key !== null) return;
        preference = valid(event.newValue); apply();
    });
    function init() {
        apply();
        document.getElementById('site-theme')?.addEventListener('change', event => {
            preference = valid(event.target.value);
            try { localStorage.setItem(key, preference); } catch (_) {}
            apply();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})();
