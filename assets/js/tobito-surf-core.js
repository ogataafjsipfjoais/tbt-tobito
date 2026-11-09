(function (root) {
    'use strict';
    const poses = ['tobito_pose_airplane.png', 'tobito_pose_koi.png', 'tobito_pose_crossed_arms.png'];
    const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));
    function settings(input = {}) {
        return {
            count: Math.round(clamp(input.count ?? 3, 1, 8)),
            size: clamp(input.size ?? 80, 40, 140),
            speed: clamp(input.speed ?? 1, 0.5, 2),
            mode: input.mode === 'wander' ? 'wander' : 'follow',
            skin: poses.includes(input.skin) ? input.skin : 'mix'
        };
    }
    function advance(agent, target, delta, speed) {
        const amount = 1 - Math.exp(-Math.min(0.05, Math.max(0, delta)) * 3.6 * speed);
        const dx = target.x - agent.x;
        agent.x += dx * amount;
        agent.y += (target.y - agent.y) * amount;
        if (Math.abs(dx) > 0.5) agent.facing = dx < 0 ? -1 : 1;
        return agent;
    }

    function stepGround(agent, target, delta, bounds, now, index = 0, following = true) {
        const floor = Math.max(0, bounds.height - bounds.size - 2);
        const right = Math.max(0, bounds.width - bounds.size);
        const duration = Math.min(0.05, Math.max(0, delta));
        const gravity = 1800;
        agent.vx = agent.vx || 0;
        agent.vy = agent.vy || 0;
        if (agent.grounded === undefined) { agent.grounded = true; agent.y = floor; }
        const gap = floor - target.y;
        if (following && agent.grounded && gap > 24 && Math.abs(target.x - agent.x) < 110 &&
            now >= (agent.jumpReadyAt || 0) && floor > 12) {
            const height = Math.min(Math.max(48, gap), 320, floor * 0.78);
            agent.vy = -Math.sqrt(2 * gravity * height);
            agent.grounded = false;
            agent.jumpReadyAt = now + 950 + index * 170;
        }
        // Short substeps keep landing and steering stable across frame rates.
        for (let left = duration; left > 1e-8;) {
            const dt = Math.min(left, 1 / 120);
            left -= dt;
            const dx = target.x - agent.x;
            const velocity = Math.max(-1, Math.min(1, dx / 70)) * bounds.speed * (following ? 240 : 85);
            agent.vx += (velocity - agent.vx) * (1 - Math.exp(-10 * dt));
            agent.x = Math.max(0, Math.min(right, agent.x + agent.vx * dt));
            if (Math.abs(agent.vx) > 8) agent.facing = agent.vx < 0 ? -1 : 1;
            if (!agent.grounded) {
                agent.y += agent.vy * dt + gravity * dt * dt / 2;
                agent.vy += gravity * dt;
                if (agent.y >= floor) {
                    agent.y = floor; agent.vy = 0; agent.grounded = true;
                    agent.landedUntil = now + 140;
                    agent.jumpReadyAt = Math.max(agent.jumpReadyAt || 0, now + 420 + index * 100);
                }
            } else agent.y = floor;
        }
        return agent;
    }

    class Engine {
        constructor(container, options = {}) {
            this.container = container;
            this.options = options;
            this.settings = settings(options.settings);
            this.agents = [];
            this.active = false;
            this.visible = true;
            this.listeners = [];
            this.pointer = null;
            this.motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
            this.start();
        }
        listen(target, type, listener, options) {
            target.addEventListener(type, listener, options);
            this.listeners.push(() => target.removeEventListener(type, listener, options));
        }
        bounds() {
            if (this.options.fullScreen) return { x: 0, y: 0, width: innerWidth, height: innerHeight };
            const rect = this.container.getBoundingClientRect();
            return { x: rect.left, y: rect.top, width: this.container.clientWidth, height: this.container.clientHeight };
        }
        start() {
            if (this.active) return;
            this.active = true;
            this.host = document.createElement('div');
            this.host.className = 'tbt-surf-layer';
            this.host.style.cssText = 'pointer-events:none;overflow:hidden;display:block;' +
                (this.options.fullScreen ? 'position:fixed;inset:0;z-index:' + (this.options.layerZIndex ?? 2147483646) + ';' : 'position:absolute;inset:0;z-index:3;');
            this.shadow = this.host.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = ':host{contain:layout style}img{position:absolute;left:0;top:0;object-fit:contain;user-select:none;pointer-events:none;will-change:transform;filter:drop-shadow(0 4px 4px #20262a18)}button{position:absolute;right:12px;bottom:12px;width:36px;height:36px;border:1px solid #aebcc2;border-radius:6px;background:#fff;color:#20262a;font:24px/1 sans-serif;pointer-events:auto;cursor:pointer}';
            this.shadow.appendChild(style);
            if (this.options.fullScreen && this.options.closeButton !== false) {
                const close = document.createElement('button');
                close.type = 'button'; close.textContent = '×';
                close.setAttribute('aria-label', 'とびとくんを非表示');
                close.title = 'とびとくんを非表示';
                close.addEventListener('click', () => { this.stop(); this.options.onClose?.(); });
                this.shadow.appendChild(close);
            }
            this.container.appendChild(this.host);
            const trackPointer = event => {
                const rect = this.bounds();
                const x = event.clientX - rect.x, y = event.clientY - rect.y;
                if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
                this.pointer = { x, y };
            };
            this.listen(window, 'pointermove', trackPointer, { passive: true });
            this.listen(window, 'pointerdown', trackPointer, { passive: true });
            this.listen(window, 'pointerout', event => { if (!event.relatedTarget) this.pointer = null; });
            this.listen(window, 'resize', () => this.layout());
            this.listen(document, 'visibilitychange', () => {
                if (document.hidden) this.pause();
                else { this.lastFrame = null; this.schedule(); }
            });
            this.listen(this.motionPreference, 'change', () => {
                this.pause(); this.layout(); this.schedule();
            });
            this.listen(window, 'blur', () => { this.pointer = null; });
            this.observer = new IntersectionObserver(entries => {
                this.visible = entries[0].isIntersecting;
                if (this.visible) this.schedule();
                else this.pause();
            });
            this.observer.observe(this.options.fullScreen ? document.documentElement : this.container);
            this.update(this.settings);
            this.schedule();
        }
        update(input) {
            this.settings = settings({ ...this.settings, ...input });
            if (!this.active) return;
            while (this.agents.length > this.settings.count) this.agents.pop().image.remove();
            while (this.agents.length < this.settings.count) {
                const index = this.agents.length;
                const image = document.createElement('img');
                image.alt = ''; image.draggable = false;
                image.setAttribute('aria-hidden', 'true');
                this.shadow.appendChild(image);
                this.agents.push({ image, x: 0, y: 0, facing: 1, initial: true });
            }
            this.agents.forEach((agent, index) => {
                const pose = this.settings.skin === 'mix' ? poses[index % poses.length] : this.settings.skin;
                agent.image.src = this.options.assetUrl ? this.options.assetUrl(pose) : 'assets/images/' + pose;
                agent.image.style.width = agent.image.style.height = this.settings.size + 'px';
            });
            this.host.dataset.count = String(this.agents.length);
            this.layout();
            this.schedule();
        }
        layout() {
            if (!this.active) return;
            const rect = this.bounds();
            this.agents.forEach((agent, index) => {
                if (this.motionPreference.matches || agent.initial) {
                    agent.x = Math.max(0, Math.min(rect.width - this.settings.size, rect.width * (index + 1) / (this.agents.length + 1) - this.settings.size / 2));
                    agent.y = Math.max(0, rect.height - this.settings.size - 2);
                    agent.vx = agent.vy = 0;
                    agent.grounded = true;
                    agent.initial = false;
                }
                const floor = Math.max(0, rect.height - this.settings.size - 2);
                if (agent.grounded) agent.y = floor;
                else if (agent.floor !== undefined) agent.y += floor - agent.floor;
                agent.floor = floor;
                agent.x = Math.max(0, Math.min(rect.width - this.settings.size, agent.x));
                agent.y = Math.max(0, Math.min(floor, agent.y));
                this.paint(agent, 0, index);
            });
        }
        pause() {
            cancelAnimationFrame(this.frame);
            this.frame = null;
            this.lastFrame = null;
        }
        schedule() {
            if (!this.active || !this.visible || document.hidden || this.motionPreference.matches || this.frame) return;
            this.frame = requestAnimationFrame(time => { this.frame = null; this.tick(time); });
        }
        tick(time) {
            if (!this.active || !this.visible || document.hidden) return;
            const delta = this.lastFrame == null ? 0.016 : (time - this.lastFrame) / 1000;
            this.lastFrame = time;
            const rect = this.bounds();
            const size = this.settings.size;
            this.agents.forEach((agent, index) => {
                const following = this.settings.mode === 'follow' && !!this.pointer;
                const phase = index * 1.8;
                const target = following ? {
                    x: this.pointer.x + (index - (this.agents.length - 1) / 2) * size * 0.75 - size / 2,
                    y: this.pointer.y - size / 2
                } : {
                    x: rect.width * (0.5 + Math.sin(time * 0.00012 + phase) * 0.32) - size / 2,
                    y: rect.height - size - 2
                };
                target.x = Math.max(4, Math.min(rect.width - size - 4, target.x));
                target.y = Math.max(4, Math.min(rect.height - size - 4, target.y));
                stepGround(agent, target, delta, { width: rect.width, height: rect.height, size, speed: this.settings.speed * (1 - index * 0.045) }, time, index, following);
                this.paint(agent, time, index);
            });
            this.schedule();
        }
        paint(agent, time, index) {
            const walking = agent.grounded && Math.abs(agent.vx || 0) > 12;
            const tilt = this.motionPreference.matches ? 0 : walking ? Math.sin(time * 0.018 + index) * 4 : Math.max(-8, Math.min(8, (agent.vx || 0) * 0.025));
            const stretch = this.motionPreference.matches ? 1 : time < (agent.landedUntil || 0) ? 0.88 : agent.grounded ? 1 : 1.04;
            agent.image.style.transformOrigin = '50% 100%';
            agent.image.style.transform = 'translate3d(' + agent.x.toFixed(1) + 'px,' + agent.y.toFixed(1) + 'px,0) scaleX(' + agent.facing + ') scaleY(' + stretch + ') rotate(' + tilt.toFixed(1) + 'deg)';
            agent.image.dataset.motion = agent.grounded ? walking ? 'walking' : 'standing' : agent.vy < 0 ? 'jumping' : 'falling';
        }
        stop() {
            if (!this.active) return;
            this.active = false;
            cancelAnimationFrame(this.frame);
            this.frame = null;
            this.listeners.forEach(remove => remove());
            this.listeners = [];
            this.observer?.disconnect();
            this.host.remove();
        }
    }
    const api = { settings, advance, stepGround, poses, Engine };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.TobitoSurf = api;
})(typeof window === 'undefined' ? globalThis : window);
