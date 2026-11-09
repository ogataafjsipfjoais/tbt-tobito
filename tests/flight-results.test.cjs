const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    const handlers = [];
    const button = { addEventListener(type, fn) { handlers.push({ type, fn }); } };
    const distance = {};
    const box = { classList: { remove() {} }, style: {} };
    const window = { addEventListener() {} };
    const controls = { style: {}, classList: { remove(name) { controls.removed = name; } } };
    const document = {
        addEventListener() {},
        getElementById(id) {
            return ({ 'btn-restart-game': button, 'result-distance': distance, 'game-result-box': box, 'game-touch-controls': controls })[id] || null;
        }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/game.js'), 'utf8'), { window, document });
    return { methods: window.TobitoFlightSimulator3D.prototype, handlers, distance, controls };
}
test('visible flight restart button is bound once and clears the session', () => {
    const { methods, handlers } = fixture();
    let resets = 0;
    const game = {
        canvas: { parentElement: { addEventListener() {} }, setAttribute() {}, addEventListener() {} },
        bindTouchControls() {}, resetFlight() { resets++; }
    };
    methods.bindEvents.call(game);
    assert.equal(handlers.length, 1);
    assert.equal(handlers[0].type, 'click');
    handlers[0].fn({ preventDefault() {}, stopPropagation() {} });
    assert.equal(resets, 1);
});
test('result distance contains only the value, with units supplied by the template', () => {
    const { methods, distance } = fixture();
    methods.showResultOverlay.call({}, 'ゲーム記録', '着水', 1234);
    assert.equal(distance.textContent, '1,234');
});
test('flight controls remain available after restart on desktop and mobile', () => {
    const { methods, controls } = fixture();
    methods.updateTouchControlsVisibility.call({});
    assert.equal(controls.removed, 'hidden');
});
