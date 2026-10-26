import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Dependency-free safety smoke test. Real DOM navigation is in navigation-v3.mjs.
const source = readFileSync(new URL('../v3_optimized.js', import.meta.url), 'utf8');
let boot;
let title = '章节测验';
const context = {
    window: { jQuery: {} },
    document: {
        getElementsByClassName: () => [{ title }],
        querySelectorAll: () => [],
        querySelector: () => null,
    },
    $: () => ({ length: 1, off() { return this; }, on() { return this; } }),
    console: { log() {}, warn() {}, error() {}, info() {} },
    setInterval(fn) { boot = fn; return 1; },
    clearInterval() {},
    setTimeout() { assert.fail('Blocked content must not schedule navigation'); },
    clearTimeout() {},
};
vm.runInNewContext(source, context);
boot();
const app = context.window.app;
assert.ok(app);
assert.equal(app._state, 'BLOCKED');
assert.equal(app._isPlaying, false);
assert.equal(app._checkInterval, null);
assert.equal(app._isChapterTest(), true);
assert.equal(app.configs.playbackRate, 1);
app.configs.playbackRate = 1.25;
assert.equal(app.configs.playbackRate, 1);
title = '本章自测';
assert.equal(app._isChapterTest(), true);
app.nextUnit();
assert.equal(app._state, 'BLOCKED');
title = 'Unknown resource';
app.run();
await app.play();
assert.equal(app._state, 'BLOCKED');
assert.equal(app._timers.size, 0);
console.log('PASS: fixed 1.0x configuration, assessment detection, and unknown-content safety (VM smoke).');
