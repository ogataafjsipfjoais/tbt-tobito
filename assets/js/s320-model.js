(function () {
    'use strict';

    const parts = ['body', 'propeller', 'elevator', 'rudder'];
    const calibration = {
        propeller: { mount: [-0.008, 2.912, 5.799], pivot: [-0.031, 2.9205, 5.799] },
        elevator: { mount: [0.060, 3.281, -9.489], pivot: [0.060, 3.281, -9.489] },
        rudder: { mount: [-0.219, 2.910, -11.854], pivot: [-0.219, 2.910, -11.854] }
    };
    let pending;
    const flexGeometries = new Map();

    function loadParts() {
        if (!pending) {
            pending = (async () => {
                if (!window.THREE?.GLTFLoader || !window.THREE?.DRACOLoader) {
                    throw new Error('S-320 loader unavailable');
                }
                const decoder = new THREE.DRACOLoader();
                decoder.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                const loader = new THREE.GLTFLoader().setDRACOLoader(decoder);
                const base = new URL('../models/', document.querySelector('script[src*="/s320-model.js"]').src);
                try {
                    // Wait for all parts before disposing the shared decoder, including failures.
                    const results = await Promise.allSettled(parts.map(name => loader.loadAsync(new URL(`${name}.glb`, base).href)));
                    const failure = results.find(result => result.status === 'rejected');
                    if (failure) throw failure.reason;
                    return results.map(result => {
                        result.value.scene.traverse(child => { child.userData.s320Source = child.uuid; });
                        return result.value.scene;
                    });
                } finally {
                    decoder.dispose();
                }
            })().catch(error => { pending = null; throw error; });
        }
        return pending;
    }

    function addWingFlex(assembly, halfSpan, scale, span, centerX) {
        const uniform = { value: 0 };
        const materials = new Map();
        let target = 0;
        let current = 0;
        let meshCount = 0;
        assembly.updateMatrixWorld(true);
        const position = new THREE.Vector3();
        const hook = shader => {
            shader.uniforms.tbtWingFlex = uniform;
            shader.vertexShader = 'attribute float tbtWingWeight; attribute vec3 tbtFlexAxis; attribute vec3 tbtFlexGradient; uniform float tbtWingFlex;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += tbtFlexAxis * tbtWingWeight * tbtWingFlex;');
            shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal -= tbtFlexGradient * dot(tbtFlexAxis, objectNormal) * tbtWingFlex;');
        };
        assembly.traverse(mesh => {
            if (!mesh.isMesh) return;
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
            // Wing skins, spars and fittings have inconsistent export names. Use one
            // spatial field for every outboard body vertex, leaving the root rigid.
            if (Math.max(Math.abs(bounds.min.x - centerX), Math.abs(bounds.max.x - centerX)) <= halfSpan * 0.12) return;
            const id = mesh.userData.s320Source;
            if (!flexGeometries.has(id)) {
                // Reuse immutable positions/normals; only bending attributes are new.
                const geometry = new THREE.BufferGeometry();
                geometry.setIndex(mesh.geometry.index);
                Object.entries(mesh.geometry.attributes).forEach(([name, attribute]) => geometry.setAttribute(name, attribute));
                mesh.geometry.groups.forEach(group => geometry.addGroup(group.start, group.count, group.materialIndex));
                const positions = geometry.attributes.position;
                const weights = new Float32Array(positions.count);
                const axes = new Float32Array(positions.count * 3);
                const gradients = new Float32Array(positions.count * 3);
                const inverse = mesh.matrixWorld.clone().invert();
                const axis = new THREE.Vector3(0, 1, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(inverse));
                const transpose = new THREE.Matrix3().setFromMatrix4(mesh.matrixWorld).transpose();
                const gradient = new THREE.Vector3();
                for (let i = 0; i < positions.count; i++) {
                    position.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld);
                    const offset = position.x - centerX;
                    const extent = Math.max(0, (Math.abs(offset) / halfSpan - 0.12) / 0.88);
                    weights[i] = Math.pow(Math.min(1, extent), 2.2);
                    axis.toArray(axes, i * 3);
                    const derivative = extent > 0 && extent < 1 ? Math.sign(offset) * 2.2 * Math.pow(extent, 1.2) / (halfSpan * 0.88) : 0;
                    gradient.set(derivative, 0, 0).applyMatrix3(transpose).toArray(gradients, i * 3);
                }
                geometry.setAttribute('tbtWingWeight', new THREE.BufferAttribute(weights, 1));
                geometry.setAttribute('tbtFlexAxis', new THREE.BufferAttribute(axes, 3));
                geometry.setAttribute('tbtFlexGradient', new THREE.BufferAttribute(gradients, 3));
                geometry.boundingBox = mesh.geometry.boundingBox?.clone() || null;
                geometry.boundingSphere = mesh.geometry.boundingSphere?.clone() || null;
                flexGeometries.set(id, geometry);
            }
            mesh.geometry = flexGeometries.get(id);
            const prepare = material => {
                if (!materials.has(material.uuid)) {
                    const copy = material.clone();
                    copy.onBeforeCompile = hook;
                    copy.customProgramCacheKey = () => 'tbt-s320-wing-flex-v2';
                    materials.set(material.uuid, copy);
                }
                return materials.get(material.uuid);
            };
            mesh.material = Array.isArray(mesh.material) ? mesh.material.map(prepare) : prepare(mesh.material);
            mesh.frustumCulled = false;
            meshCount++;
        });
        return {
            meshCount,
            setLoad(value) { target = Math.max(-0.3, Math.min(1.6, Number(value) || 0)); },
            update(delta = 0.016, immediate = false) {
                current += (target - current) * (immediate ? 1 : 1 - Math.exp(-Math.max(0, delta) * 9));
                uniform.value = current * span * 0.025 / scale;
                return current;
            },
            get load() { return current; }
        };
    }

    async function create({ span = 40, groundY = null } = {}) {
        const templates = await loadParts();
        const root = new THREE.Group();
        root.name = 'S-320';
        const assembly = new THREE.Group();
        root.add(assembly);
        const joints = {};
        templates.forEach((template, index) => {
            const name = parts[index];
            const model = template.clone(true);
            model.name = `S-320-${name}`;
            model.traverse(child => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
            });
            if (name === 'body') assembly.add(model);
            else {
                const joint = new THREE.Group();
                joint.name = `S-320-${name}-pivot`;
                joint.position.fromArray(calibration[name].mount);
                model.position.sub(new THREE.Vector3().fromArray(calibration[name].pivot));
                joint.add(model);
                assembly.add(joint);
                joints[name] = joint;
            }
        });
        const bounds = new THREE.Box3().setFromObject(assembly);
        const size = bounds.getSize(new THREE.Vector3());
        if (!Number.isFinite(size.x) || size.x <= 0) throw new Error('Empty S-320 geometry');
        const scale = span / size.x;
        const center = bounds.getCenter(new THREE.Vector3());
        const flex = addWingFlex(assembly.getObjectByName('S-320-body'), size.x / 2, scale, span, center.x);
        assembly.scale.setScalar(scale);
        assembly.position.copy(center).multiplyScalar(-scale);
        if (groundY !== null) assembly.position.y = groundY - bounds.min.y * scale;
        root.userData.aircraft = 'S-320';
        root.userData.wingFlex = true;
        return { root, flex, ...joints };
    }

    function status(container, state, retry) {
        let label = container.querySelector(':scope > .s320-status');
        if (state === 'ready') { label?.remove(); return; }
        if (!label) {
            label = document.createElement('div');
            label.className = 's320-status';
            label.setAttribute('role', 'status');
            container.appendChild(label);
        }
        label.replaceChildren(document.createTextNode(state === 'loading' ? 'S-320を読み込み中…' : 'S-320を読み込めませんでした。'));
        if (state === 'error' && retry) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = '再試行';
            button.addEventListener('click', event => { event.stopPropagation(); retry(); });
            label.appendChild(button);
        }
    }

    function windLoad(speed, now = 0, reducedMotion = false) {
        const velocity = Math.max(0, Number(speed) || 0);
        const gust = reducedMotion ? 1 : 1 + Math.sin(now * 0.0014) * 0.06 + Math.sin(now * 0.0031) * 0.025;
        return Math.min(1.6, 0.32 * Math.pow(velocity / 8, 2) * gust);
    }
    window.TBTS320 = { create, status, windLoad };
})();
