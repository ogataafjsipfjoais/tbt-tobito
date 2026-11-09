const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture(saved, dark = false, blocked = false) {
    const handlers = {}, media = { matches:dark, addEventListener(_, callback) { this.change = callback; } };
    const select = { addEventListener(_, callback) { this.change = callback; } };
    const document = { readyState:'complete', documentElement:{ dataset:{}, style:{} }, getElementById() { return select; } };
    const storage = { value:saved, getItem() { if (blocked) throw Error('Denied'); return this.value; }, setItem(_, value) { if (blocked) throw Error('Denied'); this.value = value; } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/site-theme.js'), 'utf8'), { document, window:{ matchMedia:() => media, addEventListener(type, callback) { handlers[type] = callback; } }, localStorage:storage });
    return { document, select, media, storage, handlers };
}
test('automatic theme follows OS changes and saved choice overrides the OS', () => {
    const f = fixture(null, true);
    assert.equal(f.document.documentElement.dataset.siteTheme, 'dark');
    f.media.matches = false; f.media.change(); assert.equal(f.document.documentElement.dataset.siteTheme, 'light');
    f.select.change({ target:{ value:'dark' } }); assert.equal(f.storage.value, 'dark');
    f.media.change(); assert.equal(f.document.documentElement.dataset.siteTheme, 'dark');
    assert.equal(fixture('light', true).document.documentElement.style.colorScheme, 'light');
});
test('theme works with denied storage, invalid preferences and cross-tab updates', () => {
    const f = fixture('invalid', false, true);
    f.select.change({ target:{ value:'dark' } }); assert.equal(f.document.documentElement.dataset.siteTheme, 'dark');
    f.handlers.storage({ key:'tbt_site_theme', newValue:'light' }); assert.equal(f.select.value, 'light');
});
test('companion control lives in wardrobe and has no viewport-fixed launcher', () => {
    const source = fs.readFileSync(require.resolve('../assets/js/tobito-companion.js'), 'utf8');
    const html = fs.readFileSync(require.resolve('../index.php'), 'utf8');
    assert.match(html, /id="tobito-companion-tools"/);
    assert.match(source, /host.appendChild\(this.widget\)/);
    assert.doesNotMatch(source, /document.body.appendChild\(this.widget\)|fixed bottom-5|tobito-widget-btn/);
});
test('dark surfaces and typography preserve layout and button semantics', () => {
    const css = fs.readFileSync(require.resolve('../assets/css/site-theme.css'), 'utf8');
    assert.doesNotMatch(css, /\.prologue-state :is\(h1,h2,p,span\)/);
    assert.doesNotMatch(css, /-webkit-text-fill-color/);
    assert.match(css, /#prologue-bg-ambient\s*\{\s*background:var\(--theme-paper\) !important/);
    assert.match(css, /\.text-slate-900[^\n]+:not\(button\):not\(a\)/);
    for (const component of ['.tobito-identity-band', '.identity-portrait', '.prologue-text-4', '.prologue-s4-story']) assert.ok(css.includes(component));
    for (const block of css.matchAll(/:root\[data-site-theme="dark"\][^{]*\{([^}]+)\}/g)) {
        assert.doesNotMatch(block[1], /(?:^|;)\s*(display|position|height|width|transform|font-size|line-height|padding|margin)\s*:/);
    }
});
test('dark text, secondary labels and accents have readable contrast on their surfaces', () => {
    function luminance(hex) {
        const rgb = hex.match(/[a-f\d]{2}/gi).map(channel => {
            const value = parseInt(channel, 16) / 255;
            return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
        });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    for (const background of ['171d20', '222a2e', '29353a']) for (const foreground of ['edf4f4', 'b7c7cc', '8fd6df', 'dfbf65']) {
        const contrast = (luminance(foreground) + 0.05) / (luminance(background) + 0.05);
        assert.ok(contrast >= 4.5, foreground + ' / ' + background);
    }
});
test('header dropdown backgrounds are hidden until hover or keyboard focus', () => {
    const css = fs.readFileSync(require.resolve('../assets/css/site-theme.css'), 'utf8');
    assert.match(css, /#header_inner \.nav_inner \{ visibility:hidden; opacity:0; pointer-events:none/);
    assert.match(css, /\.nav_box:is\(:hover,:focus-within\) \.nav_inner \{ visibility:visible/);
    assert.match(css, /:is\(a,\.nav_main,ruby,rb,rt\).*color:var\(--theme-ink\) !important/);
    assert.match(css, /#logo_icon path \{ fill:var\(--theme-ink\) !important/);
});
