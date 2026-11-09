(function (root) {
    'use strict';
    const radians = value => value * Math.PI / 180;
    const origin = { lat: 35.29112, lng: 136.2535 };
    const launchBearing = 285;
    const metersPerDegree = 111195;
    const longitudeScale = metersPerDegree * Math.cos(radians(origin.lat));
    const angle = radians(launchBearing);
    const rules = { height: 10, runway: 10, slope: 3.5, fullCourse: 42195 };

    function project({ lat, lng }) {
        const east = (lng - origin.lng) * longitudeScale;
        const north = (lat - origin.lat) * metersPerDegree;
        return { x: east * Math.cos(angle) - north * Math.sin(angle), z: east * Math.sin(angle) + north * Math.cos(angle) };
    }
    function unproject({ x, z }) {
        const east = x * Math.cos(angle) + z * Math.sin(angle);
        const north = -x * Math.sin(angle) + z * Math.cos(angle);
        return { lat: origin.lat + north / metersPerDegree, lng: origin.lng + east / longitudeScale };
    }
    function destination(bearing, distance) {
        return unproject({ x: Math.sin(radians(bearing - launchBearing)) * distance, z: Math.cos(radians(bearing - launchBearing)) * distance });
    }
    const points = {
        launch: { ...origin, name: '松原湖岸・発進台', x: 0, z: 0 },
        south: { ...destination(246, rules.fullCourse / 4), name: '沖島側・南旋回点（概略）' },
        north: { ...destination(327, rules.fullCourse / 4), name: '竹生島側・北旋回点（概略）' }
    };
    [points.south, points.north].forEach(point => Object.assign(point, project(point)));

    class CourseTracker {
        constructor(order = 'south') { this.reset(order); }
        reset(order = 'south') {
            this.order = order === 'north' ? 'north' : 'south';
            this.legs = [this.order, 'launch', this.order === 'south' ? 'north' : 'south', 'launch'];
            this.leg = 0;
            this.distance = 0;
            this.last = { x: 0, z: 0 };
            this.complete = false;
        }
        update(position) {
            this.distance += Math.hypot(position.x - this.last.x, position.z - this.last.z);
            this.last = { x: position.x, z: position.z };
            if (!this.complete && this.remaining(position) <= 100) {
                this.leg++;
                this.complete = this.leg === this.legs.length;
            }
            return this;
        }
        get target() { return points[this.legs[Math.min(this.leg, 3)]]; }
        remaining(position) { return Math.hypot(position.x - this.target.x, position.z - this.target.z); }
    }

    class FlightMap {
        constructor(tracker) {
            this.tracker = tracker;
            this.element = document.getElementById('flight-map');
            this.follow = false;
            this.trace = [];
            this.mode = 'course';
            if (!this.element || !root.L) return;
            this.map = L.map(this.element, { scrollWheelZoom: false, preferCanvas: true, zoomControl: true, maxZoom: 18 });
            const localTiles = new URL('../images/map-tiles/', document.querySelector('script[src*="/birdman-course.js"]').src);
            const CachedTiles = L.TileLayer.extend({
                createTile(coords, done) {
                    const tile = document.createElement('img');
                    tile.alt = '';
                    tile.setAttribute('role', 'presentation');
                    let cached = false;
                    tile.onload = () => done(null, tile);
                    tile.onerror = () => {
                        if (cached) { done(new Error('Map tile unavailable'), tile); return; }
                        cached = true;
                        tile.src = new URL(coords.z + '/' + coords.x + '/' + coords.y + '.png', localTiles).href;
                    };
                    tile.src = this.getTileUrl(coords);
                    return tile;
                }
            });
            this.tiles = new CachedTiles('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
                minZoom: 5, maxZoom: 18, attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">地理院タイル</a>'
            }).addTo(this.map);
            this.tiles.on('tileerror', () => { document.getElementById('flight-map-status').textContent = '背景地図を読み込めませんでした。コース表示は利用できます。'; });
            this.tiles.on('tileload', () => { document.getElementById('flight-map-status').textContent = ''; });
            Object.values(points).forEach(point => {
                L.circleMarker([point.lat, point.lng], { radius: 5, weight: 2, color: '#fff', fillColor: '#b83b47', fillOpacity: 1 })
                    .addTo(this.map).bindTooltip(point.name, { direction: 'top' });
            });
            this.routeLine = L.polyline([], { color: '#748a91', weight: 2, dashArray: '5 7' }).addTo(this.map);
            this.headingLine = L.polyline([], { color: '#007c9d', weight: 2 }).addTo(this.map);
            this.traceLine = L.polyline([], { color: '#b83b47', weight: 3 }).addTo(this.map);
            this.marker = L.marker([origin.lat, origin.lng], { icon: L.divIcon({ className: 'flight-position', html: '<span></span>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(this.map);
            new ResizeObserver(() => { if (this.element.clientWidth) this.map.invalidateSize(); }).observe(this.element);
            document.querySelectorAll('[data-flight-map]').forEach(button => button.addEventListener('click', () => this.setMode(button.dataset.flightMap)));
            document.getElementById('flight-map-follow')?.addEventListener('click', event => {
                this.follow = !this.follow;
                event.currentTarget.setAttribute('aria-pressed', String(this.follow));
                if (this.follow && this.lastPosition) this.map.panTo(this.lastPosition);
            });
            this.map.on('dragstart', () => {
                this.follow = false;
                document.getElementById('flight-map-follow').setAttribute('aria-pressed', 'false');
            });
            this.reset();
        }
        setMode(mode) {
            this.mode = mode;
            document.querySelectorAll('[data-flight-map]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.flightMap === mode)));
            if (mode === 'venue') this.map.setView([origin.lat, origin.lng], 16);
            else this.map.fitBounds(Object.values(points).map(point => [point.lat, point.lng]), { padding: [25, 25] });
        }
        reset() {
            this.trace = [];
            this.lastTrace = null;
            this.traceLine?.setLatLngs([]);
            const route = [points.launch, ...this.tracker.legs.map(name => points[name])];
            this.routeLine?.setLatLngs(route.map(point => [point.lat, point.lng]));
            if (this.map) this.setMode(this.mode);
        }
        update(position, yaw, state) {
            const geo = unproject(position);
            const point = [geo.lat, geo.lng];
            const heading = ((launchBearing + yaw * 180 / Math.PI) % 360 + 360) % 360;
            document.getElementById('flight-heading')?.replaceChildren(document.createTextNode(heading.toFixed(0) + '°'));
            document.getElementById('flight-target')?.replaceChildren(document.createTextNode(this.tracker.complete ? '完走' : this.tracker.target.name));
            document.getElementById('flight-leg')?.replaceChildren(document.createTextNode(Math.min(4, this.tracker.leg) + ' / 4'));
            document.getElementById('flight-remaining')?.replaceChildren(document.createTextNode((this.tracker.remaining(position) / 1000).toFixed(2) + ' km'));
            if (!this.map) return;
            this.lastPosition = point;
            this.marker.setLatLng(point);
            const marker = this.marker.getElement()?.querySelector('span');
            if (marker) marker.style.transform = 'rotate(' + heading + 'deg)';
            this.headingLine.setLatLngs([point, [this.tracker.target.lat, this.tracker.target.lng]]);
            if (state === 'flying' && (!this.lastTrace || Math.hypot(position.x - this.lastTrace.x, position.z - this.lastTrace.z) > 12)) {
                this.trace.push(point);
                if (this.trace.length > 2400) this.trace.shift();
                this.lastTrace = { x: position.x, z: position.z };
                this.traceLine.setLatLngs(this.trace);
            }
            if (this.follow) this.map.panTo(point, { animate: false });
        }
    }

    function addVenue(scene, imagesBase) {
        return root.TBTContestVenue.createShore(scene, imagesBase);
    }

    function addCourseMarkers(scene) {
        const group = new THREE.Group();
        for (const point of [points.south, points.north]) {
            const buoy = new THREE.Group();
            const float = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 1.8, 12), new THREE.MeshStandardMaterial({ color: 0xdcaa46 }));
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 9, 6), new THREE.MeshStandardMaterial({ color: 0xf5f6f4 }));
            mast.position.y = 5;
            const flag = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), new THREE.MeshBasicMaterial({ color: 0xbc3543, side: THREE.DoubleSide }));
            flag.position.set(1.5, 8.5, 0);
            buoy.add(float, mast, flag);
            buoy.position.set(point.x, 0.9, point.z);
            group.add(buoy);
        }
        scene.add(group);
        return group;
    }

    const api = { origin, launchBearing, rules, points, project, unproject, CourseTracker, FlightMap, addVenue, addCourseMarkers };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TBTBirdman = api;
})(typeof window === 'undefined' ? globalThis : window);
