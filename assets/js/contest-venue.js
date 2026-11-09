(function (root) {
    'use strict';
    // Only height, runway length/slope and public capacity are published dimensions.
    const layout = Object.freeze({ height: 10, runway: 10, slope: 3.5, shoreZ: -160,
        rearZ: -18, rampFootZ: -60, pierWidth: 3, pierHeight: 1.1,
        standX: -40, standZ: -181, rows: 10, columns: 30, publicSeats: 300 });
    const tangent = Math.tan(layout.slope * Math.PI / 180);
    function runwayHeight(z) { return layout.height - Math.max(-layout.runway, Math.min(0, z)) * tangent; }
    function approachHeight(z) {
        const t = Math.max(0, Math.min(1, (z - layout.rampFootZ) / (layout.rearZ - layout.rampFootZ)));
        return layout.pierHeight + t * (runwayHeight(layout.rearZ) - layout.pierHeight);
    }
    function seatPositions() {
        return Array.from({ length: layout.publicSeats }, (_, i) => {
            const row = Math.floor(i / layout.columns), column = i % layout.columns;
            return { x: layout.standX + (column - 14.5) * 0.64 + (Math.floor(column / 10) - 1) * 1.2,
                y: 1.2 + row * 0.36, z: layout.standZ - row * 0.95, supporter: i < 70 };
        });
    }
    function createBuilder() {
        const group = new THREE.Group(), rods = [], boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const steel = new THREE.MeshStandardMaterial({ color: 0xa9b5b7, metalness: 0.65, roughness: 0.48 });
        const white = new THREE.MeshStandardMaterial({ color: 0xe9efec, roughness: 0.85 });
        const blue = new THREE.MeshStandardMaterial({ color: 0x1676a5, roughness: 0.85 });
        function box(x, y, z, w, h, d, material = steel) {
            const mesh = new THREE.Mesh(boxGeometry, material); mesh.position.set(x, y, z); mesh.scale.set(w, h, d); group.add(mesh); return mesh;
        }
        function rod(a, b, radius = 0.045) { rods.push({ a, b, radius }); }
        function finish() {
            const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), steel, rods.length);
            const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0);
            rods.forEach(({ a, b, radius }, i) => {
                const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
                dummy.position.copy(start).add(end).multiplyScalar(0.5);
                dummy.quaternion.setFromUnitVectors(up, delta.clone().normalize());
                dummy.scale.set(radius, delta.length(), radius); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
            });
            mesh.name = 'Galvanized-scaffold-and-railings'; group.add(mesh); return group;
        }
        function sign(text, subtitle, x, y, z, w, h, background = '#f0f4f2', ink = '#22333a', round = false) {
            const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = round ? 1024 : 256;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = background;
            if (round) { ctx.beginPath(); ctx.arc(512, 512, 502, 0, Math.PI * 2); ctx.fill(); }
            else ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.font = 'bold ' + (round ? 96 : 66) + 'px sans-serif';
            ctx.fillText(text, 512, round ? 485 : 108, 950);
            ctx.font = (round ? 70 : 38) + 'px sans-serif'; ctx.fillText(subtitle, 512, round ? 610 : 190, 950);
            const texture = new THREE.CanvasTexture(canvas);
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: texture, transparent: round, side: THREE.DoubleSide }));
            mesh.position.set(x, y, z); group.add(mesh); return mesh;
        }
        return { group, steel, white, blue, box, rod, sign, finish };
    }
    function createPlatform(scene) {
        const b = createBuilder(); b.group.name = 'Matsubara-scaffold-launch-platform';
        const shape = new THREE.Shape();
        shape.moveTo(-7, 18); shape.lineTo(7, 18); shape.lineTo(7, 10);
        shape.lineTo(9, 3); shape.quadraticCurveTo(9, 0, 0, 0); shape.quadraticCurveTo(-9, 0, -9, 3); shape.lineTo(-7, 10); shape.closePath();
        const deck = new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: false, curveSegments: 24 });
        deck.rotateX(-Math.PI / 2);
        const positions = deck.attributes.position;
        for (let i = 0; i < positions.count; i++) positions.setY(i, runwayHeight(positions.getZ(i)) + positions.getY(i) - 0.32);
        deck.computeVertexNormals();
        const top = new THREE.Mesh(deck, b.blue); top.name = 'Blue-fan-deck-10m-runway'; b.group.add(top);
        const xs = [-6, -3, 0, 3, 6], zs = [-17, -14, -11, -8, -5, -2];
        for (const x of xs) for (const z of zs) b.rod([x, -0.5, z], [x, runwayHeight(z) - 0.32, z], 0.065);
        for (let y = 1; y <= 9; y += 2) {
            for (const z of zs) for (let i = 0; i < xs.length - 1; i++) {
                const x = xs[i]; b.rod([x, y, z], [x + 3, y, z]);
                if (z === zs[0] || z === zs[zs.length - 1]) {
                    b.rod([x, y, z], [x + 3, y + 2, z], 0.035); b.rod([x + 3, y, z], [x, y + 2, z], 0.035);
                }
            }
            for (const x of xs) for (let i = 0; i < zs.length - 1; i++) {
                const z = zs[i]; b.rod([x, y, z], [x, y, z + 3]);
                if (Math.abs(x) === 6) { b.rod([x, y, z], [x, y + 2, z + 3], 0.035); b.rod([x, y + 2, z], [x, y, z + 3], 0.035); }
            }
        }
        for (const side of [-1, 1]) {
            for (const z of [-14, -8, -2]) b.rod([side * 6, 3, z - 1], [side * 8, runwayHeight(z) - 0.35, z], 0.07);
        }
        // Join a low lake pier to the staging deck with a supported inclined ramp.
        const endpoints = [layout.shoreZ - 4, layout.rampFootZ, layout.rearZ];
        for (let i = 0; i < 2; i++) {
            const z0 = endpoints[i], z1 = endpoints[i + 1], y0 = approachHeight(z0), y1 = approachHeight(z1);
            const length = Math.hypot(z1 - z0, y1 - y0);
            const mesh = b.box(0, (y0 + y1) / 2 - 0.12, (z0 + z1) / 2, layout.pierWidth, 0.24, length, b.white);
            mesh.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
            for (const x of [-1.45, 1.45]) {
                for (let z = z0; z < z1; z += 3) {
                    const end = Math.min(z + 3, z1), y = approachHeight(z), nextY = approachHeight(end);
                    b.rod([x, -0.4, z], [x, y + 1.1, z], 0.055);
                    b.rod([x, y + 1.1, z], [x, nextY + 1.1, end]);
                    b.rod([x, y + 0.55, z], [x, nextY + 0.55, end], 0.03);
                    if (y > 2) {
                        for (let level = 1; level < y - 1; level += 2) {
                            b.rod([x, level, z], [x, Math.min(level + 2, nextY - 0.25), end], 0.035);
                            b.rod([x, level, end], [x, Math.min(level + 2, y - 0.25), z], 0.035);
                        }
                    }
                }
            }
        }
        const badge = b.sign('BIRDMAN', 'RALLY 2026', 0, 6.3, -1.92, 4.8, 4.8, '#1d72a5', '#ffffff', true);
        badge.name = 'Photo-inspired-round-event-board';
        b.sign('BIRDMAN RALLY', 'LAUNCH PLATFORM', 0, 9, -1.9, 10, 1.2);
        const flagMeshes = [], yellow = new THREE.MeshStandardMaterial({ color: 0xf1ce38, side: THREE.DoubleSide });
        b.rod([-6.6, runwayHeight(-16), -16], [-6.6, 15.2, -16], 0.055);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5, 12, 6), yellow); flag.position.set(-5.4, 14.5, -16); b.group.add(flag); flagMeshes.push(flag);
        b.rod([6.5, 10.6, -17], [6.5, 14, -17], 0.12);
        b.rod([6.5, 14, -17], [3, 15.5, -11], 0.08); b.box(3, 15.4, -11, 0.5, 0.35, 0.7, b.steel);
        const wingRunners = [], skin = new THREE.MeshStandardMaterial({ color: 0xd6b49b });
        for (const side of [-1, 1]) {
            const runner = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 1.4, 8), b.blue); body.position.y = 0.7;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), skin); head.position.y = 1.6;
            runner.add(body, head); runner.position.set(side * 5.2, runwayHeight(-10), -10); b.group.add(runner); wingRunners.push(runner);
        }
        for (let i = 0; i < 6; i++) {
            const x = (i < 3 ? -1 : 1) * (3.5 + (i % 3) * 0.9), y = runwayHeight(-15);
            b.box(x, y + 0.9, -15, 0.4, 0.65, 0.3, b.blue);
            b.box(x, y + 0.3, -15, 0.3, 0.6, 0.22, b.steel);
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), skin); head.position.set(x, y + 1.38, -15); b.group.add(head);
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 8), b.white); cap.position.set(x, y + 1.55, -15); b.group.add(cap);
        }
        const group = b.finish(); scene.add(group); return { group, flagMeshes, wingRunners };
    }
    function createShore(scene, imagesBase) {
        const b = createBuilder(); b.group.name = 'Matsubara-stands-team-and-broadcast-areas';
        function ground(z, depth, width, color) {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
            mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, 0.8, z); b.group.add(mesh);
        }
        ground(layout.shoreZ - 90, 180, 1400, 0xb9b294); ground(layout.shoreZ - 630, 900, 2000, 0x527252);
        const wetSand = new THREE.PlaneGeometry(1400, 10);
        wetSand.rotateX(-Math.PI / 2);
        const edge = wetSand.attributes.position;
        for (let i = 0; i < edge.count; i++) edge.setY(i, 0.8 - (edge.getZ(i) + 5) * 0.09);
        wetSand.computeVertexNormals();
        const shoreSlope = new THREE.Mesh(wetSand, new THREE.MeshStandardMaterial({ color: 0x929587, roughness: 0.9 }));
        shoreSlope.position.z = layout.shoreZ + 5; b.group.add(shoreSlope);
        function tent(x, z, width = 8, depth = 8, height = 3.5) {
            const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.3, 4), b.white);
            roof.rotation.y = Math.PI / 4; roof.scale.set(width / Math.SQRT2, 1, depth / Math.SQRT2); roof.position.set(x, height + 0.65, z); b.group.add(roof);
            for (const dx of [-width / 2, width / 2]) for (const dz of [-depth / 2, depth / 2]) b.rod([x + dx, 0.8, z + dz], [x + dx, height, z + dz], 0.055);
        }
        const seats = seatPositions(), dummy = new THREE.Object3D();
        function instances(name, geometry, material, transform) {
            const mesh = new THREE.InstancedMesh(geometry, material, seats.length); mesh.name = name;
            seats.forEach((seat, i) => { dummy.position.set(seat.x, seat.y, seat.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); transform(dummy, seat, i); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
            b.group.add(mesh); return mesh;
        }
        for (let row = 0; row < layout.rows; row++) {
            const z = layout.standZ - row * 0.95, y = 1.2 + row * 0.36;
            b.box(layout.standX, y - 0.13, z, 23.5, 0.26, 0.95, b.white);
            for (const x of [layout.standX - 11.7, layout.standX + 11.7]) {
                b.rod([x, 0.8, z], [x, y + 1, z]);
                if (row) b.rod([x, y + 1, z], [x, y + 0.64, z + 0.95]);
            }
        }
        for (const x of [-3.8, 3.8]) {
            for (let step = 0; step < 20; step++) b.box(layout.standX + x, 1.11 + step * 0.18, layout.standZ + 0.23 - step * 0.475, 1.05, 0.18, 0.475, b.white);
        }
        b.rod([layout.standX - 11.7, 2.1, layout.standZ + 0.48], [layout.standX + 11.7, 2.1, layout.standZ + 0.48]);
        instances('300-chair-seats', new THREE.BoxGeometry(0.48, 0.08, 0.46), b.white, d => { d.position.y += 0.45; });
        instances('300-chair-backs', new THREE.BoxGeometry(0.48, 0.48, 0.07), b.white, d => { d.position.y += 0.72; d.position.z -= 0.22; });
        for (const dx of [-0.2, 0.2]) for (const dz of [-0.18, 0.18]) instances('Chair-legs', new THREE.BoxGeometry(0.04, 0.42, 0.04), b.steel, d => { d.position.x += dx; d.position.y += 0.21; d.position.z += dz; });
        const trousers = new THREE.MeshStandardMaterial({ color: 0x3d484b });
        instances('Seated-laps', new THREE.BoxGeometry(0.34, 0.14, 0.4), trousers, d => { d.position.y += 0.53; d.position.z += 0.16; });
        for (const dx of [-0.1, 0.1]) instances('Spectator-lower-legs', new THREE.BoxGeometry(0.12, 0.42, 0.14), trousers, d => { d.position.x += dx; d.position.y += 0.27; d.position.z += 0.33; });
        instances('Seated-spectators', new THREE.BoxGeometry(0.35, 0.52, 0.25), b.blue, (d, s) => { d.position.y += 0.81; });
        instances('Spectator-heads', new THREE.SphereGeometry(0.14, 6, 5), new THREE.MeshStandardMaterial({ color: 0xd6b49b }), d => { d.position.y += 1.21; });
        const hats = instances('Sun-hats', new THREE.CylinderGeometry(0.21, 0.21, 0.07, 8), b.white, d => { d.position.y += 1.36; });
        const torsos = b.group.getObjectByName('Seated-spectators');
        seats.forEach((seat, i) => { torsos.setColorAt(i, new THREE.Color(seat.supporter ? 0x12628d : [0x354749, 0xccccbf, 0x96705b, 0x617463][i % 4])); });
        hats.userData.capacity = layout.publicSeats;
        tent(layout.standX, layout.standZ - 8, 25, 5, 6.5);
        b.sign('TBT 応援席', 'TEAM BIRDMAN TRIAL / S-320', layout.standX, 2.8, layout.standZ + 0.6, 11, 1.7, '#12628d', '#ffffff');
        for (let i = 0; i < 14; i++) tent(32 + i * 14, layout.shoreZ - 30 - (i % 2) * 14);
        tent(15, layout.shoreZ - 16, 10, 8); b.sign('大会本部', 'OPERATIONS', 15, 3, layout.shoreZ - 11.8, 7, 1.5);
        tent(-72, layout.shoreZ - 20, 10, 10); b.sign('TEAM BIRDMAN TRIAL', 'S-320 Element', -72, 3, layout.shoreZ - 14.8, 9, 1.5);
        const broadcastShelter = new THREE.Mesh(new THREE.SphereGeometry(4.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), b.white);
        broadcastShelter.position.set(-18, 0.8, layout.shoreZ - 14); broadcastShelter.scale.z = 1.3; b.group.add(broadcastShelter);
        for (const x of [-9, 9]) {
            b.box(x, 0.3, -132, 4.5, 0.6, 9, b.blue);
            b.box(x, 0.67, -132, 4.3, 0.14, 8.8, b.white);
        }
        // Shore-side LED truck, as seen in the university's 2026 event photographs.
        const dark = new THREE.MeshStandardMaterial({ color: 0x253a40 });
        b.box(-58, 1.8, layout.shoreZ - 8, 9, 0.7, 3.2); b.box(-63.5, 2.2, layout.shoreZ - 8, 2.4, 2.2, 3, b.white);
        b.box(-63.5, 2.8, layout.shoreZ - 6.47, 1.8, 0.8, 0.03, dark);
        for (const x of [-62, -55]) for (const z of [layout.shoreZ - 6.4, layout.shoreZ - 9.6]) {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.32, 12), dark); wheel.rotation.x = Math.PI / 2; wheel.position.set(x, 1.35, z); b.group.add(wheel);
        }
        b.box(-58, 4.3, layout.shoreZ - 8, 8.5, 4.6, 0.3, dark);
        const screen = b.sign('BIRDMAN RALLY 2026', 'TEAM BIRDMAN TRIAL / S-320', -58, 4.3, layout.shoreZ - 8.17, 8.1, 4.2, '#153d51', '#f7faf8'); screen.rotation.y = Math.PI;
        for (const x of [-23, -29, -67]) {
            const z = layout.shoreZ - 5;
            for (const dx of [-0.5, 0, 0.5]) b.rod([x + dx, 0.8, z + Math.abs(dx)], [x, 2.5, z], 0.03);
            b.box(x, 2.7, z, 0.55, 0.4, 0.7, dark);
        }
        for (const position of [{ x: -25, z: 40 }, { x: 28, z: 70 }, { x: -42, z: 150 }]) {
            const boat = root.TBTScenery.makeRescueBoat(); boat.position.set(position.x, 0.5, position.z); boat.rotation.y = 0.2; b.group.add(boat);
        }
        new THREE.TextureLoader().load(imagesBase + 'tobito_pose_koi.png', texture => {
            const mascot = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
            mascot.scale.set(2.2, 2.2, 2.2); mascot.position.set(-72, 2.3, layout.shoreZ - 14); b.group.add(mascot);
        });
        const group = b.finish(); scene.add(group); return group;
    }
    const api = { layout, runwayHeight, approachHeight, seatPositions, createPlatform, createShore };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TBTContestVenue = api;
})(typeof window === 'undefined' ? globalThis : window);
