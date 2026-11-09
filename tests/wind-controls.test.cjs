const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = {
    window: {}, document: { readyState: 'loading', addEventListener() {}, getElementById() { return null; } },
    matchMedia: () => ({ matches: false })
};
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/s320-model.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/wind-tunnel.js'), 'utf8'), context);
const methods = context.window.WindTunnelSimulator.prototype;

test('wind particles scale immediately with speed and clamp to a readable range', () => {
    const tunnel = { container: { dataset: {} }, particleSystem: { material: {} } };
    const sizes = [-10, 5, 10, 15, 25, 90].map(speed => {
        tunnel.windSpeed = speed;
        methods.updateParticleAppearance.call(tunnel);
        return tunnel.particleSystem.material.size;
    });
    assert.deepEqual(sizes, [3.5, 3.5, 4.875, 6.25, 9, 9]);
    assert.equal(tunnel.container.dataset.particleSize, '9.00');
});
test('wing flex follows wind speed automatically without manual settings', () => {
    let target = 0;
    const tunnel = {
        windSpeed: 8, container: { dataset: {} },
        wingFlex: { load: 0, setLoad(value) { target = value; this.load = value; }, update() {} }
    };
    const values = [0, 5, 8, 15, 25].map(speed => {
        tunnel.windSpeed = speed;
        methods.updateWingFlex.call(tunnel, 0, 1000, true);
        return target;
    });
    assert.equal(values[0], 0);
    values.slice(1).forEach((value, i) => assert.ok(value > values[i]));
    assert.equal(values[4], 1.6);
    assert.equal(tunnel.container.dataset.wingFlex, '1.600');
});
