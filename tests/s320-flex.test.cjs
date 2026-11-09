const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Affine fixtures exercise separate export scales without a WebGL dependency.
class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.set(x, y, z); }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    fromBufferAttribute(a, i) { return this.set(a.array[i * 3], a.array[i * 3 + 1], a.array[i * 3 + 2]); }
    applyMatrix3(m) { return this.set(this.x * m.scale[0], this.y * m.scale[1], this.z * m.scale[2]); }
    applyMatrix4(m) { this.applyMatrix3(m); return this.set(this.x + m.offset[0], this.y + m.offset[1], this.z + m.offset[2]); }
    toArray(out, offset = 0) { out[offset] = this.x; out[offset + 1] = this.y; out[offset + 2] = this.z; return out; }
}
class Matrix4 {
    constructor(scale = [1, 1, 1], offset = [0, 0, 0]) { this.scale = scale; this.offset = offset; }
    clone() { return new Matrix4([...this.scale], [...this.offset]); }
    invert() { this.offset = this.offset.map((v, i) => -v / this.scale[i]); this.scale = this.scale.map(v => 1 / v); return this; }
}
class Matrix3 {
    setFromMatrix4(m) { this.scale = [...m.scale]; return this; }
    transpose() { return this; }
}
class BufferAttribute { constructor(array, itemSize) { this.array = array; this.itemSize = itemSize; this.count = array.length / itemSize; } }
class BufferGeometry {
    constructor() { this.attributes = {}; this.groups = []; }
    setIndex(index) { this.index = index; }
    setAttribute(name, attribute) { this.attributes[name] = attribute; }
    addGroup(start, count, materialIndex) { this.groups.push({ start, count, materialIndex }); }
}
function bounds(min, max) {
    return { min: new Vector3(...min), max: new Vector3(...max), clone() { return bounds(this.min.toArray([]), this.max.toArray([])); },
        applyMatrix4(m) { this.min.applyMatrix4(m); this.max.applyMatrix4(m); return this; } };
}
function mesh(name, source, values, matrix = new Matrix4()) {
    const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(new Float32Array(values), 3));
    const xs = values.filter((_, i) => i % 3 === 0);
    geometry.boundingBox = bounds([Math.min(...xs), 0, 0], [Math.max(...xs), 0, 0]);
    return { name, isMesh: true, geometry, matrixWorld: matrix, userData: { s320Source: source }, material: { uuid: source + '-material', clone() { return {}; } } };
}
function fixture() {
    const context = { window: {}, THREE: { Vector3, Matrix3, BufferGeometry, BufferAttribute } };
    const source = fs.readFileSync(require.resolve('../assets/js/s320-model.js'), 'utf8');
    vm.runInNewContext(source.replace('window.TBTS320 = { create, status, windLoad };', 'window.TBTS320 = { create, status, windLoad, addWingFlex };'), context);
    return context.window.TBTS320;
}
function assembly(meshes) { return { updateMatrixWorld() {}, traverse(fn) { meshes.forEach(fn); } }; }
function displacedWorld(mesh, i, uniform) {
    const p = new Vector3().fromBufferAttribute(mesh.geometry.attributes.position, i);
    const a = new Vector3().fromBufferAttribute(mesh.geometry.attributes.tbtFlexAxis, i);
    const weight = mesh.geometry.attributes.tbtWingWeight.array[i] * uniform;
    p.set(p.x + a.x * weight, p.y + a.y * weight, p.z + a.z * weight);
    return p.applyMatrix4(mesh.matrixWorld).toArray([]);
}

test('unnamed full-wing skins and structural exports share the same flex field', () => {
    const api = fixture();
    const skin = mesh('Plane.034', 'skin', [10, 2, 0, 20, 2, 0]);
    const spar = mesh('S4', 'spar', [5, 4, 0, 10, 4, 0], new Matrix4([2, 0.5, 1]));
    const fittings = mesh('NurbsPath.042', 'fitting', [10, 2, 0, 20, 2, 0]);
    const root = mesh('Cylinder', 'root', [0, 0, 0, 1, 0, 0]);
    const original = [...skin.geometry.attributes.position.array];
    const flex = api.addWingFlex(assembly([skin, spar, fittings, root]), 20, 0.5, 40, 0);
    assert.equal(flex.meshCount, 3);
    assert.equal(root.geometry.attributes.tbtWingWeight, undefined);
    assert.deepEqual([...skin.geometry.attributes.position.array], original);
    const shader = { uniforms: {}, vertexShader: '#include <beginnormal_vertex>\n#include <begin_vertex>' };
    skin.material.onBeforeCompile(shader);
    for (const load of [-0.3, 0, 0.5, 1.6]) {
        flex.setLoad(load); flex.update(0.016, true);
        for (let i = 0; i < 2; i++) {
            assert.deepEqual(displacedWorld(skin, i, shader.uniforms.tbtWingFlex.value), displacedWorld(spar, i, shader.uniforms.tbtWingFlex.value));
            assert.deepEqual(displacedWorld(skin, i, shader.uniforms.tbtWingFlex.value), displacedWorld(fittings, i, shader.uniforms.tbtWingFlex.value));
        }
    }
    assert.match(shader.vertexShader, /objectNormal -= tbtFlexGradient/);
    assert.match(shader.vertexShader, /transformed \+= tbtFlexAxis/);
});
test('left/right wing bending is symmetric and the rigid center is unchanged', () => {
    const api = fixture(), wing = mesh('Plane', 'symmetric', [-20, 0, 0, -10, 0, 0, 0, 0, 0, 10, 0, 0, 20, 0, 0]);
    api.addWingFlex(assembly([wing]), 20, 1, 40, 0);
    const weights = wing.geometry.attributes.tbtWingWeight.array;
    assert.equal(weights[0], weights[4]); assert.equal(weights[1], weights[3]); assert.equal(weights[2], 0);
    const gradient = wing.geometry.attributes.tbtFlexGradient.array;
    assert.ok(gradient[3] < 0); assert.ok(gradient[9] > 0); assert.equal(gradient[6], 0);
    const epsilon = 0.001, field = x => Math.pow((x / 20 - 0.12) / 0.88, 2.2);
    assert.ok(Math.abs(gradient[9] - (field(10 + epsilon) - field(10 - epsilon)) / (2 * epsilon)) < 1e-6);
});
test('cached immutable geometry does not share flex load between model instances', () => {
    const api = fixture(), one = mesh('Plane', 'shared', [10, 0, 0, 20, 0, 0]), two = mesh('Plane', 'shared', [10, 0, 0, 20, 0, 0]);
    const flexOne = api.addWingFlex(assembly([one]), 20, 1, 40, 0), flexTwo = api.addWingFlex(assembly([two]), 20, 1, 40, 0);
    assert.equal(one.geometry, two.geometry);
    const shaderOne = { uniforms: {}, vertexShader: '' }, shaderTwo = { uniforms: {}, vertexShader: '' };
    one.material.onBeforeCompile(shaderOne); two.material.onBeforeCompile(shaderTwo);
    flexOne.setLoad(1.6); flexOne.update(0.016, true);
    assert.equal(shaderOne.uniforms.tbtWingFlex.value, 1.6);
    assert.equal(shaderTwo.uniforms.tbtWingFlex.value, 0);
    flexTwo.setLoad(0.5); flexTwo.update(0.016, true);
    assert.equal(shaderOne.uniforms.tbtWingFlex.value, 1.6);
});
