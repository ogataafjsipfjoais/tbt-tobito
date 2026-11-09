const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    const windowHandlers = {}, canvasHandlers = {}, buttonHandlers = {}, status = {};
    const document = { activeElement: null, addEventListener() {}, getElementById(id) {
        return id === 'flight-keyboard-focus' ? { addEventListener(type, handler) { buttonHandlers[type] = handler; } } : id === 'flight-keyboard-status' ? status : null;
    } };
    const window = { addEventListener(type, handler) { windowHandlers[type] = handler; } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/game.js'), 'utf8'), { window, document });
    const canvas = { parentElement: { addEventListener() {}, contains(node) { return node === canvas; } }, setAttribute() {}, addEventListener(type, handler) {
        (canvasHandlers[type] ||= []).push(handler);
    }, focus() { document.activeElement = canvas; canvasHandlers.focus?.forEach(handler => handler()); } };
    const game = { canvas, physics: {}, mouseLook: {}, bindTouchControls() {}, handlePedalTap() { this.taps = (this.taps || 0) + 1; }, resetFlight() {}, switchCamera() {}, switchWeather() {}, toggleTheater() {} };
    window.TobitoFlightSimulator3D.prototype.bindEvents.call(game);
    const key = (code, extra = {}) => windowHandlers.keydown({ code, target: { closest() { return false; } }, preventDefault() {}, ...extra });
    return { game, canvas, key, status, windowHandlers, buttonHandlers, document };
}
test('guide focus button enables keyboard control without automatically launching', () => {
    const { game, status, buttonHandlers, key } = fixture();
    assert.equal(status.textContent, 'キーボード待機');
    key('Space'); assert.equal(game.taps, undefined);
    buttonHandlers.click(); assert.equal(status.textContent, 'キーボード操作中');
    assert.equal(game.taps, undefined);
    key('Space'); assert.equal(game.taps, 1);
    key('Space', { repeat: true }); assert.equal(game.taps, 1);
});
test('pitch, bank and rudder keys match the guide and do not intercept pilot name input', () => {
    const { game, key, buttonHandlers, windowHandlers } = fixture(); buttonHandlers.click();
    key('ArrowUp'); assert.equal(game.physics.elevator, 1);
    key('ArrowDown'); assert.equal(game.physics.elevator, -1);
    key('ArrowLeft'); assert.equal(game.physics.aileron, -1);
    key('ArrowRight'); assert.equal(game.physics.aileron, 1);
    key('KeyQ'); assert.equal(game.physics.rudder, -1);
    key('KeyE'); assert.equal(game.physics.rudder, 1);
    key('ArrowUp', { target: { closest() { return true; } } }); assert.equal(game.physics.elevator, -1);
    windowHandlers.blur(); assert.equal(game.physics.elevator, 0); assert.equal(game.physics.rudder, 0);
});
