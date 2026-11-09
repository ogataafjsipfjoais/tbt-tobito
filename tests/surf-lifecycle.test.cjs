const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function fixture() {
    class Element {
        constructor() { this.listeners = new Map(); this.children = []; this.dataset = {}; this.style = {}; this.clientWidth = 600; this.clientHeight = 300; }
        addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
        removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
        emit(type) { this.listeners.get(type)?.forEach(fn => fn({})); }
        setAttribute() {}
        appendChild(node) { this.children.push(node); node.parent = this; return node; }
        attachShadow() { this.shadowRoot = new Element(); return this.shadowRoot; }
        remove() { this.parent.children = this.parent.children.filter(node => node !== this); }
        getBoundingClientRect() { return { left: 0, top: 0 }; }
    }
    const win = new Element(), doc = new Element(), motion = new Element(), stage = new Element();
    doc.documentElement = new Element(); doc.createElement = () => new Element();
    motion.matches = false;
    let observer, next = 0;
    const frames = new Map();
    const context = {
        window: win, document: doc, module: { exports: {} }, innerWidth: 600, innerHeight: 300,
        matchMedia: () => motion, performance: { now: () => 1000 },
        requestAnimationFrame: fn => { frames.set(++next, fn); return next; },
        cancelAnimationFrame: id => frames.delete(id),
        IntersectionObserver: class { constructor(callback) { observer = this; this.callback = callback; } observe() {} disconnect() { this.disconnected = true; } }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../assets/js/tobito-surf-core.js'), 'utf8'), context);
    const engine = new context.module.exports.Engine(stage);
    return { engine, stage, win, doc, motion, observer, frames };
}
test('surf resumes after leaving the viewport or hiding the tab', () => {
    const { engine, observer, doc, frames } = fixture();
    assert.equal(frames.size, 1);
    observer.callback([{ isIntersecting: false }]);
    assert.equal(frames.size, 0);
    observer.callback([{ isIntersecting: true }]);
    assert.equal(frames.size, 1);
    doc.hidden = true; doc.emit('visibilitychange');
    assert.equal(frames.size, 0);
    doc.hidden = false; doc.emit('visibilitychange');
    assert.equal(frames.size, 1);
    engine.stop();
    assert.equal(frames.size, 0);
    assert.equal(observer.disconnected, true);
});
test('surf paints immediately, supports reduced motion and removes all listeners', () => {
    const { engine, stage, win, doc, motion, frames } = fixture();
    assert.equal(engine.agents.length, 3);
    assert.ok(engine.agents.every(agent => agent.image.style.transform.includes('translate3d')));
    assert.ok(engine.host.style.cssText.includes('pointer-events:none'));
    motion.matches = true; motion.emit('change');
    assert.equal(frames.size, 0);
    motion.matches = false; motion.emit('change');
    assert.equal(frames.size, 1);
    engine.update({ count: 5 });
    assert.equal(engine.agents.length, 5);
    engine.stop();
    assert.equal(stage.children.length, 0);
    for (const target of [win, doc, motion]) {
        assert.ok(Array.from(target.listeners.values()).every(set => set.size === 0));
    }
});
