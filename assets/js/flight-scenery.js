(function (root) {
    'use strict';
    const venueLayout = (typeof module !== 'undefined' && module.exports ? require('./contest-venue.js') : root.TBTContestVenue).layout;
    const waves = [
        { x: 0.13, z: 0.08, amplitude: 0.22, speed: 0.85 },
        { x: -0.24, z: 0.31, amplitude: 0.09, speed: 1.35 },
        { x: 0.70, z: 0.46, amplitude: 0.025, speed: 1.90 }
    ];
    const waveScale = wind => 0.45 + Math.min(12, Math.max(0, wind)) * 0.12;
    function waveHeight(x, z, time, wind = 2.4) {
        return waves.reduce((height, wave) => height + Math.sin(x * wave.x + z * wave.z - time * wave.speed) * wave.amplitude, 0) * waveScale(wind);
    }
    function seededRandom(seed = 320) {
        return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    }
    function createWater(scene) {
        const uniforms = { time: { value: 0 }, wind: { value: 2.4 }, sky: { value: new THREE.Color(0xa8ccdc) }, shoreZ: { value: venueLayout.shoreZ } };
        const waveTerms = waves.map(w => 'sin(dot(p,vec2(' + w.x.toFixed(3) + ',' + w.z.toFixed(3) + '))-t*' + w.speed.toFixed(3) + ')*' + w.amplitude.toFixed(3)).join('+');
        const waveGLSL = 'float tbtHeight(vec2 p,float t){return (' + waveTerms + ')*(0.45+min(12.0,tbtWaterWind)*0.12);}\n';
        const material = new THREE.MeshStandardMaterial({ color: 0x246575, roughness: 0.16, metalness: 0.45 });
        material.onBeforeCompile = shader => {
            shader.uniforms.tbtWaterTime = uniforms.time;
            shader.uniforms.tbtWaterWind = uniforms.wind;
            shader.uniforms.tbtWaterSky = uniforms.sky;
            shader.uniforms.tbtShoreZ = uniforms.shoreZ;
            const shared = 'uniform float tbtWaterTime;uniform float tbtWaterWind;varying vec3 vTbtWaterWorld;\n' + waveGLSL;
            shader.vertexShader = shared + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', [
                '#include <begin_vertex>',
                'vec3 tbtBaseWorld=(modelMatrix*vec4(position,1.0)).xyz;',
                'transformed.z+=tbtHeight(tbtBaseWorld.xz,tbtWaterTime);',
                'vTbtWaterWorld=(modelMatrix*vec4(transformed,1.0)).xyz;'
            ].join('\n'));
            shader.fragmentShader = shared + 'uniform vec3 tbtWaterSky;uniform float tbtShoreZ;\n' + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', [
                '#include <normal_fragment_maps>',
                'vec2 wp=vTbtWaterWorld.xz;float wt=tbtWaterTime;',
                'float hx=(tbtHeight(wp+vec2(0.08,0.0),wt)-tbtHeight(wp-vec2(0.08,0.0),wt))/0.16;',
                'float hz=(tbtHeight(wp+vec2(0.0,0.08),wt)-tbtHeight(wp-vec2(0.0,0.08),wt))/0.16;',
                'hx=hx*2.0+cos(wp.x*2.1+wp.y*0.7-wt*2.4)*0.12;',
                'hz=hz*2.0+cos(wp.y*2.8-wp.x*0.5-wt*2.1)*0.09;',
                'vec3 tbtWorldNormal=normalize(vec3(-hx,1.0,-hz));',
                'normal=normalize((viewMatrix*vec4(tbtWorldNormal,0.0)).xyz);'
            ].join('\n'));
            const output = shader.fragmentShader.includes('#include <output_fragment>') ? '#include <output_fragment>' : 'gl_FragColor = vec4( outgoingLight, diffuseColor.a );';
            if (!shader.fragmentShader.includes(output)) throw new Error('Unsupported water shader output');
            shader.fragmentShader = shader.fragmentShader.replace(output, [
                'float fresnel=pow(1.0-max(dot(normal,normalize(vViewPosition)),0.0),3.0);',
                'outgoingLight=mix(outgoingLight,tbtWaterSky,fresnel*0.32);',
                'vec2 irregular=wp+vec2(sin(wp.y*0.033)+cos(wp.x*0.047),sin(wp.x*0.037+wp.y*0.019))*3.0;',
                'float ripple=0.45*sin(irregular.x*1.4+irregular.y*1.9-wt*2.0)+0.3*sin(irregular.x*0.6-irregular.y*0.9+wt*1.1)+0.25*sin(irregular.x*2.3+irregular.y*0.37-wt*2.7);',
                'outgoingLight*=0.90+ripple*0.18;',
                'float sparkle=pow(max(0.0,ripple),12.0);',
                'outgoingLight+=vec3(0.2,0.23,0.22)*sparkle;',
                'float coast=exp(-abs(vTbtWaterWorld.z-tbtShoreZ)*0.22)*step(abs(vTbtWaterWorld.x),700.0);',
                'float foam=smoothstep(0.75,0.98,sin(vTbtWaterWorld.z*0.8-wt*1.3+sin(vTbtWaterWorld.x*0.07)));',
                'outgoingLight=mix(outgoingLight,vec3(0.77,0.87,0.84),coast*foam*0.65);',
                output
            ].join('\n'));
        };
        material.customProgramCacheKey = () => 'tbt-lake-surface-v3';
        const far = new THREE.Mesh(new THREE.PlaneGeometry(24000, 32000, 48, 64), material);
        far.name = 'Biwa-distant-water'; far.rotation.x = -Math.PI / 2; far.position.y = -0.18; scene.add(far);
        const near = new THREE.Mesh(new THREE.PlaneGeometry(1600, 2000, 160, 200), material);
        near.name = 'Biwa-detailed-water'; near.rotation.x = -Math.PI / 2; scene.add(near);
        return { far, near, uniforms, update(time, wind, position, sky) {
            uniforms.time.value = time;
            uniforms.wind.value = wind;
            if (sky) uniforms.sky.value.copy(sky);
            near.position.x = Math.round(position.x / 40) * 40;
            near.position.z = Math.round(position.z / 40) * 40;
        } };
    }
    function makeRescueBoat() {
        const group = new THREE.Group();
        group.name = 'contest-rescue-boat';
        group.userData.rescueBoat = true;
        const white = new THREE.MeshStandardMaterial({ color: 0xdde3df, roughness: 0.65 });
        const blue = new THREE.MeshStandardMaterial({ color: 0x237689, roughness: 0.5 });
        const metal = new THREE.MeshStandardMaterial({ color: 0x849a9f, metalness: 0.6, roughness: 0.3 });
        const shape = new THREE.Shape();
        shape.moveTo(-1.4, -3.6); shape.lineTo(1.4, -3.6); shape.lineTo(1.4, 2.5);
        shape.quadraticCurveTo(0.8, 4.5, 0, 4.8); shape.quadraticCurveTo(-0.8, 4.5, -1.4, 2.5); shape.closePath();
        const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.15, bevelSegments: 2, steps: 1, curveSegments: 10 }), white);
        hull.rotation.x = Math.PI / 2; hull.position.y = 0.6; group.add(hull);
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.6, 2.4), blue); cabin.position.set(0, 1.1, -0.8); group.add(cabin);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.13, 2.7), white); roof.position.set(0, 1.96, -0.8); group.add(roof);
        const glass = new THREE.MeshStandardMaterial({ color: 0x374c55, metalness: 0.45, roughness: 0.1 });
        for (const side of [-1, 1]) {
            const window = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.65, 1.7), glass); window.position.set(side * 0.94, 1.4, -0.8); group.add(window);
            const railing = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 5.2, 5), metal);
            railing.rotation.x = Math.PI / 2; railing.position.set(side * 1.25, 0.9, 0.7); group.add(railing);
            for (const z of [-1.7, 0.3, 2.8]) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 5), metal); post.position.set(side * 1.25, 0.65, z); group.add(post);
            }
        }
        const motor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.6), glass); motor.position.set(0, 0.05, -4.2); group.add(motor);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 6, 12), new THREE.MeshStandardMaterial({ color: 0xc95b42 }));
        ring.position.set(1.48, 1, -1.1); ring.rotation.y = Math.PI / 2; group.add(ring);
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.8, 5), metal); antenna.position.set(0.2, 2.8, -0.8); group.add(antenna);
        const wake = new THREE.Mesh(new THREE.PlaneGeometry(8, 28), new THREE.ShaderMaterial({
            uniforms: { time: { value: 0 } }, transparent: true, depthWrite: false,
            vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
            fragmentShader: 'uniform float time;varying vec2 vUv;void main(){float edge=abs(vUv.x-0.5);float fan=0.08+(1.0-vUv.y)*0.38;float wake=1.0-smoothstep(0.015,0.055,abs(edge-fan));float ripples=0.4+0.6*pow(0.5+0.5*sin(vUv.y*90.0-time*3.0),4.0);gl_FragColor=vec4(0.76,0.91,0.91,wake*ripples*vUv.y*0.55);}'
        }));
        wake.rotation.x = -Math.PI / 2; wake.position.set(0, 0.06, -17); group.add(wake);
        group.userData.wake = wake;
        return group;
    }
    function addLandscape(scene, venue) {
        const random = seededRandom();
        const shoreZ = venueLayout.shoreZ;
        const group = new THREE.Group(); group.name = 'Matsubara-detailed-landscape';
        const asphalt = new THREE.MeshStandardMaterial({ color: 0x737e79, roughness: 1 });
        const road = new THREE.Mesh(new THREE.PlaneGeometry(1700, 11), asphalt); road.rotation.x = -Math.PI / 2; road.position.set(0, 0.86, shoreZ - 146); group.add(road);
        const paint = new THREE.MeshBasicMaterial({ color: 0xdce0d3 });
        for (let x = -800; x < 800; x += 18) {
            const stripe = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.16), paint); stripe.rotation.x = -Math.PI / 2; stripe.position.set(x, 0.89, shoreZ - 146); group.add(stripe);
        }
        const walls = [0xaaa995,0xaebac0,0xc1bdac,0x91a298].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1 }));
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x606f70, roughness: 0.85 });
        const glass = new THREE.MeshStandardMaterial({ color: 0x56717c, roughness: 0.35, metalness: 0.25 });
        const windowMatrices = [];
        const windowDummy = new THREE.Object3D();
        for (let i = 0; i < 36; i++) {
            const house = new THREE.Group();
            const width = 10 + random() * 10, depth = 9 + random() * 10, height = 4 + Math.floor(random() * 4) * 3;
            const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), walls[i % walls.length]); body.position.y = height / 2; house.add(body);
            const roof = new THREE.Mesh(new THREE.ConeGeometry(width * 0.78, 2.5, 4), roofMat); roof.rotation.y = Math.PI / 4; roof.scale.z = depth / width; roof.position.y = height + 1.25; house.add(roof);
            house.position.set(-430 + (i % 18) * 50 + random() * 12, 0.8, shoreZ - 190 - Math.floor(i / 18) * 75);
            for (let floor = 0; floor < height / 3; floor++) for (let column = 0; column < 3; column++) {
                windowDummy.position.set(house.position.x + (column - 1) * width / 4, house.position.y + 1.8 + floor * 3, house.position.z + depth / 2 + 0.02);
                windowDummy.updateMatrix(); windowMatrices.push(windowDummy.matrix.clone());
            }
            group.add(house);
        }
        const windows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.7, 1.4), glass, windowMatrices.length);
        windowMatrices.forEach((matrix, index) => windows.setMatrixAt(index, matrix));
        group.add(windows);
        const treeCount = 220, dummy = new THREE.Object3D();
        const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.22, 5, 6), new THREE.MeshStandardMaterial({ color: 0x77715c }), treeCount);
        const crowns = new THREE.InstancedMesh(new THREE.SphereGeometry(2.4, 9, 6), new THREE.MeshStandardMaterial({ color: 0x477b58, roughness: 1 }), treeCount);
        for (let i = 0; i < treeCount; i++) {
            const x = (random() - 0.5) * 1600;
            let z = shoreZ - 70 - random() * 650;
            if (Math.abs(z - (shoreZ - 146)) < 12) z -= 25;
            const scale = 0.65 + random() * 0.9;
            dummy.position.set(x, 0.8 + 2.5 * scale, z); dummy.scale.set(scale, scale, scale); dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
            dummy.position.y = 0.8 + 5.2 * scale; dummy.scale.set(scale * 1.1, scale * 0.7, scale); dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix);
        }
        group.add(trunks, crowns);

        const boats = [];
        venue.traverse(object => { if (object.userData.rescueBoat) { object.userData.anchor = object.position.clone(); boats.push(object); } });
        scene.add(group);
        return { group, boats, update(time, wind) {
            boats.forEach((boat, index) => {
                const anchor = boat.userData.anchor;
                boat.position.set(anchor.x + Math.sin(time * 0.04 + index) * 8, 0.25 + waveHeight(anchor.x, anchor.z, time, wind), anchor.z + Math.sin(time * 0.035 + index * 2) * 12);
                boat.rotation.z = Math.sin(time * 0.8 + index) * 0.035;
                boat.rotation.x = Math.cos(time * 0.7 + index) * 0.025;
                boat.userData.wake.material.uniforms.time.value = time;
            });
        } };
    }
    function createMountains(scene) {
        const group = new THREE.Group(); group.name = 'Biwa-layered-ridges';
        const random = seededRandom(1214);
        for (let layer = 0; layer < 3; layer++) for (const side of [-1, 1]) {
            const geometry = new THREE.PlaneGeometry(3500, 26000, 32, 144);
            geometry.rotateX(-Math.PI / 2);
            const pos = geometry.attributes.position, colors = new Float32Array(pos.count * 3);
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i), z = pos.getZ(i);
                const envelope = Math.max(0, 1 - Math.pow(x / 1750, 2));
                const ridge = 430 + layer * 190 + Math.sin(z * 0.0015 + side) * 210 + Math.sin(z * 0.0042 + layer) * 105 + random() * 65;
                const height = Math.max(0, ridge * envelope);
                pos.setY(i, height);
                const color = new THREE.Color().setHSL(0.36, 0.16 + envelope * 0.1, 0.24 + layer * 0.055 + height / 14000);
                color.toArray(colors, i * 3);
            }
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
            const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true }));
            mesh.position.set(side * (5400 + layer * 2000), -5, 7500); group.add(mesh);
        }
        scene.add(group);
        return group;
    }
    const api = { waves, waveHeight, waveScale, seededRandom, createWater, makeRescueBoat, addLandscape, createMountains };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TBTScenery = api;
})(typeof window === 'undefined' ? globalThis : window);
