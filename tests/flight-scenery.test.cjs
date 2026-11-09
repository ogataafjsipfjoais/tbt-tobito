const { test } = require('node:test');
const assert = require('node:assert/strict');
const { waveHeight, waveScale, waves, seededRandom, createWater } = require('../assets/js/flight-scenery.js');

test('water waves move continuously and remain within their specified envelope', () => {
    const envelope = waves.reduce((sum, wave) => sum + wave.amplitude, 0);
    for (const wind of [0, 1.5, 3, 12, 25]) {
        for (const x of [-1200, 0, 25, 750]) for (const t of [0, 0.1, 12, 45]) {
            const value = waveHeight(x, 20, t, wind);
            assert.ok(Number.isFinite(value));
            assert.ok(Math.abs(value) <= envelope * waveScale(wind));
            assert.ok(Math.abs(waveHeight(x, 20, t + 0.001, wind) - value) < 0.001);
        }
    }
    assert.notEqual(waveHeight(25, 30, 0), waveHeight(25, 30, 1));
});
test('wind increases wave height without unbounded storm amplitudes', () => {
    assert.ok(waveScale(3) > waveScale(1.5));
    assert.equal(waveScale(12), waveScale(100));
    assert.equal(waveScale(-10), waveScale(0));
});
test('scenery placement remains deterministic between loads', () => {
    const a = seededRandom(320), b = seededRandom(320), c = seededRandom(321);
    const values = Array.from({ length: 100 }, a);
    assert.deepEqual(values, Array.from({ length: 100 }, b));
    assert.notDeepEqual(values, Array.from({ length: 100 }, c));
    assert.ok(values.every(value => value >= 0 && value < 1));
});
test('water output hooks work with the existing Three.js r128 shader', () => {
    const previous = global.THREE;
    global.THREE = {
        Color: class { copy() {} },
        MeshStandardMaterial: class { constructor(options) { Object.assign(this, options); } },
        PlaneGeometry: class {},
        Mesh: class { constructor(geometry, material) { this.material = material; this.rotation = {}; this.position = {}; } }
    };
    try {
        const water = createWater({ add() {} });
        const shader = {
            uniforms: {}, vertexShader: '#include <begin_vertex>',
            fragmentShader: '#include <normal_fragment_maps>\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );'
        };
        water.far.material.onBeforeCompile(shader);
        assert.match(shader.vertexShader, /transformed.z\+=tbtHeight/);
        assert.match(shader.fragmentShader, /float foam=/);
        assert.match(shader.fragmentShader, /float fresnel=/);
        assert.match(shader.fragmentShader, /float sparkle=/);
        assert.match(shader.fragmentShader, /gl_FragColor = vec4/);
        assert.equal(shader.uniforms.tbtWaterTime, water.uniforms.time);
    } finally { global.THREE = previous; }
});
