const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('surf starts across the whole page, with no dedicated section or stage', () => {
    const html = fs.readFileSync(require.resolve('../index.php'), 'utf8');
    assert.doesNotMatch(html, /id="surfing"|id="tobito-surf-stage"|id="surf-fullscreen"|id="wt-wing-motion"|id="wt-wing-flex"/);
    let toggleListener;
    const toggle = { setAttribute() {}, addEventListener(type, fn) { toggleListener = fn; } };
    const document = { readyState: 'complete', documentElement: {}, getElementById: () => toggle };
    const engines = [];
    const context = {
        document, localStorage: { getItem: () => null, setItem() {} },
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        window: { TobitoSurf: { Engine: class { constructor(parent, options) {
            this.host = { dataset: {} }; this.parent = parent; this.options = options; engines.push(this);
        } stop() { this.stopped = true; } } } }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/tobito-surf-demo.js'), 'utf8'), context);
    assert.equal(engines[0].parent, document.documentElement);
    assert.equal(engines[0].options.fullScreen, true);
    assert.equal(engines[0].options.closeButton, false);
    assert.equal(engines[0].host.dataset.surfScope, 'page');
    toggleListener();
    assert.equal(engines[0].stopped, true);
    assert.equal(engines.length, 1);
    toggleListener();
    assert.equal(engines.length, 2);
});
