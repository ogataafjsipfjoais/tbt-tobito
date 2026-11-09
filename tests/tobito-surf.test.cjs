const { test } = require('node:test');
const assert = require('node:assert/strict');
const { settings, advance } = require('../assets/js/tobito-surf-core.js');

test('surf settings reject unsupported poses and clamp controls', () => {
    assert.deepEqual(settings({ count: 99, size: -1, speed: 0, mode: 'invalid', skin: '../../file' }),
        { count: 8, size: 40, speed: 0.5, mode: 'follow', skin: 'mix' });
    assert.deepEqual(settings(), { count: 3, size: 80, speed: 1, mode: 'follow', skin: 'mix' });
});
test('surf follows the pointer at the same speed at 30 and 60 FPS', () => {
    const atFPS = fps => {
        const agent = { x: 0, y: 0, facing: 1 };
        for (let i = 0; i < fps; i++) advance(agent, { x: 200, y: 100 }, 1 / fps, 1);
        return agent;
    };
    assert.ok(Math.abs(atFPS(30).x - atFPS(60).x) < 1e-9);
    const left = advance({ x: 200, y: 0, facing: 1 }, { x: 100, y: 30 }, 1 / 60, 1);
    assert.equal(left.facing, -1);
    assert.ok(left.x > 100 && left.x < 200);
});
