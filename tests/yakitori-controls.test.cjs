const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
    const handlers = {};
    const canvasHandlers = {};
    let hidden = false;
    let overlayHidden = false;
    const canvas = { addEventListener: (type, callback) => { canvasHandlers[type] = callback; }, setAttribute() {} };
    const document = {
        activeElement: null,
        getElementById: id => id === 'game-view-yakitori' ? { classList: { contains: () => hidden } }
            : id === 'yakitori-result-overlay' ? { classList: { add: name => { overlayHidden = name === 'hidden'; } } } : null
    };
    const window = { addEventListener: (type, callback) => { handlers[type] = callback; } };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/yakitori-game.js'), 'utf8'), { window, document });
    const game = Object.create(window.YakitoriGame.prototype);
    game.canvas = canvas;
    game.keys = { up: true, down: true };
    game.player = { normalH: 55, h: 30, isDucking: true };
    game.groundY = 360;
    game.initAudio = () => {};
    game.initControls();
    return { game, handlers, canvas, document, setHidden: value => { hidden = value; }, overlayHidden: () => overlayHidden };
}

test('restart clears the result overlay, score, and held duck state', () => {
    const f = fixture();
    f.game.distance = 99;
    f.game.score = 50;
    f.game.resetGame();
    assert.equal(f.game.state, 'playing');
    assert.equal(f.game.distance, 0);
    assert.equal(f.game.score, 0);
    assert.equal(f.game.player.h, 55);
    assert.equal(f.game.player.isDucking, false);
    assert.equal(f.game.keys.down, false);
    assert.equal(f.overlayHidden(), true);
});
test('game keys leave text entry and inactive tabs alone', () => {
    const f = fixture();
    let jumps = 0;
    let prevented = 0;
    f.game.handleJump = () => { jumps++; };
    const event = { code: 'Space', preventDefault: () => { prevented++; } };
    f.document.activeElement = { tagName: 'INPUT' };
    f.handlers.keydown(event);
    f.document.activeElement = f.canvas;
    f.setHidden(true);
    f.handlers.keydown(event);
    assert.equal(jumps, 0);
    assert.equal(prevented, 0);
    f.setHidden(false);
    f.handlers.keydown(event);
    assert.equal(jumps, 1);
    assert.equal(prevented, 1);
    f.handlers.keydown({ ...event, isComposing: true });
    f.handlers.keydown({ ...event, repeat: true });
    assert.equal(jumps, 1);
});
