const { test } = require('node:test');
const assert = require('node:assert/strict');
const { origin, rules, points, project, unproject, CourseTracker } = require('../assets/js/birdman-course.js');

test('course transforms round-trip between map coordinates and the game', () => {
    for (const geo of [origin, { lat: 35.4, lng: 136.1 }, { lat: 35.2, lng: 136.05 }]) {
        const back = unproject(project(geo));
        assert.ok(Math.abs(back.lat - geo.lat) < 1e-10);
        assert.ok(Math.abs(back.lng - geo.lng) < 1e-10);
    }
    const forward = unproject({ x: 0, z: 1000 });
    assert.ok(forward.lng < origin.lng);
    assert.ok(forward.lat > origin.lat);
});
test('launch dimensions and practice course match the stated rules', () => {
    assert.deepEqual(rules, { height: 10, runway: 10, slope: 3.5, fullCourse: 42195 });
    for (const point of [points.north, points.south]) {
        assert.ok(Math.abs(Math.hypot(point.x, point.z) - rules.fullCourse / 4) < 1e-6);
        assert.ok(point.lng < origin.lng);
    }
    assert.ok(points.south.lat < origin.lat);
    assert.ok(points.north.lat > origin.lat);
});
test('returning to the launch point does not lose accumulated distance', () => {
    for (const order of ['south', 'north']) {
        const course = new CourseTracker(order);
        for (const name of course.legs.slice()) {
            course.update(points[name]);
            assert.ok(course.distance > 0);
        }
        assert.equal(course.complete, true);
        assert.equal(course.leg, 4);
        assert.ok(Math.abs(course.distance - rules.fullCourse) < 1e-5);
        course.reset(order);
        assert.equal(course.distance, 0);
        assert.equal(course.target, points[order]);
        assert.equal(course.complete, false);
    }
});
test('waypoints cannot be skipped simply by flying beyond the start', () => {
    const course = new CourseTracker();
    course.update({ x: 0, z: 300 });
    assert.equal(course.leg, 0);
    assert.equal(course.distance, 300);
    assert.ok(course.remaining(course.last) > 9000);
});
