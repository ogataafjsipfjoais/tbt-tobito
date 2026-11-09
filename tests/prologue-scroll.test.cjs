const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../assets/js/prologue-scroll.js'), 'utf8');
const sceneIds = ['prologue-state-1', 'prologue-state-2', 'prologue-state-3', 'prologue-stage-4'];

function createHero(code = source, { finePointer = false, search = '', missing = false } = {}) {
    const nodes = new Map();
    const events = new Map();
    const frames = [];
    const scrolls = [];
    let progress = 0;
    const node = id => {
        if (!nodes.has(id)) nodes.set(id, {
            style: {}, listeners: {},
            offsetHeight: id === 'prologue-section' ? 2300 : 900,
            querySelector: node,
            getBoundingClientRect: () => ({ top: 70 - progress * 1400, left: 0, width: 1000, height: 900 }),
            addEventListener(name, fn) { this.listeners[name] = fn; },
        });
        return nodes.get(id);
    };
    const context = {
        document: { readyState: 'complete', getElementById: missing ? () => null : node, querySelector: node },
        window: {
            scrollY: 0, location: { search }, matchMedia: () => ({ matches: finePointer }),
            addEventListener: (name, fn) => events.set(name, fn), scrollTo: args => scrolls.push(args),
        },
        getComputedStyle: () => ({ top: '70px' }), URLSearchParams,
        requestAnimationFrame: fn => { frames.push(fn); return frames.length; },
        setTimeout: fn => fn(),
    };
    vm.runInNewContext(code, context);
    function flush() {
        let remaining = 1000;
        while (frames.length && remaining-- > 0) frames.shift()();
        assert.ok(remaining > 0, 'Animation must settle');
    }
    return {
        node, nodes, events, frames, scrolls, flush,
        at(value) { progress = value; events.get('scroll')(); flush(); },
        visible() { return sceneIds.filter(id => Number(node(id).style.opacity) > 0); },
    };
}

test('forward and reverse scrolling never overlap phrases or mascot scenes', () => {
    const hero = createHero();
    for (const direction of [1, -1]) for (let step = 0; step <= 1000; step++) {
        hero.at(direction === 1 ? step / 1000 : 1 - step / 1000);
        assert.ok(hero.visible().length <= 1);
        assert.ok(!(Number(hero.node('prologue-stage-4').style.opacity) > 0 && Number(hero.node('prologue-giant-wrap').style.opacity) > 0));
    }
});

test('scene resting points and hidden controls remain correct', () => {
    const hero = createHero();
    [0, 0.27, 0.50, 0.80].forEach((progress, index) => {
        hero.at(progress);
        assert.deepEqual(hero.visible(), [sceneIds[index]]);
        assert.equal(hero.node('prologue-stage-4').inert, index !== 3);
    });
    hero.at(-1);
    assert.deepEqual(hero.visible(), [sceneIds[0]]);
    hero.at(2);
    assert.deepEqual(hero.visible(), [sceneIds[3]]);
});

test('scroll bursts share a frame and resize updates the scene', () => {
    const hero = createHero();
    for (let i = 0; i < 20; i++) hero.events.get('scroll')();
    assert.equal(hero.frames.length, 1);
    hero.flush();
    hero.events.get('resize')();
    assert.equal(hero.frames.length, 1);
    hero.flush();
});

test('pointer leaving after settling returns the mascot to center', () => {
    const hero = createHero(source, { finePointer: true });
    const stage = hero.node('prologue-pinned-stage');
    stage.listeners.mousemove({ clientX: 900, clientY: 700 });
    hero.flush();
    assert.ok(Math.abs(parseFloat(hero.node('prologue-giant-wrap').style.marginLeft)) > 1);
    stage.listeners.mouseleave();
    hero.flush();
    assert.ok(Math.abs(parseFloat(hero.node('prologue-giant-wrap').style.marginLeft)) < 0.02);
});

test('preview links use the same scroll geometry; unrelated pages are ignored', () => {
    const hero = createHero(source, { search: '?state=3' });
    assert.equal(hero.scrolls[0].top, 700);
    assert.equal(createHero(source, { search: '?state=invalid' }).scrolls.length, 0);
    assert.equal(createHero(source, { missing: true }).events.size, 0);
});

// Optional baseline comparison is used during a behavior-preserving refactor.
if (process.env.TOBITO_BASELINE) test('rendered styles match the pre-refactor implementation', () => {
    const before = createHero(readFileSync(process.env.TOBITO_BASELINE, 'utf8'));
    const after = createHero();
    for (const direction of [1, -1]) for (let step = 0; step <= 1000; step++) {
        const progress = direction === 1 ? step / 1000 : 1 - step / 1000;
        before.at(progress);
        after.at(progress);
        for (const [id, element] of before.nodes) {
            assert.deepEqual(after.node(id).style, element.style, id + ' at ' + progress);
            assert.equal(after.node(id).inert, element.inert);
        }
    }
});
