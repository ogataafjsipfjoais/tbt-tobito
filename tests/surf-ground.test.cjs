const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stepGround } = require('../assets/js/tobito-surf-core.js');
const bounds = { width: 800, height: 600, size: 64, speed: 1 };
const floor = 534;

test('cursor above the character triggers a ballistic jump and a landing', () => {
    const agent = { x: 350, y: floor, facing: 1 };
    stepGround(agent, { x: 380, y: 160 }, 1 / 60, bounds, 0);
    assert.equal(agent.grounded, false);
    assert.ok(agent.vy < 0 && agent.y < floor);
    let apex = agent.y;
    for (let i = 1; i < 90; i++) {
        stepGround(agent, { x: 380, y: 160 }, 1 / 60, bounds, i * 1000 / 60, 0, false);
        apex = Math.min(apex, agent.y);
        assert.ok(agent.y <= floor);
    }
    assert.ok(apex < floor - 250);
    assert.equal(agent.grounded, true);
    assert.equal(agent.y, floor);
    assert.equal(agent.vy, 0);
});
test('ground running follows the cursor and respects screen edges', () => {
    const agent = { x: 50, y: floor, facing: 1 };
    for (let i = 0; i < 180; i++) stepGround(agent, { x: 1000, y: floor }, 1 / 60, bounds, i * 1000 / 60);
    assert.ok(agent.x > 650 && agent.x <= 736);
    assert.equal(agent.y, floor);
    stepGround(agent, { x: -100, y: floor }, 0.05, bounds, 4000);
    for (let i = 0; i < 100; i++) stepGround(agent, { x: -100, y: floor }, 0.05, bounds, 4000 + i * 50);
    assert.equal(agent.x, 0);
    assert.equal(agent.facing, -1);
});
test('jump height and horizontal pursuit agree at 30 and 60 FPS', () => {
    const simulate = fps => {
        const agent = { x: 300, y: floor, facing: 1 };
        for (let i = 0; i < fps / 2; i++) stepGround(agent, { x: 350, y: 220 }, 1 / fps, bounds, i * 1000 / fps);
        return agent;
    };
    const a = simulate(30), b = simulate(60);
    assert.ok(Math.abs(a.x - b.x) < 0.1);
    assert.ok(Math.abs(a.y - b.y) < 0.1);
});
test('a low cursor does not make characters hover or continually jump', () => {
    const agent = { x: 200, y: floor, facing: 1 };
    for (let i = 0; i < 120; i++) stepGround(agent, { x: 240, y: floor }, 1 / 60, bounds, i * 1000 / 60);
    assert.equal(agent.grounded, true);
    assert.equal(agent.y, floor);
});
