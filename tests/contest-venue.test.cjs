const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { layout, runwayHeight, approachHeight, seatPositions } = require('../assets/js/contest-venue.js');

test('published launch dimensions are preserved and staging deck stays level', () => {
    assert.equal(layout.height, 10);
    assert.equal(layout.runway, 10);
    assert.equal(layout.slope, 3.5);
    assert.equal(runwayHeight(0), 10);
    assert.ok(Math.abs(runwayHeight(-10) - (10 + 10 * Math.tan(3.5 * Math.PI / 180))) < 1e-10);
    assert.equal(runwayHeight(layout.rearZ), runwayHeight(-10));
    assert.equal(runwayHeight(10), 10);
});
test('low pier and inclined access meet the staging deck without a height discontinuity', () => {
    assert.equal(approachHeight(layout.shoreZ), layout.pierHeight);
    assert.equal(approachHeight(layout.rampFootZ), layout.pierHeight);
    assert.equal(approachHeight(layout.rearZ), runwayHeight(layout.rearZ));
    let previous = layout.pierHeight;
    for (let z = layout.shoreZ; z <= layout.rearZ; z += 0.25) {
        const height = approachHeight(z);
        assert.ok(height >= previous);
        assert.ok(height - previous < 0.06);
        previous = height;
    }
});
test('300 stepped seats are ashore, unique, and retain two unobstructed aisles', () => {
    const seats = seatPositions();
    assert.equal(seats.length, 300);
    assert.equal(new Set(seats.map(s => `${s.x},${s.z}`)).size, 300);
    assert.ok(seats.every(s => s.z < layout.shoreZ - 10));
    assert.equal(seats.filter(s => s.supporter).length, 70);
    for (let row = 0; row < 10; row++) {
        const section = seats.slice(row * 30, row * 30 + 30);
        assert.ok(section[10].x - section[9].x > 1.8);
        assert.ok(section[20].x - section[19].x > 1.8);
        assert.equal(section[0].y, 1.2 + row * 0.36);
    }
});
test('venue module is loaded before dependent scenery and flight scripts', () => {
    const html = fs.readFileSync(path.join(__dirname, '../index.php'), 'utf8');
    assert.ok(html.indexOf('assets/js/contest-venue.js') < html.indexOf('assets/js/flight-scenery.js'));
    assert.ok(html.indexOf('assets/js/flight-scenery.js') < html.indexOf('assets/js/game.js'));
    for (const camera of ['platform', 'venue', 'stands']) assert.match(html, new RegExp(`option value="${camera}"`));
});
